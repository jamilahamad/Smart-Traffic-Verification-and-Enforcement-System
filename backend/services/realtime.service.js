const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const User = require("../models/User");

let ioInstance = null;

const allowedOrigins = [
  env.clientUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth?.token;

  if (authToken) {
    return authToken;
  }

  const headerToken = socket.handshake.headers?.authorization || "";

  if (headerToken.startsWith("Bearer ")) {
    return headerToken.slice(7);
  }

  return "";
};

const getUserRoom = (userId) => {
  return `user:${String(userId)}`;
};

const toPlainObject = (value) => {
  if (!value) {
    return value;
  }

  if (typeof value.toObject === "function") {
    return value.toObject();
  }

  return value;
};

const initRealtime = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = getTokenFromSocket(socket);

      if (!token) {
        return next(new Error("Authentication token missing."));
      }

      const decoded = jwt.verify(token, env.jwtSecret);
      const userId = decoded.id || decoded._id || decoded.userId;

      if (!userId) {
        return next(new Error("Invalid token payload."));
      }

      const user = await User.findById(userId).select(
        "_id name email role status adminLevel"
      );

      if (!user || user.status !== "active") {
        return next(new Error("User account is not active."));
      }

      socket.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        adminLevel: user.adminLevel,
      };

      return next();
    } catch (error) {
      return next(new Error("Socket authentication failed."));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user?._id;

    if (userId) {
      socket.join(getUserRoom(userId));

      socket.emit("notifications:connected", {
        userId,
        connected: true,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return ioInstance;
};

const getRealtime = () => {
  return ioInstance;
};

const emitToUser = (userId, eventName, payload = {}) => {
  if (!ioInstance || !userId || !eventName) {
    return;
  }

  ioInstance.to(getUserRoom(userId)).emit(eventName, payload);
};

const emitNotificationToUser = (notification) => {
  const cleanNotification = toPlainObject(notification);

  if (!cleanNotification?.recipient) {
    return;
  }

  emitToUser(cleanNotification.recipient, "notification:new", {
    notification: cleanNotification,
  });
};

const emitNotificationUpdatedToUser = (notification) => {
  const cleanNotification = toPlainObject(notification);

  if (!cleanNotification?.recipient) {
    return;
  }

  emitToUser(cleanNotification.recipient, "notification:updated", {
    notification: cleanNotification,
  });
};

const emitNotificationsReadAllToUser = (userId) => {
  emitToUser(userId, "notifications:read-all", {
    readAt: new Date().toISOString(),
  });
};

module.exports = {
  initRealtime,
  getRealtime,
  emitToUser,
  emitNotificationToUser,
  emitNotificationUpdatedToUser,
  emitNotificationsReadAllToUser,
};