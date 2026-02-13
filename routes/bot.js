/**
 * BOT ROUTES
 *
 * LinkedIn bot automation and control endpoints
 */

const express = require("express");
const router = express.Router();

// Basic bot status endpoint
router.get("/status", async (req, res) => {
  try {
    const botService = req.botService;
    if (!botService) {
      return res.status(500).json({
        success: false,
        message: "Bot service not initialized",
      });
    }

    // Ensure user is authenticated and get userId
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const status = await botService.getBotStatus(userId);

    res.json({
      success: true,
      message: "Bot service is running",
      data: status,
    });
  } catch (error) {
    console.error("❌ Bot status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get bot status",
      error: error.message,
    });
  }
});

// Start bot automation
router.post("/start", async (req, res) => {
  try {
    const botService = req.botService;
    if (!botService) {
      return res.status(500).json({
        success: false,
        message: "Bot service not initialized",
      });
    }

    // Ensure user is authenticated and get userId
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const userSettings = req.body || {};

    console.log(`🚀 Starting bot for authenticated user: ${userId}`);
    
    // Check if user can perform bot control action
    if (!req.user.canPerformAction || !req.user.canPerformAction('bot_control')) {
      return res.status(403).json({
        success: false,
        message: "Permission denied: Bot control requires valid license",
      });
    }
    
    const result = await botService.startBot(userId, userSettings);

    res.json({
      success: true,
      message: "Bot automation started successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Bot start error:", error);
    res.status(400).json({
      success: false,
      message: "Failed to start bot",
      error: error.message,
    });
  }
});

// Stop bot automation
router.post("/stop", async (req, res) => {
  try {
    const botService = req.botService;
    if (!botService) {
      return res.status(500).json({
        success: false,
        message: "Bot service not initialized",
      });
    }

    // Ensure user is authenticated and get userId
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    console.log(`🛑 Stopping bot for authenticated user: ${userId}`);
    
    // Check if user can perform bot control action
    if (!req.user.canPerformAction || !req.user.canPerformAction('bot_control')) {
      return res.status(403).json({
        success: false,
        message: "Permission denied: Bot control requires valid license",
      });
    }
    
    const result = await botService.stopBot(userId);

    res.json({
      success: true,
      message: "Bot automation stopped successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Bot stop error:", error);
    res.status(400).json({
      success: false,
      message: "Failed to stop bot",
      error: error.message,
    });
  }
});

// Emergency stop
router.post("/emergency-stop", async (req, res) => {
  try {
    const botService = req.botService;
    if (!botService) {
      return res.status(500).json({
        success: false,
        message: "Bot service not initialized",
      });
    }

    // Ensure user is authenticated and get userId
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    console.log(`🚨 Emergency stop for authenticated user: ${userId}`);
    
    // Emergency stop doesn't check permissions - safety first
    const result = await botService.stopBot(userId);

    res.json({
      success: true,
      message: "Bot emergency stopped successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Bot emergency stop error:", error);
    res.status(400).json({
      success: false,
      message: "Failed to emergency stop bot",
      error: error.message,
    });
  }
});

// Get bot configuration
router.get("/config", (req, res) => {
  res.json({
    success: true,
    message: "Bot configuration retrieved",
    data: {},
  });
});

module.exports = router;
