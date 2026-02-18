const mongoose = require("mongoose");

const DailyLimitsSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Index for faster queries
    },
    username: {
      type: String,
      required: false,
    },
    maxConnections: {
      type: Number,
      default: 8,
      min: 1,
      max: 50,
      required: true,
    },
    maxDirectMessages: {
      type: Number,
      default: 2,
      min: 1,
      max: 20,
      required: true,
    },
    maxProfileViews: {
      type: Number,
      default: 50,
      min: 10,
      max: 500,
      required: true,
    },
    maxSearches: {
      type: Number,
      default: 10,
      min: 1,
      max: 50,
      required: true,
    },
    respectWarmup: {
      type: Boolean,
      default: true,
    },
    dailyReset: {
      type: Date,
      default: () => {
        const tomorrow = new Date();
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      },
    },
  },
  {
    timestamps: true,
  },
);

// Method to check if limit is reached
DailyLimitsSchema.methods.isLimitReached = function (type, currentCount) {
  switch (type) {
    case "connections":
      return currentCount >= this.maxConnections;
    case "messages":
      return currentCount >= this.maxDirectMessages;
    case "views":
      return currentCount >= this.maxProfileViews;
    case "searches":
      return currentCount >= this.maxSearches;
    default:
      return false;
  }
};

// Method to get remaining count
DailyLimitsSchema.methods.getRemainingCount = function (type, currentCount) {
  switch (type) {
    case "connections":
      return Math.max(0, this.maxConnections - currentCount);
    case "messages":
      return Math.max(0, this.maxDirectMessages - currentCount);
    case "views":
      return Math.max(0, this.maxProfileViews - currentCount);
    case "searches":
      return Math.max(0, this.maxSearches - currentCount);
    default:
      return 0;
  }
};

module.exports = mongoose.model("DailyLimits", DailyLimitsSchema);
