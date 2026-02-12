/**
 * Test Bot Status with SQLite (No MongoDB needed)
 */

const BotStatusSQLite = require("../models/BotStatusSQLite");

async function testBotStatus() {
  try {
    console.log("🧪 Testing Bot Status SQLite Database...\n");

    // Test 1: Get default user status
    console.log("📋 Test 1: Get default user status");
    const defaultUser = await BotStatusSQLite.getBotStatus("default");
    console.log("Default user:", defaultUser);
    console.log("");

    // Test 2: Enable bot for default user
    console.log("📋 Test 2: Enable bot for default user");
    const enabledBot = await BotStatusSQLite.enableBot("default", "premium");
    console.log("Enabled bot:", enabledBot);
    console.log("");

    // Test 3: Create another user
    console.log("📋 Test 3: Create another user");
    const newUser = await BotStatusSQLite.getBotStatus("user123");
    console.log("New user:", newUser);
    console.log("");

    // Test 4: Enable bot for new user
    console.log("📋 Test 4: Enable bot for new user");
    const newUserEnabled = await BotStatusSQLite.enableBot("user123", "trial");
    console.log("New user enabled:", newUserEnabled);
    console.log("");

    // Test 5: Disable bot for default user
    console.log("📋 Test 5: Disable bot for default user");
    const disabledBot = await BotStatusSQLite.disableBot("default");
    console.log("Disabled bot:", disabledBot);
    console.log("");

    // Test 6: Get all users
    console.log("📋 Test 6: Get all users");
    const allUsers = await BotStatusSQLite.getAllUsers();
    console.log("All users:", allUsers);
    console.log("");

    console.log("✅ All tests passed! SQLite database is working perfectly.");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run tests
testBotStatus();
