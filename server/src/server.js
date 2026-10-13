const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const connectDatabase = require('./config/database');
const app = require('./app');
const User = require('./models/User');

async function start() {
  await connectDatabase(process.env.MONGO_URI);
  await User.init();
  console.log('Connected to MongoDB.');
  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
}

start().catch(() => {
  console.error('Startup failed. Check MongoDB availability, MONGO_URI, and network access.');
  process.exitCode = 1;
});
