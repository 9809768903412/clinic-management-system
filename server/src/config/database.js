const mongoose = require('mongoose');
let connectionPromise;

async function connectDatabase(uri) {
  if (!uri) throw new Error('Set MONGO_URI.');
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 5 })
      .catch(error => { connectionPromise = undefined; throw error; });
  }
  await connectionPromise;
  return mongoose.connection;
}
module.exports = connectDatabase;
