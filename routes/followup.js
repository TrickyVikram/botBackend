/**
 * FOLLOW-UP ROUTES - LinkedIn engagement automation
 *
 * Routes for managing follow-up accounts and engagement activities
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const licenseMiddleware = require("../middleware/license");

// Mock data for development
const mockLikeAccounts = [
  {
    id: 1,
    name: "John Smith",
    title: "Software Engineer",
    company: "Tech Corp",
    profileUrl: "https://linkedin.com/in/johnsmith",
    connectionDate: "2024-01-15T10:30:00Z",
    totalPosts: 25,
    likedPosts: 8,
    lastActivity: "2024-01-15T14:20:00Z",
    engagementRate: 85,
    status: "active",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    title: "Marketing Manager",
    company: "Digital Agency",
    profileUrl: "https://linkedin.com/in/sarahjohnson",
    connectionDate: "2024-01-14T09:15:00Z",
    totalPosts: 18,
    likedPosts: 12,
    lastActivity: "2024-01-15T11:45:00Z",
    engagementRate: 92,
    status: "active",
  },
];

const mockCommentAccounts = [
  {
    id: 1,
    name: "Mike Davis",
    title: "Product Manager",
    company: "StartupXYZ",
    profileUrl: "https://linkedin.com/in/mikedavis",
    connectionDate: "2024-01-13T16:20:00Z",
    totalPosts: 15,
    commentedPosts: 6,
    lastActivity: "2024-01-15T13:10:00Z",
    engagementRate: 78,
    status: "active",
    averageCommentLength: 45,
  },
];

// Apply middleware to all routes
router.use(authMiddleware);
router.use(licenseMiddleware);

/**
 * @route GET /api/followup/like-accounts
 * @desc Get all follow-up accounts for liking activities
 * @access Private (requires auth + license)
 */
router.get("/like-accounts", async (req, res) => {
  try {
    console.log("📋 Fetching follow-up like accounts");

    const { page = 1, limit = 10, status = "all", search = "" } = req.query;

    // Filter mock data based on query parameters
    let filteredAccounts = mockLikeAccounts;

    if (status !== "all") {
      filteredAccounts = filteredAccounts.filter(
        (account) => account.status === status,
      );
    }

    if (search) {
      filteredAccounts = filteredAccounts.filter(
        (account) =>
          account.name.toLowerCase().includes(search.toLowerCase()) ||
          account.company.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: "Follow-up like accounts retrieved successfully",
      data: paginatedAccounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredAccounts.length,
        pages: Math.ceil(filteredAccounts.length / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching follow-up like accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch follow-up like accounts",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/followup/like-accounts/:id/like
 * @desc Like a post from a follow-up account
 * @access Private (requires auth + license)
 */
router.post("/like-accounts/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const { postId } = req.body;

    console.log(`👍 Liking post ${postId} from account ${id}`);

    // Simulate like action
    const account = mockLikeAccounts.find((acc) => acc.id == id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Follow-up account not found",
      });
    }

    // Update account stats
    account.likedPosts += 1;
    account.lastActivity = new Date().toISOString();
    account.engagementRate = Math.min(
      100,
      account.engagementRate + Math.random() * 2,
    );

    res.json({
      success: true,
      message: `Successfully liked post from ${account.name}`,
      data: {
        accountId: id,
        postId,
        timestamp: new Date().toISOString(),
        newStats: {
          likedPosts: account.likedPosts,
          engagementRate: account.engagementRate,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error liking post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to like post",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/followup/comment-accounts
 * @desc Get all follow-up accounts for commenting activities
 * @access Private (requires auth + license)
 */
router.get("/comment-accounts", async (req, res) => {
  try {
    console.log("📋 Fetching follow-up comment accounts");

    const { page = 1, limit = 10, status = "all", search = "" } = req.query;

    // Filter mock data
    let filteredAccounts = mockCommentAccounts;

    if (status !== "all") {
      filteredAccounts = filteredAccounts.filter(
        (account) => account.status === status,
      );
    }

    if (search) {
      filteredAccounts = filteredAccounts.filter(
        (account) =>
          account.name.toLowerCase().includes(search.toLowerCase()) ||
          account.company.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: "Follow-up comment accounts retrieved successfully",
      data: paginatedAccounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredAccounts.length,
        pages: Math.ceil(filteredAccounts.length / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching follow-up comment accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch follow-up comment accounts",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/followup/comment-accounts/:id/comment
 * @desc Comment on a post from a follow-up account
 * @access Private (requires auth + license)
 */
router.post("/comment-accounts/:id/comment", async (req, res) => {
  try {
    const { id } = req.params;
    const { postId, comment } = req.body;

    console.log(`💬 Commenting on post ${postId} from account ${id}`);

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    // Simulate comment action
    const account = mockCommentAccounts.find((acc) => acc.id == id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Follow-up account not found",
      });
    }

    // Update account stats
    account.commentedPosts += 1;
    account.lastActivity = new Date().toISOString();
    account.engagementRate = Math.min(
      100,
      account.engagementRate + Math.random() * 3,
    );
    account.averageCommentLength = Math.round(
      (account.averageCommentLength + comment.length) / 2,
    );

    res.json({
      success: true,
      message: `Successfully commented on post from ${account.name}`,
      data: {
        accountId: id,
        postId,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
        newStats: {
          commentedPosts: account.commentedPosts,
          engagementRate: account.engagementRate,
          averageCommentLength: account.averageCommentLength,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error commenting on post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to comment on post",
      error: error.message,
    });
  }
});

module.exports = router;
