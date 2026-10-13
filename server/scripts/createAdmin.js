const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '../../.env.local'), quiet: true });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const connect = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');

(async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length < 8 || password.length > 128 || !password.trim()) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8–128 characters) in the private server/.env file.');
    await connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    await User.init();
    if (await User.exists({ role: 'admin', active: true })) throw new Error('An administrator already exists. Use its login to manage staff.');
    if (await User.exists({ email })) throw new Error('This email is already registered. Choose a different administrator email.');
    await User.create({ name: 'Clinic Administrator', email, passwordHash: await hashPassword(password), role: 'admin', active: true });
    console.log('Administrator created. Sign in with the email and password you configured.');
  } catch (error) { console.error(error.name === 'Error' ? error.message : 'Administrator setup failed. Check the database connection.'); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
