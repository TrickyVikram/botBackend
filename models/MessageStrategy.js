/**
 * MESSAGE STRATEGY MODEL
 *
 * Mongoose model for message strategy configuration
 */

const mongoose = require("mongoose");

const MessageStrategySchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["connection", "direct", "mixed", "connect_only", "direct_only"],
      default: "connect_only",
      required: true,
    },
    directMessageChance: {
      type: Number,
      default: 30,
      min: 0,
      max: 100,
    },
    connectionRequestChance: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    personalizeMessages: {
      type: Boolean,
      default: true,
    },
    useCustomMessages: {
      type: Boolean,
      default: false,
    },
    customMessages: {
      connection: {
        type: String,
        default:
          "Hi {name}, I'd love to connect and expand my professional network.",
      },
      direct: {
        type: String,
        default:
          "Hello {name}, I noticed {company} is in the {industry} sector. I'd love to connect and share insights about industry trends and opportunities.",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Method to determine message type
MessageStrategySchema.methods.shouldSendDirectMessage = function () {
  switch (this.mode) {
    case "direct":
      return true;
    case "connection":
      return false;
    case "mixed":
      return Math.random() * 100 < this.directMessageChance;
    default:
      return false;
  }
};

// Update chances when mode changes
MessageStrategySchema.pre("save", function (next) {
  if (this.mode === "direct") {
    this.directMessageChance = 100;
    this.connectionRequestChance = 0;
  } else if (this.mode === "connection") {
    this.directMessageChance = 0;
    this.connectionRequestChance = 100;
  } else {
    // For mixed mode, ensure percentages add up to 100
    this.connectionRequestChance = 100 - this.directMessageChance;
  }
  next();
});

module.exports = mongoose.model("MessageStrategy", MessageStrategySchema);
