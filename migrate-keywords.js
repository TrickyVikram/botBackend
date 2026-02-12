/**
 * MIGRATION SCRIPT
 *
 * This script will help associate existing keywords with the current user
 * by creating a consistent user fingerprint mapping
 */

const mongoose = require("mongoose");
require("./models/database-connection"); // This should establish connection

const UserLicense = require("./models/UserLicense");
const SearchKeyword = require("./models/SearchKeyword");

async function migrateKeywords() {
  try {
    console.log("🔄 Starting keyword migration...");

    // Get all existing keywords
    const keywords = await SearchKeyword.find({});
    console.log(`📊 Found ${keywords.length} keywords in database`);

    // Get all existing users
    const users = await UserLicense.find({});
    console.log(`👥 Found ${users.length} users in database`);

    // Print existing data for debugging
    console.log("\n📋 Existing Keywords:");
    keywords.forEach((keyword, index) => {
      console.log(
        `${index + 1}. "${keyword.keyword}" - Created by: ${keyword.createdBy?.userId || "Unknown"}`,
      );
    });

    console.log("\n👥 Existing Users:");
    users.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.username} (${user._id}) - ${user.email}`,
      );
    });

    // Find the most recent user (likely the current active user)
    const latestUser = users.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];

    if (!latestUser) {
      console.log("❌ No users found in database");
      return;
    }

    console.log(
      `\n✅ Latest user identified: ${latestUser.username} (${latestUser._id})`,
    );
    console.log(`📧 Email: ${latestUser.email}`);

    // Update all keywords to belong to the latest user
    const updateResult = await SearchKeyword.updateMany(
      {},
      {
        $set: {
          "createdBy.userId": latestUser._id.toString(),
          "createdBy.userName": latestUser.username,
          "createdBy.userEmail": latestUser.email,
        },
      },
    );

    console.log(`\n🔄 Updated ${updateResult.modifiedCount} keywords`);

    // Verify the migration
    const updatedKeywords = await SearchKeyword.find({});
    console.log("\n✅ Keywords after migration:");
    updatedKeywords.forEach((keyword, index) => {
      console.log(
        `${index + 1}. "${keyword.keyword}" - Now belongs to: ${keyword.createdBy?.userId}`,
      );
    });

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
migrateKeywords();
