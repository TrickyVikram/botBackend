/**
 * TEST SCRIPT TO CREATE KEYWORDS FOR DIFFERENT USERS
 *
 * This script creates test keywords to verify user filtering
 */

const mongoose = require("mongoose");
const SearchKeyword = require("./models/SearchKeyword");
const UserLicense = require("./models/UserLicense");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://automationBot:pacific2112@cluster0.evr61ao.mongodb.net/automationBot?retryWrites=true&w=majority",
    );
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const createTestData = async () => {
  try {
    await connectDB();

    // Create test users if they don't exist
    const testUsers = [
      {
        userId: "8f5393b72af06c99bfaf884516e5829d", // This matches the frontend userID
        username: "TestUser",
        email: "test@example.com",
        password: "test-password",
      },
      {
        userId: "another-user-id-12345",
        username: "AnotherUser",
        email: "another@example.com",
        password: "test-password",
      },
    ];

    // Create users
    for (const userData of testUsers) {
      const existingUser = await UserLicense.findOne({
        userId: userData.userId,
      });
      if (!existingUser) {
        const newUser = new UserLicense(userData);
        await newUser.save();
        console.log(
          `✅ Created user: ${userData.username} (${userData.userId})`,
        );
      } else {
        console.log(
          `👤 User already exists: ${userData.username} (${userData.userId})`,
        );
      }
    }

    // Create test keywords for different users
    const testKeywords = [
      // Keywords for TestUser (the one used by frontend)
      {
        keyword: "software engineer",
        subject: "Exciting Software Engineering Opportunity",
        msgSetting: "alternative", // Use alternative messages
        connectMessage:
          "Hi [name], I noticed your impressive background in software engineering at [company]. I'd love to connect and share an exciting opportunity that aligns with your expertise.",
        directMessage:
          "Hi [name], Following up on my connection request - I have a fantastic software engineering role that I believe would be perfect for someone with your background at [company]. Would you be open to a brief conversation?",
        createdBy: {
          userId: "8f5393b72af06c99bfaf884516e5829d",
          userName: "TestUser",
          userEmail: "test@example.com",
        },
        alternativeMessages: {
          subjects: [
            "Software Developer Position - Perfect Match!",
            "Tech Opportunity at Growing Company",
            "Engineering Role Discussion",
          ],
          connectMessages: [
            "Hello [name], your software engineering experience at [company] caught my attention. Let's connect!",
            "Hi [name], I have an interesting software role that matches your [company] background perfectly.",
          ],
          directMessages: [
            "Hi [name], I hope you're doing well. I have a software engineering opportunity that I think you'd find exciting based on your work at [company].",
            "Hello [name], following up on my connection - would love to discuss a software engineering position that fits your expertise.",
          ],
        },
      },
      {
        keyword: "data scientist",
        subject: "Data Science Role Discussion",
        msgSetting: "normal", // Use normal messages
        connectMessage:
          "Hi [name], your data science work at [company] is impressive. I have an exciting opportunity to discuss.",
        directMessage:
          "Hello [name], I have a data science position that aligns perfectly with your background at [company]. Interested in learning more?",
        createdBy: {
          userId: "8f5393b72af06c99bfaf884516e5829d",
          userName: "TestUser",
          userEmail: "test@example.com",
        },
        alternativeMessages: {
          subjects: [
            "Data Scientist Opening - Great Fit!",
            "Analytics Role at Tech Startup",
          ],
          connectMessages: [
            "Hi [name], your data science expertise at [company] is exactly what we're looking for!",
          ],
          directMessages: [
            "Hello [name], I have an exciting data science opportunity that matches your [company] experience.",
          ],
        },
      },
      // Keywords for AnotherUser (should NOT appear for TestUser)
      {
        keyword: "marketing manager",
        subject: "Marketing Leadership Opportunity",
        connectMessage:
          "Hi [name], your marketing leadership at [company] is impressive. Let's connect!",
        directMessage:
          "Hello [name], I have a marketing manager role that fits your [company] background perfectly.",
        createdBy: {
          userId: "another-user-id-12345",
          userName: "AnotherUser",
          userEmail: "another@example.com",
        },
      },
      {
        keyword: "sales director",
        subject: "Sales Leadership Role",
        connectMessage:
          "Hi [name], your sales achievements at [company] caught my attention.",
        directMessage:
          "Hello [name], I have a sales director position that would be perfect for you.",
        createdBy: {
          userId: "another-user-id-12345",
          userName: "AnotherUser",
          userEmail: "another@example.com",
        },
      },
    ];

    // Clear existing keywords (optional)
    console.log("🗑️  Clearing existing keywords...");
    await SearchKeyword.deleteMany({});

    // Create new test keywords
    for (const keywordData of testKeywords) {
      const newKeyword = new SearchKeyword(keywordData);
      await newKeyword.save();
      console.log(
        `✅ Created keyword: "${keywordData.keyword}" for user ${keywordData.createdBy.userName}`,
      );
    }

    console.log("\n📊 Test Data Summary:");
    console.log(`👤 Users created: ${testUsers.length}`);
    console.log(`🔑 Keywords created: ${testKeywords.length}`);

    const userKeywords = await SearchKeyword.find({
      "createdBy.userId": "8f5393b72af06c99bfaf884516e5829d",
    });
    console.log(`📋 Keywords for TestUser: ${userKeywords.length}`);

    const otherKeywords = await SearchKeyword.find({
      "createdBy.userId": "another-user-id-12345",
    });
    console.log(`📋 Keywords for AnotherUser: ${otherKeywords.length}`);

    console.log("\n✅ Test data created successfully!");
    console.log(
      "🌐 You can now test the user filtering on: http://localhost:3000/settings/keyword-list",
    );
  } catch (error) {
    console.error("❌ Error creating test data:", error);
  } finally {
    mongoose.connection.close();
  }
};

createTestData();
