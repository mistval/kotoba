function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({ message: 'Not logged in' });
}

module.exports = checkAuth;
