/**
 * WebSocket Connection Test Utility
 */

const io = require("socket.io-client");

const testConnection = () => {
  console.log("🔧 Testing WebSocket connection to backend...");

  const socket = io("ws://botbackend-qtjt.onrender.com", {
    transports: ["websocket", "polling"],
    timeout: 5000,
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected successfully!", socket.id);

    // Test ping
    socket.emit("ping");
  });

  socket.on("connection-confirmed", (data) => {
    console.log("✅ Connection confirmed:", data);
  });

  socket.on("pong", (data) => {
    console.log("🏓 Pong received:", data);
    process.exit(0);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Disconnected:", reason);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.log("⏰ Connection test timeout");
    process.exit(1);
  }, 10000);
};

testConnection();
