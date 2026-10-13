const jwt = require('jsonwebtoken');
const User = require('../models/User');

function createRequireAuth(users = User) {
  return async function requireAuth(req, res, next) {
    if (!process.env.JWT_SECRET) return res.status(503).json({ message: 'Authentication is not configured.' });
    const token = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('access_token='))?.slice('access_token='.length);
    if (!token) return res.status(401).json({ message: 'Please log in.' });
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
    catch { return res.status(401).json({ message: 'Your session has expired. Please log in again.' }); }
    if (typeof payload.sub !== 'string' || !/^[a-f0-9]{24}$/i.test(payload.sub)) return res.status(401).json({ message: 'Invalid session.' });
    try {
      const user = await users.findById(payload.sub);
      if (!user || user.active === false || (user.authVersion || 0) !== payload.version) return res.status(401).json({ message: 'Please log in again.' });
      req.user = user;
      res.set('Cache-Control', 'no-store');
      return next();
    } catch (error) { return next(error); }
  };
}
module.exports = createRequireAuth;
