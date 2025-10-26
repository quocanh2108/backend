const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true, lowercase: true },
		password: { type: String, required: true, select: false },
		role: { type: String, enum: ['admin', 'parent', 'child'], default: 'parent' },
		profile: {
			avatarUrl: String,
			phone: String,
			address: String,
			dateOfBirth: Date,
			gender: { type: String, enum: ['male', 'female', 'other'] }
		},
		settings: {
			notifications: { type: Boolean, default: true },
			language: { type: String, default: 'vi' },
			timezone: { type: String, default: 'Asia/Ho_Chi_Minh' }
		},
		isActive: { type: Boolean, default: true },
		lastLogin: Date,
		isTrialAccount: { type: Boolean, default: true },
		trialStartDate: { type: Date, default: Date.now },
		trialEndDate: { type: Date },
		isActivated: { type: Boolean, default: false }
	},
	{ timestamps: true }
);

UserSchema.pre('save', async function (next) {
	if (!this.isModified('password')) return next();
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
	next();
});

UserSchema.pre('save', function (next) {
	if (this.isNew && this.role !== 'admin' && this.isTrialAccount && !this.trialEndDate) {
		this.trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
	}
	if (this.isNew && this.role === 'admin') {
		this.isTrialAccount = false;
		this.isActivated = true;
	}
	next();
});

UserSchema.methods.comparePassword = function (candidate) {
	return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.isTrialValid = function () {
	if (this.role === 'admin') {
		return true;
	}
	if (!this.isTrialAccount || this.isActivated) {
		return true;
	}
	return new Date() <= this.trialEndDate;
};

UserSchema.methods.getTrialStatus = function () {
	if (this.role === 'admin') {
		return {
			isTrial: false,
			isValid: true,
			daysRemaining: null,
			message: 'Tài khoản quản trị viên'
		};
	}
	
	if (!this.isTrialAccount || this.isActivated) {
		return {
			isTrial: false,
			isValid: true,
			daysRemaining: null,
			message: 'Tài khoản đã được kích hoạt'
		};
	}
	
	const now = new Date();
	const daysRemaining = Math.ceil((this.trialEndDate - now) / (1000 * 60 * 60 * 24));
	const isValid = now <= this.trialEndDate;
	
	return {
		isTrial: true,
		isValid,
		daysRemaining: Math.max(0, daysRemaining),
		message: isValid 
			? `Tài khoản dùng thử còn ${daysRemaining} ngày`
			: 'Tài khoản dùng thử đã hết hạn'
	};
};

module.exports = mongoose.model('User', UserSchema);
