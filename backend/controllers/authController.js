const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  supabase,          // alias for supabaseAdmin — DB operations only
  supabaseAdmin,     // service-role client — DB + admin.createUser
  supabaseAuth,      // anon-key client — signInWithPassword / getUser ONLY
  isLiveSupabase,
  MOCK_PROFILES,
  createSupabaseToken,
  getProfileByAuthUser
} = require('../config/supabaseClient');
const {
  normalizeIndianPhone,
  getDeterministicInternalEmail,
  parseLoginIdentifier,
  getPhoneVariants
} = require('../utils/phoneNormalizer');

// In-memory offline profile store for local dev / offline tests
const OFFLINE_PROFILES = new Map();

function saveOfflineProfile(profile) {
  if (!profile) return;
  if (profile.email) OFFLINE_PROFILES.set(profile.email.toLowerCase(), profile);
  if (profile.phone) OFFLINE_PROFILES.set(normalizeIndianPhone(profile.phone), profile);
  if (profile.id) OFFLINE_PROFILES.set(String(profile.id), profile);
}

function getOfflineProfile(key) {
  if (!key) return null;
  const k = String(key).toLowerCase().trim();
  const byEmail = OFFLINE_PROFILES.get(k);
  if (byEmail) return byEmail;
  const norm = normalizeIndianPhone(k);
  if (norm && OFFLINE_PROFILES.has(norm)) {
    return OFFLINE_PROFILES.get(norm);
  }
  return OFFLINE_PROFILES.get(key) || null;
}

// Static demo credentials for instant evaluation
const DEMO_CREDENTIALS = {
  'farmer@pashurakshak.in': { password: 'Farmer@123', role: 'farmer' },
  'suresh@pashurakshak.in': { password: 'Farmer@123', role: 'farmer' },
  'vet@pashurakshak.in': { password: 'Vet@123', role: 'veterinarian' },
  'amit.vet@pashurakshak.in': { password: 'Vet@123', role: 'veterinarian' },
  'vet2@pashurakshak.in': { password: 'Vet@123', role: 'veterinarian' },
  'officer@pashurakshak.in': { password: 'Admin@123', role: 'officer' },
  'admin@pashurakshak.in': { password: 'Admin@123', role: 'admin' },
  'santosh@pashurakshak.in': { password: 'Farmer@123', role: 'farmer' },
  'sunita@pashurakshak.in': { password: 'Farmer@123', role: 'farmer' }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const {
      name,
      role = 'farmer',
      phone,
      email,
      password,
      state,
      village,
      block,
      district,
      registrationNo,
      department,
      preferredLanguage,
      location
    } = req.body;

    if (!name || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'कृपया नाम, मोबाइल नंबर और पासवर्ड अवश्य भरें (Please provide name, phone, and password).'
      });
    }

    const cleanPhone = normalizeIndianPhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'कृपया एक मान्य 10-अंकीय मोबाइल नंबर दर्ज करें (Please provide a valid 10-digit mobile number).'
      });
    }

    // Deterministic email: user-provided email, or standardized internal farmer email
    const cleanEmail = (email && String(email).trim())
      ? String(email).toLowerCase().trim()
      : getDeterministicInternalEmail(cleanPhone);

    const safeDistrict = district ? district.trim() : 'Nagpur';
    const safeState = state ? state.trim() : 'Maharashtra';
    const safeVillage = village ? village.trim() : '';
    const safeBlock = block ? block.trim() : '';

    // 1. Check duplicate registration in live Supabase public.profiles
    // Uses supabaseAdmin (service-role) so RLS does not block the check
    if (supabaseAdmin) {
      try {
        const phoneVars = getPhoneVariants(cleanPhone);
        const { data: dupP } = await supabaseAdmin
          .from('profiles')
          .select('id, email, phone')
          .or(`email.eq.${cleanEmail},phone.in.(${phoneVars.join(',')})`)
          .limit(1)
          .maybeSingle();

        if (dupP) {
          return res.status(400).json({
            success: false,
            message: 'इस मोबाइल नंबर या ईमेल से पहले से खाता मौजूद है (A user with this phone or email already exists).'
          });
        }
      } catch (checkErr) {
        // Continue to offline/resilient check
      }
    }

    // Check duplicate in offline store
    if (getOfflineProfile(cleanEmail) || getOfflineProfile(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'इस मोबाइल नंबर या ईमेल से पहले से खाता मौजूद है (A user with this phone or email already exists).'
      });
    }

    // Check duplicate in MongoDB if active
    try {
      const existingMongo = await User.findOne({
        $or: [{ email: cleanEmail }, { phone: cleanPhone }]
      });
      if (existingMongo) {
        return res.status(400).json({
          success: false,
          message: 'इस मोबाइल नंबर या ईमेल से पहले से खाता मौजूद है (A user with this phone or email already exists).'
        });
      }
    } catch (e) {}

    // Compute secure password hash for profiles and dual-write
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let authUserId = null;
    let profileId = null;
    let session = null;

    // 2. Canonical Registration via Supabase Auth & public.profiles
    if (isLiveSupabase && supabaseAdmin) {
      // Step A: Create user in Supabase Auth via admin API (requires service-role client)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          role: role || 'farmer',
          phone: cleanPhone,
          district: safeDistrict,
          state: safeState,
          village: safeVillage,
          block: safeBlock,
          registrationNo: registrationNo ? registrationNo.trim() : '',
          department: department ? department.trim() : '',
          preferredLanguage: preferredLanguage || 'hi'
        }
      });

      if (authError) {
        console.error('[Supabase Auth] Registration error:', authError.message);
        if (
          authError.message.toLowerCase().includes('already') ||
          authError.message.toLowerCase().includes('exists') ||
          authError.status === 422
        ) {
          return res.status(400).json({
            success: false,
            message: 'इस मोबाइल नंबर या ईमेल से पहले से खाता मौजूद है। कृपया लॉगिन करें (An account with this phone/email already exists. Please log in).'
          });
        }
        return res.status(500).json({
          success: false,
          message: `Supabase Auth registration failed: ${authError.message}`
        });
      }

      authUserId = authData.user.id;

      // Step B: Upsert profile row into public.profiles using ADMIN client
      // Uses onConflict: 'email' so if database trigger on_auth_user_created
      // already created the row, PostgREST updates it rather than throwing 23505 unique constraint error.
      const profileToUpsert = {
        name: name.trim(),
        role: role || 'farmer',
        phone: cleanPhone,
        email: cleanEmail,
        password_hash: passwordHash,
        village: safeVillage,
        block: safeBlock,
        district: safeDistrict,
        state: safeState,
        registration_no: registrationNo ? registrationNo.trim() : '',
        department: department ? department.trim() : '',
        preferred_language: preferredLanguage || 'hi',
        latitude: parseFloat(location?.lat || 0),
        longitude: parseFloat(location?.lng || 0),
        auth_user_id: authUserId,
        updated_at: new Date().toISOString()
      };

      let profileRow = null;
      const { data: upsertedProfile, error: profileUpsertError } = await supabaseAdmin
        .from('profiles')
        .upsert(profileToUpsert, { onConflict: 'email' })
        .select('*')
        .single();

      if (profileUpsertError) {
        console.warn('[Supabase] Upsert notice during registration:', profileUpsertError.message);

        // Fallback: fetch existing row if present
        const { data: existingP } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .or(`auth_user_id.eq.${authUserId},email.eq.${cleanEmail}`)
          .limit(1)
          .maybeSingle();

        if (existingP) {
          profileRow = existingP;
        } else {
          // Compensation rollback: delete orphaned auth user if profile cannot be saved
          try {
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
            console.log(`[Supabase] Compensation rollback: deleted orphan auth user ${authUserId}`);
          } catch (delErr) {
            console.error(`[Supabase] Compensation rollback failed for ${authUserId}:`, delErr.message);
          }

          return res.status(500).json({
            success: false,
            message: `Database profile creation failed: ${profileUpsertError.message}`
          });
        }
      } else {
        profileRow = upsertedProfile;
      }

      profileId = profileRow.id;

      // Step C: Sign in via the AUTH client (anon key) to obtain real Supabase session.
      // CRITICAL: supabaseAuth is used here — NOT supabaseAdmin — to prevent
      // the user session from contaminating the admin DB client's Authorization header.
      try {
        const authClientToUse = supabaseAuth || supabaseAdmin;
        const { data: signInData, error: signInErr } = await authClientToUse.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
        if (signInData && signInData.session && !signInErr) {
          session = signInData.session;
        }
      } catch (signInEx) {
        console.warn('[Supabase Auth] Post-registration sign-in notice:', signInEx.message);
      }
    } else {
      // Offline / Developer Test Mode: Deterministic UUID generation
      const generatedId = crypto.randomUUID();
      profileId = generatedId;
      authUserId = generatedId;
    }

    const userPayload = {
      id: profileId,
      _id: profileId,
      auth_user_id: authUserId,
      name: name.trim(),
      email: cleanEmail,
      role: role || 'farmer',
      phone: cleanPhone,
      state: safeState,
      village: safeVillage,
      block: safeBlock,
      district: safeDistrict,
      location: {
        lat: parseFloat(location?.lat || 0),
        lng: parseFloat(location?.lng || 0)
      },
      registrationNo: registrationNo ? registrationNo.trim() : '',
      department: department ? department.trim() : '',
      preferredLanguage: preferredLanguage || 'hi'
    };

    // Store in offline profile map for consistent logout/login during offline tests
    saveOfflineProfile({
      ...userPayload,
      passwordHash
    });

    // 3. Non-blocking MongoDB dual-write for legacy data compatibility
    try {
      await User.create({
        name: name.trim(),
        role: role || 'farmer',
        phone: cleanPhone,
        email: cleanEmail,
        passwordHash,
        state: safeState,
        village: safeVillage,
        block: safeBlock,
        district: safeDistrict,
        location: {
          lat: parseFloat(location?.lat || 0),
          lng: parseFloat(location?.lng || 0)
        },
        registrationNo: registrationNo ? registrationNo.trim() : '',
        department: department ? department.trim() : '',
        preferredLanguage: preferredLanguage || 'hi'
      });
    } catch (mongoErr) {
      // Non-blocking
    }

    // Return genuine Supabase session token or fallback compliant JWT
    const token = session ? session.access_token : createSupabaseToken(userPayload);
    const refreshToken = session ? session.refresh_token : undefined;

    return res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token (supports Email OR Mobile Phone)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, phone, identifier, password } = req.body;
    const rawLoginKey = (email || phone || identifier || '').trim();

    if (!rawLoginKey || !password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया ईमेल या मोबाइल नंबर और पासवर्ड दर्ज करें (Please provide email/phone and password).'
      });
    }

    const { isEmail, email: parsedEmail, phone: normPhone, deterministicEmail } = parseLoginIdentifier(rawLoginKey);

    let authEmail = parsedEmail;
    let matchedProfile = null;

    // If identifier is a phone number, resolve the registered email from public.profiles
    // Uses supabaseAdmin (service-role) so RLS does not block the lookup
    if (!isEmail && normPhone) {
      if (supabaseAdmin) {
        try {
          const uniquePhones = getPhoneVariants(normPhone);
          const { data: dbP } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('phone', uniquePhones)
            .limit(1)
            .maybeSingle();
          if (dbP) {
            matchedProfile = dbP;
            authEmail = dbP.email;
          }
        } catch (dbErr) {
          console.warn('[Supabase] Phone lookup notice:', dbErr.message);
        }
      }

      // If not found in public.profiles, check auth.users via admin API to find matching phone in user_metadata
      if (!matchedProfile && supabaseAdmin && isLiveSupabase) {
        try {
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
          const matchingAuthUser = userList?.users?.find(u => {
            const uPhone = normalizeIndianPhone(u.phone || u.user_metadata?.phone || '');
            return uPhone === normPhone;
          });
          if (matchingAuthUser && matchingAuthUser.email) {
            authEmail = matchingAuthUser.email;
          }
        } catch (authListErr) {}
      }

      // If not in DB or offline, check in-memory offline store
      if (!authEmail) {
        const offP = getOfflineProfile(normPhone);
        if (offP) {
          authEmail = offP.email;
          matchedProfile = offP;
        }
      }

      // Default to deterministic internal email if unmapped
      if (!authEmail) {
        authEmail = deterministicEmail;
      }
    }

    // 1. Primary: Authenticate via Live Supabase Auth if connected.
    // CRITICAL: Use supabaseAuth (anon-key client) for signInWithPassword,
    // NOT supabaseAdmin, to prevent the user's session from contaminating
    // the admin DB client's Authorization header.
    if (isLiveSupabase && (supabaseAuth || supabaseAdmin) && authEmail) {
      try {
        const authClientToUse = supabaseAuth || supabaseAdmin;
        const { data: authData, error: authError } = await authClientToUse.auth.signInWithPassword({
          email: authEmail,
          password
        });

        if (authData && authData.session && !authError) {
          const profile = await getProfileByAuthUser(authData.user);
          const authoritativeId = profile?.id || authData.user.id;

          const userPayload = {
            id: authoritativeId,
            _id: authoritativeId,
            auth_user_id: authData.user.id,
            name: profile?.name || authData.user.user_metadata?.name || 'User',
            email: profile?.email || authData.user.email,
            role: profile?.role || authData.user.user_metadata?.role || 'farmer',
            phone: profile?.phone || normPhone || '',
            district: profile?.district || authData.user.user_metadata?.district || 'Nagpur',
            state: profile?.state || authData.user.user_metadata?.state || 'Maharashtra',
            village: profile?.village || '',
            block: profile?.block || '',
            registrationNo: profile?.registrationNo || '',
            department: profile?.department || '',
            preferredLanguage: profile?.preferredLanguage || 'hi'
          };

          return res.status(200).json({
            success: true,
            token: authData.session.access_token,
            refreshToken: authData.session.refresh_token,
            user: userPayload
          });
        }
      } catch (supabaseErr) {
        console.warn('[Supabase Auth] Live sign-in notice:', supabaseErr.message);
      }
    }

    // 2. Direct public.profiles password verification fallback (for offline or direct-provisioned profiles)
    // Uses supabaseAdmin (service-role) so RLS does not block the lookup
    if (supabaseAdmin && (authEmail || normPhone)) {
      try {
        if (!matchedProfile) {
          const phoneVars = normPhone ? getPhoneVariants(normPhone) : [];
          const orFilter = authEmail
            ? (phoneVars.length ? `email.eq.${authEmail},phone.in.(${phoneVars.join(',')})` : `email.eq.${authEmail}`)
            : `phone.in.(${phoneVars.join(',')})`;

          const { data: p } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .or(orFilter)
            .limit(1)
            .maybeSingle();
          if (p) matchedProfile = p;
        }

        if (matchedProfile && matchedProfile.password_hash) {
          const isMatch = await bcrypt.compare(password, matchedProfile.password_hash);
          if (isMatch) {
            const userPayload = {
              id: matchedProfile.id,
              _id: matchedProfile.id,
              auth_user_id: matchedProfile.auth_user_id || matchedProfile.id,
              name: matchedProfile.name,
              email: matchedProfile.email,
              role: matchedProfile.role,
              phone: matchedProfile.phone,
              district: matchedProfile.district,
              state: matchedProfile.state,
              village: matchedProfile.village || '',
              block: matchedProfile.block || '',
              registrationNo: matchedProfile.registration_no || '',
              department: matchedProfile.department || '',
              preferredLanguage: matchedProfile.preferred_language || 'hi'
            };

            const token = createSupabaseToken(userPayload);
            return res.status(200).json({
              success: true,
              token,
              user: userPayload
            });
          }
        }
      } catch (profErr) {
        console.warn('[Supabase Profiles] Direct verification notice:', profErr.message);
      }
    }

    // 3. Offline In-Memory Profile Fallback (for unit tests / offline developer mode)
    const offlineProfile = getOfflineProfile(authEmail || normPhone || rawLoginKey);
    if (offlineProfile && offlineProfile.passwordHash) {
      const isMatch = await bcrypt.compare(password, offlineProfile.passwordHash);
      if (isMatch) {
        const userPayload = {
          id: offlineProfile.id,
          _id: offlineProfile.id,
          auth_user_id: offlineProfile.auth_user_id || offlineProfile.id,
          name: offlineProfile.name,
          email: offlineProfile.email,
          role: offlineProfile.role,
          phone: offlineProfile.phone,
          district: offlineProfile.district,
          state: offlineProfile.state,
          village: offlineProfile.village || '',
          block: offlineProfile.block || '',
          registrationNo: offlineProfile.registrationNo || '',
          department: offlineProfile.department || '',
          preferredLanguage: offlineProfile.preferredLanguage || 'hi'
        };
        const token = createSupabaseToken(userPayload);
        return res.status(200).json({
          success: true,
          token,
          user: userPayload
        });
      }
    }

    // 4. Static / Seed Persona Accounts (Farmer, Vet, Officer, Admin)
    const cleanEmail = (authEmail || rawLoginKey).toLowerCase();
    const demoAccount = DEMO_CREDENTIALS[cleanEmail];
    if (demoAccount && password === demoAccount.password) {
      const mockUser = MOCK_PROFILES[cleanEmail] || {
        id: '00000000-0000-0000-0000-000000000001',
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: demoAccount.role,
        phone: '+919822011223',
        district: 'Nagpur',
        state: 'Maharashtra'
      };

      const token = createSupabaseToken(mockUser);
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: mockUser.id,
          _id: mockUser.id,
          auth_user_id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          phone: mockUser.phone,
          district: mockUser.district,
          state: mockUser.state,
          village: mockUser.village || '',
          block: mockUser.block || '',
          registrationNo: mockUser.registrationNo || '',
          department: mockUser.department || '',
          preferredLanguage: mockUser.preferredLanguage || 'hi'
        }
      });
    }

    // 5. MongoDB Fallback
    let mongoUser = null;
    try {
      mongoUser = await User.findOne({
        $or: [
          { email: cleanEmail },
          { phone: normPhone || rawLoginKey }
        ]
      });
    } catch (e) {}

    if (mongoUser) {
      const isMatch = await mongoUser.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'पासवर्ड गलत है। कृपया पुनः प्रयास करें (Invalid password).'
        });
      }

      const userPayload = {
        id: String(mongoUser._id),
        _id: String(mongoUser._id),
        auth_user_id: String(mongoUser._id),
        name: mongoUser.name,
        email: mongoUser.email,
        phone: mongoUser.phone,
        role: mongoUser.role,
        district: mongoUser.district,
        state: mongoUser.state,
        village: mongoUser.village || '',
        block: mongoUser.block || '',
        registrationNo: mongoUser.registrationNo || '',
        department: mongoUser.department || '',
        preferredLanguage: mongoUser.preferredLanguage || 'hi'
      };

      const token = createSupabaseToken(userPayload);
      return res.status(200).json({
        success: true,
        token,
        user: userPayload
      });
    }

    // If none matched
    return res.status(401).json({
      success: false,
      message: 'उपयोगकर्ता नहीं मिला या पासवर्ड गलत है (User not found or invalid credentials).'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current logged in user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, email, village, block, district, state, preferredLanguage } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.auth_user_id;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (village !== undefined) updates.village = String(village).trim();
    if (block !== undefined) updates.block = String(block).trim();
    if (district !== undefined) updates.district = String(district).trim();
    if (state !== undefined) updates.state = String(state).trim();
    if (preferredLanguage !== undefined) updates.preferred_language = String(preferredLanguage).trim();

    if (isLiveSupabase && userId) {
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
          .select()
          .maybeSingle();

        if (!error && data) {
          const merged = { ...req.user, ...data };
          saveOfflineProfile(merged);
          return res.status(200).json({
            success: true,
            user: merged
          });
        }
      } catch (dbErr) {
        console.warn('[AuthController] Notice updating Supabase profile:', dbErr.message);
      }
    }

    const updated = {
      ...req.user,
      ...updates
    };
    saveOfflineProfile(updated);

    return res.status(200).json({
      success: true,
      user: updated
    });
  } catch (error) {
    next(error);
  }
};
