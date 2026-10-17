// DNS setup (optional)
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/authRoutes.js");
const roomRoutes = require("./routes/roomRoutes.js");
const maintenanceRoutes = require("./routes/maintenanceRoutes.js");
const billingRoutes = require("./routes/billingRoutes.js");
const residentRoutes = require("./routes/residentRoutes.js");
const statsRoutes = require("./routes/statsRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");
const expenseRoutes = require("./routes/expenseRoutes.js");
const reportRoutes = require("./routes/reportRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const { startScheduler } = require("./utils/scheduler.js");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

// Test route (also reports database status)
app.get("/api/test", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({ msg: "Backend working!", db: states[mongoose.connection.readyState] });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    startScheduler();
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});  