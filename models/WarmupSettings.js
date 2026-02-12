/**
 * WARMUP SETTINGS MODEL
 *
 * Mongoose model for warmup configuration
 */

const mongoose = require("mongoose");

const WarmupSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    overrideWarmup: {
      type: Boolean,
        default: true,
    },
    phase: {
      type: String,
      enum: ["auto", "week1", "week2", "week3", "week4plus"],
      default: "auto",
    },
    customLimits: {
      week1: {
        daily: { type: Number, default: 2 },
        weekly: { type: Number, default: 10 },
      },
      week2: {
        daily: { type: Number, default: 3 },
        weekly: { type: Number, default: 15 },
      },
      week3: {
        daily: { type: Number, default: 4 },
        weekly: { type: Number, default: 20 },
      },
      week4plus: {
        daily: { type: Number, default: 5 },
        weekly: { type: Number, default: 25 },
      },
    },
    accountStartDate: {
      type: Date,
      default: Date.now,
    },
    totalConnections: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Method to get current week number
WarmupSettingsSchema.methods.getCurrentWeek = function () {
  const now = new Date();
  const startDate = new Date(this.accountStartDate);
  const diffTime = Math.abs(now - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil(diffDays / 7);

  if (weekNumber <= 1) return "week1";
  if (weekNumber <= 2) return "week2";
  if (weekNumber <= 3) return "week3";
  return "week4plus";
};

// Method to get current limits
WarmupSettingsSchema.methods.getCurrentLimits = function () {
  const currentWeek = this.getCurrentWeek();
  return this.customLimits[currentWeek];
};

// Method to check if warmup should be respected
WarmupSettingsSchema.methods.shouldRespectWarmup = function () {
  return this.enabled && !this.overrideWarmup;
};

module.exports = mongoose.model("WarmupSettings", WarmupSettingsSchema);
