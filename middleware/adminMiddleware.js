/**
 * Admin Middleware (Password Guard)
 * Reads X-Admin-Password header and compares to ADMIN_PASSWORD in .env.
 * Admin does NOT use OTP — simple password-based access.
 */
const adminProtect = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'];

  if (!adminPassword) {
    const err = new Error('Admin password is required (X-Admin-Password header)');
    err.statusCode = 401;
    return next(err);
  }

  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    const err = new Error('Invalid admin password');
    err.statusCode = 403;
    return next(err);
  }

  next();
};

module.exports = { adminProtect };

