/**
 * MESSAGE ROUTES - LinkedIn message management
 *
 * Routes for managing messages, conversations, and connection requests
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const licenseMiddleware = require("../middleware/license");

// Mock data for development
let mockMessages = [
  {
    id: 1,
    from: {
      name: "John Smith",
      title: "Software Engineer",
      company: "Tech Corp",
      profileImage: null,
    },
    subject: "Great to connect!",
    message:
      "Hi there! Thanks for connecting with me on LinkedIn. I saw your background in software development and would love to discuss potential collaboration opportunities.",
    timestamp: "2024-01-15T14:30:00Z",
    status: "unread",
    type: "received",
    thread: [
      {
        id: 1,
        message:
          "Hi there! Thanks for connecting with me on LinkedIn. I saw your background in software development and would love to discuss potential collaboration opportunities.",
        timestamp: "2024-01-15T14:30:00Z",
        from: "them",
      },
    ],
  },
  {
    id: 2,
    from: {
      name: "Sarah Johnson",
      title: "Marketing Manager",
      company: "Digital Agency",
      profileImage: null,
    },
    subject: "Project collaboration",
    message:
      "Hello! I came across your profile and was impressed by your recent projects. Would you be interested in discussing a potential collaboration on a marketing campaign for a tech startup?",
    timestamp: "2024-01-14T11:20:00Z",
    status: "read",
    type: "received",
    thread: [
      {
        id: 1,
        message:
          "Hello! I came across your profile and was impressed by your recent projects. Would you be interested in discussing a potential collaboration on a marketing campaign for a tech startup?",
        timestamp: "2024-01-14T11:20:00Z",
        from: "them",
      },
      {
        id: 2,
        message:
          "Hi Sarah! Thank you for reaching out. I'd be very interested in learning more about the project. Could you share some more details?",
        timestamp: "2024-01-14T15:45:00Z",
        from: "me",
      },
    ],
  },
];

let mockDirectMessages = [
  {
    id: 1,
    contact: {
      name: "Mike Davis",
      title: "Product Manager",
      company: "StartupXYZ",
      profileImage: null,
    },
    lastMessage: {
      text: "Let's schedule a call next week to discuss the product roadmap.",
      timestamp: "2024-01-15T13:20:00Z",
      from: "them",
    },
    messageCount: 5,
    status: "unread",
    thread: [
      {
        id: 1,
        text: "Hi Mike! I noticed we share similar interests in product development.",
        timestamp: "2024-01-15T09:00:00Z",
        from: "me",
      },
      {
        id: 2,
        text: "Hello! Yes, I'd love to connect and share insights.",
        timestamp: "2024-01-15T10:15:00Z",
        from: "them",
      },
      {
        id: 3,
        text: "Let's schedule a call next week to discuss the product roadmap.",
        timestamp: "2024-01-15T13:20:00Z",
        from: "them",
      },
    ],
  },
];

let mockConnectionMessages = [
  {
    id: 1,
    contact: {
      name: "Alice Brown",
      title: "UX Designer",
      company: "Design Studio",
      profileImage: null,
      location: "San Francisco, CA",
      mutualConnections: 5,
    },
    status: "pending_sent",
    message:
      "Hi Alice! I noticed your excellent UX work and would love to connect.",
    timestamp: "2024-01-15T14:30:00Z",
    type: "outgoing",
  },
  {
    id: 2,
    contact: {
      name: "Robert Wilson",
      title: "Data Scientist",
      company: "AI Corp",
      profileImage: null,
      location: "New York, NY",
      mutualConnections: 12,
    },
    status: "pending_received",
    message:
      "Hello! I came across your profile and would like to connect to discuss AI trends.",
    timestamp: "2024-01-14T11:20:00Z",
    type: "incoming",
  },
];

// Apply middleware to all routes
router.use(authMiddleware);
router.use(licenseMiddleware);

/**
 * @route GET /api/messages
 * @desc Get all messages
 * @access Private (requires auth + license)
 */
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching messages");

    const {
      page = 1,
      limit = 10,
      status = "all",
      type = "all",
      search = "",
    } = req.query;

    // Filter messages
    let filteredMessages = mockMessages;

    if (status !== "all") {
      filteredMessages = filteredMessages.filter(
        (msg) => msg.status === status,
      );
    }

    if (type !== "all") {
      filteredMessages = filteredMessages.filter((msg) => msg.type === type);
    }

    if (search) {
      filteredMessages = filteredMessages.filter(
        (msg) =>
          msg.from.name.toLowerCase().includes(search.toLowerCase()) ||
          msg.subject.toLowerCase().includes(search.toLowerCase()) ||
          msg.message.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Sort by timestamp (newest first)
    filteredMessages.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: "Messages retrieved successfully",
      data: paginatedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredMessages.length,
        pages: Math.ceil(filteredMessages.length / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/messages/:id/reply
 * @desc Reply to a message
 * @access Private (requires auth + license)
 */
router.post("/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    console.log(`💬 Replying to message ${id}`);

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const messageIndex = mockMessages.findIndex((msg) => msg.id == id);
    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const originalMessage = mockMessages[messageIndex];

    // Add reply to thread
    const newReply = {
      id: originalMessage.thread.length + 1,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      from: "me",
    };

    originalMessage.thread.push(newReply);
    originalMessage.status = "replied";

    res.json({
      success: true,
      message: "Reply sent successfully",
      data: {
        messageId: id,
        reply: newReply,
        threadLength: originalMessage.thread.length,
      },
    });
  } catch (error) {
    console.error("❌ Error replying to message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reply to message",
      error: error.message,
    });
  }
});

/**
 * @route PATCH /api/messages/:id/status
 * @desc Update message status
 * @access Private (requires auth + license)
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📝 Updating message ${id} status to ${status}`);

    const validStatuses = ["read", "unread", "archived", "important"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const messageIndex = mockMessages.findIndex((msg) => msg.id == id);
    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    mockMessages[messageIndex].status = status;

    res.json({
      success: true,
      message: `Message status updated to ${status}`,
      data: mockMessages[messageIndex],
    });
  } catch (error) {
    console.error("❌ Error updating message status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update message status",
      error: error.message,
    });
  }
});

/**
 * @route PATCH /api/messages/:id/archive
 * @desc Archive a message
 * @access Private (requires auth + license)
 */
router.patch("/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗄️ Archiving message ${id}`);

    const messageIndex = mockMessages.findIndex((msg) => msg.id == id);
    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    mockMessages[messageIndex].status = "archived";

    res.json({
      success: true,
      message: "Message archived successfully",
      data: mockMessages[messageIndex],
    });
  } catch (error) {
    console.error("❌ Error archiving message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive message",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/messages/direct
 * @desc Get direct messages
 * @access Private (requires auth + license)
 */
router.get("/direct", async (req, res) => {
  try {
    console.log("📋 Fetching direct messages");

    const { page = 1, limit = 10, search = "" } = req.query;

    let filteredMessages = mockDirectMessages;

    if (search) {
      filteredMessages = filteredMessages.filter(
        (conv) =>
          conv.contact.name.toLowerCase().includes(search.toLowerCase()) ||
          conv.contact.company.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: "Direct messages retrieved successfully",
      data: paginatedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredMessages.length,
        pages: Math.ceil(filteredMessages.length / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching direct messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch direct messages",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/messages/direct
 * @desc Send a direct message
 * @access Private (requires auth + license)
 */
router.post("/direct", async (req, res) => {
  try {
    const { recipient, subject, message } = req.body;

    console.log("📤 Sending direct message");

    if (!recipient || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Recipient, subject, and message are required",
      });
    }

    const newMessage = {
      id: Math.max(...mockDirectMessages.map((m) => m.id), 0) + 1,
      contact: {
        name: recipient,
        title: "Unknown",
        company: "Unknown",
        profileImage: null,
      },
      lastMessage: {
        text: message.trim(),
        timestamp: new Date().toISOString(),
        from: "me",
      },
      messageCount: 1,
      status: "sent",
      thread: [
        {
          id: 1,
          text: message.trim(),
          timestamp: new Date().toISOString(),
          from: "me",
        },
      ],
    };

    mockDirectMessages.push(newMessage);

    res.status(201).json({
      success: true,
      message: "Direct message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("❌ Error sending direct message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send direct message",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/messages/direct/:contactId/reply
 * @desc Reply to a direct message
 * @access Private (requires auth + license)
 */
router.post("/direct/:contactId/reply", async (req, res) => {
  try {
    const { contactId } = req.params;
    const { message } = req.body;

    console.log(`💬 Replying to direct message from contact ${contactId}`);

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const conversationIndex = mockDirectMessages.findIndex(
      (conv) => conv.id == contactId,
    );
    if (conversationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const conversation = mockDirectMessages[conversationIndex];

    // Add reply to thread
    const newReply = {
      id: conversation.thread.length + 1,
      text: message.trim(),
      timestamp: new Date().toISOString(),
      from: "me",
    };

    conversation.thread.push(newReply);
    conversation.lastMessage = {
      text: message.trim(),
      timestamp: new Date().toISOString(),
      from: "me",
    };
    conversation.messageCount += 1;

    res.json({
      success: true,
      message: "Reply sent successfully",
      data: {
        contactId,
        reply: newReply,
        messageCount: conversation.messageCount,
      },
    });
  } catch (error) {
    console.error("❌ Error replying to direct message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reply to direct message",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/messages/connections
 * @desc Get connection messages
 * @access Private (requires auth + license)
 */
router.get("/connections", async (req, res) => {
  try {
    console.log("📋 Fetching connection messages");

    const { page = 1, limit = 10, status = "all", search = "" } = req.query;

    let filteredConnections = mockConnectionMessages;

    if (status !== "all") {
      filteredConnections = filteredConnections.filter(
        (conn) => conn.status === status,
      );
    }

    if (search) {
      filteredConnections = filteredConnections.filter(
        (conn) =>
          conn.contact.name.toLowerCase().includes(search.toLowerCase()) ||
          conn.contact.company.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedConnections = filteredConnections.slice(
      startIndex,
      endIndex,
    );

    res.json({
      success: true,
      message: "Connection messages retrieved successfully",
      data: paginatedConnections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredConnections.length,
        pages: Math.ceil(filteredConnections.length / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching connection messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch connection messages",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/messages/connections/request
 * @desc Send a connection request
 * @access Private (requires auth + license)
 */
router.post("/connections/request", async (req, res) => {
  try {
    const { recipientId, message } = req.body;

    console.log("🤝 Sending connection request");

    if (!recipientId || !message) {
      return res.status(400).json({
        success: false,
        message: "Recipient ID and message are required",
      });
    }

    const newConnectionRequest = {
      id: Math.max(...mockConnectionMessages.map((c) => c.id), 0) + 1,
      contact: {
        name: `User ${recipientId}`,
        title: "Professional",
        company: "Unknown Company",
        profileImage: null,
        location: "Unknown",
        mutualConnections: Math.floor(Math.random() * 20),
      },
      status: "pending_sent",
      message: message.trim(),
      timestamp: new Date().toISOString(),
      type: "outgoing",
    };

    mockConnectionMessages.push(newConnectionRequest);

    res.status(201).json({
      success: true,
      message: "Connection request sent successfully",
      data: newConnectionRequest,
    });
  } catch (error) {
    console.error("❌ Error sending connection request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send connection request",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/messages/connections/:id/accept
 * @desc Accept a connection request
 * @access Private (requires auth + license)
 */
router.post("/connections/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`✅ Accepting connection request ${id}`);

    const connectionIndex = mockConnectionMessages.findIndex(
      (conn) => conn.id == id,
    );
    if (connectionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    if (mockConnectionMessages[connectionIndex].status !== "pending_received") {
      return res.status(400).json({
        success: false,
        message: "Can only accept pending received connection requests",
      });
    }

    mockConnectionMessages[connectionIndex].status = "connected";
    mockConnectionMessages[connectionIndex].timestamp =
      new Date().toISOString();

    res.json({
      success: true,
      message: "Connection request accepted successfully",
      data: mockConnectionMessages[connectionIndex],
    });
  } catch (error) {
    console.error("❌ Error accepting connection request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept connection request",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/messages/connections/:id/decline
 * @desc Decline a connection request
 * @access Private (requires auth + license)
 */
router.post("/connections/:id/decline", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`❌ Declining connection request ${id}`);

    const connectionIndex = mockConnectionMessages.findIndex(
      (conn) => conn.id == id,
    );
    if (connectionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    if (mockConnectionMessages[connectionIndex].status !== "pending_received") {
      return res.status(400).json({
        success: false,
        message: "Can only decline pending received connection requests",
      });
    }

    mockConnectionMessages[connectionIndex].status = "declined";
    mockConnectionMessages[connectionIndex].timestamp =
      new Date().toISOString();

    res.json({
      success: true,
      message: "Connection request declined successfully",
      data: mockConnectionMessages[connectionIndex],
    });
  } catch (error) {
    console.error("❌ Error declining connection request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to decline connection request",
      error: error.message,
    });
  }
});

/**
 * @route PUT /api/messages/connections/settings
 * @desc Update connection settings
 * @access Private (requires auth + license)
 */
router.put("/connections/settings", async (req, res) => {
  try {
    const { autoConnect, defaultMessage } = req.body;

    console.log("⚙️ Updating connection settings");

    // In a real app, save to database
    const settings = {
      autoConnect: Boolean(autoConnect),
      defaultMessage: defaultMessage || "",
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: "Connection settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("❌ Error updating connection settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update connection settings",
      error: error.message,
    });
  }
});

module.exports = router;
