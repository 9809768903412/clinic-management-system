const app = require('./app');
const connectDatabase = require('./config/database');
const User = require('./models/User');

function createVercelHandler(ensureReady = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET is not configured.');
  await connectDatabase(process.env.MONGO_URI || process.env.MONGODB_URI);
  await User.init();
}, application = app) {
  return async (req, res) => {
    try {
      await ensureReady();
      return application(req, res);
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({ message: 'Service unavailable. Check the server database and authentication configuration.' });
    }
  };
}
module.exports = createVercelHandler;
