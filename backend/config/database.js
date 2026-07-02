const mongoose = require("mongoose");
const env = require("./env");

const connectDatabase = async () => {
  if (!env.mongoUri) {
    throw new Error(
      "MongoDB URI missing. Add one of: MONGO_URI, MONGODB_URI, MONGO_URL, DATABASE_URL, or DB_URI in backend/.env"
    );
  }

  const connection = await mongoose.connect(env.mongoUri);

  console.log(` MongoDB Connected: ${connection.connection.host}`);

  return connection;
};

module.exports = connectDatabase;