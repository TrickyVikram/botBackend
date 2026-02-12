/**
 * ANALYTICS AND REPORTING ROUTES
 *
 * Get analytics data, reports, and statistics
 */

const express = require("express");
const ActivityLog = require("../models/ActivityLog");
const SessionLogs = require("../models/SessionLogs");

const router = express.Router();

// Test endpoint to check MongoDB data without authentication
router.get("/test-data", async (req, res) => {
  try {
    console.log("🔍 Testing analytics data...");

    // Get total count of activities
    const totalActivities = await ActivityLog.countDocuments();

    // Get recent activities
    const recentActivities = await ActivityLog.find({})
      .sort({ timestamp: -1 })
      .limit(10);

    // Get activity type summary
    const activityTypes = await ActivityLog.aggregate([
      {
        $group: {
          _id: "$actionType",
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
          },
        },
      },
    ]);

    // Get daily activity counts for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyActivities = await ActivityLog.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      message: "MongoDB data check successful",
      data: {
        totalActivities,
        activityTypes,
        dailyActivities,
        recentActivities: recentActivities.map((activity) => ({
          id: activity._id,
          type: activity.actionType,
          target: activity.targetProfile,
          keyword: activity.searchKeyword,
          success: activity.success,
          timestamp: activity.timestamp,
          message: activity.message || "",
          subject: activity.subject || "",
          metadata: activity.metadata || {},
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
          __v: activity.__v,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Test data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get test data",
      error: error.message,
    });
  }
});

// Get dashboard analytics
router.get("/dashboard", async (req, res) => {
  try {
    const { period = "7d" } = req.query;

    let dateFilter;
    const now = new Date();

    switch (period) {
      case "1d":
        dateFilter = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    // Get activity logs for the period
    const activities = await ActivityLog.find({
      timestamp: { $gte: dateFilter },
    }).sort({ timestamp: -1 });

    // Get session logs for the period
    const sessions = await SessionLogs.find({
      timestamp: { $gte: dateFilter },
    }).sort({ timestamp: -1 });

    // Calculate statistics
    const stats = {
      totalActivities: activities.length,
      totalSessions: sessions.length,
      connectionsSent: activities.filter(
        (a) => a.actionType === "connection_sent",
      ).length,
      messagesSent: activities.filter(
        (a) => a.actionType === "direct_message_sent",
      ).length,
      profilesViewed: activities.filter(
        (a) => a.actionType === "profile_viewed",
      ).length,
      searchesPerformed: activities.filter(
        (a) => a.actionType === "search_performed",
      ).length,
      successRate: 0,
      averageSessionDuration: 0,
    };

    // Calculate success rate
    const successfulActivities = activities.filter((a) => a.success).length;
    stats.successRate =
      activities.length > 0
        ? (successfulActivities / activities.length) * 100
        : 0;

    // Calculate average session duration
    const completedSessions = sessions.filter((s) => s.endTime);
    if (completedSessions.length > 0) {
      const totalDuration = completedSessions.reduce((sum, session) => {
        return sum + (new Date(session.endTime) - new Date(session.startTime));
      }, 0);
      stats.averageSessionDuration = totalDuration / completedSessions.length;
    }

    // Group activities by date
    const dailyStats = {};
    activities.forEach((activity) => {
      const date = activity.timestamp.toISOString().split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          connections: 0,
          messages: 0,
          profiles: 0,
          searches: 0,
        };
      }

      switch (activity.actionType) {
        case "connection_sent":
          dailyStats[date].connections++;
          break;
        case "direct_message_sent":
          dailyStats[date].messages++;
          break;
        case "profile_viewed":
          dailyStats[date].profiles++;
          break;
        case "search_performed":
          dailyStats[date].searches++;
          break;
      }
    });

    res.json({
      success: true,
      data: {
        period,
        stats,
        dailyStats: Object.values(dailyStats).sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        ),
        recentActivities: activities.slice(0, 10),
        recentSessions: sessions.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("❌ Get dashboard analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get analytics data",
    });
  }
});

// Get activity logs
router.get("/activities", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      actionType,
      success,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (actionType) {
      filter.actionType = actionType;
    }

    if (success !== undefined) {
      filter.success = success === "true";
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
          totalCount: total,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get activities error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get activities",
    });
  }
});

// Get performance report
router.get("/performance", async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    let dateFilter;
    const now = new Date();

    switch (period) {
      case "7d":
        dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    // Aggregate performance data
    const performanceData = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: dateFilter },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            actionType: "$actionType",
          },
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
          },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          actions: {
            $push: {
              type: "$_id.actionType",
              count: "$count",
              successCount: "$successCount",
              successRate: {
                $cond: [
                  { $eq: ["$count", 0] },
                  0,
                  {
                    $multiply: [{ $divide: ["$successCount", "$count"] }, 100],
                  },
                ],
              },
            },
          },
          totalActions: { $sum: "$count" },
          totalSuccess: { $sum: "$successCount" },
        },
      },
      {
        $addFields: {
          date: "$_id",
          overallSuccessRate: {
            $cond: [
              { $eq: ["$totalActions", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$totalSuccess", "$totalActions"] },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    res.json({
      success: true,
      data: {
        period,
        performanceData,
      },
    });
  } catch (error) {
    console.error("❌ Get performance report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get performance report",
    });
  }
});

// Get keyword performance
router.get("/keywords", async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    let dateFilter;
    const now = new Date();

    switch (period) {
      case "7d":
        dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    // Aggregate keyword performance
    const keywordData = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: dateFilter },
          searchKeyword: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$searchKeyword",
          totalActions: { $sum: 1 },
          successfulActions: {
            $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
          },
          connections: {
            $sum: {
              $cond: [{ $eq: ["$actionType", "connection_sent"] }, 1, 0],
            },
          },
          messages: {
            $sum: {
              $cond: [{ $eq: ["$actionType", "direct_message_sent"] }, 1, 0],
            },
          },
          profiles: {
            $sum: { $cond: [{ $eq: ["$actionType", "profile_viewed"] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          keyword: "$_id",
          successRate: {
            $cond: [
              { $eq: ["$totalActions", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$successfulActions", "$totalActions"] },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $sort: { totalActions: -1 },
      },
    ]);

    res.json({
      success: true,
      data: {
        period,
        keywordPerformance: keywordData,
      },
    });
  } catch (error) {
    console.error("❌ Get keyword analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get keyword analytics",
    });
  }
});

// Export data (for premium users)
router.get("/export", async (req, res) => {
  try {
    const user = req.user;

    // Check if user can export data
    if (!user.canPerformAction("export_data")) {
      return res.status(403).json({
        success: false,
        message: "Data export requires premium or enterprise license",
      });
    }

    const { format = "json", period = "30d" } = req.query;

    let dateFilter;
    const now = new Date();

    switch (period) {
      case "7d":
        dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        dateFilter = new Date(0);
        break;
      default:
        dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const [activities, sessions] = await Promise.all([
      ActivityLog.find({ timestamp: { $gte: dateFilter } }).sort({
        timestamp: -1,
      }),
      SessionLogs.find({ timestamp: { $gte: dateFilter } }).sort({
        timestamp: -1,
      }),
    ]);

    const exportData = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        period,
        user: user.username,
        licenseType: user.licenseType,
      },
      activities,
      sessions,
    };

    if (format === "csv") {
      // Convert to CSV format (simplified)
      const csvData = activities.map((activity) => ({
        timestamp: activity.timestamp,
        actionType: activity.actionType,
        targetProfile: activity.targetProfile,
        searchKeyword: activity.searchKeyword,
        success: activity.success,
        message: activity.message,
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=linkedin-bot-data-${period}.csv`,
      );

      // Simple CSV conversion (in production, use a proper CSV library)
      const csvHeaders = Object.keys(csvData[0] || {}).join(",");
      const csvRows = csvData.map((row) => Object.values(row).join(","));
      const csvContent = [csvHeaders, ...csvRows].join("\n");

      res.send(csvContent);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=linkedin-bot-data-${period}.json`,
      );
      res.json(exportData);
    }
  } catch (error) {
    console.error("❌ Export data error:", error);
    res.status(500).json({
      success: false,
      message: "Data export failed",
    });
  }
});

module.exports = router;
