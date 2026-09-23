const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('No token provided');
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    err.message = 'Invalid or expired token';
    err.statusCode = 401;
    next(err);
  }
}

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const err = new Error('You do not have permission to perform this action');
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
}

module.exports = { protect, restrictTo };
