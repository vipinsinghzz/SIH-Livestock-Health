const mongoose = require('mongoose');

// Disable Mongoose operation buffering so queries fail immediately if MongoDB is not connected
// rather than blocking for 10 seconds waiting for a connection.
mongoose.set('bufferCommands', false);

/**
 * Connect to MongoDB (Optional legacy data store during transition)
 * Supabase PostgreSQL is the primary database.
 * If MongoDB is not configured or unavailable, the backend logs a notice and continues
 * without terminating the process (never calls process.exit).
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('[Database] MONGODB_URI not set. Running in Supabase PostgreSQL primary mode.');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000, // 15s timeout to survive CPU spikes
      connectTimeoutMS: 15000
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] MongoDB connection attempt failed: ${error.message}. Running in resilient offline mode.`);
    return null;
  }
};

module.exports = connectDB;
