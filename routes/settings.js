/**
 * SETTINGS MANAGEMENT ROUTES
 *
 * Manage search keywords, daily limits, and message strategies
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
// Remove the broken import, we'll handle permissions in the route handlers

// Import existing models
const SearchKeyword = require("../models/SearchKeyword");
const SearchSettings = require("../models/SearchSettings");
const DailyLimits = require("../models/DailyLimits");
const MessageStrategy = require("../models/MessageStrategy");
const WarmupSettings = require("../models/WarmupSettings");
const UserLicense = require("../models/UserLicense");

const router = express.Router();

// ===== JWT UTILITY FUNCTIONS =====
const extractUserFromToken = async (authHeader) => {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    console.log("🔐 Extracting user from JWT token...");

    // For development - we'll decode without verification first
    // In production, use proper JWT secret verification
    const decoded = jwt.decode(token);
    console.log("📋 Decoded token:", decoded);

    if (decoded && decoded.userId) {
      // Find user in database
      const user = await UserLicense.findOne({ userId: decoded.userId });
      if (user) {
        console.log("✅ User found from token:", user.username, user.userId);
        return {
          userId: user.userId,
          username: user.username,
          email: user.email,
          _id: user._id,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("❌ Token extraction error:", error);
    return null;
  }
};

const findUserByHeaders = async (req) => {
  // Get user ID from headers
  const headerUserId = req.get("X-User-ID");
  const headerUserName = req.get("X-User-Name");
  const headerUserEmail = req.get("X-User-Email");

  console.log("🔍 Looking for user with header ID:", headerUserId);

  if (headerUserId) {
    // First try to find by userId field
    let user = await UserLicense.findOne({ userId: headerUserId });

    if (!user && headerUserEmail) {
      // Try to find by email
      user = await UserLicense.findOne({ email: headerUserEmail });
    }

    if (!user && headerUserName && headerUserEmail) {
      // Create new user if doesn't exist
      console.log("🆕 Creating new user:", headerUserName);
      user = await UserLicense.create({
        userId: headerUserId,
        username: headerUserName,
        email: headerUserEmail,
        password: "temp123", // Temporary password
        licenseType: "trial",
      });
      console.log("✅ New user created:", user.userId);
    }

    return user;
  }

  return null;
};

// ===== LICENSE MIDDLEWARE FOR DAILY LIMITS =====
const setDefaultLicenseInfo = (req, res, next) => {
  // Provide default license info if not available
  if (!req.licenseInfo) {
    req.licenseInfo = {
      permissions: {
        maxDailyConnections: 100,
        maxDailyMessages: 50,
      },
    };
  }
  next();
};

// Apply license middleware to all routes
router.use(setDefaultLicenseInfo);

// ===== USER IDENTIFICATION MIDDLEWARE =====
const identifyCurrentUser = async (req, res, next) => {
  try {
    // Method 1: Try to get user from JWT token
    const authHeader = req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "default-secret-key",
        );

        // Find user by JWT userId (not MongoDB _id)
        const user = await UserLicense.findOne({ userId: decoded.userId });
        if (user) {
          req.currentUserId = user.userId; // Use UserLicense.userId, not MongoDB _id
          req.currentUserInfo = user;
          console.log(`🔐 JWT User found: ${user.username} (${user.userId})`);
          return next();
        }
      } catch (jwtError) {
        console.log(`⚠️ JWT verification failed:`, jwtError.message);
      }
    }

    // Method 2: Try to get user from hardcoded headers (for development/frontend compatibility)
    const hardcodedUserId = req.get("X-User-ID");
    const hardcodedUserName = req.get("X-User-Name");
    const hardcodedUserEmail = req.get("X-User-Email");

    if (hardcodedUserId && hardcodedUserName && hardcodedUserEmail) {
      // Try to find existing user with this userId (not MongoDB _id)
      const existingUser = await UserLicense.findOne({
        userId: hardcodedUserId,
      });
      if (existingUser) {
        req.currentUserId = hardcodedUserId;
        req.currentUserInfo = existingUser;
        console.log(
          `👤 Using hardcoded user: ${hardcodedUserName} (${hardcodedUserId})`,
        );
        return next();
      }

      // If user doesn't exist, create one with this userId
      const newUser = new UserLicense({
        userId: hardcodedUserId,
        username: hardcodedUserName,
        email: hardcodedUserEmail,
        password: "temp-password", // This should be hashed in production
      });

      await newUser.save();
      req.currentUserId = hardcodedUserId;
      req.currentUserInfo = newUser;
      console.log(
        `👤 Created new user: ${hardcodedUserName} (${hardcodedUserId})`,
      );
      return next();
    }

    // Method 3: Create/Find user based on fingerprint (fallback)
    const userIP = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";

    // Try to get fingerprint from frontend first
    let userFingerprint = req.get("X-User-Fingerprint");

    // If no fingerprint from frontend, create one based on IP and User-Agent
    if (!userFingerprint) {
      userFingerprint = Buffer.from(`${userIP}_${userAgent}`)
        .toString("base64")
        .substring(0, 12);
    }

    // Try to find existing user with this fingerprint
    const searchEmail = `user_${userFingerprint}@localhost`;
    console.log(`🔍 Looking for user with email: ${searchEmail}`);

    let user = await UserLicense.findOne({
      email: searchEmail,
    });

    console.log(
      `👤 Found user:`,
      user ? `${user.username} (${user._id})` : "None",
    );

    // If no user found, create a new one
    if (!user) {
      user = new UserLicense({
        username: `User_${userFingerprint.substring(0, 8)}`,
        email: `user_${userFingerprint}@localhost`,
        password: "default123", // In real system, this should be hashed
        licenseType: "trial",
        isActive: true,
        // Additional fingerprint data
        metadata: {
          userAgent: userAgent.substring(0, 200),
          ip: userIP,
          fingerprint: userFingerprint,
          createdVia: "auto-registration",
        },
      });
      await user.save();
      console.log(`👤 Created new user: ${user.username} (${user._id})`);
    }

    req.currentUserId = user._id.toString();
    req.currentUserInfo = user;

    console.log(`👤 Identified user: ${user.username} (${user._id})`);
    next();
  } catch (error) {
    console.error("❌ User identification error:", error.message);
    // Don't block the request, just use fallback
    const userFingerprint = Buffer.from(`unknown_${Date.now()}`)
      .toString("base64")
      .substring(0, 12);
    req.currentUserId = `temp_${userFingerprint}`;
    req.currentUserInfo = { username: "TempUser" };
    next();
  }
};

// ===== HEALTH CHECK FOR SETTINGS API =====
router.get("/health", async (req, res) => {
  try {
    const keywordCount = await SearchKeyword.countDocuments();
    res.json({
      success: true,
      message: "Settings API is working",
      data: {
        totalKeywords: keywordCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// ===== SEARCH KEYWORDS =====

// Get all search keywords for current user
router.get("/keywords", identifyCurrentUser, async (req, res) => {
  try {
    const currentUserId = req.currentUserId;
    const currentUserInfo = req.currentUserInfo;

    console.log(
      `🔍 Fetching keywords for user: ${currentUserInfo.username} (${currentUserId})`,
    );

    // Debug: First get ALL keywords to see what we have
    const allKeywords = await SearchKeyword.find({}).sort({ createdAt: -1 });
    console.log(`🔍 Total keywords in database: ${allKeywords.length}`);

    // Log first few keywords to see the structure
    allKeywords.slice(0, 3).forEach((kw, i) => {
      console.log(`🔍 Keyword ${i + 1}:`, {
        keyword: kw.keyword,
        status: kw.status,
        createdBy: kw.createdBy,
        createdByUserId: kw.createdBy?.userId,
        currentUserId: currentUserId,
        match: kw.createdBy?.userId === currentUserId,
      });
    });

    // Filter by current user's MongoDB _id - Remove status filter for debugging
    const keywords = await SearchKeyword.find({
      "createdBy.userId": currentUserId,
    }).sort({ createdAt: -1 });

    console.log(
      `📋 Found ${keywords.length} keywords for user ${currentUserId}`,
    );

    // Add user info to response
    const response = {
      success: true,
      data: keywords,
      userInfo: {
        currentUserId: currentUserId,
        userName: currentUserInfo.username,
        totalKeywords: await SearchKeyword.countDocuments(),
        userKeywords: keywords.length,
      },
    };

    res.json(response);
    console.log(`👤 User keywords for ${currentUserId}: ${keywords.length}`);
  } catch (error) {
    console.error("❌ Get keywords error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get keywords",
    });
  }
});

// New Keywords List API with User ID filtering
router.get("/keywords-list", async (req, res) => {
  try {
    console.log("🚀 KEYWORDS-LIST ROUTE REACHED!");
    console.log("📋 Headers:", req.headers);

    // Get user ID from headers
    const userID = req.get("X-User-ID");
    const userName = req.get("X-User-Name") || "Unknown User";

    console.log("🔍 Filtering keywords for User ID:", userID);

    if (!userID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required in headers (X-User-ID)",
      });
    }

    // Get all keywords for debugging
    const allKeywords = await SearchKeyword.find({}).sort({ createdAt: -1 });
    console.log(`📊 Total keywords in database: ${allKeywords.length}`);

    // Filter keywords by user ID
    const userKeywords = await SearchKeyword.find({
      "createdBy.userId": userID,
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${userKeywords.length} keywords for user ${userID}`);

    // Log sample data for debugging
    if (userKeywords.length > 0) {
      console.log("📝 Sample keyword:", {
        keyword: userKeywords[0].keyword,
        status: userKeywords[0].status,
        createdBy: userKeywords[0].createdBy?.userId,
      });
    }

    res.json({
      success: true,
      data: userKeywords,
      meta: {
        total: userKeywords.length,
        userID: userID,
        userName: userName,
        totalInDatabase: allKeywords.length,
      },
    });
  } catch (error) {
    console.error("❌ Keywords-list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch keywords",
      error: error.message,
    });
  }
});

// Add new search keyword
router.post(
  "/keywords",
  [
    body("keyword")
      .isLength({ min: 2, max: 100 })
      .withMessage("Keyword must be 2-100 characters"),
    body("connectMessage")
      .isLength({ min: 10, max: 500 })
      .withMessage("Connect message must be 10-500 characters"),
    body("directMessage")
      .isLength({ min: 10, max: 500 })
      .withMessage("Direct message must be 10-500 characters"),
  ],
  identifyCurrentUser,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { keyword, connectMessage, directMessage } = req.body;

      // Enhanced validation
      if (!keyword || !keyword.trim()) {
        return res.status(400).json({
          success: false,
          message: "Keyword is required",
        });
      }

      if (!connectMessage || !connectMessage.trim()) {
        return res.status(400).json({
          success: false,
          message: "Connection message is required",
        });
      }

      if (!directMessage || !directMessage.trim()) {
        return res.status(400).json({
          success: false,
          message: "Direct message is required",
        });
      }

      // Get current user from middleware
      const currentUserId = req.currentUserId;
      const currentUserInfo = req.currentUserInfo;

      console.log(
        `🔑 Creating keyword for user: ${currentUserInfo.username} (${currentUserId})`,
      );

      // Check for duplicate (case insensitive) - USER SPECIFIC
      const existingKeyword = await SearchKeyword.findOne({
        keyword: { $regex: new RegExp(`^${keyword.trim()}$`, "i") },
        "createdBy.userId": currentUserId,
      });

      if (existingKeyword) {
        return res.status(409).json({
          success: false,
          message: `You already have a keyword "${keyword}". Please use a different keyword.`,
        });
      }

      // License check (if license info is available) - USER SPECIFIC
      if (req.licenseInfo) {
        const currentKeywords = await SearchKeyword.countDocuments({
          status: "active",
          "createdBy.userId": currentUserId,
        });
        if (currentKeywords >= req.licenseInfo.permissions.maxSearchKeywords) {
          return res.status(403).json({
            success: false,
            message: `Maximum ${req.licenseInfo.permissions.maxSearchKeywords} keywords allowed for ${req.licenseInfo.type} license`,
          });
        }
      }

      const currentUser = {
        userId: currentUserId, // This is now the actual MongoDB _id
        userName: currentUserInfo.username,
        userEmail: currentUserInfo.email,
        userIP: req.ip || req.connection.remoteAddress || "unknown",
        userAgent: (req.get("User-Agent") || "unknown").substring(0, 100), // Limit length
      };

      console.log(`🔑 Creating keyword for user:`, {
        userId: currentUser.userId,
        userName: currentUser.userName,
        userEmail: currentUser.userEmail,
      });

      const newKeyword = new SearchKeyword({
        keyword: keyword.trim(),
        connectMessage: connectMessage.trim(),
        directMessage: directMessage.trim(),
        status: "active",
        createdBy: currentUser,
        usageStats: {
          totalUses: 0,
          lastUsed: null,
          successfulConnections: 0,
        },
        alternativeMessages: {
          subjects: ["Professional Collaboration Opportunity"],
          connectMessages: [connectMessage.trim()],
          directMessages: [directMessage.trim()],
        },
      });

      await newKeyword.save();

      console.log(`✅ Added new keyword: ${newKeyword.keyword}`);

      res.status(201).json({
        success: true,
        message: "Keyword added successfully",
        data: newKeyword,
      });
    } catch (error) {
      console.error("❌ Add keyword error:", error);

      // Handle specific MongoDB errors
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Keyword already exists",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: Object.values(error.errors).map((e) => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to add keyword",
        error: error.message,
      });
    }
  },
);

// Simple Add Keyword API (for user ID based saving)
router.post("/add-keyword", async (req, res) => {
  console.log("🚀 ADD-KEYWORD ROUTE REACHED!");

  try {
    console.log("🔍 Full request body:", JSON.stringify(req.body, null, 2));

    const {
      keyword,
      subject,
      connectMessage,
      directMessage,
      status,
      userID,
      alternativeMessages,
      msgSetting,
    } = req.body;

    console.log("📝 Simple Add Keyword Request:", {
      keyword,
      subject,
      connectMessage: connectMessage?.substring(0, 30) + "...",
      directMessage: directMessage?.substring(0, 30) + "...",
      status,
      userID,
      alternativeMessages,
      msgSetting,
    });

    // Basic validation
    if (!keyword || !keyword.trim()) {
      return res.status(400).json({
        success: false,
        message: "Keyword is required",
      });
    }

    if (!connectMessage || !connectMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: "Connect message is required",
      });
    }

    if (!directMessage || !directMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: "Direct message is required",
      });
    }

    if (!userID || !userID.trim()) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Check for duplicate keyword for this user
    const existingKeyword = await SearchKeyword.findOne({
      keyword: { $regex: new RegExp(`^${keyword.trim()}$`, "i") },
      "createdBy.userId": userID,
    });

    if (existingKeyword) {
      return res.status(409).json({
        success: false,
        message: `Keyword "${keyword}" already exists for this user`,
      });
    }

    // Create new keyword with all fields
    const newKeyword = new SearchKeyword({
      keyword: keyword.trim(),
      subject: subject?.trim() || "Professional Collaboration Opportunity",
      connectMessage: connectMessage.trim(),
      directMessage: directMessage.trim(),
      status: status || "active",
      msgSetting: msgSetting || "normal", // Add msgSetting field
      createdBy: {
        userId: userID, // Use provided userID
        userName: "User", // Default name
        userEmail: "unknown",
        userIP: req.ip || "unknown",
        userAgent: req.get("User-Agent")?.substring(0, 100) || "unknown",
      },
      usageStats: {
        totalUses: 0,
        lastUsed: null,
        successfulConnections: 0,
      },
      alternativeMessages: alternativeMessages || {
        subjects: [subject?.trim() || "Professional Collaboration"],
        connectMessages: [connectMessage.trim()],
        directMessages: [directMessage.trim()],
      },
    });

    await newKeyword.save();

    console.log("✅ Complete keyword saved successfully:", {
      keyword: newKeyword.keyword,
      subject: newKeyword.subject,
      userID: userID,
      id: newKeyword._id,
    });

    res.status(201).json({
      success: true,
      message: "Keyword saved successfully!",
      data: {
        id: newKeyword._id,
        keyword: newKeyword.keyword,
        subject: newKeyword.subject,
        connectMessage: newKeyword.connectMessage,
        directMessage: newKeyword.directMessage,
        status: newKeyword.status,
        userID: userID,
        msgSetting: newKeyword.msgSetting,
        alternativeMessages: newKeyword.alternativeMessages,
        createdAt: newKeyword.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Simple add keyword error:", error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Keyword already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to save keyword",
      error: error.message,
    });
  }
});

// Update search keyword
router.put(
  "/keywords/:id",
  [
    body("keyword")
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage("Keyword must be 2-100 characters"),
    body("connectMessage")
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage("Connect message must be 10-500 characters"),
    body("directMessage")
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage("Direct message must be 10-500 characters"),
    body("msgSetting")
      .optional()
      .isIn(["normal", "alternative"])
      .withMessage("msgSetting must be 'normal' or 'alternative'"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const updatedKeyword = await SearchKeyword.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true },
      );

      if (!updatedKeyword) {
        return res.status(404).json({
          success: false,
          message: "Keyword not found",
        });
      }

      res.json({
        success: true,
        message: "Keyword updated successfully",
        data: updatedKeyword,
      });
    } catch (error) {
      console.error("❌ Update keyword error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update keyword",
      });
    }
  },
);

// Delete search keyword
router.delete("/keywords/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedKeyword = await SearchKeyword.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true },
    );

    if (!deletedKeyword) {
      return res.status(404).json({
        success: false,
        message: "Keyword not found",
      });
    }

    res.json({
      success: true,
      message: "Keyword deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete keyword error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete keyword",
    });
  }
});

// Toggle keyword status (Active/Inactive)
router.patch("/keywords/:id/toggle-status", async (req, res) => {
  try {
    const { id } = req.params;

    const keyword = await SearchKeyword.findById(id);

    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: "Keyword not found",
      });
    }

    // Toggle status
    keyword.status = keyword.status === "active" ? "inactive" : "active";
    await keyword.save();

    console.log(
      `✅ Keyword "${keyword.keyword}" status changed to: ${keyword.status}`,
    );

    res.json({
      success: true,
      message: `Keyword ${keyword.status === "active" ? "activated" : "deactivated"} successfully`,
      data: {
        id: keyword._id,
        keyword: keyword.keyword,
        status: keyword.status,
        createdBy: keyword.createdBy,
      },
    });
  } catch (error) {
    console.error("❌ Toggle keyword status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle keyword status",
    });
  }
});

// Get alternative messages for a keyword
router.get("/keywords/:id/alternative-messages", async (req, res) => {
  try {
    const { id } = req.params;

    const keyword = await SearchKeyword.findById(id);

    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: "Keyword not found",
      });
    }

    res.json({
      success: true,
      data: {
        keyword: keyword.keyword,
        subject: keyword.subject,
        connectMessage: keyword.connectMessage,
        directMessage: keyword.directMessage,
        alternativeMessages: keyword.alternativeMessages || {
          subjects: [],
          connectMessages: [],
          directMessages: [],
        },
        totalAlternatives: {
          subjects: keyword.alternativeMessages?.subjects?.length || 0,
          connectMessages:
            keyword.alternativeMessages?.connectMessages?.length || 0,
          directMessages:
            keyword.alternativeMessages?.directMessages?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get alternative messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get alternative messages",
    });
  }
});

// Add alternative message to a keyword
router.post("/keywords/:id/alternative-messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { type, message } = req.body; // type: 'subjects', 'connectMessages', 'directMessages'

    if (!type || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Type and message are required",
      });
    }

    const validTypes = ["subjects", "connectMessages", "directMessages"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid message type. Must be: subjects, connectMessages, or directMessages",
      });
    }

    const keyword = await SearchKeyword.findById(id);

    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: "Keyword not found",
      });
    }

    // Initialize alternativeMessages if it doesn't exist
    if (!keyword.alternativeMessages) {
      keyword.alternativeMessages = {
        subjects: [],
        connectMessages: [],
        directMessages: [],
      };
    }

    // Add the new message to the appropriate array
    if (!keyword.alternativeMessages[type]) {
      keyword.alternativeMessages[type] = [];
    }

    // Check for duplicates
    const messageExists = keyword.alternativeMessages[type].includes(
      message.trim(),
    );
    if (messageExists) {
      return res.status(400).json({
        success: false,
        message: "This alternative message already exists",
      });
    }

    keyword.alternativeMessages[type].push(message.trim());
    keyword.markModified("alternativeMessages");
    await keyword.save();

    res.json({
      success: true,
      message: "Alternative message added successfully",
      data: {
        keyword: keyword.keyword,
        alternativeMessages: keyword.alternativeMessages,
      },
    });
  } catch (error) {
    console.error("❌ Add alternative message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add alternative message",
    });
  }
});

// Delete alternative message from a keyword
router.delete("/keywords/:id/alternative-messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { type, index } = req.body;

    if (!type || index === undefined || index === null) {
      return res.status(400).json({
        success: false,
        message: "Type and index are required",
      });
    }

    const keyword = await SearchKeyword.findById(id);

    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: "Keyword not found",
      });
    }

    if (!keyword.alternativeMessages || !keyword.alternativeMessages[type]) {
      return res.status(400).json({
        success: false,
        message: "No alternative messages found for this type",
      });
    }

    if (index >= keyword.alternativeMessages[type].length || index < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid message index",
      });
    }

    keyword.alternativeMessages[type].splice(index, 1);
    keyword.markModified("alternativeMessages");
    await keyword.save();

    res.json({
      success: true,
      message: "Alternative message deleted successfully",
      data: {
        keyword: keyword.keyword,
        alternativeMessages: keyword.alternativeMessages,
      },
    });
  } catch (error) {
    console.error("❌ Delete alternative message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alternative message",
    });
  }
});

// ===== DAILY LIMITS =====

// Get daily limits
router.get("/limits", async (req, res) => {
  try {
    let limits = await DailyLimits.findOne();

    if (!limits) {
      // Create default limits based on license
      limits = new DailyLimits({
        maxConnections: req.licenseInfo.permissions.maxDailyConnections,
        maxDirectMessages: req.licenseInfo.permissions.maxDailyMessages,
      });
      await limits.save();
    }

    res.json({
      success: true,
      data: limits,
    });
  } catch (error) {
    console.error("❌ Get limits error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get daily limits",
    });
  }
});

// Update daily limits
router.put(
  "/limits",
  [
    body("maxConnections")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Max connections must be 1-100"),
    body("maxDirectMessages")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Max messages must be 1-50"),
    body("maxProfileViews")
      .optional()
      .isInt({ min: 10, max: 1000 })
      .withMessage("Max profile views must be 10-1000"),
    body("maxSearches")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Max searches must be 1-100"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const updateData = req.body;

      // Enforce license limits
      if (
        updateData.maxConnections &&
        updateData.maxConnections >
          req.licenseInfo.permissions.maxDailyConnections
      ) {
        updateData.maxConnections =
          req.licenseInfo.permissions.maxDailyConnections;
      }

      if (
        updateData.maxDirectMessages &&
        updateData.maxDirectMessages >
          req.licenseInfo.permissions.maxDailyMessages
      ) {
        updateData.maxDirectMessages =
          req.licenseInfo.permissions.maxDailyMessages;
      }

      const limits = await DailyLimits.findOneAndUpdate(
        {},
        { $set: updateData },
        { new: true, upsert: true },
      );

      res.json({
        success: true,
        message: "Daily limits updated successfully",
        data: limits,
      });
    } catch (error) {
      console.error("❌ Update limits error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update daily limits",
      });
    }
  },
);

// ===== MESSAGE STRATEGY =====

// Get message strategy
router.get("/message-strategy", async (req, res) => {
  try {
    let strategy = await MessageStrategy.findOne();

    if (!strategy) {
      // Create default strategy
      strategy = new MessageStrategy({
        mode: "mixed",
        directMessageChance: 30,
      });
      await strategy.save();
    }

    res.json({
      success: true,
      data: strategy,
    });
  } catch (error) {
    console.error("❌ Get message strategy error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get message strategy",
    });
  }
});

// Update message strategy
router.put(
  "/message-strategy",
  [
    body("mode")
      .optional()
      .isIn(["connection", "direct", "mixed", "connect_only", "direct_only"])
      .withMessage("Invalid mode"),
    body("directMessageChance")
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage("Direct message chance must be 0-100"),
    body("connectionMessageTemplate")
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage("Connection message template must be 10-500 characters"),
    body("directMessageTemplate")
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage("Direct message template must be 10-500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const updateData = req.body;

      const strategy = await MessageStrategy.findOneAndUpdate(
        {},
        { $set: updateData },
        { new: true, upsert: true },
      );

      res.json({
        success: true,
        message: "Message strategy updated successfully",
        data: strategy,
      });
    } catch (error) {
      console.error("❌ Update message strategy error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update message strategy",
      });
    }
  },
);

// ===== WARMUP SETTINGS =====

// Get warmup settings
router.get("/warmup", async (req, res) => {
  try {
    let warmup = await WarmupSettings.findOne();

    if (!warmup) {
      // Create default warmup settings
      warmup = new WarmupSettings({
        enabled: true,
        phase: "auto",
      });
      await warmup.save();
    }

    res.json({
      success: true,
      data: warmup,
    });
  } catch (error) {
    console.error("❌ Get warmup settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get warmup settings",
    });
  }
});

// Update warmup settings
router.put(
  "/warmup",
  [
    body("enabled")
      .optional()
      .isBoolean()
      .withMessage("Enabled must be boolean"),
    body("phase")
      .optional()
      .isIn(["auto", "week1", "week2", "week3", "week4plus"])
      .withMessage("Invalid phase"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const updateData = req.body;

      const warmup = await WarmupSettings.findOneAndUpdate(
        {},
        { $set: updateData },
        { new: true, upsert: true },
      );

      res.json({
        success: true,
        message: "Warmup settings updated successfully",
        data: warmup,
      });
    } catch (error) {
      console.error("❌ Update warmup settings error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update warmup settings",
      });
    }
  },
);

// ===== BULK SETTINGS =====

// Get all settings
router.get("/all", async (req, res) => {
  try {
    const [keywords, limits, messageStrategy, warmupSettings] =
      await Promise.all([
        SearchKeyword.find({ status: "active" }).sort({ createdAt: -1 }),
        DailyLimits.findOne(),
        MessageStrategy.findOne(),
        WarmupSettings.findOne(),
      ]);

    res.json({
      success: true,
      data: {
        keywords,
        limits,
        messageStrategy,
        warmupSettings,
        licenseInfo: req.licenseInfo,
      },
    });
  } catch (error) {
    console.error("❌ Get all settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get settings",
    });
  }
});

// ===== USER MANAGEMENT =====

// Create new user (for demo purposes)
router.post("/users", async (req, res) => {
  try {
    const { username, email, licenseType = "trial" } = req.body;

    // Check if user already exists
    const existingUser = await UserLicense.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create new user
    const newUser = new UserLicense({
      username: username || `User_${Date.now()}`,
      email,
      password: "default123", // In production, this should be hashed
      licenseType,
      isActive: true,
    });

    await newUser.save();

    res.json({
      success: true,
      message: "User created successfully",
      data: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        licenseType: newUser.licenseType,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    console.error("❌ Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const users = await UserLicense.find({})
      .select("username email licenseType isActive createdAt")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
});

module.exports = router;
