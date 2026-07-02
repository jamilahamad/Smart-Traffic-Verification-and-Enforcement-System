const app = require("./app");
const env = require("./config/env");
const connectDatabase = require("./config/database");

const startServer = async () => {
  try {
    await connectDatabase();

    const PORT = env.industrialPort || 5001;

    app.listen(PORT, () => {
      console.log(` STVES Industrial Backend running on port ${PORT}`);
      console.log(` Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(" Failed to start STVES Industrial Backend");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();