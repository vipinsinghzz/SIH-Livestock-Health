/**
 * Supabase Client Configuration (Backend Admin)
 * File: backend/config/supabaseClient.js
 * 
 * Manages Supabase Auth & Database operations using the Service Role Key.
 * STRICT SECURITY: This file and the SUPABASE_SERVICE_ROLE_KEY must NEVER
 * be exported, bundled, or exposed to the frontend.
 */

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock-supabase.pashurakshak.internal';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'pashurakshak_supabase_service_role_secret_key_2026';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'pashurakshak_supabase_anon_public_key_2026';

const isLiveSupabase = SUPABASE_URL.startsWith('http') && 
  !SUPABASE_URL.includes('mock-supabase') && 
  !SUPABASE_URL.includes('[your-project');

let supabase = null;

if (isLiveSupabase) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log(`[Supabase] Initialized live client connecting to ${SUPABASE_URL}`);
  } catch (err) {
    console.warn(`[Supabase] Live client initialization warning: ${err.message}. Falling back to resilient mode.`);
  }
}

/**
 * Deterministic mock Supabase user generator for testing & offline compatibility.
 * Matches Supabase Auth exact user schema and JWT specification.
 */
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

/**
 * Generate a Supabase-compliant access token (JWT)
 */
function createSupabaseToken(userPayload) {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure';
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

/**
 * Verifies an incoming Bearer token against Supabase Auth.
 * If live Supabase client is connected, invokes supabase.auth.getUser(token).
 * Falls back to verifying cryptographic Supabase JWT claims.
 */
async function verifySupabaseToken(token) {
  if (!token) return { user: null, error: new Error('No token provided') };

  // 1. Live Supabase Auth verification
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (data && data.user && !error) {
        return { user: data.user, error: null };
      }
    } catch (err) {
      // Continue to local verification fallback
    }
  }

  // 2. Fallback: Cryptographic JWT verification for Supabase claim structure
  try {
    const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure';
    const decoded = jwt.verify(token, secret);

    // Verify it contains standard Supabase claims (sub, aud) or legacy id
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

/**
 * Resolves or builds a profile record linked to the Supabase user id.
 */
async function getProfileByAuthUser(supabaseUser) {
  if (!supabaseUser) return null;

  const email = (supabaseUser.email || '').toLowerCase().trim();

  // Check mock/seed profiles first
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

  // Live Supabase public.profiles query
  if (supabase) {
    try {
      const authUserId = String(supabaseUser.id || '').trim();
      const phone = String(supabaseUser.phone || supabaseUser.user_metadata?.phone || '').trim();
      let data = null;

      // 1. Prefer matching by auth_user_id
      if (authUserId) {
        const { data: byAuth, error: authErr } = await supabase
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
        const { data: byId, error: idErr } = await supabase
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
        const { data: byEmail, error: emailErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (byEmail && !emailErr) {
          data = byEmail;
          // Link auth_user_id if missing or outdated
          if (authUserId && (!data.auth_user_id || data.auth_user_id !== authUserId)) {
            try {
              await supabase
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

      // 4. Fall back to matching by phone
      if (!data && phone) {
        const { data: byPhone, error: phoneErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', phone)
          .maybeSingle();
        if (byPhone && !phoneErr) {
          data = byPhone;
          if (authUserId && (!data.auth_user_id || data.auth_user_id !== authUserId)) {
            try {
              await supabase
                .from('profiles')
                .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
                .eq('id', data.id);
              data.auth_user_id = authUserId;
            } catch (linkErr) {
              console.warn('[Supabase] Notice linking auth_user_id on profile by phone:', linkErr.message);
            }
          }
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

      // 5. Auto-provision profile in public.profiles if missing for authenticated Supabase user
      if (!data && authUserId) {
        const meta = supabaseUser.user_metadata || {};
        const safePhone = phone || meta.phone || '0000000000';
        const safeDistrict = meta.district ? String(meta.district).trim() : 'Pune';
        const safeState = meta.state ? String(meta.state).trim() : 'Maharashtra';
        const profileToInsert = {
          auth_user_id: authUserId,
          name: meta.name || email?.split('@')[0] || 'Farmer',
          role: meta.role || 'farmer',
          phone: safePhone,
          email: email || `user_${authUserId.substring(0, 8)}@livestocksathi.in`,
          password_hash: '',
          district: safeDistrict,
          state: safeState,
          village: meta.village || '',
          block: meta.block || '',
          registration_no: meta.registrationNo || '',
          department: meta.department || '',
          preferred_language: meta.preferredLanguage || 'hi'
        };

        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert(profileToInsert)
          .select('*')
          .single();

        if (newProfile && !insertErr) {
          console.log('[Supabase] Auto-provisioned missing profile for user:', {
            profileId: newProfile.id,
            auth_user_id: authUserId,
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
          // If conflict on email (code 23505), fetch existing profile and link auth_user_id
          if (insertErr.code === '23505' && profileToInsert.email) {
            const { data: dupP } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', profileToInsert.email)
              .maybeSingle();
            if (dupP) {
              await supabase
                .from('profiles')
                .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
                .eq('id', dupP.id);
              return {
                _id: dupP.id,
                id: dupP.id,
                auth_user_id: authUserId,
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
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  MOCK_PROFILES,
  createSupabaseToken,
  verifySupabaseToken,
  getProfileByAuthUser
};
