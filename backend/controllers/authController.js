const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
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

    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        { phone: cleanPhone }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'इस मोबाइल नंबर या ईमेल से पहले से खाता मौजूद है (A user with this phone or email already exists).'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
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

    const token = generateToken(user._id);

    res.status(201).json({
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
        location: user.location,
        registrationNo: user.registrationNo,
        department: user.department,
        preferredLanguage: user.preferredLanguage
      }
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

    // Match either email or phone number
    const user = await User.findOne({
      $or: [
        { email: loginKey.toLowerCase() },
        { phone: loginKey }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'उपयोगकर्ता नहीं मिला। कृपया सही मोबाइल नंबर या ईमेल दर्ज करें (User not found).'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'पासवर्ड गलत है। कृपया पुनः प्रयास करें (Invalid password).'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
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
