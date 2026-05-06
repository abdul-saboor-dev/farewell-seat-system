const jwt = require('jsonwebtoken');

/**
 * Auth Middleware — JWT Guard
 *
 * Verifies the Bearer token from the Authorization header.
 * Attaches decoded student payload { id, iat, exp } to req.student.
 *
 * Device validation is handled at login time (not here) — the JWT
 * itself is the proof of authentication once issued.
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
    req.student = decoded;
    next();

  } catch (error) {
    const err = new Error('Invalid or expired token. Please login again.');
    err.statusCode = 401;
    next(err);
  }
};

module.exports = { protect };
