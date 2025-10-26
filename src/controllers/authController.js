const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');

function signToken(user) {
	return jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET || 'secret', {
		expiresIn: process.env.JWT_EXPIRES_IN || '7d'
	});
}

function signRefreshToken(user) {
	return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret', {
		expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
	});
}

const register = async (req, res, next) => {
	try {
		const schema = Joi.object({
			name: Joi.string().required(),
			email: Joi.string().email().required(),
			password: Joi.string().min(6).required(),
			role: Joi.string().valid('parent', 'child', 'admin')
		});
		const value = await schema.validateAsync(req.body);
		const exists = await User.findOne({ email: value.email });
		if (exists) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
		const user = await User.create(value);
		const token = signToken(user);
		const refreshToken = signRefreshToken(user);
		const trialStatus = user.getTrialStatus();
		res.status(201).json({ 
			success: true, 
			data: { 
				token, 
				refreshToken, 
				user: { 
					id: user._id, 
					name: user.name, 
					email: user.email, 
					role: user.role,
					trialStatus: trialStatus
				} 
			} 
		});
	} catch (err) {
		next(err);
	}
};

const login = async (req, res, next) => {
	try {
		const schema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
		const { email, password } = await schema.validateAsync(req.body);
		const user = await User.findOne({ email }).select('+password');
		if (!user) return res.status(400).json({ success: false, message: 'Sai thông tin đăng nhập' });
		if (!user.isActive) return res.status(400).json({ success: false, message: 'Tài khoản đã bị khóa' });
		const ok = await user.comparePassword(password);
		if (!ok) return res.status(400).json({ success: false, message: 'Sai thông tin đăng nhập' });
		
		if (user.role !== 'admin' && user.isTrialAccount && !user.isActivated) {
			const trialStatus = user.getTrialStatus();
			if (!trialStatus.isValid) {
				return res.status(403).json({ 
					success: false, 
					message: 'Tài khoản dùng thử đã hết hạn. Vui lòng liên hệ admin để kích hoạt tài khoản.',
					trialStatus: trialStatus
				});
			}
		}
		
		user.lastLogin = new Date();
		await user.save();
		
		const token = signToken(user);
		const refreshToken = signRefreshToken(user);
		const trialStatus = user.getTrialStatus();
		
		res.json({ 
			success: true, 
			data: { 
				token, 
				refreshToken, 
				user: { 
					id: user._id, 
					name: user.name, 
					email: user.email, 
					role: user.role,
					profile: user.profile,
					settings: user.settings,
					trialStatus: trialStatus
				} 
			} 
		});
	} catch (err) {
		next(err);
	}
};

const logout = async (req, res) => {
	res.json({ success: true, message: 'Đã đăng xuất' });
};

const forgotPassword = async (req, res, next) => {
	try {
		const schema = Joi.object({ email: Joi.string().email().required() });
		const { email } = await schema.validateAsync(req.body);
		const user = await User.findOne({ email });
		if (!user) return res.status(200).json({ success: true, message: 'Nếu email tồn tại, liên kết đặt lại đã được gửi' });
		res.json({ success: true, message: 'Liên kết đặt lại mật khẩu (mô phỏng)' });
	} catch (err) {
		next(err);
	}
};

const resetPassword = async (req, res, next) => {
	try {
		const schema = Joi.object({ email: Joi.string().email().required(), newPassword: Joi.string().min(6).required() });
		const { email, newPassword } = await schema.validateAsync(req.body);
		const user = await User.findOne({ email }).select('+password');
		if (!user) return res.status(400).json({ success: false, message: 'Tài khoản không tồn tại' });
		user.password = newPassword;
		await user.save();
		res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
	} catch (err) {
		next(err);
	}
};

const refresh = async (req, res, next) => {
	try {
		const schema = Joi.object({ refreshToken: Joi.string().required() });
		const { refreshToken } = await schema.validateAsync(req.body);
		const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret');
		const user = await User.findById(payload.id);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
		const token = signToken(user);
		res.json({ success: true, data: { token } });
	} catch (err) {
		next(err);
	}
};

const updateProfile = async (req, res, next) => {
	try {
		const schema = Joi.object({
			name: Joi.string().optional(),
			profile: Joi.object({
				avatarUrl: Joi.string().uri().optional(),
				phone: Joi.string().optional(),
				address: Joi.string().optional(),
				dateOfBirth: Joi.date().optional(),
				gender: Joi.string().valid('male', 'female', 'other').optional()
			}).optional(),
			settings: Joi.object({
				notifications: Joi.boolean().optional(),
				language: Joi.string().optional(),
				timezone: Joi.string().optional()
			}).optional()
		});
		const updateData = await schema.validateAsync(req.body);
		const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });
		res.json({ success: true, data: { user } });
	} catch (err) {
		next(err);
	}
};

const changePassword = async (req, res, next) => {
	try {
		const schema = Joi.object({
			currentPassword: Joi.string().required(),
			newPassword: Joi.string().min(6).required()
		});
		const { currentPassword, newPassword } = await schema.validateAsync(req.body);
		const user = await User.findById(req.user.id).select('+password');
		const isCurrentPasswordValid = await user.comparePassword(currentPassword);
		if (!isCurrentPasswordValid) {
			return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
		}
		user.password = newPassword;
		await user.save();
		res.json({ success: true, message: 'Đổi mật khẩu thành công' });
	} catch (err) {
		next(err);
	}
};

const getProfile = async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id);
		const trialStatus = user.getTrialStatus();
		const userData = user.toObject();
		userData.trialStatus = trialStatus;
		userData.id = userData._id;
		res.json({ success: true, data: { user: userData } });
	} catch (err) {
		next(err);
	}
};

module.exports = { 
	register, 
	login, 
	logout, 
	forgotPassword, 
	resetPassword, 
	refresh, 
	updateProfile, 
	changePassword, 
	getProfile 
};
