/**
 * POST ROUTES - LinkedIn post management
 *
 * Routes for managing post drafts and published content
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const licenseMiddleware = require("../middleware/license");

// Mock data for development
let mockPostDrafts = [
  {
    id: 1,
    title: "The Future of AI in Software Development",
    content:
      "Artificial Intelligence is transforming how we write and maintain code. From automated testing to intelligent code completion, AI tools are becoming indispensable for modern developers. What are your thoughts on AI's role in programming? #AI #SoftwareDevelopment #Technology",
    category: "Technology",
    tags: ["AI", "Software", "Development", "Technology"],
    status: "draft",
    wordCount: 45,
    scheduledFor: null,
    createdAt: "2024-01-15T09:30:00Z",
    updatedAt: "2024-01-15T09:30:00Z",
  },
  {
    id: 2,
    title: "Tips for Effective Remote Team Management",
    content:
      "Managing remote teams requires a different set of skills than traditional in-person management. Here are 5 key strategies I've learned: 1. Clear communication channels 2. Regular check-ins 3. Trust and autonomy 4. Digital collaboration tools 5. Virtual team building. What works best for your team? #RemoteWork #Management #Leadership",
    category: "Leadership",
    tags: ["Remote Work", "Management", "Leadership", "Teams"],
    status: "draft",
    wordCount: 62,
    scheduledFor: "2024-01-16T14:00:00Z",
    createdAt: "2024-01-14T16:20:00Z",
    updatedAt: "2024-01-15T10:15:00Z",
  },
];

let mockPostedContent = [
  {
    id: 1,
    title: "LinkedIn Growth Strategies That Actually Work",
    content:
      "After 2 years of consistent posting and engagement, here's what I've learned about growing on LinkedIn: 1. Consistency beats perfection 2. Engage genuinely with others 3. Share valuable insights, not just achievements 4. Use storytelling to connect 5. Be authentic in your voice. The result? 300% follower growth and meaningful connections. #LinkedInGrowth #PersonalBranding #Networking",
    category: "Business",
    tags: ["LinkedIn", "Growth", "Networking", "Personal Branding"],
    publishedAt: "2024-01-14T10:00:00Z",
    engagement: {
      likes: 127,
      comments: 23,
      shares: 8,
      views: 2840,
      clickThroughRate: 4.2,
      engagementRate: 5.6,
    },
    performance: "high",
  },
  {
    id: 2,
    title: "The Power of Mentorship in Tech Careers",
    content:
      "Finding the right mentor changed my career trajectory completely. A good mentor doesn't just give advice - they challenge your thinking, open doors, and help you see blind spots. For those looking for mentorship: be specific about what you want to learn, respect their time, and always follow through. For potential mentors: remember the impact someone had on you and pay it forward. #Mentorship #TechCareers #ProfessionalGrowth",
    category: "Career",
    tags: ["Mentorship", "Tech Careers", "Growth", "Learning"],
    publishedAt: "2024-01-12T15:30:00Z",
    engagement: {
      likes: 89,
      comments: 15,
      shares: 12,
      views: 1950,
      clickThroughRate: 3.8,
      engagementRate: 5.9,
    },
    performance: "high",
  },
];

// Apply middleware to all routes
router.use(authMiddleware);
router.use(licenseMiddleware);

/**
 * @route GET /api/posts/drafts
 * @desc Get all post drafts
 * @access Private (requires auth + license)
 */
router.get("/drafts", async (req, res) => {
  try {
    console.log("📋 Fetching post drafts");

    const {
      page = 1,
      limit = 10,
      category = "all",
      status = "all",
      search = "",
    } = req.query;

    // Filter drafts
    let filteredDrafts = mockPostDrafts;

    if (category !== "all") {
      filteredDrafts = filteredDrafts.filter(
        (draft) => draft.category.toLowerCase() === category.toLowerCase(),
      );
    }

    if (status !== "all") {
      filteredDrafts = filteredDrafts.filter(
        (draft) => draft.status === status,
      );
    }

    if (search) {
      filteredDrafts = filteredDrafts.filter(
        (draft) =>
          draft.title.toLowerCase().includes(search.toLowerCase()) ||
          draft.content.toLowerCase().includes(search.toLowerCase()) ||
          draft.tags.some((tag) =>
            tag.toLowerCase().includes(search.toLowerCase()),
          ),
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedDrafts = filteredDrafts.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: "Post drafts retrieved successfully",
      data: paginatedDrafts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredDrafts.length,
        pages: Math.ceil(filteredDrafts.length / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching post drafts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch post drafts",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/posts/drafts
 * @desc Create a new post draft
 * @access Private (requires auth + license)
 */
router.post("/drafts", async (req, res) => {
  try {
    const { title, content, category, tags, scheduledFor } = req.body;

    console.log("✏️ Creating new post draft");

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const newDraft = {
      id: Math.max(...mockPostDrafts.map((d) => d.id), 0) + 1,
      title: title.trim(),
      content: content.trim(),
      category: category || "General",
      tags: tags || [],
      status: "draft",
      wordCount: content.trim().split(/\s+/).length,
      scheduledFor: scheduledFor || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockPostDrafts.push(newDraft);

    res.status(201).json({
      success: true,
      message: "Post draft created successfully",
      data: newDraft,
    });
  } catch (error) {
    console.error("❌ Error creating post draft:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create post draft",
      error: error.message,
    });
  }
});

/**
 * @route PUT /api/posts/drafts/:id
 * @desc Update a post draft
 * @access Private (requires auth + license)
 */
router.put("/drafts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, scheduledFor } = req.body;

    console.log(`📝 Updating post draft ${id}`);

    const draftIndex = mockPostDrafts.findIndex((draft) => draft.id == id);
    if (draftIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post draft not found",
      });
    }

    const updatedDraft = {
      ...mockPostDrafts[draftIndex],
      title: title?.trim() || mockPostDrafts[draftIndex].title,
      content: content?.trim() || mockPostDrafts[draftIndex].content,
      category: category || mockPostDrafts[draftIndex].category,
      tags: tags || mockPostDrafts[draftIndex].tags,
      scheduledFor:
        scheduledFor !== undefined
          ? scheduledFor
          : mockPostDrafts[draftIndex].scheduledFor,
      wordCount: (content?.trim() || mockPostDrafts[draftIndex].content).split(
        /\s+/,
      ).length,
      updatedAt: new Date().toISOString(),
    };

    mockPostDrafts[draftIndex] = updatedDraft;

    res.json({
      success: true,
      message: "Post draft updated successfully",
      data: updatedDraft,
    });
  } catch (error) {
    console.error("❌ Error updating post draft:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update post draft",
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/posts/drafts/:id
 * @desc Delete a post draft
 * @access Private (requires auth + license)
 */
router.delete("/drafts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting post draft ${id}`);

    const draftIndex = mockPostDrafts.findIndex((draft) => draft.id == id);
    if (draftIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post draft not found",
      });
    }

    const deletedDraft = mockPostDrafts.splice(draftIndex, 1)[0];

    res.json({
      success: true,
      message: "Post draft deleted successfully",
      data: deletedDraft,
    });
  } catch (error) {
    console.error("❌ Error deleting post draft:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete post draft",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/posts/drafts/:id/publish
 * @desc Publish a post draft
 * @access Private (requires auth + license)
 */
router.post("/drafts/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;
    const { publishNow = true, scheduledFor = null } = req.body;

    console.log(`🚀 Publishing post draft ${id}`);

    const draftIndex = mockPostDrafts.findIndex((draft) => draft.id == id);
    if (draftIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post draft not found",
      });
    }

    const draft = mockPostDrafts[draftIndex];

    // Simulate publishing
    const publishedPost = {
      ...draft,
      publishedAt: publishNow ? new Date().toISOString() : scheduledFor,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        clickThroughRate: 0,
        engagementRate: 0,
      },
      performance: "pending",
    };

    // Add to posted content if publishing now
    if (publishNow) {
      mockPostedContent.push(publishedPost);
      mockPostDrafts.splice(draftIndex, 1); // Remove from drafts
    } else {
      draft.status = "scheduled";
      draft.scheduledFor = scheduledFor;
      draft.updatedAt = new Date().toISOString();
    }

    res.json({
      success: true,
      message: publishNow
        ? "Post published successfully"
        : "Post scheduled successfully",
      data: publishedPost,
    });
  } catch (error) {
    console.error("❌ Error publishing post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish post",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/posts/published
 * @desc Get all published posts
 * @access Private (requires auth + license)
 */
router.get("/published", async (req, res) => {
  try {
    console.log("📋 Fetching published posts");

    const {
      page = 1,
      limit = 10,
      category = "all",
      performance = "all",
      dateFrom = null,
      dateTo = null,
      search = "",
    } = req.query;

    // Filter published posts
    let filteredPosts = mockPostedContent;

    if (category !== "all") {
      filteredPosts = filteredPosts.filter(
        (post) => post.category.toLowerCase() === category.toLowerCase(),
      );
    }

    if (performance !== "all") {
      filteredPosts = filteredPosts.filter(
        (post) => post.performance === performance,
      );
    }

    if (dateFrom) {
      filteredPosts = filteredPosts.filter(
        (post) => new Date(post.publishedAt) >= new Date(dateFrom),
      );
    }

    if (dateTo) {
      filteredPosts = filteredPosts.filter(
        (post) => new Date(post.publishedAt) <= new Date(dateTo),
      );
    }

    if (search) {
      filteredPosts = filteredPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(search.toLowerCase()) ||
          post.content.toLowerCase().includes(search.toLowerCase()) ||
          post.tags.some((tag) =>
            tag.toLowerCase().includes(search.toLowerCase()),
          ),
      );
    }

    // Sort by published date (newest first)
    filteredPosts.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: "Published posts retrieved successfully",
      data: paginatedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredPosts.length,
        pages: Math.ceil(filteredPosts.length / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching published posts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch published posts",
      error: error.message,
    });
  }
});

module.exports = router;
