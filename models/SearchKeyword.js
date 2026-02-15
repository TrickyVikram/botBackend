/**
 * SEARCH KEYWORD MODEL
 *
 * Mongoose model for search keywords with personalized messages
 */

const mongoose = require("mongoose");

const SearchKeywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      default: "Professional Collaboration Opportunity",
    },
    connectMessage: {
      type: String,
      required: true,
      trim: true,
    },
    directMessage: {
      type: String,
      required: true,
      trim: true,
    },
    // Message Setting - determines whether to use alternative messages or normal
    msgSetting: {
      type: String,
      enum: ["normal", "alternative"],
      default: "normal",
    },
    // User information - WHO created this keyword
    createdBy: {
      userId: {
        type: String,
        default: "user", // Default user ID
        index: true, // Add index for faster filtering
      },
      userName: {
        type: String,
        default: "User", // Default user name
      },
      userEmail: {
        type: String,
        default: "user@localhost", // Default email
      },
      userIP: {
        type: String,
        default: "unknown", // User's IP address
      },
      userAgent: {
        type: String,
        default: "unknown", // User's browser info
      },
    },
    // Usage statistics
    usageStats: {
      totalUses: {
        type: Number,
        default: 0,
      },
      lastUsed: {
        type: Date,
        default: null,
      },
      successfulConnections: {
        type: Number,
        default: 0,
      },
    },
    // Alternative messages for variety
    alternativeMessages: {
      connectMessages: [
        {
          type: String,
          trim: true,
        },
      ],
      directMessages: [
        {
          type: String,
          trim: true,
        },
      ],
      subjects: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

// Index for better performance
SearchKeywordSchema.index({ status: 1 });
// Note: keyword already has unique index from schema definition

// Static methods
SearchKeywordSchema.statics.getActiveKeywords = function () {
  return this.find({ status: "active" });
};

SearchKeywordSchema.statics.getKeywordById = function (id) {
  return this.findById(id);
};

SearchKeywordSchema.statics.activateKeyword = function (id) {
  return this.findByIdAndUpdate(id, { status: "active" }, { new: true });
};

SearchKeywordSchema.statics.deactivateKeyword = function (id) {
  return this.findByIdAndUpdate(id, { status: "inactive" }, { new: true });
};

// Instance methods
SearchKeywordSchema.methods.getPersonalizedConnectMessage = function (
  name,
  company,
) {
  return this.connectMessage
    .replace(/\[name\]/g, name || "there")
    .replace(/\{\{name\}\}/g, name || "there")
    .replace(/\[company\]/g, company || "your company")
    .replace(/\{\{company\}\}/g, company || "your company");
};

SearchKeywordSchema.methods.getPersonalizedDirectMessage = function (
  name,
  company,
) {
  return this.directMessage
    .replace(/\[name\]/g, name || "there")
    .replace(/\{\{name\}\}/g, name || "there")
    .replace(/\[company\]/g, company || "your company")
    .replace(/\{\{company\}\}/g, company || "your company");
};

SearchKeywordSchema.methods.toggleStatus = function () {
  this.status = this.status === "active" ? "inactive" : "active";
  return this.save();
};

const SearchKeyword = mongoose.model("SearchKeyword", SearchKeywordSchema);

module.exports = SearchKeyword;
