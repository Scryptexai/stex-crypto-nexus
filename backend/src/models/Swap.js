
const mongoose = require('mongoose');

const SwapSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chain: {
    type: String,
    enum: ['risechain', 'megaeth'],
    required: true
  },
  tokenIn: {
    address: { type: String, required: true },
    symbol: { type: String, required: true },
    amount: { type: String, required: true }
  },
  tokenOut: {
    address: { type: String, required: true },
    symbol: { type: String, required: true },
    amount: { type: String, required: true }
  },
  route: [{
    tokenIn: String,
    tokenOut: String,
    fee: Number,
    pool: String
  }],
  slippage: {
    type: Number,
    required: true
  },
  priceImpact: {
    type: Number,
    default: 0
  },
  fee: {
    type: String,
    required: true
  },
  txHash: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  pointsEarned: {
    type: Number,
    default: 15
  }
}, {
  timestamps: true
});

SwapSchema.index({ user: 1, createdAt: -1 });
SwapSchema.index({ txHash: 1 });

module.exports = mongoose.model('Swap', SwapSchema);
