const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../services/emailService');

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
		}).messages({
			'string.email': 'Vui lòng nhập đúng định dạng email',
			'any.required': 'Vui lòng nhập {#label}',
			'string.min': 'Mật khẩu phải có ít nhất 6 ký tự'
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
		if (err.isJoi) {
			return res.status(400).json({
				success: false,
				message: err.details[0].message
			});
		}
		next(err);
	}
};

const login = async (req, res, next) => {
	try {
		const schema = Joi.object({ 
			email: Joi.string().email().required(), 
			password: Joi.string().required()
		}).messages({
			'string.email': 'Vui lòng nhập đúng định dạng email',
			'any.required': 'Vui lòng nhập {#label}'
		});
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
		if (err.isJoi) {
			return res.status(400).json({
				success: false,
				message: err.details[0].message
			});
		}
		next(err);
	}
};

const logout = async (req, res) => {
	res.json({ success: true, message: 'Đã đăng xuất' });
};

const forgotPassword = async (req, res, next) => {
	try {
		const schema = Joi.object({ 
			email: Joi.string().email().required()
		}).messages({
			'string.email': 'Vui lòng nhập đúng định dạng email',
			'any.required': 'Vui lòng nhập email'
		});
		const { email } = await schema.validateAsync(req.body);
		
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ 
				success: false, 
				message: 'Email không tồn tại trong hệ thống' 
			});
		}

		const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
		
		try {
			await OTP.deleteMany({ email });
			
			await OTP.create({
				email,
				otp: otpCode,
				attempts: 0,
				expiresAt
			});
		} catch (dbError) {
			return res.status(500).json({ 
				success: false, 
				message: 'Lỗi hệ thống. Vui lòng thử lại sau.' 
			});
		}

		try {
			const emailSent = await sendOTPEmail(email, otpCode);
			
			if (!emailSent) {
				await OTP.deleteMany({ email });
				return res.status(500).json({ 
					success: false, 
					message: 'Không thể gửi email. Vui lòng thử lại sau.' 
				});
			}
		} catch (emailError) {
			await OTP.deleteMany({ email });
			if (emailError.message && emailError.message.includes('EMAIL_USER and EMAIL_PASSWORD')) {
				return res.status(500).json({ 
					success: false, 
					message: 'Lỗi rồi! Kiểm tra cáu hình email!' 
				});
			}
			return res.status(500).json({ 
				success: false, 
				message: 'Không thể gửi email. Vui lòng kiểm tra cấu hình email.' 
			});
		}

		res.json({ 
			success: true, 
			message: 'Mã xác nhận đã được gửi đến email của bạn' 
		});
	} catch (err) {
		if (err.isJoi || err.name === 'ValidationError') {
			const message = err.details && err.details[0] ? err.details[0].message : err.message;
			return res.status(400).json({
				success: false,
				message: message
			});
		}
		next(err);
	}
};

const verifyOTP = async (req, res, next) => {
	try {
		const schema = Joi.object({ 
			email: Joi.string().email().required(), 
			otp: Joi.string().length(6).required()
		}).messages({
			'string.email': 'Vui lòng nhập đúng định dạng email',
			'any.required': 'Vui lòng nhập {#label}',
			'string.length': 'Mã OTP phải có 6 số'
		});
		const { email, otp } = await schema.validateAsync(req.body);
		
		const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });
		
		if (!otpRecord) {
			return res.status(400).json({ 
				success: false, 
				message: 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.' 
			});
		}

		if (otpRecord.lockedUntil && new Date() < otpRecord.lockedUntil) {
			const remainingSeconds = Math.ceil((otpRecord.lockedUntil - new Date()) / 1000);
			return res.status(400).json({ 
				success: false, 
				message: `Bạn đã nhập sai quá nhiều lần. Vui lòng đợi ${remainingSeconds} giây trước khi thử lại.`,
				lockedUntil: otpRecord.lockedUntil
			});
		}

		if (new Date() > otpRecord.expiresAt) {
			return res.status(400).json({ 
				success: false, 
				message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' 
			});
		}

		if (otpRecord.otp !== otp) {
			const newAttempts = otpRecord.attempts + 1;
			
			if (newAttempts >= 3) {
				const lockedUntil = new Date(Date.now() + 60 * 1000);
				await OTP.findByIdAndUpdate(otpRecord._id, { 
					attempts: newAttempts,
					lockedUntil
				});
				
				return res.status(400).json({ 
					success: false, 
					message: 'Bạn đã nhập sai mã OTP 3 lần. Vui lòng đợi 60 giây trước khi thử lại.',
					lockedUntil
				});
			}

			await OTP.findByIdAndUpdate(otpRecord._id, { attempts: newAttempts });
			
			return res.status(400).json({ 
				success: false, 
				message: `Mã OTP không đúng. Bạn còn ${3 - newAttempts} lần thử.`,
				remainingAttempts: 3 - newAttempts
			});
		}

		res.json({ 
			success: true, 
			message: 'Mã OTP hợp lệ' 
		});
	} catch (err) {
		if (err.isJoi || err.name === 'ValidationError') {
			const message = err.details && err.details[0] ? err.details[0].message : err.message;
			return res.status(400).json({
				success: false,
				message: message
			});
		}
		next(err);
	}
};

const resetPassword = async (req, res, next) => {
	try {
		const schema = Joi.object({ 
			email: Joi.string().email().required(), 
			otp: Joi.string().length(6).required(),
			newPassword: Joi.string().min(6).required()
		}).messages({
			'string.email': 'Vui lòng nhập đúng định dạng email',
			'any.required': 'Vui lòng nhập {#label}',
			'string.length': 'Mã OTP phải có 6 số',
			'string.min': 'Mật khẩu phải có ít nhất 6 ký tự'
		});
		const { email, otp, newPassword } = await schema.validateAsync(req.body);
		
		const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });
		
		if (!otpRecord) {
			return res.status(400).json({ 
				success: false, 
				message: 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.' 
			});
		}

		if (otpRecord.lockedUntil && new Date() < otpRecord.lockedUntil) {
			const remainingSeconds = Math.ceil((otpRecord.lockedUntil - new Date()) / 1000);
			return res.status(400).json({ 
				success: false, 
				message: `Bạn đã nhập sai quá nhiều lần. Vui lòng đợi ${remainingSeconds} giây trước khi thử lại.`,
				lockedUntil: otpRecord.lockedUntil
			});
		}

		if (new Date() > otpRecord.expiresAt) {
			return res.status(400).json({ 
				success: false, 
				message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' 
			});
		}

		if (otpRecord.otp !== otp) {
			const newAttempts = otpRecord.attempts + 1;
			
			if (newAttempts >= 3) {
				const lockedUntil = new Date(Date.now() + 60 * 1000);
				await OTP.findByIdAndUpdate(otpRecord._id, { 
					attempts: newAttempts,
					lockedUntil
				});
				
				return res.status(400).json({ 
					success: false, 
					message: 'Bạn đã nhập sai mã OTP 3 lần. Vui lòng đợi 60 giây trước khi thử lại.',
					lockedUntil
				});
			}

			await OTP.findByIdAndUpdate(otpRecord._id, { attempts: newAttempts });
			
			return res.status(400).json({ 
				success: false, 
				message: `Mã OTP không đúng. Bạn còn ${3 - newAttempts} lần thử.`,
				remainingAttempts: 3 - newAttempts
			});
		}

		const user = await User.findOne({ email }).select('+password');
		if (!user) {
			return res.status(400).json({ 
				success: false, 
				message: 'Tài khoản không tồn tại' 
			});
		}

		user.password = newPassword;
		await user.save();

		await OTP.deleteMany({ email });

		res.json({ 
			success: true, 
			message: 'Đặt lại mật khẩu thành công' 
		});
	} catch (err) {
		if (err.isJoi || err.name === 'ValidationError') {
			const message = err.details && err.details[0] ? err.details[0].message : err.message;
			return res.status(400).json({
				success: false,
				message: message
			});
		}
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
	verifyOTP,
	resetPassword, 
	refresh, 
	updateProfile, 
	changePassword, 
	getProfile 
};
