const mongoose = require("mongoose");

const BotStatusSchema = new mongoose.Schema(
  {
    userID: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    license: {
      type: String,
      required: true,
      default: "trial",
    },
    botStatus: {
      type: String,
      enum: ["enable", "disable"],
      default: "disable",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    isRunning: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Static methods for easy status management
BotStatusSchema.statics.enableBot = async function (
  userID = "default",
  license = "trial",
) {
  return await this.findOneAndUpdate(
    { userID },
    {
      botStatus: "enable",
      license,
      isRunning: true,
      lastActivity: new Date(),
    },
    { upsert: true, new: true },
  );
};

BotStatusSchema.statics.disableBot = async function (userID = "default") {
  return await this.findOneAndUpdate(
    { userID },
    {
      botStatus: "disable",
      isRunning: false,
      lastActivity: new Date(),
    },
    { upsert: true, new: true },
  );
};

BotStatusSchema.statics.getBotStatus = async function (userID = "default") {
  let status = await this.findOne({ userID });
  if (!status) {
    status = await this.create({ userID });
  }
  return status;
};

module.exports = mongoose.model("BotStatus", BotStatusSchema);
