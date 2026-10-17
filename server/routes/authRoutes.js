const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, emergencyContact } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Name, email and password are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "resident", // roles can only be changed by an admin
      phone,
      emergencyContact,
    });

    await newUser.save();
    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    if (!user.isActive) {
      return res.status(403).json({ msg: "Your account has been deactivated. Contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET current logged-in user's full profile
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").populate("roomId", "roomNumber");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE own profile (name, phone, emergency contact, room preference, alert settings)
router.put("/me", protect, async (req, res) => {
  try {
    const { name, phone, emergencyContact, roomPreference, notifyEmail, notifySms } = req.body;
    const update = { name, phone, emergencyContact };
    if (roomPreference) {
      update.roomPreference = {
        roomType: ["single", "double", "dorm"].includes(roomPreference.roomType) ? roomPreference.roomType : "",
        notes: String(roomPreference.notes || "").slice(0, 300),
      };
    }
    if (typeof notifyEmail === "boolean") update.notifyEmail = notifyEmail;
    if (typeof notifySms === "boolean") update.notifySms = notifySms;

    const updated = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select("-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Admin: User Management =====

// GET all users (admin only)
router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").populate("roomId", "roomNumber");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a user's role (admin only)
router.put("/users/:id/role", protect, authorize("admin"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "staff", "resident"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ msg: "You cannot change your own role" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTIVATE / DEACTIVATE a user (admin only)
router.put("/users/:id/status", protect, authorize("admin"), async (req, res) => {
  try {
    const { isActive } = req.body;
    if (req.params.id === req.user.id) {
      return res.status(400).json({ msg: "You cannot deactivate your own account" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;