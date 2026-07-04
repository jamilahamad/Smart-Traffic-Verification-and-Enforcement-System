const mongoose = require("mongoose");
const env = require("./env");

mongoose.set("strictQuery", true);

let cachedConnectionPromise = null;

const connectDatabase = async () => {
  if (!env.mongoUri) {
    throw new Error(
      "MongoDB URI missing. Add MONGODB_URI in environment variables."
    );
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  cachedConnectionPromise = mongoose
    .connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    })
    .then((connection) => {
      console.log(`MongoDB Connected: ${connection.connection.host}`);
      return connection.connection;
    })
    .catch((error) => {
      cachedConnectionPromise = null;
      console.error("MongoDB connection failed:", error.message);
      throw error;
    });

  return cachedConnectionPromise;
};

module.exports = connectDatabase;