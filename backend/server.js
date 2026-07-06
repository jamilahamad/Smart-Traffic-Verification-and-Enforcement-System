const http = require("http");

const app = require("./app");
const env = require("./config/env");
const connectDatabase = require("./config/database");
const { initRealtime } = require("./services/realtime.service");

const startServer = async () => {
  try {
    await connectDatabase();

    const PORT = env.industrialPort || 5001;
    const server = http.createServer(app);

    initRealtime(server);

    server.listen(PORT, () => {
      console.log(` STVES Industrial Backend running on port ${PORT}`);
      console.log(` Health: http://localhost:${PORT}/api/health`);
      console.log(` Realtime: Socket.IO enabled on port ${PORT}`);
    });
  } catch (error) {
    console.error(" Failed to start STVES Industrial Backend");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();