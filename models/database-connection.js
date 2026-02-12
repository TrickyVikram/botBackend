/**
 * MONGOOSE DATABASE CONNECTION
 *
 * Centralized database connection and configuration
 */

const mongoose = require("mongoose");

class DatabaseConnection {
  constructor() {
    this.mongoUri =
      process.env.AUTOMATION_MONGO_URI || "mongodb://localhost:27017";
    this.mongoDbName = process.env.AUTOMATION_DB_NAME || "automationBot";
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB using Mongoose
   */
  async connect() {
    try {
      console.log(
        `🔗 Connecting to MongoDB: ${this.mongoUri}/${this.mongoDbName}`,
      );

      await mongoose.connect(`${this.mongoUri}/${this.mongoDbName}`, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      this.isConnected = true;
      console.log(`✅ Connected to MongoDB successfully`);
      console.log(`📊 Database: ${this.mongoDbName}`);

      // Handle connection events
      mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        console.log("🔌 MongoDB disconnected");
        this.isConnected = false;
      });

      return true;
    } catch (error) {
      this.isConnected = false;
      console.error(`❌ MongoDB connection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check database connection status
   */
  async checkConnection() {
    try {
      if (mongoose.connection.readyState === 1) {
        return {
          connected: true,
          message: "Database connection active",
          database: this.mongoDbName,
          state: "Connected",
        };
      } else {
        return {
          connected: false,
          message: "Database connection inactive",
          state: mongoose.connection.states[mongoose.connection.readyState],
        };
      }
    } catch (error) {
      return {
        connected: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("🔌 Disconnected from MongoDB");
    } catch (error) {
      console.error("❌ Error disconnecting:", error.message);
    }
  }
}

module.exports = DatabaseConnection;
