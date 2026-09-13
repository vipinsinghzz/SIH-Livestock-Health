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
            district: district ? district.trim() : 'Pune',
            state: state || 'Maharashtra',
            village: village ? village.trim() : '',
            block: block ? block.trim() : '',
            registrationNo: registrationNo ? registrationNo.trim() : '',
            department: department ? department.trim() : '',
            preferredLanguage: preferredLanguage || 'hi'
          }
        });

        if (authData && authData.user) {
          authUserId = authData.user.id;
        }
      } catch (err) {
        console.warn('[Supabase Auth] User creation notice:', err.message);
      }
    }

    // 3. Register in MongoDB to maintain dual-compatibility during migration
    let mongoUser = null;
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      mongoUser = await User.create({
        name: name.trim(),
        role: role || 'farmer',
        phone: cleanPhone,
        email: cleanEmail,
        passwordHash,
        state: state || 'Maharashtra',
        village: village ? village.trim() : '',
        block: block ? block.trim() : '',
        district: district ? district.trim() : 'Pune',
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

    const effectiveId = authUserId || (mongoUser ? mongoUser._id : '00000000-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0'));

    const userPayload = {
      id: effectiveId,
      _id: effectiveId,
      name: name.trim(),
      email: cleanEmail,
      role: role || 'farmer',
      phone: cleanPhone,
      state: state || 'Maharashtra',
      village: village ? village.trim() : '',
      block: block ? block.trim() : '',
      district: district ? district.trim() : 'Pune',
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

    // 1. First priority: Authenticate via Live Supabase Auth if connected
    if (supabase && cleanEmail.includes('@')) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
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
