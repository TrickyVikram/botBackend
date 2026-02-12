/**
 * BOT STATUS MODEL - SQLite Version
 *
 * Simple file-based database for bot status
 */

const fs = require("fs");
const path = require("path");

class BotStatusSQLite {
  constructor() {
    this.dbPath = path.join(__dirname, "../data/bot-status.json");
    this.ensureDBExists();
  }

  ensureDBExists() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify({}));
    }
  }

  readDB() {
    try {
      const data = fs.readFileSync(this.dbPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("❌ Error reading database:", error);
      return {};
    }
  }

  writeDB(data) {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error("❌ Error writing database:", error);
      return false;
    }
  }

  async getBotStatus(userID = "default") {
    const db = this.readDB();

    if (!db[userID]) {
      // Create default user
      db[userID] = {
        userID: userID,
        license: "trial",
        botStatus: "disable",
        isRunning: false,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
    }

    return db[userID];
  }

  async enableBot(userID = "default", license = "trial") {
    const db = this.readDB();

    db[userID] = {
      ...db[userID],
      userID: userID,
      license: license,
      botStatus: "enable",
      isRunning: true,
      lastActivity: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.writeDB(db)) {
      console.log(`✅ Bot enabled for user ${userID} with license ${license}`);
      return db[userID];
    } else {
      throw new Error("Failed to enable bot");
    }
  }

  async disableBot(userID = "default") {
    const db = this.readDB();

    if (db[userID]) {
      db[userID] = {
        ...db[userID],
        botStatus: "disable",
        isRunning: false,
        lastActivity: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (this.writeDB(db)) {
        console.log(`✅ Bot disabled for user ${userID}`);
        return db[userID];
      } else {
        throw new Error("Failed to disable bot");
      }
    } else {
      throw new Error("User not found");
    }
  }

  async getAllUsers() {
    const db = this.readDB();
    return Object.values(db);
  }
}

module.exports = new BotStatusSQLite();
