
const mongoose = require('mongoose');

const BridgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sourceChain: {
    type: String,
    enum: ['risechain', 'megaeth', 'sepolia'],
    required: true
  },
  destinationChain: {
    type: String,
    enum: ['risechain', 'megaeth', 'sepolia'],
    required: true
  },
  sourceAddress: {
    type: String,
    required: true
  },
  destinationAddress: {
    type: String,
    required: true
  },
  tokenAddress: {
    type: String,
    default: null // null for native ETH
  },
  amount: {
    type: String,
    required: true
  },
  fee: {
    type: String,
    required: true
  },
  sourceTxHash: {
    type: String,
    required: true,
    unique: true
  },
  destinationTxHash: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'validating', 'challenged', 'confirmed', 'failed'],
    default: 'pending'
  },
  validatorSignatures: [{
    validator: String,
    signature: String,
    timestamp: Date
  }],
  challengePeriodEnd: {
    type: Date,
    default: null
  },
  estimatedCompletion: {
    type: Date,
    required: true
  },
  pointsEarned: {
    type: Number,
    default: 20
  }
}, {
  timestamps: true
});

BridgeSchema.index({ user: 1, createdAt: -1 });
BridgeSchema.index({ sourceTxHash: 1 });
BridgeSchema.index({ status: 1 });

module.exports = mongoose.model('Bridge', BridgeSchema);
