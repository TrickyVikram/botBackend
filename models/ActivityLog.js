/**
 * ACTIVITY LOG MODEL
 *
 * Mongoose model for tracking individual automation activities
 */

const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      default: "default",
    },
    username: {
      type: String,
      required: false,
      default: "Default User",
    },
    actionType: {
      type: String,
      enum: [
        "connection_sent",
        "connection_attempted",
        "direct_message_sent",
        "profile_viewed",
        "search_performed",
      ],
      required: true,
    },
    targetProfile: {
      type: String,
      required: true,
    },
    profileUrl: {
      type: String,
      required: true,
    },
    searchKeyword: {
      type: String,
      required: true,
    },
    success: {
      type: Boolean,
      required: true,
      default: false,
    },
    message: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      sessionDuration: Number,
      retryCount: Number,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better performance
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ actionType: 1, success: 1 });
ActivityLogSchema.index({ searchKeyword: 1 });
ActivityLogSchema.index({ userId: 1 });

// Static methods
ActivityLogSchema.statics.getTodayLogs = function (userId = "default") {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  return this.find({
    userId: userId,
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });
};

ActivityLogSchema.statics.getSuccessfulActions = function (
  actionType,
  userId = "default",
  date = new Date(),
) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  return this.countDocuments({
    userId: userId,
    actionType: actionType,
    success: true,
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });
};

ActivityLogSchema.statics.getTodayUsage = async function (userId = "default") {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const logs = await this.find({
    userId: userId,
    success: true,
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  const usage = {
    connections: 0,
    directMessages: 0,
    profileViews: 0,
    searches: 0,
  };

  logs.forEach((log) => {
    switch (log.actionType) {
      case "connection_sent":
        usage.connections++;
        break;
      case "direct_message_sent":
        usage.directMessages++;
        break;
      case "profile_viewed":
        usage.profileViews++;
        break;
      case "search_performed":
        usage.searches++;
        break;
    }
  });

  return usage;
};

// Instance methods
ActivityLogSchema.methods.isToday = function () {
  const today = new Date();
  const logDate = this.timestamp;
  return logDate.toDateString() === today.toDateString();
};

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);

module.exports = ActivityLog;
