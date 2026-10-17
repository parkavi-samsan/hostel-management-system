const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify token - checks if user is logged in, and that the account is still active
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, access denied' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    // Use the live role from the database so role changes and deactivation apply immediately
    const user = await User.findById(decoded.id).select('role isActive');
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });
    if (!user.isActive) return res.status(403).json({ message: 'Your account has been deactivated. Contact admin.' });

    req.user = { id: String(user._id), role: user.role };
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Restrict to specific roles - use after protect
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for your role' });
    }
    next();
  };
};

module.exports = { protect, authorize };
