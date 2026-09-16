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

// Service-role / admin key (bypasses RLS) — accept any of the known variable names
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  'pashurakshak_supabase_service_role_secret_key_2026';

// Public / anon key (subject to RLS) — used ONLY for auth operations
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'pashurakshak_supabase_anon_public_key_2026';

const isLiveSupabase =
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('mock-supabase') &&
  !SUPABASE_URL.includes('[your-project');

// ─── Client 1: AUTH client (anon key, RLS-constrained) ─────────────────────
// ONLY used for: auth.signInWithPassword(), auth.getUser(token)
// NEVER used for .from() database operations.
let supabaseAuth = null;

// ─── Client 2: ADMIN / DB client (service-role key, bypasses RLS) ───────────
// ONLY used for: .from('profiles'), .from('animals'), admin.createUser(), etc.
// NEVER receives the signed-in user's access_token.
let supabaseAdmin = null;

// ─── Backward-compatible alias (DB operations use supabaseAdmin) ─────────────
// All callers that import `supabase` get the admin client for database ops.
let supabase = null;

if (isLiveSupabase) {
  try {
    // Audit key type at startup (supports both JWT-style eyJ... and opaque sb_secret_... keys)
    let keyRole = 'unknown';
    if (SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
      // Classic JWT — decode payload
      try {
        const payload = JSON.parse(
          Buffer.from(SUPABASE_SERVICE_ROLE_KEY.split('.')[1], 'base64').toString()
        );
        keyRole = payload.role || 'unknown';
      } catch (e) {}
    } else if (
      SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_') ||
      SUPABASE_SERVICE_ROLE_KEY.length > 40
    ) {
      // Opaque secret key format (Supabase newer format) — cannot decode as JWT
      keyRole = 'opaque-secret (service-role assumed)';
    }

    if (keyRole === 'anon') {
      console.error(
        '[Supabase CRITICAL MISCONFIGURATION] SUPABASE_SERVICE_ROLE_KEY is an ANON key! ' +
        'All server-side profile and admin operations will fail with PostgreSQL RLS permission denied. ' +
        'Set SUPABASE_SERVICE_ROLE_KEY to the service_role secret from Supabase Dashboard → Project Settings → API.'
      );
    } else {
      console.log(
        `[Supabase] Admin DB client initialized with service-role credentials (key type: ${keyRole}) → ${SUPABASE_URL}`
      );
    }

    // CLIENT 2: Admin/DB — service-role key, never persists session, never auto-refreshes
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    // CLIENT 1: Auth — anon key, never persists session
    supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    // Backward-compat alias: all .from() calls use the admin client
    supabase = supabaseAdmin;

    console.log('[Supabase] Auth client initialized with anon key (for signInWithPassword / getUser only).');
    console.log('[Supabase] Admin DB client is ISOLATED from auth sessions — RLS bypassed via service-role key.');
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
    district: 'Pune',
    state: 'Maharashtra',
    village: 'Malegaon Bk',
    block: 'Baramati',
    preferredLanguage: 'hi',
    location: { lat: 18.1517, lng: 74.5772 }
  },
  'vet@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Dr. Ananya Deshmukh (डॉ. अनन्या देशमुख)',
    email: 'vet@pashurakshak.in',
    role: 'veterinarian',
    phone: '+919822022334',
    district: 'Pune',
    state: 'Maharashtra',
    village: 'Baramati Town',
    block: 'Baramati',
    registrationNo: 'MAH-VET-2022-4819',
    department: 'Department of Animal Husbandry, Govt. of Maharashtra',
    preferredLanguage: 'en',
    location: { lat: 18.1540, lng: 74.5810 }
  },
  'officer@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Dr. Suresh Kulkarni (डॉ. सुरेश कुलकर्णी)',
    email: 'officer@pashurakshak.in',
    role: 'officer',
    phone: '+919822033445',
    district: 'Pune',
    state: 'Maharashtra',
    village: 'Shivajinagar',
    block: 'Haveli',
    preferredLanguage: 'en',
    location: { lat: 18.5314, lng: 73.8446 }
  },
  'admin@pashurakshak.in': {
    id: '00000000-0000-0000-0000-000000000099',
    name: 'Chief Admin (मुख्य प्रशासक)',
    email: 'admin@pashurakshak.in',
    role: 'admin',
    phone: '+919822099999',
    district: 'Pune',
    state: 'Maharashtra',
    village: 'Pune Central',
    block: 'Haveli',
    preferredLanguage: 'en',
    location: { lat: 18.5204, lng: 73.8567 }
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
        district: mockProfile ? mockProfile.district : 'Pune'
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

  // Check mock/seed profiles first (for offline/test mode)
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
      district: p.district,
      state: p.state,
      village: p.village,
      block: p.block,
      location: p.location,
      preferredLanguage: p.preferredLanguage,
      registrationNo: p.registrationNo || '',
      department: p.department || ''
    };
  }

  // Live Supabase public.profiles query — uses supabaseAdmin (service-role)
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
        const safeDistrict = meta.district ? String(meta.district).trim() : 'Pune';
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

  // Synthesize from metadata if not found in table or offline
  const meta = supabaseUser.user_metadata || {};
  return {
    _id: supabaseUser.id,
    id: supabaseUser.id,
    auth_user_id: supabaseUser.id,
    name: meta.name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    role: meta.role || 'farmer',
    phone: meta.phone || supabaseUser.phone || '',
    district: meta.district || 'Pune',
    state: meta.state || 'Maharashtra',
    village: meta.village || '',
    block: meta.block || '',
    location: meta.location || { lat: 0, lng: 0 },
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
