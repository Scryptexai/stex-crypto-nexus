
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    trim: true,
    maxlength: 32
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 200,
    default: ''
  },
  reputation: {
    type: Number,
    default: 0,
    min: 0
  },
  totalVolume: {
    type: String,
    default: '0'
  },
  totalTrades: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: String,
    default: '0'
  },
  socialScore: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    },
    notifications: {
      trades: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      graduation: { type: Boolean, default: true }
    }
  },
  stats: {
    bridgeTransactions: { type: Number, default: 0 },
    swapTransactions: { type: Number, default: 0 },
    tokensCreated: { type: Number, default: 0 },
    portfolioValue: { type: String, default: '0' }
  }
}, {
  timestamps: true
});

UserSchema.index({ address: 1 });
UserSchema.index({ reputation: -1 });
UserSchema.index({ totalVolume: -1 });

module.exports = mongoose.model('User', UserSchema);
