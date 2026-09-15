const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifySupabaseToken, getProfileByAuthUser } = require('../config/supabaseClient');

/**
 * Creates a normalized user object compatible with both MongoDB Mongoose queries
 * and PostgreSQL / Supabase operations.
 */
function createCompatibleUserObject(profile, mongoUser = null) {
  const userIdStr = String(mongoUser ? mongoUser._id : (profile._id || profile.id));

  // Safe wrapper for ObjectId.equals compatibility
  const idWrapper = mongoUser ? mongoUser._id : {
    toString: () => userIdStr,
    valueOf: () => userIdStr,
    equals: (other) => {
      if (!other) return false;
      const otherStr = typeof other === 'object' && other.toString ? other.toString() : String(other);
      return otherStr === userIdStr;
    }
  };

  return {
    _id: idWrapper,
    id: userIdStr,
    auth_user_id: profile.auth_user_id || userIdStr,
    name: profile.name || (mongoUser ? mongoUser.name : 'User'),
    email: (profile.email || (mongoUser ? mongoUser.email : '')).toLowerCase(),
    phone: profile.phone || (mongoUser ? mongoUser.phone : ''),
    role: profile.role || (mongoUser ? mongoUser.role : 'farmer'),
    district: profile.district || (mongoUser ? mongoUser.district : 'Pune'),
    state: profile.state || (mongoUser ? mongoUser.state : 'Maharashtra'),
    village: profile.village || (mongoUser ? mongoUser.village : ''),
    block: profile.block || (mongoUser ? mongoUser.block : ''),
    location: profile.location || (mongoUser ? mongoUser.location : { lat: 0, lng: 0 }),
    preferredLanguage: profile.preferredLanguage || (mongoUser ? mongoUser.preferredLanguage : 'hi'),
    registrationNo: profile.registrationNo || (mongoUser ? mongoUser.registrationNo : ''),
    department: profile.department || (mongoUser ? mongoUser.department : '')
  };
}

const protect = async (req, res, next) => {
  let token;

  console.log('[AUTH DEBUG]', {
    method: req.method,
    path: req.originalUrl,
    hasAuthorization: Boolean(req.headers.authorization),
    authorizationPrefix: req.headers.authorization
      ? req.headers.authorization.substring(0, 20)
      : null
  });

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. No token provided.'
    });
  }

  // 1. First priority: Supabase Auth Token verification
  try {
    const { user: supabaseUser, error } = await verifySupabaseToken(token);
    if (supabaseUser && !error) {
      const profile = await getProfileByAuthUser(supabaseUser);

      // Check if matching MongoDB user exists to attach Mongoose instance if active
      let mongoUser = null;
      try {
        if (profile && profile.email) {
          mongoUser = await User.findOne({ email: profile.email.toLowerCase() }).select('-passwordHash');
        }
      } catch (dbErr) {
        // Mongoose may be offline or in transition, continue with profile
      }

      req.user = createCompatibleUserObject(profile || supabaseUser, mongoUser);
      req.supabaseUser = supabaseUser;
      return next();
    }
  } catch (supabaseErr) {
    // Continue to legacy fallback
  }

  // 2. Backward-Compatible Fallback: Legacy MongoDB JWT verification
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure');
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

// Optional authentication (allows unauthenticated users while populating req.user if token is present)
const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  // Try Supabase Auth first
  try {
    const { user: supabaseUser, error } = await verifySupabaseToken(token);
    if (supabaseUser && !error) {
      const profile = await getProfileByAuthUser(supabaseUser);
      let mongoUser = null;
      try {
        if (profile && profile.email) {
          mongoUser = await User.findOne({ email: profile.email.toLowerCase() }).select('-passwordHash');
        }
      } catch (e) { }

      req.user = createCompatibleUserObject(profile || supabaseUser, mongoUser);
      req.supabaseUser = supabaseUser;
      return next();
    }
  } catch (e) { }

  // Fallback to legacy JWT
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure');
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (user) {
      req.user = user;
    }
    return next();
  } catch (err) {
    // If token is invalid, continue as unauthenticated
    return next();
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access this resource.'
      });
    }

    const userRole = req.user.role;

    // Support role synonyms: veterinarian <-> field_worker
    const matchesRole = roles.includes(userRole) ||
      (userRole === 'veterinarian' && roles.includes('field_worker')) ||
      (userRole === 'field_worker' && roles.includes('veterinarian')) ||
      (userRole === 'admin'); // Admin always has authorized override

    if (!matchesRole) {
      return res.status(403).json({
        success: false,
        message: `User role '${userRole}' is not authorized to perform this action.`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  optionalProtect,
  authorize
};
