const BotStatus = require("../models/BotStatus");

class BotStatusService {
  static io = null;

  // Set Socket.IO instance for real-time updates
  static setSocketIO(socketIO) {
    this.io = socketIO;
  }

  // Emit bot status update to connected clients
  static emitStatusUpdate(userId, status) {
    if (this.io) {
      this.io.to(`user-${userId}`).emit("bot-status-update", status);
      console.log(`📡 Emitted bot status update for user: ${userId}`);
    }
  }

  // Start bot and update status
  static async startBot(userId = "default") {
    try {
      const status = await BotStatus.setActive(userId);
      console.log(
        `✅ Bot status updated - Active: ${status.isActive} for user: ${userId}`,
      );

      // Emit real-time update
      this.emitStatusUpdate(userId, {
        userId: status.userId,
        isActive: status.isActive,
        status: status.status,
        lastStartTime: status.lastStartTime,
        lastStopTime: status.lastStopTime,
        currentTask: status.currentTask,
        connectionsToday: status.connectionsToday,
        totalConnections: status.totalConnections,
        errorMessage: status.errorMessage,
      });

      return status;
    } catch (error) {
      console.error("❌ Error starting bot status:", error);
      throw error;
    }
  }

  // Stop bot and update status
  static async stopBot(userId = "default", errorMessage = null) {
    try {
      const status = await BotStatus.setInactive(userId, errorMessage);
      console.log(
        `🛑 Bot status updated - Active: ${status.isActive} for user: ${userId}`,
      );

      // Emit real-time update
      this.emitStatusUpdate(userId, {
        userId: status.userId,
        isActive: status.isActive,
        status: status.status,
        lastStartTime: status.lastStartTime,
        lastStopTime: status.lastStopTime,
        currentTask: status.currentTask,
        connectionsToday: status.connectionsToday,
        totalConnections: status.totalConnections,
        errorMessage: status.errorMessage,
      });

      return status;
    } catch (error) {
      console.error("❌ Error stopping bot status:", error);
      throw error;
    }
  }

  // Update connection counts
  static async updateConnections(userId = "default", todayCount, totalCount) {
    try {
      const status = await BotStatus.updateConnections(
        userId,
        todayCount,
        totalCount,
      );
      console.log(
        `📊 Connection counts updated for user: ${userId} - Today: ${todayCount}, Total: ${totalCount}`,
      );

      // Emit real-time update
      this.emitStatusUpdate(userId, {
        userId: status.userId,
        isActive: status.isActive,
        status: status.status,
        lastStartTime: status.lastStartTime,
        lastStopTime: status.lastStopTime,
        currentTask: status.currentTask,
        connectionsToday: status.connectionsToday,
        totalConnections: status.totalConnections,
        errorMessage: status.errorMessage,
      });

      return status;
    } catch (error) {
      console.error("❌ Error updating connections:", error);
      throw error;
    }
  }

  // Update current task
  static async updateCurrentTask(userId = "default", task) {
    try {
      const status = await BotStatus.updateTask(userId, task);
      console.log(
        `📋 Current task updated for user: ${userId} - Task: ${task}`,
      );

      // Emit real-time update
      this.emitStatusUpdate(userId, {
        userId: status.userId,
        isActive: status.isActive,
        status: status.status,
        lastStartTime: status.lastStartTime,
        lastStopTime: status.lastStopTime,
        currentTask: status.currentTask,
        connectionsToday: status.connectionsToday,
        totalConnections: status.totalConnections,
        errorMessage: status.errorMessage,
      });

      return status;
    } catch (error) {
      console.error("❌ Error updating task:", error);
      throw error;
    }
  }

  // Get bot status
  static async getBotStatus(userId = "default") {
    try {
      const status = await BotStatus.getStatus(userId);
      return {
        success: true,
        data: {
          userId: status.userId,
          isActive: status.isActive,
          status: status.status,
          lastStartTime: status.lastStartTime,
          lastStopTime: status.lastStopTime,
          currentTask: status.currentTask,
          connectionsToday: status.connectionsToday,
          totalConnections: status.totalConnections,
          errorMessage: status.errorMessage,
          uptime:
            status.isActive && status.lastStartTime
              ? Math.floor(
                  (Date.now() - new Date(status.lastStartTime).getTime()) /
                    1000,
                )
              : 0,
        },
      };
    } catch (error) {
      console.error("❌ Error getting bot status:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Set bot to pause status
  static async pauseBot(userId = "default") {
    try {
      const status = await BotStatus.findOneAndUpdate(
        { userId },
        { status: "paused" },
        { upsert: true, new: true },
      );
      console.log(`⏸️ Bot paused for user: ${userId}`);
      return status;
    } catch (error) {
      console.error("❌ Error pausing bot:", error);
      throw error;
    }
  }

  // Resume bot from pause
  static async resumeBot(userId = "default") {
    try {
      const status = await BotStatus.findOneAndUpdate(
        { userId },
        { status: "running" },
        { upsert: true, new: true },
      );
      console.log(`▶️ Bot resumed for user: ${userId}`);
      return status;
    } catch (error) {
      console.error("❌ Error resuming bot:", error);
      throw error;
    }
  }

  // Get all bot statuses (for multiple users)
  static async getAllBotStatuses() {
    try {
      const statuses = await BotStatus.find({});
      return {
        success: true,
        data: statuses,
      };
    } catch (error) {
      console.error("❌ Error getting all bot statuses:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = BotStatusService;
