/**
 * BOT SERVICE (SIMPLIFIED)
 *
 * Simple service to manage bot status in database only
 */

const BotStatus = require("../models/BotStatus");

class BotService {
  constructor(io = null) {
    this.io = io;
    this.activeBots = new Map();
    this.botStatuses = new Map();

    console.log(`🤖 BotService initialized (Database Only)`);
  }

  async getBotStatus(userId) {
    try {
      // Validate userId
      if (!userId || userId === "default") {
        throw new Error("Valid userId required for bot operations");
      }

      // Get database status
      const dbStatus = await BotStatus.getBotStatus(userId);

      // Map database status to frontend expected status
      let frontendStatus = "stopped";
      if (dbStatus.botStatus === "enable" && dbStatus.isRunning) {
        frontendStatus = "running";
      } else if (dbStatus.botStatus === "disable" || !dbStatus.isRunning) {
        frontendStatus = "stopped";
      }

      return {
        isRunning: dbStatus.isRunning,
        status: frontendStatus, // Use mapped status for frontend
        processId: null,
        uptime: 0,
        timestamp: new Date(),
        userId: userId, // Include userId for verification
        // Database status
        dbStatus: {
          botStatus: dbStatus.botStatus,
          license: dbStatus.license,
          isRunning: dbStatus.isRunning,
          lastActivity: dbStatus.lastActivity,
          userID: dbStatus.userID,
        },
      };
    } catch (error) {
      console.error("❌ Error getting bot status:", error);
      return {
        isRunning: false,
        status: "error",
        error: error.message,
      };
    }
  }

  async startBot(userId, userSettings = {}) {
    try {
      // Validate userId
      if (!userId || userId === "default") {
        throw new Error("Valid userId required for bot operations");
      }

      console.log(`🚀 Starting bot for user: ${userId}`);

      // Get current bot status from database
      const currentStatus = await BotStatus.getBotStatus(userId);

      if (currentStatus.botStatus === "enable" && currentStatus.isRunning) {
        throw new Error("Bot is already running for this user");
      }

      // Get license from userSettings or use default
      const license = userSettings.license || currentStatus.license || "trial";

      // Enable bot in database with user details
      const updatedStatus = await BotStatus.enableBot(userId, license);

      console.log(`✅ Bot enabled in database for user: ${userId}`);
      console.log(`📊 License: ${license}`);
      console.log(`📊 Status: ${updatedStatus.botStatus}`);

      // Store in memory for quick access
      this.activeBots.set(userId, {
        startTime: Date.now(),
        license: license,
        status: "running",
      });
      this.botStatuses.set(userId, "running");

      // Emit socket event with userId for user-specific updates
      if (this.io) {
        this.io.emit("bot-status", {
          userId,
          status: "running",
          license: license,
          timestamp: new Date(),
        });

        this.io.emit("bot-logs", {
          userId,
          type: "success",
          message: `🚀 Bot started successfully for user ${userId}`,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        message: "Bot started successfully",
        status: "running",
        license: license,
        userID: userId,
        data: updatedStatus,
      };
    } catch (error) {
      console.error(`❌ Failed to start bot for user ${userId}:`, error);
      this.activeBots.delete(userId);
      this.botStatuses.set(userId, "error");
      throw error;
    }
  }

  async stopBot(userId) {
    try {
      // Validate userId
      if (!userId || userId === "default") {
        throw new Error("Valid userId required for bot operations");
      }

      console.log(`🛑 Stopping bot for user: ${userId}`);

      // Get current status from database
      const currentStatus = await BotStatus.getBotStatus(userId);

      if (currentStatus.botStatus === "disable" && !currentStatus.isRunning) {
        throw new Error("No bot running for this user");
      }

      // Disable bot in database
      const updatedStatus = await BotStatus.disableBot(userId);

      console.log(`✅ Bot disabled in database for user: ${userId}`);

      // Remove from memory
      this.activeBots.delete(userId);
      this.botStatuses.set(userId, "stopped");

      // Emit socket event with userId for user-specific updates
      if (this.io) {
        this.io.emit("bot-status", {
          userId,
          status: "stopped",
          timestamp: new Date(),
        });

        this.io.emit("bot-logs", {
          userId,
          type: "info",
          message: `🛑 Bot stopped successfully for user ${userId}`,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        message: "Bot stopped successfully",
        status: "stopped",
        userID: userId,
        data: updatedStatus,
      };
    } catch (error) {
      console.error(`❌ Error stopping bot for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = BotService;
