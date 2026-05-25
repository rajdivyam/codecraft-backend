const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // auto-delete after 5 minutes (TTL index)
  },
});

// One active OTP per phone
otpSchema.index({ phone: 1 });

const Otp = mongoose.model("Otp", otpSchema);

module.exports = Otp;
