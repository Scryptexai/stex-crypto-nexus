
const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    index: true
  },
  chain: {
    type: String,
    enum: ['risechain', 'megaeth'],
    required: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  totalValue: {
    type: String,
    required: true
  },
  fee: {
    type: String,
    default: '0'
  },
  gasUsed: {
    type: String,
    default: '0'
  },
  gasPrice: {
    type: String,
    default: '0'
  },
  txHash: {
    type: String,
    unique: true,
    sparse: true
  },
  blockNumber: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  slippage: {
    type: Number,
    default: 0
  },
  priceImpact: {
    type: Number,
    default: 0
  },
  socialNote: {
    type: String,
    maxlength: 280,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

TradeSchema.index({ user: 1, timestamp: -1 });
TradeSchema.index({ token: 1, timestamp: -1 });
TradeSchema.index({ type: 1, timestamp: -1 });
TradeSchema.index({ txHash: 1 });

module.exports = mongoose.model('Trade', TradeSchema);
