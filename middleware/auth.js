// ─── Auth Middleware ──────────────────────────────
// Checks if user is logged in
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  if (req.headers['content-type'] === 'application/json' || req.xhr) {
    return res.status(401).json({ success: false, message: 'Please login first' });
  }
  return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

// Checks if user is admin
function requireAdmin(req, res, next) {
  if (!req.session.user) {
    if (req.headers['content-type'] === 'application/json' || req.xhr) {
      return res.status(401).json({ success: false, message: 'Please login first' });
    }
    return res.redirect('/login?redirect=/admin');
  }
  if (req.session.user.role !== 'admin') {
    if (req.headers['content-type'] === 'application/json' || req.xhr) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    return res.status(403).render('403', { message: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
