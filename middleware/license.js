/**
 * LICENSE VERIFICATION MIDDLEWARE
 *
 * Validates user license and permissions
 */

const UserLicense = require("../models/UserLicense");

const licenseMiddleware = async (req, res, next) => {
  try {
    // User should be available from auth middleware
    const userId = req.user.userId || req.user._id;

    // Get user license - use the user object directly if available
    let userLicense = req.user;

    // If not available in req.user, fetch from database
    if (!userLicense.licenseKey) {
      userLicense = await UserLicense.findOne({
        $or: [{ userId: userId }, { _id: req.user._id }],
      });
    }

    if (!userLicense) {
      return res.status(403).json({
        success: false,
        message: "No license found for user",
      });
    }

    // Check if license is active
    if (!userLicense.isActive) {
      return res.status(403).json({
        success: false,
        message: "License is inactive",
      });
    }

    // Check if license is expired
    if (userLicense.isLicenseExpired && userLicense.isLicenseExpired()) {
      return res.status(403).json({
        success: false,
        message: "License has expired",
        expiredAt: userLicense.expiresAt,
      });
    }

    // Check daily limits for bot operations
    if (req.path.includes("/bot/start") || req.path.includes("/bot/")) {
      const canPerformAction =
        await userLicense.canPerformAction("bot_control");

      if (!canPerformAction) {
        return res.status(403).json({
          success: false,
          message: "Daily bot control limit exceeded",
          usage: userLicense.dailyUsage,
        });
      }
    }

    // Check feature permissions
    const requiredPermission = getRequiredPermission(req.path, req.method);
    if (requiredPermission && !userLicense.hasPermission(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${requiredPermission} required`,
        userLicenseType: userLicense.licenseType,
      });
    }

    // Add license info to request for use in routes
    req.userLicense = userLicense;

    next();
  } catch (error) {
    console.error("License middleware error:", error);
    res.status(500).json({
      success: false,
      message: "License verification failed",
    });
  }
};

// Helper function to determine required permission based on route
function getRequiredPermission(path, method) {
  // Bot control routes
  if (path.includes("/bot/")) {
    return "bot_control";
  }

  // Settings routes
  if (path.includes("/settings/")) {
    return "manage_settings";
  }

  // Analytics routes
  if (path.includes("/analytics/")) {
    return "view_analytics";
  }

  // Default - no special permission required
  return null;
}

module.exports = licenseMiddleware;
