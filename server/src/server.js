const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const connectDatabase = require('./config/database');
const app = require('./app');
const User = require('./models/User');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set a random JWT_SECRET with at least 32 characters.');
  await connectDatabase(process.env.MONGO_URI || process.env.MONGODB_URI);
  await Promise.all([User.init(), require('./models/Patient').init(), require('./models/Appointment').init(), require('./models/Consultation').init()]);
  console.log('Connected to MongoDB.');
  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
}

start().catch(() => {
  console.error('Startup failed. Check MongoDB availability, MONGO_URI, JWT_SECRET (32+ characters), and network access.');
  process.exitCode = 1;
});
