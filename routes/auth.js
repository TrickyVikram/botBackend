
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const UserLicense = require("../models/UserLicense");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";

/* =========================================================
   REGISTER
========================================================= */

router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be 3-30 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers, and underscore"),

    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),

    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
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

      const { username, email, password } = req.body;

      // Check existing user
      const existingUser = await UserLicense.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists with this email or username",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create trial license
      const newUser = await UserLicense.createTrialLicense({
        username,
        email,
        password: hashedPassword,
      });

      // ✅ FIXED JWT (added userIDs)
      const token = jwt.sign(
        {
          userId: newUser._id,        // Mongo ObjectId
          userIDs: newUser.userId,    // Custom userId
          licenseKey: newUser.licenseKey,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully with trial license",
        data: {
          token,
          user: {
            userId: newUser.userId,
            mongoId: newUser._id,
            username: newUser.username,
            email: newUser.email,
            licenseKey: newUser.licenseKey,
            licenseType: newUser.licenseType,
            expiresAt: newUser.expiresAt,
            daysRemaining: newUser.getDaysRemaining(),
            permissions: newUser.permissions,
          },
        },
      });
    } catch (error) {
      console.error("❌ Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Registration failed",
      });
    }
  }
);

/* =========================================================
   LOGIN
========================================================= */

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
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

      const { email, password } = req.body;

      const user = await UserLicense.findOne({ email });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      if (!user.isLicenseValid()) {
        return res.status(403).json({
          success: false,
          message: "License expired or inactive",
          licenseStatus: {
            isExpired: user.isLicenseExpired(),
            daysRemaining: user.getDaysRemaining(),
            licenseType: user.licenseType,
            expiresAt: user.expiresAt,
          },
        });
      }

      await user.updateLastLogin({
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // ✅ FIXED JWT (added userIDs)
      const token = jwt.sign(
        {
          userId: user._id,       // Mongo ObjectId
          userIDs: user.userId,   // Custom userId
          licenseKey: user.licenseKey,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            userId: user.userId,
            mongoId: user._id,
            username: user.username,
            email: user.email,
            licenseKey: user.licenseKey,
            licenseType: user.licenseType,
            expiresAt: user.expiresAt,
            daysRemaining: user.getDaysRemaining(),
            permissions: user.permissions,
            totalUsage: user.totalUsage,
            lastLoginAt: user.lastLoginAt,
          },
        },
      });
    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  }
);

/* =========================================================
   VERIFY LICENSE
========================================================= */

router.post(
  "/verify-license",
  [body("licenseKey").notEmpty().withMessage("License key required")],
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

      const { licenseKey } = req.body;

      const user = await UserLicense.findByLicenseKey(licenseKey);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Invalid license key",
        });
      }

      res.json({
        success: true,
        message: "License verified successfully",
        data: {
          isValid: user.isLicenseValid(),
          licenseType: user.licenseType,
          username: user.username,
          expiresAt: user.expiresAt,
          daysRemaining: user.getDaysRemaining(),
          permissions: user.permissions,
        },
      });
    } catch (error) {
      console.error("❌ License verification error:", error);
      res.status(500).json({
        success: false,
        message: "License verification failed",
      });
    }
  }
);

module.exports = router;
