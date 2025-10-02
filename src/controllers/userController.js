const Joi = require('joi');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const listUsers = async (req, res, next) => {
	try {
		const { page = 1, limit = 20, role, isActive, search } = req.query;
		const filter = {};
		if (role) filter.role = role;
		if (isActive !== undefined) filter.isActive = isActive === 'true';
		if (search) {
			filter.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ email: { $regex: search, $options: 'i' } }
			];
		}

		const users = await User.find(filter)
			.select('-password')
			.sort({ createdAt: -1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));

		const total = await User.countDocuments(filter);

		res.json({
			success: true,
			data: users,
			pagination: {
				total,
				page: parseInt(page),
				limit: parseInt(limit),
				pages: Math.ceil(total / parseInt(limit))
			}
		});
	} catch (e) {
		next(e);
	}
};

const getUserById = async (req, res, next) => {
	try {
		const user = await User.findById(req.params.id).select('-password');
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}
		res.json({ success: true, data: user });
	} catch (e) {
		next(e);
	}
};

const createUser = async (req, res, next) => {
	try {
		const schema = Joi.object({
			name: Joi.string().required(),
			email: Joi.string().email().required(),
			password: Joi.string().min(6).required(),
			role: Joi.string().valid('admin', 'parent', 'child').required(),
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

		const userData = await schema.validateAsync(req.body);
		const user = await User.create(userData);
		res.status(201).json({ success: true, data: user });
	} catch (e) {
		next(e);
	}
};

const updateUser = async (req, res, next) => {
	try {
		const schema = Joi.object({
			name: Joi.string().optional(),
			email: Joi.string().email().optional(),
			role: Joi.string().valid('admin', 'parent', 'child').optional(),
			isActive: Joi.boolean().optional(),
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
		const user = await User.findByIdAndUpdate(
			req.params.id,
			updateData,
			{ new: true }
		).select('-password');

		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		res.json({ success: true, data: user });
	} catch (e) {
		next(e);
	}
};

const deleteUser = async (req, res, next) => {
	try {
		const user = await User.findByIdAndDelete(req.params.id);
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}
		res.json({ success: true, message: 'User deleted successfully' });
	} catch (e) {
		next(e);
	}
};

const resetUserPassword = async (req, res, next) => {
	try {
		const schema = Joi.object({
			newPassword: Joi.string().min(6).required()
		});
		const { newPassword } = await schema.validateAsync(req.body);

		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		user.password = newPassword;
		await user.save();

		res.json({ success: true, message: 'Password reset successfully' });
	} catch (e) {
		next(e);
	}
};

module.exports = {
	listUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	resetUserPassword
};