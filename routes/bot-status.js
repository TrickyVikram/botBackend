const express = require("express");
const router = express.Router();
const BotStatusService = require("../services/BotStatusService");

// Get bot status
router.get("/status/:userId?", async (req, res) => {
  try {
    // Get authenticated user's ID
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = req.params.userId;
    
    // Use authenticated user's ID, ignore parameter for security
    const userId = authenticatedUserId || requestedUserId || "default";
    
    // Prevent accessing other users' data
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Can only view your own bot status",
      });
    }

    const result = await BotStatusService.getBotStatus(userId);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to get bot status",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error in get bot status route:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Start bot
router.post("/start/:userId?", async (req, res) => {
  try {
    // Get authenticated user's ID
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = req.params.userId;
    
    // Use authenticated user's ID, ignore parameter for security
    const userId = authenticatedUserId || requestedUserId || "default";
    
    // Prevent controlling other users' bots
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Can only control your own bot",
      });
    }

    const status = await BotStatusService.startBot(userId);

    res.json({
      success: true,
      message: "Bot started successfully",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error in start bot route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start bot",
      error: error.message,
    });
  }
});

// Stop bot
router.post("/stop/:userId?", async (req, res) => {
  try {
    // Get authenticated user's ID
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = req.params.userId;
    
    // Use authenticated user's ID, ignore parameter for security
    const userId = authenticatedUserId || requestedUserId || "default";
    
    // Prevent controlling other users' bots
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Can only control your own bot",
      });
    }

    const { errorMessage } = req.body;
    const status = await BotStatusService.stopBot(userId, errorMessage);

    res.json({
      success: true,
      message: "Bot stopped successfully",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error in stop bot route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop bot",
      error: error.message,
    });
  }
});

// Pause bot
router.post("/pause/:userId?", async (req, res) => {
  try {
    // Get authenticated user's ID
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = req.params.userId;
    
    // Use authenticated user's ID, ignore parameter for security
    const userId = authenticatedUserId || requestedUserId || "default";
    
    // Prevent controlling other users' bots
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Can only control your own bot",
      });
    }

    const status = await BotStatusService.pauseBot(userId);

    res.json({
      success: true,
      message: "Bot paused successfully",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error in pause bot route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to pause bot",
      error: error.message,
    });
  }
});

// Resume bot
router.post("/resume/:userId?", async (req, res) => {
  try {
    // Get authenticated user's ID
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = req.params.userId;
    
    // Use authenticated user's ID, ignore parameter for security
    const userId = authenticatedUserId || requestedUserId || "default";
    
    // Prevent controlling other users' bots
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Can only control your own bot",
      });
    }

    const status = await BotStatusService.resumeBot(userId);

    res.json({
      success: true,
      message: "Bot resumed successfully",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error in resume bot route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resume bot",
      error: error.message,
    });
  }
});

// Update connections
router.post("/connections/:userId?", async (req, res) => {
  try {
    // Get authenticated user's ID
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = req.params.userId;
    
    // Use authenticated user's ID, ignore parameter for security
    const userId = authenticatedUserId || requestedUserId || "default";
    
    // Prevent updating other users' data
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Can only update your own bot data",
      });
    }

    const { todayCount, totalCount } = req.body;

    if (typeof todayCount !== "number" || typeof totalCount !== "number") {
      return res.status(400).json({
        success: false,
        message: "todayCount and totalCount must be numbers",
      });
    }

    const status = await BotStatusService.updateConnections(
      userId,
      todayCount,
      totalCount,
    );

    res.json({
      success: true,
      message: "Connection counts updated successfully",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error in update connections route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update connection counts",
      error: error.message,
    });
  }
});

// Update current task
router.post("/task/:userId?", async (req, res) => {
  try {
    // Get authenticated user's ID
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = req.params.userId;
    
    // Use authenticated user's ID, ignore parameter for security
    const userId = authenticatedUserId || requestedUserId || "default";
    
    // Prevent updating other users' data
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Can only update your own bot data",
      });
    }

    const { task } = req.body;

    const status = await BotStatusService.updateCurrentTask(userId, task);

    res.json({
      success: true,
      message: "Current task updated successfully",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error in update task route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
});

// Get all bot statuses (Admin only)
router.get("/all", async (req, res) => {
  try {
    // Check if user is admin or has special permissions
    const user = req.user;
    if (!user || (user.licenseType !== "enterprise" && user.role !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Admin privileges required",
      });
    }

    const result = await BotStatusService.getAllBotStatuses();

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to get all bot statuses",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error in get all bot statuses route:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
