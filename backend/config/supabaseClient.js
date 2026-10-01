/**
 * Supabase Client Configuration (Backend Two-Client Architecture)
 * File: backend/config/supabaseClient.js
 *
 * TWO SEPARATE CLIENTS to prevent session contamination:
 *
 * supabaseAuth  — initialized with SUPABASE_ANON_KEY
 *                 ONLY used for: auth.signInWithPassword(), auth.getUser()
 *                 persistSession: false so it never caches the user session.
 *
 * supabaseAdmin — initialized with SUPABASE_SERVICE_ROLE_KEY
 *                 ONLY used for: .from('profiles'), .from('animals'), etc.
 *                 persistSession: false, autoRefreshToken: false.
 *                 NEVER receives the user's access_token.
 *                 Bypasses RLS unconditionally with service-role credentials.
 *
 * SECURITY: This file and the SUPABASE_SERVICE_ROLE_KEY MUST NEVER
 * be exported, bundled, or exposed to the frontend.
 */

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const { normalizeIndianPhone, getDeterministicInternalEmail, getPhoneVariants } = require('../utils/phoneNormalizer');

// ─── Environment Variables ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock-supabase.pashurakshak.internal';

// Helper to determine key nature without exposing credentials
function inspectKeyType(rawKey) {
  if (!rawKey) return { type: 'missing', isSecret: false, isAnon: false };
  const key = String(rawKey).trim();
  if (key.startsWith('sb_secret_')) {
    return { type: 'sb_secret', isSecret: true, isAnon: false };
  }
  if (key.startsWith('sb_publishable_')) {
    return { type: 'sb_publishable', isSecret: false, isAnon: true };
  }
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
      if (payload.role === 'service_role') {
        return { type: 'service_role_jwt', isSecret: true, isAnon: false };
      }
      if (payload.role === 'anon') {
        return { type: 'anon_jwt', isSecret: false, isAnon: true };
      }
      return { type: `jwt_${payload.role || 'unknown'}`, isSecret: false, isAnon: false };
    } catch (e) {
      return { type: 'opaque_jwt', isSecret: false, isAnon: false };
    }
  }
  if (key.includes('placeholder') || key.includes('mock')) {
    return { type: 'placeholder', isSecret: false, isAnon: false };
  }
  return { type: 'opaque_string', isSecret: key.length > 40, isAnon: false };
}

// Resolve candidate secret keys from environment
const rawSecretCandidate =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SECRET ||
  process.env.SB_SECRET_KEY ||
  (process.env.SUPABASE_KEY && inspectKeyType(process.env.SUPABASE_KEY).isSecret ? process.env.SUPABASE_KEY : null) ||
  '';

// Resolve candidate public/anon keys from environment
const rawAnonCandidate =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  (process.env.SUPABASE_KEY && inspectKeyType(process.env.SUPABASE_KEY).isAnon ? process.env.SUPABASE_KEY : null) ||
  '';

const secretKeyInfo = inspectKeyType(rawSecretCandidate);
const anonKeyInfo = inspectKeyType(rawAnonCandidate);

// Fallback to harmless developer placeholders only when not configured
const SUPABASE_SERVICE_ROLE_KEY = rawSecretCandidate || 'pashurakshak_supabase_service_role_secret_key_2026';
const SUPABASE_ANON_KEY = rawAnonCandidate || 'pashurakshak_supabase_anon_public_key_2026';

const isLiveSupabase =
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('mock-supabase') &&
  !SUPABASE_URL.includes('[your-project');

// ─── Client 1: AUTH client (anon key, RLS-constrained) ─────────────────────
// ONLY used for: auth.signInWithPassword(), auth.getUser(token)
// NEVER used for .from() database operations.
let supabaseAuth = null;

// ─── Client 2: ADMIN / DB client (service-role key, bypasses RLS) ───────────
// ONLY used for: .from('profiles'), .from('animals'), admin.createUser(), admin.deleteUser()
// NEVER receives the signed-in user's access_token.
let supabaseAdmin = null;

// ─── Backward-compatible alias (DB operations use supabaseAdmin) ─────────────
// All callers that import `supabase` get the admin client for database ops.
let supabase = null;

if (isLiveSupabase) {
  try {
    if (secretKeyInfo.isAnon) {
      console.error(
        '[Supabase CRITICAL MISCONFIGURATION] A publishable/anon key was provided where a secret key was expected! ' +
        'Server-side profile creation and admin operations will fail with PostgreSQL RLS error 42501 (permission denied). ' +
        'Configure SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in Railway to the service_role or sb_secret_... key.'
      );
    } else {
      console.log(
        `[Supabase] Admin DB client initialized (key type: ${secretKeyInfo.type}) → ${new URL(SUPABASE_URL).hostname}`
      );
    }

    // CLIENT 2: Admin/DB — privileged service credential, never persists session, never auto-refreshes
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    // CLIENT 1: Auth — anon/publishable key, never persists session
    supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    // Backward-compat alias: all .from() calls use the admin client
    supabase = supabaseAdmin;

    console.log('[Supabase] Auth client initialized with anon/publishable key (for signInWithPassword / getUser only).');
    console.log('[Supabase] Admin DB client is ISOLATED from auth sessions — privileged server-side access.');
  } catch (err) {
    console.warn(`[Supabase] Client initialization warning: ${err.message}. Falling back to resilient mode.`);
  }
}

// ─── Mock / seed profiles for offline/test environments ────────────────────
const MOCK_PROFILES = {
  'farmer@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Ramesh Patil (रमेश पाटील)',
    email: 'farmer@pashurakshak.in',
    role: 'farmer',
    phone: '+919822011223',
    district: 'Nagpur',
    state: 'Maharashtra',
    village: 'Yerkheda',
    block: 'Kamptee',
    preferredLanguage: 'hi',
    location: { lat: 21.2400, lng: 79.2150 }
  },
  'santosh@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Santosh Wankhede (संतोष वानखेडे)',
    email: 'santosh@pashurakshak.in',
    role: 'farmer',
    phone: '+919822044556',
    district: 'Nagpur',
    state: 'Maharashtra',
    village: 'Takalghat',
    block: 'Hingna',
    preferredLanguage: 'hi',
    location: { lat: 21.0250, lng: 78.9450 }
  },
  'sunita@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Sunita Pawar (सुनिता पवार)',
    email: 'sunita@pashurakshak.in',
    role: 'farmer',
    phone: '+919822055667',
    district: 'Nagpur',
    state: 'Maharashtra',
    village: 'Mansar',
    block: 'Ramtek',
    preferredLanguage: 'mr',
    location: { lat: 21.3850, lng: 79.2800 }
  },
  'vet@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Dr. Ananya Deshmukh (डॉ. अनन्या देशमुख)',
    email: 'vet@pashurakshak.in',
    role: 'veterinarian',
    phone: '+919822022334',
    district: 'Nagpur',
    state: 'Maharashtra',
    village: 'Saoner Town',
    block: 'Saoner',
    registrationNo: 'MAH-VET-2022-4819',
    department: 'Department of Animal Husbandry, Govt. of Maharashtra, Saoner Polyclinic',
    preferredLanguage: 'en',
    location: { lat: 21.3833, lng: 78.9167 }
  },
  'vet2@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000012',
    name: 'Dr. Rajesh Deshmukh (डॉ. राजेश देशमुख)',
    email: 'vet2@pashurakshak.in',
    role: 'veterinarian',
    phone: '+919822022335',
    district: 'Nagpur',
    state: 'Maharashtra',
    village: 'Kamptee Town',
    block: 'Kamptee',
    registrationNo: 'MAH-VET-2020-3102',
    department: 'Department of Animal Husbandry, Govt. of Maharashtra, Kamptee Dispensary',
    preferredLanguage: 'en',
    location: { lat: 21.2227, lng: 79.1970 }
  },
  'officer@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Dr. Suresh Kulkarni (डॉ. सुरेश कुलकर्णी)',
    email: 'officer@pashurakshak.in',
    role: 'officer',
    phone: '+919822033445',
    district: 'Nagpur',
    state: 'Maharashtra',
    village: 'Civil Lines',
    block: 'Nagpur Urban',
    registrationNo: 'MAH-OFF-2018-0912',
    department: 'District Animal Husbandry Office, Nagpur',
    preferredLanguage: 'en',
    location: { lat: 21.1458, lng: 79.0882 }
  },
  'admin@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000099',
    name: 'Chief Admin (मुख्य प्रशासक)',
    email: 'admin@pashurakshak.in',
    role: 'admin',
    phone: '+919822099999',
    district: 'Nagpur',
    state: 'Maharashtra',
    village: 'Civil Lines',
    block: 'Nagpur Urban',
    preferredLanguage: 'en',
    location: { lat: 21.1458, lng: 79.0882 }
  }
};

// ─── JWT generation ─────────────────────────────────────────────────────────
/**
 * Generate a Supabase-compliant access token (JWT).
 * Used in offline/test mode and for public.profiles password-verified logins.
 */
function createSupabaseToken(userPayload) {
  const secret =
    process.env.SUPABASE_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'pashurakshak_jwt_secret_key_2026_secure';
  return jwt.sign(
    {
      sub: userPayload.id || userPayload._id,
      aud: 'authenticated',
      role: 'authenticated',
      email: userPayload.email,
      phone: userPayload.phone || '',
      app_metadata: {
        provider: 'email',
        providers: ['email']
      },
      user_metadata: {
        name: userPayload.name,
        role: userPayload.role,
        district: userPayload.district,
        state: userPayload.state,
        phone: userPayload.phone
      },
      iss: 'supabase'
    },
    secret,
    { expiresIn: '7d' }
  );
}

// ─── Token verification ──────────────────────────────────────────────────────
/**
 * Verify an incoming Bearer token against Supabase Auth.
 *
 * IMPORTANT: Uses supabaseAuth (anon key) — NOT supabaseAdmin — to call
 * auth.getUser(token). This is intentional: the admin DB client must
 * NEVER receive the user's access_token, which would contaminate its
 * Authorization header and cause subsequent DB queries to execute under
 * the user's RLS context instead of service-role context.
 */
async function verifySupabaseToken(token) {
  if (!token) return { user: null, error: new Error('No token provided') };

  // 1. Live Supabase Auth verification via AUTH client (anon key)
  if (supabaseAuth) {
    try {
      const { data, error } = await supabaseAuth.auth.getUser(token);
      if (data && data.user && !error) {
        return { user: data.user, error: null };
      }
    } catch (err) {
      // Continue to local JWT verification fallback
    }
  }

  // 2. Fallback: Cryptographic JWT verification for Supabase claim structure
  try {
    const secret =
      process.env.SUPABASE_JWT_SECRET ||
      process.env.JWT_SECRET ||
      'pashurakshak_jwt_secret_key_2026_secure';
    const decoded = jwt.verify(token, secret);

    const userId = decoded.sub || decoded.id;
    if (!userId) {
      return { user: null, error: new Error('Invalid token claims: missing subject identifier') };
    }

    const email = decoded.email || (decoded.user_metadata && decoded.user_metadata.email);
    const mockProfile = email ? MOCK_PROFILES[email.toLowerCase()] : null;

    const syntheticUser = {
      id: userId,
      aud: decoded.aud || 'authenticated',
      role: decoded.role || 'authenticated',
      email: email || (mockProfile ? mockProfile.email : ''),
      phone: decoded.phone || (mockProfile ? mockProfile.phone : ''),
      user_metadata: decoded.user_metadata || {
        name: mockProfile ? mockProfile.name : 'User',
        role: mockProfile ? mockProfile.role : 'farmer',
        district: mockProfile ? mockProfile.district : 'Nagpur'
      }
    };

    return { user: syntheticUser, error: null };
  } catch (err) {
    return { user: null, error: err };
  }
}

// ─── Profile resolution ──────────────────────────────────────────────────────
/**
 * Resolves or builds a profile record linked to the Supabase user id.
 *
 * IMPORTANT: Uses supabaseAdmin (service-role key) for ALL .from('profiles')
 * queries. The supabaseAdmin client NEVER receives the user's access_token,
 * so it always queries with service-role privileges, bypassing RLS safely.
 */
async function getProfileByAuthUser(supabaseUser) {
  if (!supabaseUser) return null;

  const email = (supabaseUser.email || '').toLowerCase().trim();

  // 1. Live Supabase public.profiles query — uses supabaseAdmin (service-role)
  if (supabaseAdmin) {
    try {
      const authUserId = String(supabaseUser.id || '').trim();
      const phone = String(supabaseUser.phone || supabaseUser.user_metadata?.phone || '').trim();
      let data = null;

      // 1. Prefer matching by auth_user_id
      if (authUserId) {
        const { data: byAuth, error: authErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authUserId)
          .maybeSingle();
        if (byAuth && !authErr) {
          data = byAuth;
        }
      }

      // 2. Fall back to matching by profile id = authUserId
      if (!data && authUserId) {
        const { data: byId, error: idErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', authUserId)
          .maybeSingle();
        if (byId && !idErr) {
          data = byId;
        }
      }

      // 3. Fall back to matching by email
      if (!data && email) {
        const { data: byEmail, error: emailErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (byEmail && !emailErr) {
          data = byEmail;
          // Link auth_user_id if missing or outdated
          if (authUserId && (!data.auth_user_id || data.auth_user_id !== authUserId)) {
            try {
              await supabaseAdmin
                .from('profiles')
                .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
                .eq('id', data.id);
              data.auth_user_id = authUserId;
            } catch (linkErr) {
              console.warn('[Supabase] Notice linking auth_user_id on profile by email:', linkErr.message);
            }
          }
        }
      }

      // 4. Fall back to matching by phone variants
      if (!data && phone) {
        const uniquePhones = getPhoneVariants(phone);
        const { data: byPhone, error: phoneErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .in('phone', uniquePhones)
          .limit(1)
          .maybeSingle();
        if (byPhone && !phoneErr) {
          data = byPhone;
        }
      }

      if (data) {
        return {
          _id: data.id,
          id: data.id,
          auth_user_id: data.auth_user_id || authUserId,
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone,
          district: data.district,
          state: data.state,
          village: data.village || '',
          block: data.block || '',
          location: { lat: data.latitude || 0, lng: data.longitude || 0 },
          preferredLanguage: data.preferred_language || 'hi',
          registrationNo: data.registration_no || '',
          department: data.department || ''
        };
      }

      // 5. Auto-provision profile in public.profiles if missing
      if (!data && (authUserId || email || phone)) {
        const meta = supabaseUser.user_metadata || {};
        const safePhone = normalizeIndianPhone(phone || meta.phone || '9822000000');
        const safeDistrict = meta.district ? String(meta.district).trim() : 'Nagpur';
        const safeState = meta.state ? String(meta.state).trim() : 'Maharashtra';
        const safeEmail = email || getDeterministicInternalEmail(safePhone);

        const isSyntheticAuthId = authUserId && authUserId.startsWith('00000000-0000-0000-0000-');

        const profileToInsert = {
          name: meta.name || email?.split('@')[0] || 'Farmer',
          role: meta.role || 'farmer',
          phone: safePhone,
          email: safeEmail,
          password_hash: '$2b$10$e7a68FwE3P9K.fakePasswordHashForOAuthOrSupaAuthUser',
          district: safeDistrict,
          state: safeState,
          village: meta.village || '',
          block: meta.block || '',
          registration_no: meta.registrationNo || '',
          department: meta.department || '',
          preferred_language: meta.preferredLanguage || 'hi'
        };

        if (authUserId && !isSyntheticAuthId) {
          profileToInsert.auth_user_id = authUserId;
        }

        let { data: newProfile, error: insertErr } = await supabaseAdmin
          .from('profiles')
          .insert(profileToInsert)
          .select('*')
          .single();

        // FK violation (23503): auth_user_id not in auth.users — retry without it
        if (insertErr && insertErr.code === '23503' && profileToInsert.auth_user_id) {
          console.warn('[Supabase] auth_user_id not in auth.users (23503), retrying with auth_user_id = null');
          delete profileToInsert.auth_user_id;
          const retryRes = await supabaseAdmin
            .from('profiles')
            .insert(profileToInsert)
            .select('*')
            .single();
          newProfile = retryRes.data;
          insertErr = retryRes.error;
        }

        if (newProfile && !insertErr) {
          console.log('[Supabase] Auto-provisioned missing profile for user:', {
            profileId: newProfile.id,
            email: newProfile.email,
            district: newProfile.district
          });
          return {
            _id: newProfile.id,
            id: newProfile.id,
            auth_user_id: newProfile.auth_user_id || authUserId,
            name: newProfile.name,
            email: newProfile.email,
            role: newProfile.role,
            phone: newProfile.phone,
            district: newProfile.district,
            state: newProfile.state,
            village: newProfile.village || '',
            block: newProfile.block || '',
            location: { lat: newProfile.latitude || 0, lng: newProfile.longitude || 0 },
            preferredLanguage: newProfile.preferred_language || 'hi',
            registrationNo: newProfile.registration_no || '',
            department: newProfile.department || ''
          };
        } else if (insertErr) {
          console.warn('[Supabase] Auto-provision profile error:', insertErr.message);
          // Conflict (23505): duplicate email or phone — fetch existing
          if (insertErr.code === '23505') {
            const { data: dupP } = await supabaseAdmin
              .from('profiles')
              .select('*')
              .or(`email.eq.${safeEmail},phone.eq.${safePhone}`)
              .limit(1)
              .maybeSingle();
            if (dupP) {
              return {
                _id: dupP.id,
                id: dupP.id,
                auth_user_id: dupP.auth_user_id || authUserId,
                name: dupP.name,
                email: dupP.email,
                role: dupP.role,
                phone: dupP.phone,
                district: dupP.district,
                state: dupP.state,
                village: dupP.village || '',
                block: dupP.block || '',
                location: { lat: dupP.latitude || 0, lng: dupP.longitude || 0 },
                preferredLanguage: dupP.preferred_language || 'hi',
                registrationNo: dupP.registration_no || '',
                department: dupP.department || ''
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Supabase] getProfileByAuthUser error:', e.message);
    }
  }

  // 2. Check mock/seed profiles fallback (for offline/test mode when not in Supabase)
  if (email && MOCK_PROFILES[email]) {
    const p = MOCK_PROFILES[email];
    return {
      _id: p.id,
      id: p.id,
      auth_user_id: supabaseUser.id,
      name: p.name,
      email: p.email,
      role: p.role,
      phone: p.phone,
      district: p.district || 'Nagpur',
      state: p.state || 'Maharashtra',
      village: p.village,
      block: p.block,
      location: p.location,
      preferredLanguage: p.preferredLanguage,
      registrationNo: p.registrationNo || '',
      department: p.department || ''
    };
  }

  // 3. Synthesize from metadata if not found in table or offline
  const meta = supabaseUser.user_metadata || {};
  return {
    _id: supabaseUser.id,
    id: supabaseUser.id,
    auth_user_id: supabaseUser.id,
    name: meta.name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    role: meta.role || 'farmer',
    phone: meta.phone || supabaseUser.phone || '',
    district: meta.district || 'Nagpur',
    state: meta.state || 'Maharashtra',
    village: meta.village || '',
    block: meta.block || '',
    location: meta.location || { lat: 21.1458, lng: 79.0882 },
    preferredLanguage: meta.preferredLanguage || 'hi',
    registrationNo: meta.registrationNo || '',
    department: meta.department || ''
  };
}

module.exports = {
  // Backward-compat alias — database operations (uses service-role/admin client)
  supabase,
  // Explicit named exports for code that needs to explicitly choose
  supabaseAdmin,
  supabaseAuth,
  isLiveSupabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  MOCK_PROFILES,
  createSupabaseToken,
  verifySupabaseToken,
  getProfileByAuthUser
};
