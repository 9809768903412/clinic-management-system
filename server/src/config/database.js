const mongoose = require('mongoose');

async function connectDatabase(uri) {
  if (!uri) throw new Error('Set MONGO_URI in server/.env.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

module.exports = connectDatabase;
