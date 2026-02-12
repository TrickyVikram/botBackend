/**
 * SEARCH SETTINGS MODEL
 *
 * Mongoose model for search configuration
 */

const mongoose = require("mongoose");

const SearchSettingsSchema = new mongoose.Schema(
  {
    selectedKeywords: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      required: true,
    },
    cycleMode: {
      type: String,
      enum: ["auto", "manual", "random"],
      default: "auto",
    },
    currentSearchId: {
      type: Number,
      default: 1,
    },
    searchDelay: {
      type: Number,
      default: 3000,
      min: 1000,
      max: 10000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Add methods
SearchSettingsSchema.methods.getNextKeyword = function () {
  const currentIndex = this.selectedKeywords.indexOf(this.currentSearchId);
  const nextIndex = (currentIndex + 1) % this.selectedKeywords.length;
  this.currentSearchId = this.selectedKeywords[nextIndex];
  return this.currentSearchId;
};

SearchSettingsSchema.methods.setKeywords = function (keywords) {
  this.selectedKeywords = keywords;
  if (!keywords.includes(this.currentSearchId)) {
    this.currentSearchId = keywords[0];
  }
};

module.exports = mongoose.model("SearchSettings", SearchSettingsSchema);
