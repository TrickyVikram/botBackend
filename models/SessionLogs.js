/**
 * SESSION LOGS MODEL
 *
 * Mongoose model for automation session tracking
 */

const mongoose = require("mongoose");

const SessionLogsSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["running", "completed", "failed", "stopped"],
      default: "running",
    },
    searchKeyword: {
      type: String,
      required: true,
    },
    searchIndex: {
      type: Number,
      required: true,
    },
    results: {
      totalProcessed: { type: Number, default: 0 },
      successful: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      directMessages: { type: Number, default: 0 },
      connections: { type: Number, default: 0 },
    },
    profilesProcessed: [
      {
        name: String,
        title: String,
        company: String,
        location: String,
        profileLink: String,
        connectionStatus: String,
        messageType: String,
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    sessionErrors: [
      {
        message: String,
        stack: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    warmupStatus: {
      enabled: Boolean,
      overridden: Boolean,
      currentWeek: String,
      dailyLimit: Number,
      dailyUsed: Number,
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  },
);

// Method to add profile result
SessionLogsSchema.methods.addProfileResult = function (profile) {
  this.profilesProcessed.push(profile);
  this.results.totalProcessed = this.profilesProcessed.length;
};

// Method to update results
SessionLogsSchema.methods.updateResults = function (type) {
  switch (type) {
    case "success":
      this.results.successful++;
      break;
    case "failed":
      this.results.failed++;
      break;
    case "skipped":
      this.results.skipped++;
      break;
    case "direct":
      this.results.directMessages++;
      break;
    case "connection":
      this.results.connections++;
      break;
  }
};

// Method to complete session
SessionLogsSchema.methods.completeSession = function (status = "completed") {
  this.endTime = new Date();
  this.status = status;
};

module.exports = mongoose.model("SessionLogs", SessionLogsSchema);
