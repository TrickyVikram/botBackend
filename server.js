/**
 * LINKEDIN BOT DASHBOARD API SERVER
 *
 * Complete backend API with license verification and database integration
 */

require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const path = require("path");
const cron = require("node-cron");

// Import database connection
const DatabaseConnection = require("./models/database-connection");

// Import routes
const authRoutes = require("./routes/auth");
const botRoutes = require("./routes/bot");
const licenseRoutes = require("./routes/license");
const settingsRoutes = require("./routes/settings");
const analyticsRoutes = require("./routes/analytics");
const botStatusRoutes = require("./routes/bot-status");
const followupRoutes = require("./routes/followup");
const postsRoutes = require("./routes/posts");
const messagesRoutes = require("./routes/messages");

// Import middleware
const authMiddleware = require("./middleware/auth");
const licenseMiddleware = require("./middleware/license");

// Import services
const BotService = require("./services/BotService");
const LicenseService = require("./services/LicenseService");
const BotStatusService = require("./services/BotStatusService");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5002;

// Initialize services as global variables
let botService;
let licenseService;

const allowedOrigins = [
  "https://botforntend.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 5000,
  allowEIO3: true,
});

// Set Socket.IO instance for real-time updates
BotStatusService.setSocketIO(io);

// Security middleware with live dashboard support
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "ws://localhost:*",
          "wss://localhost:*",
          "http://localhost:*",
          "https://localhost:*",
          "ws://*",
          "wss://*",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(compression());

// Enhanced CORS - Allow All Origins
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-User-ID",
      "X-User-Name",
      "X-User-Email",
      "X-User-Fingerprint",
      "X-User-Browser",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["X-Total-Count", "X-Auth-Token"],
  }),
);

// Rate limiting - INCREASED LIMITS FOR TESTING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for testing)
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api/", limiter);

// Strict rate limiting for authentication - INCREASED FOR TESTING
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 auth requests per windowMs (increased for testing)
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});
app.use("/api/auth/", authLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Database connection
let dbConnection;

async function connectToDatabase() {
  try {
    dbConnection = new DatabaseConnection();
    await dbConnection.connect();
    console.log("✅ Connected to MongoDB database");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

// Initialize services
async function initializeServices() {
  try {
    // Set Socket.IO in app for routes to access
    app.set("io", io);

    botService = new BotService(io);
    licenseService = new LicenseService();

    console.log("✅ Services initialized successfully");
  } catch (error) {
    console.error("❌ Service initialization failed:", error);
    process.exit(1);
  }
}

// Global middleware to attach services to request object
app.use((req, res, next) => {
  req.botService = botService;
  req.licenseService = licenseService;
  next();
});

// Routes
app.get("/api/health", (req, res) => {
  const healthInfo = {
    success: true,
    message: "LinkedIn Bot Dashboard API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    port: PORT,
    services: {
      database: !!dbConnection,
      botService: !!botService,
      licenseService: !!licenseService,
      socketIO: !!io,
    },
    socketClients: io.engine.clientsCount || 0,
  };

  res.json(healthInfo);
});

// WebSocket health check
app.get("/api/ws/health", (req, res) => {
  res.json({
    success: true,
    message: "WebSocket server is ready",
    clients: io.engine.clientsCount || 0,
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to check current bot status
app.get("/api/debug/bot-status", async (req, res) => {
  try {
    const userId = req.query.userId || "8f5393b72af06c99bfaf884516e5829d";
    const currentStatus = await botService.getBotStatus(userId);

    res.json({
      success: true,
      message: "Debug bot status",
      data: {
        userId,
        currentStatus,
        socketConnected: !!io,
        socketClients: io ? io.engine.clientsCount : 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message,
    });
  }
});

// Handle preflight requests for all routes
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS,PATCH",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,X-Requested-With,X-User-ID,X-User-Name,X-User-Email,X-User-Fingerprint,X-User-Browser,Accept,Origin",
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

// Public debug routes - no authentication required
app.get("/api/debug/bot-status", async (req, res) => {
  try {
    const testUserId = "8f5393b72af06c99bfaf884516e5829d"; // Using the actual user ID from your database
    const status = await botService.getBotStatus(testUserId);

    res.json({
      success: true,
      message: "Debug bot status retrieved",
      userId: testUserId,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get debug bot status",
      error: error.message,
    });
  }
});

// Public routes - simplified for testing
app.use("/api/auth", authRoutes);
app.use("/api/bot", authMiddleware, licenseMiddleware, botRoutes);
app.use("/api/bot-status", authMiddleware, botStatusRoutes);
app.use("/api/license", authMiddleware, licenseMiddleware, licenseRoutes);
app.use("/api/settings", settingsRoutes); // Removed auth and license middleware for testing
app.use("/api/analytics", authMiddleware, analyticsRoutes);
app.use("/api/followup", followupRoutes); // New follow-up routes
app.use("/api/posts", postsRoutes); // New post management routes
app.use("/api/messages", messagesRoutes); // New message management routes

// Add public analytics endpoint for testing
app.use("/api/public/analytics", analyticsRoutes);

// Serve frontend in production only
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../forntend/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../forntend/build/index.html"));
  });
} else {
  // Development mode - only serve API routes
  console.log("🔧 Development mode - serving API routes only");
}

// Global error handler
app.use((error, req, res, next) => {
  console.error("❌ Global error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Send connection confirmation
  socket.emit("connection-confirmed", {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });

  socket.on("join-dashboard", async (data) => {
    try {
      const { userId, licenseKey } = data;

      // Verify license
      const license = await licenseService.verifyLicense(licenseKey);
      if (!license || license.userId !== userId) {
        socket.emit("license-error", { message: "Invalid license" });
        return;
      }

      socket.join(`user-${userId}`);
      console.log(`✅ User ${userId} joined dashboard room`);

      // Send initial bot status
      const botStatus = await botService.getBotStatus(userId);
      socket.emit("bot-status", botStatus);

      // Confirm successful join
      socket.emit("dashboard-joined", {
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Socket join error:", error);
      socket.emit("error", { message: "Failed to join dashboard" });
    }
  });

  socket.on("ping", () => {
    socket.emit("pong", { timestamp: new Date().toISOString() });
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 User disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Scheduled tasks
cron.schedule("0 0 * * *", async () => {
  console.log("🕐 Running daily cleanup tasks...");
  try {
    // Reset daily usage counters
    await licenseService.resetDailyUsage();

    // Clean up expired sessions
    await botService.cleanupExpiredSessions();

    console.log("✅ Daily cleanup completed");
  } catch (error) {
    console.error("❌ Daily cleanup failed:", error);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📤 Received SIGTERM, shutting down gracefully...");

  if (botService && typeof botService.stopAllBots === "function") {
    await botService.stopAllBots();
  }

  if (dbConnection) {
    await dbConnection.disconnect();
  }

  server.close(() => {
    console.log("✅ Server shut down successfully");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("📤 Received SIGINT, shutting down gracefully...");

  if (botService && botService.activeBots) {
    try {
      // Stop all active bots if the method exists
      if (typeof botService.stopBot === "function") {
        for (const userId of botService.activeBots.keys()) {
          await botService.stopBot(userId);
        }
      }
    } catch (error) {
      console.log("⚠️ Error stopping bots:", error.message);
    }
  }

  if (dbConnection) {
    await dbConnection.disconnect();
  }

  server.close(() => {
    console.log("✅ Server shut down successfully");
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    await connectToDatabase();
    await initializeServices();

    server.listen(PORT, () => {
      console.log(`
🚀 LinkedIn Bot Dashboard API Server Started!
📍 Port: ${PORT}
🌐 Environment: ${process.env.NODE_ENV || "development"}
🔗 Health Check: http://localhost:${PORT}/api/health
📊 Dashboard: ${process.env.FRONTEND_URL || "https://botforntend.onrender.com"}
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, io, server };
