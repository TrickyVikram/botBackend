/**
 * LICENSE MANAGEMENT ROUTES
 *
 * License verification, upgrades, and management
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const UserLicense = require("../models/UserLicense");

const router = express.Router();

// Get current license info
router.get("/info", async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        licenseKey: user.licenseKey,
        licenseType: user.licenseType,
        isValid: user.isLicenseValid(),
        isExpired: user.isLicenseExpired(),
        daysRemaining: user.getDaysRemaining(),
        activatedAt: user.activatedAt,
        expiresAt: user.expiresAt,
        permissions: user.permissions,
        totalUsage: user.totalUsage,
        billing: user.billing,
      },
    });
  } catch (error) {
    console.error("❌ Get license info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get license information",
    });
  }
});

// Upgrade license
router.post(
  "/upgrade",
  [
    body("licenseType")
      .isIn(["basic", "premium", "enterprise"])
      .withMessage("Invalid license type"),
    body("durationDays")
      .optional()
      .isInt({ min: 30, max: 1095 })
      .withMessage("Duration must be 30-1095 days"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { licenseType, durationDays = 365 } = req.body;
      const user = req.user;

      // In real implementation, this would integrate with payment processing
      // For now, we'll simulate an upgrade

      const upgradedUser = await UserLicense.upgradeLicense(
        user.userId,
        licenseType,
        durationDays,
      );

      if (!upgradedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: `License upgraded to ${licenseType} successfully`,
        data: {
          licenseType: upgradedUser.licenseType,
          expiresAt: upgradedUser.expiresAt,
          permissions: upgradedUser.permissions,
          daysRemaining: upgradedUser.getDaysRemaining(),
        },
      });
    } catch (error) {
      console.error("❌ License upgrade error:", error);
      res.status(500).json({
        success: false,
        message: "License upgrade failed",
      });
    }
  },
);

// Extend license
router.post(
  "/extend",
  [body("days").isInt({ min: 1, max: 365 }).withMessage("Days must be 1-365")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { days } = req.body;
      const user = req.user;

      // Extend expiry date
      const newExpiryDate = new Date(user.expiresAt);
      newExpiryDate.setDate(newExpiryDate.getDate() + days);

      user.expiresAt = newExpiryDate;
      await user.save();

      res.json({
        success: true,
        message: `License extended by ${days} days`,
        data: {
          expiresAt: user.expiresAt,
          daysRemaining: user.getDaysRemaining(),
        },
      });
    } catch (error) {
      console.error("❌ License extension error:", error);
      res.status(500).json({
        success: false,
        message: "License extension failed",
      });
    }
  },
);

// Get usage statistics
router.get("/usage", async (req, res) => {
  try {
    const user = req.user;

    // Calculate usage percentages
    const usagePercentages = {
      connections:
        (user.totalUsage.connectionsUsed /
          user.permissions.maxDailyConnections) *
        100,
      messages:
        (user.totalUsage.messagesUsed / user.permissions.maxDailyMessages) *
        100,
    };

    res.json({
      success: true,
      data: {
        totalUsage: user.totalUsage,
        permissions: user.permissions,
        usagePercentages,
        remainingQuota: {
          connections: Math.max(
            0,
            user.permissions.maxDailyConnections -
              user.totalUsage.connectionsUsed,
          ),
          messages: Math.max(
            0,
            user.permissions.maxDailyMessages - user.totalUsage.messagesUsed,
          ),
        },
      },
    });
  } catch (error) {
    console.error("❌ Get usage error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get usage statistics",
    });
  }
});

// Reset daily usage (admin function or for testing)
router.post("/reset-usage", async (req, res) => {
  try {
    const user = req.user;

    // Only allow for premium/enterprise users
    if (!["premium", "enterprise"].includes(user.licenseType)) {
      return res.status(403).json({
        success: false,
        message: "Usage reset requires premium or enterprise license",
      });
    }

    user.totalUsage = {
      connectionsUsed: 0,
      messagesUsed: 0,
      searchesPerformed: 0,
      totalSessions: user.totalUsage.totalSessions, // Keep total sessions
    };

    await user.save();

    res.json({
      success: true,
      message: "Daily usage reset successfully",
      data: {
        totalUsage: user.totalUsage,
      },
    });
  } catch (error) {
    console.error("❌ Reset usage error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset usage",
    });
  }
});

// Check action permission
router.post(
  "/check-permission",
  [body("action").notEmpty().withMessage("Action required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { action } = req.body;
      const user = req.user;

      const canPerform = user.canPerformAction(action);

      res.json({
        success: true,
        data: {
          action,
          canPerform,
          licenseType: user.licenseType,
          permissions: user.permissions,
          usage: user.totalUsage,
        },
      });
    } catch (error) {
      console.error("❌ Check permission error:", error);
      res.status(500).json({
        success: false,
        message: "Permission check failed",
      });
    }
  },
);

module.exports = router;
