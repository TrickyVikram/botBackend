/**
 * USER LICENSE MODEL
 * 
 * Manages user license verification and permissions
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const UserLicenseSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(16).toString('hex')
  },
  
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // License Information
  licenseKey: {
    type: String,
    required: true,
    unique: true,
    default: () => 'LIC-' + crypto.randomBytes(16).toString('hex').toUpperCase()
  },
  
  licenseType: {
    type: String,
    enum: ['trial', 'basic', 'premium', 'enterprise'],
    default: 'trial'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // License Validity
  activatedAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    required: true,
    default: () => {
      // Default 30-day trial
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      return expiry;
    }
  },
  
  // Usage Permissions
  permissions: {
    maxDailyConnections: {
      type: Number,
      default: 10
    },
    maxDailyMessages: {
      type: Number,
      default: 5
    },
    maxSearchKeywords: {
      type: Number,
      default: 5
    },
    canUseAdvancedFeatures: {
      type: Boolean,
      default: false
    },
    canExportData: {
      type: Boolean,
      default: false
    },
    canUseAPI: {
      type: Boolean,
      default: false
    }
  },
  
  // Usage Statistics
  totalUsage: {
    connectionsUsed: {
      type: Number,
      default: 0
    },
    messagesUsed: {
      type: Number,
      default: 0
    },
    searchesPerformed: {
      type: Number,
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    }
  },
  
  // Account Status
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  
  deviceInfo: {
    lastDeviceId: String,
    lastIP: String,
    lastUserAgent: String
  },
  
  // Billing Information (optional)
  billing: {
    subscriptionId: String,
    paymentMethod: String,
    nextBillingDate: Date,
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  }
}, {
  timestamps: true
});

// Indexes
UserLicenseSchema.index({ licenseKey: 1 });
UserLicenseSchema.index({ email: 1 });
UserLicenseSchema.index({ expiresAt: 1 });

// Methods
UserLicenseSchema.methods.isLicenseValid = function() {
  return this.isActive && this.expiresAt > new Date();
};

UserLicenseSchema.methods.isLicenseExpired = function() {
  return this.expiresAt < new Date();
};

UserLicenseSchema.methods.getDaysRemaining = function() {
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

UserLicenseSchema.methods.canPerformAction = function(actionType) {
  if (!this.isLicenseValid()) return false;
  
  switch (actionType) {
    case 'connection':
      return this.totalUsage.connectionsUsed < this.permissions.maxDailyConnections;
    case 'message':
      return this.totalUsage.messagesUsed < this.permissions.maxDailyMessages;
    case 'advanced_features':
      return this.permissions.canUseAdvancedFeatures;
    case 'export_data':
      return this.permissions.canExportData;
    case 'api_access':
      return this.permissions.canUseAPI;
    default:
      return true;
  }
};

UserLicenseSchema.methods.incrementUsage = function(actionType) {
  switch (actionType) {
    case 'connection':
      this.totalUsage.connectionsUsed += 1;
      break;
    case 'message':
      this.totalUsage.messagesUsed += 1;
      break;
    case 'search':
      this.totalUsage.searchesPerformed += 1;
      break;
    case 'session':
      this.totalUsage.totalSessions += 1;
      break;
  }
  return this.save();
};

UserLicenseSchema.methods.updateLastLogin = function(deviceInfo = {}) {
  this.lastLoginAt = new Date();
  if (deviceInfo.deviceId) this.deviceInfo.lastDeviceId = deviceInfo.deviceId;
  if (deviceInfo.ip) this.deviceInfo.lastIP = deviceInfo.ip;
  if (deviceInfo.userAgent) this.deviceInfo.lastUserAgent = deviceInfo.userAgent;
  return this.save();
};

// Static methods
UserLicenseSchema.statics.findByLicenseKey = function(licenseKey) {
  return this.findOne({ licenseKey, isActive: true });
};

UserLicenseSchema.statics.createTrialLicense = function(userData) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30); // 30-day trial
  
  return this.create({
    ...userData,
    licenseType: 'trial',
    expiresAt: expiry,
    permissions: {
      maxDailyConnections: 5,
      maxDailyMessages: 3,
      maxSearchKeywords: 3,
      canUseAdvancedFeatures: false,
      canExportData: false,
      canUseAPI: false
    }
  });
};

UserLicenseSchema.statics.upgradeLicense = function(userId, licenseType, durationDays = 365) {
  const permissions = {
    basic: {
      maxDailyConnections: 15,
      maxDailyMessages: 10,
      maxSearchKeywords: 10,
      canUseAdvancedFeatures: true,
      canExportData: true,
      canUseAPI: false
    },
    premium: {
      maxDailyConnections: 50,
      maxDailyMessages: 25,
      maxSearchKeywords: 25,
      canUseAdvancedFeatures: true,
      canExportData: true,
      canUseAPI: true
    },
    enterprise: {
      maxDailyConnections: 100,
      maxDailyMessages: 50,
      maxSearchKeywords: 50,
      canUseAdvancedFeatures: true,
      canExportData: true,
      canUseAPI: true
    }
  };
  
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + durationDays);
  
  return this.findOneAndUpdate(
    { userId },
    {
      licenseType,
      expiresAt: expiry,
      permissions: permissions[licenseType],
      isActive: true
    },
    { new: true }
  );
};

module.exports = mongoose.model('UserLicense', UserLicenseSchema);
