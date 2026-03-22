const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  note: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, {
  timestamps: true
});

settlementSchema.index({ from: 1, to: 1 });

module.exports = mongoose.model('Settlement', settlementSchema);
