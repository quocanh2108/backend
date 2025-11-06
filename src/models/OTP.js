const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema(
	{
		email: { type: String, required: true, index: true },
		otp: { type: String, required: true },
		attempts: { type: Number, default: 0 },
		lockedUntil: { type: Date, default: null },
		expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
	},
	{ timestamps: true }
);

OTPSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('OTP', OTPSchema);

