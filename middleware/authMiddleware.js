const jwt = require('jsonwebtoken');

/**
 * Auth Middleware (Student JWT Guard)
 * Verifies the Bearer JWT token from Authorization header.
 * Attaches decoded student payload to req.student.
 */
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('No token provided. Please login first.');
      err.statusCode = 401;
      return next(err);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.student = decoded; // { id, iat, exp }
    next();
  } catch (error) {
    const err = new Error('Invalid or expired token. Please login again.');
    err.statusCode = 401;
    next(err);
  }
};

module.exports = { protect };
