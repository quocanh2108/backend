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
		lastLogin: Date
	},
	{ timestamps: true }
);

UserSchema.pre('save', async function (next) {
	if (!this.isModified('password')) return next();
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
	next();
});

UserSchema.methods.comparePassword = function (candidate) {
	return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
