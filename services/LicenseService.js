/**
 * LICENSE SERVICE
 *
 * Handles license operations and management
 */

const UserLicense = require("../models/UserLicense");

const cron = require("node-cron");

class LicenseService {
  constructor() {
    this.initializeScheduledTasks();
  }

  /**
   * Verify license by license key
   */
  async verifyLicense(licenseKey) {
    try {
      const license = await UserLicense.findByLicenseKey(licenseKey);

      if (!license) {
        return null;
      }

      return {
        ...license.toObject(),
        isValid: license.isLicenseValid(),
        isExpired: license.isLicenseExpired(),
        daysRemaining: license.getDaysRemaining(),
      };
    } catch (error) {
      console.error("❌ License verification error:", error);
      throw error;
    }
  }

  /**
   * Create a new license
   */
  async createLicense(userData, licenseType = "trial") {
    try {
      let license;

      if (licenseType === "trial") {
        license = await UserLicense.createTrialLicense(userData);
      } else {
        const durationDays = this.getLicenseDuration(licenseType);
        license = await UserLicense.create({
          ...userData,
          licenseType,
          permissions: this.getLicensePermissions(licenseType),
          expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        });
      }

      return license;
    } catch (error) {
      console.error("❌ License creation error:", error);
      throw error;
    }
  }

  /**
   * Upgrade license
   */
  async upgradeLicense(userId, licenseType, durationDays) {
    try {
      const license = await UserLicense.upgradeLicense(
        userId,
        licenseType,
        durationDays,
      );

      if (!license) {
        throw new Error("User not found");
      }

      return {
        ...license.toObject(),
        isValid: license.isLicenseValid(),
        daysRemaining: license.getDaysRemaining(),
      };
    } catch (error) {
      console.error("❌ License upgrade error:", error);
      throw error;
    }
  }

  /**
   * Extend license
   */
  async extendLicense(userId, days) {
    try {
      const user = await UserLicense.findOne({ userId });

      if (!user) {
        throw new Error("User not found");
      }

      const newExpiryDate = new Date(user.expiresAt);
      newExpiryDate.setDate(newExpiryDate.getDate() + days);

      user.expiresAt = newExpiryDate;
      await user.save();

      return {
        ...user.toObject(),
        daysRemaining: user.getDaysRemaining(),
      };
    } catch (error) {
      console.error("❌ License extension error:", error);
      throw error;
    }
  }

  /**
   * Deactivate license
   */
  async deactivateLicense(userId) {
    try {
      const user = await UserLicense.findOneAndUpdate(
        { userId },
        { isActive: false },
        { new: true },
      );

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      console.error("❌ License deactivation error:", error);
      throw error;
    }
  }

  /**
   * Reset daily usage for all users
   */
  async resetDailyUsage() {
    try {
      const result = await UserLicense.updateMany(
        {},
        {
          $set: {
            "totalUsage.connectionsUsed": 0,
            "totalUsage.messagesUsed": 0,
            "totalUsage.searchesPerformed": 0,
          },
        },
      );

      console.log(`✅ Reset daily usage for ${result.modifiedCount} users`);

      return result;
    } catch (error) {
      console.error("❌ Reset daily usage error:", error);
      throw error;
    }
  }

  /**
   * Get expired licenses
   */
  async getExpiredLicenses() {
    try {
      const expiredLicenses = await UserLicense.find({
        expiresAt: { $lt: new Date() },
        isActive: true,
      });

      return expiredLicenses;
    } catch (error) {
      console.error("❌ Get expired licenses error:", error);
      throw error;
    }
  }

  /**
   * Deactivate expired licenses
   */
  async deactivateExpiredLicenses() {
    try {
      const result = await UserLicense.updateMany(
        {
          expiresAt: { $lt: new Date() },
          isActive: true,
        },
        { isActive: false },
      );

      console.log(`🔒 Deactivated ${result.modifiedCount} expired licenses`);

      return result;
    } catch (error) {
      console.error("❌ Deactivate expired licenses error:", error);
      throw error;
    }
  }

  /**
   * Get license statistics
   */
  async getLicenseStatistics() {
    try {
      const stats = await UserLicense.aggregate([
        {
          $group: {
            _id: "$licenseType",
            count: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ["$isActive", true] }, 1, 0],
              },
            },
            expired: {
              $sum: {
                $cond: [{ $lt: ["$expiresAt", new Date()] }, 1, 0],
              },
            },
          },
        },
        {
          $addFields: {
            licenseType: "$_id",
          },
        },
      ]);

      const totalUsers = await UserLicense.countDocuments();
      const activeUsers = await UserLicense.countDocuments({ isActive: true });
      const expiredUsers = await UserLicense.countDocuments({
        expiresAt: { $lt: new Date() },
      });

      return {
        total: totalUsers,
        active: activeUsers,
        expired: expiredUsers,
        byType: stats,
      };
    } catch (error) {
      console.error("❌ Get license statistics error:", error);
      throw error;
    }
  }

  /**
   * Get license permissions based on type
   */
  getLicensePermissions(licenseType) {
    const permissions = {
      trial: {
        maxDailyConnections: 5,
        maxDailyMessages: 3,
        maxSearchKeywords: 3,
        canUseAdvancedFeatures: false,
        canExportData: false,
        canUseAPI: false,
      },
      basic: {
        maxDailyConnections: 15,
        maxDailyMessages: 10,
        maxSearchKeywords: 10,
        canUseAdvancedFeatures: true,
        canExportData: true,
        canUseAPI: false,
      },
      premium: {
        maxDailyConnections: 50,
        maxDailyMessages: 25,
        maxSearchKeywords: 25,
        canUseAdvancedFeatures: true,
        canExportData: true,
        canUseAPI: true,
      },
      enterprise: {
        maxDailyConnections: 100,
        maxDailyMessages: 50,
        maxSearchKeywords: 50,
        canUseAdvancedFeatures: true,
        canExportData: true,
        canUseAPI: true,
      },
    };

    return permissions[licenseType] || permissions.trial;
  }

  /**
   * Get license duration in days
   */
  getLicenseDuration(licenseType) {
    const durations = {
      trial: 30,
      basic: 365,
      premium: 365,
      enterprise: 365,
    };

    return durations[licenseType] || 30;
  }

  /**
   * Initialize scheduled tasks
   */
  initializeScheduledTasks() {
    // Daily cleanup at midnight
    cron.schedule("0 0 * * *", async () => {
      console.log("🕐 Running daily license maintenance...");

      try {
        // Reset daily usage
        await this.resetDailyUsage();

        // Deactivate expired licenses
        await this.deactivateExpiredLicenses();

        console.log("✅ Daily license maintenance completed");
      } catch (error) {
        console.error("❌ Daily license maintenance failed:", error);
      }
    });

    // Weekly statistics logging
    cron.schedule("0 0 * * 1", async () => {
      console.log("📊 Generating weekly license statistics...");

      try {
        const stats = await this.getLicenseStatistics();
        console.log("📊 License Statistics:", JSON.stringify(stats, null, 2));
      } catch (error) {
        console.error("❌ License statistics generation failed:", error);
      }
    });

    console.log("⏰ License service scheduled tasks initialized");
  }
}

module.exports = LicenseService;
