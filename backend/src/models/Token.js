
const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  symbol: {
    type: String,
    required: true,
    maxlength: 10
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  image: {
    type: String,
    default: null
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chain: {
    type: String,
    enum: ['risechain', 'megaeth'],
    required: true
  },
  bondingCurve: {
    type: String,
    required: true
  },
  totalSupply: {
    type: String,
    default: '1000000000000000000000000000' // 1B tokens
  },
  maxSupply: {
    type: String,
    default: '1000000000000000000000000000'
  },
  currentPrice: {
    type: String,
    default: '0'
  },
  marketCap: {
    type: String,
    default: '0'
  },
  volume24h: {
    type: String,
    default: '0'
  },
  volumeAllTime: {
    type: String,
    default: '0'
  },
  trades24h: {
    type: Number,
    default: 0
  },
  tradesAllTime: {
    type: Number,
    default: 0
  },
  holders: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isGraduated: {
    type: Boolean,
    default: false
  },
  graduatedAt: {
    type: Date,
    default: null
  },
  trendingScore: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['meme', 'utility', 'gaming', 'defi', 'nft', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    maxlength: 20
  }],
  socialLinks: {
    website: String,
    twitter: String,
    telegram: String,
    discord: String
  },
  metrics: {
    priceChange24h: { type: Number, default: 0 },
    priceChange7d: { type: Number, default: 0 },
    uniqueTraders: { type: Number, default: 0 },
    averageTradeSize: { type: String, default: '0' },
    liquidityDepth: { type: String, default: '0' }
  }
}, {
  timestamps: true
});

TokenSchema.index({ address: 1, chain: 1 });
TokenSchema.index({ creator: 1 });
TokenSchema.index({ trendingScore: -1 });
TokenSchema.index({ volume24h: -1 });
TokenSchema.index({ isActive: 1 });
TokenSchema.index({ isGraduated: 1 });

module.exports = mongoose.model('Token', TokenSchema);
