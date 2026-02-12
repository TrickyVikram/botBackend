/**
 * AUTHENTICATION ROUTES
 *
 * User registration, login, and license management
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const UserLicense = require("../models/UserLicense");

const router = express.Router();

// Register new user
router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be 3-30 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscore",
      ),
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
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { username, email, password } = req.body;

      // Check if user already exists
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

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser._id, licenseKey: newUser.licenseKey },
        process.env.JWT_SECRET || "default-secret-key",
        { expiresIn: "7d" },
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully with trial license",
        data: {
          token,
          user: {
            userId: newUser.userId,
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
  },
);

// Login user
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
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await UserLicense.findOne({ email });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if license is valid
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

      // Update last login
      await user.updateLastLogin({
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, licenseKey: user.licenseKey },
        process.env.JWT_SECRET || "default-secret-key",
        { expiresIn: "7d" },
      );

      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            userId: user.userId,
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
  },
);

// Verify license key
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
  },
);

module.exports = router;
