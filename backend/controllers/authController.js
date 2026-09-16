const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  supabase,
  MOCK_PROFILES,
  createSupabaseToken,
  getProfileByAuthUser
} = require('../config/supabaseClient');

// Static demo credentials for instant evaluation
const DEMO_CREDENTIALS = {
  'farmer@pashurakshak.in': { password: 'Farmer@123', role: 'farmer' },
  'vet@pashurakshak.in': { password: 'Vet@123', role: 'veterinarian' },
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

    const cleanPhone = phone.trim();
    // Use provided email, or generate safe default if farmer does not have an email
    const cleanEmail = (email && email.trim())
      ? email.toLowerCase().trim()
      : `farmer_${cleanPhone.replace(/\D/g, '')}@livestocksathi.in`;

    // 1. Check existing in MongoDB if connected
    let existingMongoUser = null;
    try {
      existingMongoUser = await User.findOne({
        $or: [
          { email: cleanEmail },
          { phone: cleanPhone }
        ]
      });
    } catch (e) {}

    if (existingMongoUser) {
      return res.status(400).json({
        success: false,
        message: 'इस मोबाइल नंबर या ईमेल से पहले से खाता मौजूद है (A user with this phone or email already exists).'
      });
    }

    let authUserId = null;
    let profileId = null;

    // Compute password hash for profiles and Mongo dual-write
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const safeDistrict = district ? district.trim() : 'Pune';
    const safeState = state ? state.trim() : 'Maharashtra';
    const safeVillage = village ? village.trim() : '';
    const safeBlock = block ? block.trim() : '';

    // 2. Register with Supabase Auth if live client connected
    if (supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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

        if (authData && authData.user) {
          authUserId = authData.user.id;
        } else if (authError) {
          console.warn('[Supabase Auth] User creation notice:', authError.message);
        }

        // Explicitly ensure a corresponding profiles row exists in Supabase
        try {
          let existingProfile = null;

          // Sequential check: 1. by auth_user_id
          if (authUserId) {
            const { data: pAuth } = await supabase
              .from('profiles')
              .select('id, auth_user_id, email, phone')
              .eq('auth_user_id', authUserId)
              .maybeSingle();
            if (pAuth) existingProfile = pAuth;
          }

          // Sequential check: 2. by email
          if (!existingProfile && cleanEmail) {
            const { data: pEmail } = await supabase
              .from('profiles')
              .select('id, auth_user_id, email, phone')
              .eq('email', cleanEmail)
              .maybeSingle();
            if (pEmail) existingProfile = pEmail;
          }

          // Sequential check: 3. by phone
          if (!existingProfile && cleanPhone) {
            const { data: pPhone } = await supabase
              .from('profiles')
              .select('id, auth_user_id, email, phone')
              .eq('phone', cleanPhone)
              .maybeSingle();
            if (pPhone) existingProfile = pPhone;
          }

          if (existingProfile) {
            profileId = existingProfile.id;
            if (authUserId && (!existingProfile.auth_user_id || existingProfile.auth_user_id !== authUserId)) {
              await supabase
                .from('profiles')
                .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
                .eq('id', existingProfile.id);
            }
            console.log('[Supabase] Linked existing profile to registered user:', {
              profileId: existingProfile.id,
              auth_user_id: authUserId,
              email: cleanEmail
            });
          } else {
            const profileToInsert = {
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
              longitude: parseFloat(location?.lng || 0)
            };
            if (authUserId) {
              profileToInsert.auth_user_id = authUserId;
            }

            let { data: insertedProfile, error: profileInsertError } = await supabase
              .from('profiles')
              .insert(profileToInsert)
              .select('id, auth_user_id')
              .single();

            // If error 23503 (fk_profiles_auth_user violated because auth_user_id not in auth.users), retry with auth_user_id = null
            if (profileInsertError && profileInsertError.code === '23503' && profileToInsert.auth_user_id) {
              console.warn('[Supabase] auth_user_id not in auth.users (code 23503), retrying profile insertion without auth_user_id');
              delete profileToInsert.auth_user_id;
              const retryInsert = await supabase
                .from('profiles')
                .insert(profileToInsert)
                .select('id, auth_user_id')
                .single();
              insertedProfile = retryInsert.data;
              profileInsertError = retryInsert.error;
            }

            if (insertedProfile && !profileInsertError) {
              profileId = insertedProfile.id;
              console.log('[Supabase] Created new profile for registered farmer:', {
                profileId: insertedProfile.id,
                email: cleanEmail
              });
            } else if (profileInsertError) {
              console.error('[Supabase] Failed to insert profile during registration:', profileInsertError.message);
              // If duplicate email/phone conflict (code 23505), link to the existing profile
              if (profileInsertError.code === '23505') {
                const { data: dupProfile } = await supabase
                  .from('profiles')
                  .select('id, auth_user_id')
                  .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
                  .limit(1)
                  .maybeSingle();
                if (dupProfile) {
                  profileId = dupProfile.id;
                }
              }
            }
          }
        } catch (profileErr) {
          console.error('[Supabase] Error verifying/creating profile during registration:', profileErr.message);
        }
      } catch (err) {
        console.warn('[Supabase Auth] User creation notice:', err.message);
      }
    }

    // 3. Register in MongoDB to maintain dual-compatibility during migration
    let mongoUser = null;
    try {
      mongoUser = await User.create({
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
      console.warn('[MongoDB] Dual-write notice:', mongoErr.message);
    }

    const effectiveId = profileId || authUserId || (mongoUser ? mongoUser._id : '00000000-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0'));

    const userPayload = {
      id: effectiveId,
      _id: effectiveId,
      auth_user_id: authUserId || effectiveId,
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

    // Issue Supabase-standard JWT
    const token = createSupabaseToken(userPayload);

    res.status(201).json({
      success: true,
      token,
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
    const loginKey = (email || phone || identifier || '').trim();

    if (!loginKey || !password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया ईमेल या मोबाइल नंबर और पासवर्ड दर्ज करें (Please provide email/phone and password).'
      });
    }

    const cleanEmail = loginKey.toLowerCase();
    const digitsOnly = loginKey.replace(/\D/g, '');
    const phoneTargetEmail = digitsOnly.length >= 10 ? `farmer_${digitsOnly.slice(-10)}@livestocksathi.in` : null;

    // 1. First priority: Authenticate via Live Supabase Auth if connected
    if (supabase) {
      const authEmail = cleanEmail.includes('@') ? cleanEmail : phoneTargetEmail;
      if (authEmail) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password
          });

          if (authData && authData.session && !authError) {
            const profile = await getProfileByAuthUser(authData.user);
            return res.status(200).json({
              success: true,
              token: authData.session.access_token,
              refreshToken: authData.session.refresh_token,
              user: profile || {
                id: authData.user.id,
                _id: authData.user.id,
                email: authData.user.email,
                role: authData.user.user_metadata?.role || 'farmer',
                name: authData.user.user_metadata?.name || 'User'
              }
            });
          }
        } catch (supabaseErr) {
          // Fall through to database/demo verification
        }
      }

      // Check live public.profiles for credentials match (supports farmers registered with phone)
      try {
        const phoneVariants = [loginKey];
        if (digitsOnly.length === 10) phoneVariants.push(`+91${digitsOnly}`, `91${digitsOnly}`, digitsOnly);
        else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) phoneVariants.push(digitsOnly.substring(2), `+${digitsOnly}`, digitsOnly);
        const uniquePhones = [...new Set(phoneVariants)];

        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('*')
          .or(`email.eq.${cleanEmail},${phoneTargetEmail ? `email.eq.${phoneTargetEmail},` : ''}phone.in.(${uniquePhones.join(',')})`)
          .limit(1)
          .maybeSingle();

        if (dbProfile && dbProfile.password_hash) {
          const isMatch = await bcrypt.compare(password, dbProfile.password_hash);
          if (isMatch) {
            const token = createSupabaseToken({
              id: dbProfile.id,
              _id: dbProfile.id,
              auth_user_id: dbProfile.auth_user_id || dbProfile.id,
              name: dbProfile.name,
              email: dbProfile.email,
              role: dbProfile.role,
              phone: dbProfile.phone,
              district: dbProfile.district,
              state: dbProfile.state
            });

            return res.status(200).json({
              success: true,
              token,
              user: {
                id: dbProfile.id,
                _id: dbProfile.id,
                auth_user_id: dbProfile.auth_user_id || dbProfile.id,
                name: dbProfile.name,
                email: dbProfile.email,
                role: dbProfile.role,
                phone: dbProfile.phone,
                district: dbProfile.district,
                state: dbProfile.state,
                village: dbProfile.village || '',
                block: dbProfile.block || '',
                registrationNo: dbProfile.registration_no || '',
                department: dbProfile.department || '',
                preferredLanguage: dbProfile.preferred_language || 'hi'
              }
            });
          }
        }
      } catch (profAuthErr) {
        console.warn('[Supabase Auth] Direct profile verification notice:', profAuthErr.message);
      }
    }

    // 2. Check Static / Seed Persona Accounts (Farmer, Vet, Officer, Admin)
    const demoAccount = DEMO_CREDENTIALS[cleanEmail];
    if (demoAccount && password === demoAccount.password) {
      const mockUser = MOCK_PROFILES[cleanEmail] || {
        id: '00000000-0000-0000-0000-000000000001',
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: demoAccount.role,
        phone: '+919822011223',
        district: 'Pune',
        state: 'Maharashtra'
      };

      const token = createSupabaseToken(mockUser);

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: mockUser.id,
          _id: mockUser.id,
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

    // 3. Fallback: Authenticate against MongoDB User collection
    let user = null;
    try {
      user = await User.findOne({
        $or: [
          { email: cleanEmail },
          { phone: loginKey }
        ]
      });
    } catch (e) {}

    if (user) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'पासवर्ड गलत है। कृपया पुनः प्रयास करें (Invalid password).'
        });
      }

      // Generate Supabase token for authenticated user
      const token = createSupabaseToken({
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        district: user.district,
        state: user.state
      });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          state: user.state,
          village: user.village,
          block: user.block,
          district: user.district,
          registrationNo: user.registrationNo,
          department: user.department,
          preferredLanguage: user.preferredLanguage
        }
      });
    }

    // User not found
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
