const Joi = require('joi');
const Child = require('../models/Child');

const listChildren = async (req, res, next) => {
	try {
		const query = req.user.role === 'parent' ? { parent: req.user.id } : {};
		const children = await Child.find(query).populate('parent', 'name email');
		res.json({ success: true, data: children });
	} catch (e) {
		next(e);
	}
};

const createChild = async (req, res, next) => {
	try {
		const schema = Joi.object({
			name: Joi.string().required(),
			email: Joi.string().email().required(),
			age: Joi.number().integer().min(3).max(18).required(),
			gender: Joi.string().valid('male', 'female', 'other').required(),
			avatarUrl: Joi.string().uri().optional(),
			learningLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
			preferences: Joi.array().items(Joi.string()).optional(),
			inviteMessage: Joi.string().optional(),
			isInvitation: Joi.boolean().optional()
		});
		const value = await schema.validateAsync(req.body);
		
		if (value.isInvitation && value.email) {
			const Invitation = require('../models/Invitation');
			const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			
			const invitation = await Invitation.create({
				parent: req.user.id,
				childEmail: value.email,
				childName: value.name,
				invitationCode: invitationCode,
				message: value.inviteMessage || 'Bạn được mời tham gia hệ thống học tập',
				status: 'pending'
			});
			
			return res.status(201).json({ 
				success: true, 
				message: 'Lời mời đã được gửi đến email',
				data: { invitation }
			});
		}
		
		const User = require('../models/User');
		const existingUser = await User.findOne({ email: value.email, role: 'child' });
		
		if (existingUser) {
			const existingChild = await Child.findOne({ email: value.email });
			
			if (existingChild) {
				if (existingChild.parent.toString() === req.user.id) {
					return res.status(400).json({
						success: false,
						message: 'Trẻ này đã được thêm vào tài khoản của bạn'
					});
				}
				
				if (existingChild.parent && existingChild.parent.toString() !== req.user.id) {
					return res.status(400).json({
						success: false,
						message: 'Trẻ này đã được thêm vào tài khoản phụ huynh khác'
					});
				}
			}
			
			const childData = {
				_id: existingUser._id,
				name: value.name,
				email: value.email,
				age: value.age,
				gender: value.gender,
				avatarUrl: value.avatarUrl,
				learningLevel: value.learningLevel || 'beginner',
				preferences: value.preferences || [],
				parent: req.user.id,
				createdBy: req.user.id,
				isActive: true
			};
			
			let child;
			if (existingChild) {
				child = await Child.findByIdAndUpdate(existingChild._id, childData, { new: true });
			} else {
				child = await Child.create(childData);
			}
			
			return res.status(200).json({
				success: true,
				message: 'Đã gắn trẻ hiện có vào tài khoản của bạn',
				data: child
			});
		}
		
		const child = await Child.create({
			name: value.name,
			email: value.email,
			age: value.age,
			gender: value.gender,
			avatarUrl: value.avatarUrl,
			learningLevel: value.learningLevel || 'beginner',
			preferences: value.preferences || [],
			parent: req.user.id,
			createdBy: req.user.id,
			isActive: true
		});
		
		res.status(201).json({ 
			success: true, 
			message: 'Đã tạo trẻ mới thành công',
			data: child 
		});
	} catch (e) {
		next(e);
	}
};

const updateChild = async (req, res, next) => {
	try {
		const schema = Joi.object({ 
			name: Joi.string().optional(), 
			email: Joi.string().email().optional(),
			age: Joi.number().integer().min(3).max(18).optional(),
			gender: Joi.string().valid('male', 'female', 'other').optional(),
			avatarUrl: Joi.string().uri().optional(),
			learningLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
			preferences: Joi.array().items(Joi.string()).optional()
		});
		const value = await schema.validateAsync(req.body);
		const child = await Child.findOneAndUpdate({ _id: req.params.id, parent: req.user.id }, value, { new: true });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		res.json({ success: true, data: child });
	} catch (e) {
		next(e);
	}
};

const deleteChild = async (req, res, next) => {
	try {
		const child = await Child.findOneAndDelete({ _id: req.params.id, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		res.json({ success: true });
	} catch (e) {
		next(e);
	}
};

const getProgress = async (req, res, next) => {
	try {
		const child = await Child.findOne({ _id: req.params.id, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		res.json({ success: true, data: child.progress });
	} catch (e) {
		next(e);
	}
};

const updateProgress = async (req, res, next) => {
	try {
		const schema = Joi.object({ lettersCompleted: Joi.number(), numbersCompleted: Joi.number(), colorsCompleted: Joi.number(), actionsCompleted: Joi.number() });
		const value = await schema.validateAsync(req.body);
		const child = await Child.findOneAndUpdate({ _id: req.params.id, parent: req.user.id }, { $set: Object.fromEntries(Object.entries(value).map(([k, v]) => [`progress.${k}`, v])) }, { new: true });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		res.json({ success: true, data: child.progress });
	} catch (e) {
		next(e);
	}
};

const getChildById = async (req, res, next) => {
	try {
		const child = await Child.findOne({ _id: req.params.id, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		res.json({ success: true, data: child });
	} catch (e) {
		next(e);
	}
};

const getChildStats = async (req, res, next) => {
	try {
		const child = await Child.findOne({ _id: req.params.id, parent: req.user.id });
		if (!child) {
			return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		}

		const Progress = require('../models/Progress');
		
		const stats = await Progress.aggregate([
			{ $match: { child: child._id } },
			{
				$group: {
					_id: null,
					totalLessons: { $sum: 1 },
					completedLessons: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
					averageScore: { $avg: '$score' },
					totalTimeSpent: { $sum: '$timeSpent' }
				}
			}
		]);

		const result = stats[0] || { totalLessons: 0, completedLessons: 0, averageScore: 0, totalTimeSpent: 0 };

		res.json({ success: true, data: result });
	} catch (e) {
		next(e);
	}
};

const getChildActivities = async (req, res, next) => {
	try {
		const { childId } = req.params;
		const { page = 1, limit = 20, type, startDate, endDate } = req.query;
		
		const child = await Child.findOne({ _id: childId, parent: req.user.id });
		if (!child) {
			return res.status(404).json({ success: false, message: 'Child not found' });
		}

		const filter = { child: child._id };
		if (type) filter.type = type;
		if (startDate && endDate) {
			filter.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate)
			};
		}

		const Progress = require('../models/Progress');
		const activities = await Progress.find(filter)
			.populate('lesson', 'title category level content')
			.populate('game', 'title type category')
			.sort({ createdAt: -1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));

		const processedActivities = activities;

		const total = await Progress.countDocuments(filter);

		res.json({
			success: true,
			data: {
				activities: processedActivities,
				pagination: {
					total,
					page: parseInt(page),
					limit: parseInt(limit),
					pages: Math.ceil(total / parseInt(limit))
				}
			}
		});
	} catch (e) {
		next(e);
	}
};

const getChildGameResults = async (req, res, next) => {
	try {
		const { childId } = req.params;
		const { page = 1, limit = 20, gameType, startDate, endDate } = req.query;
		
		const child = await Child.findOne({ _id: childId, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

		const filter = { child: child._id, type: 'game' };
		if (gameType) {
			const Game = require('../models/Game');
			const games = await Game.find({ type: gameType });
			filter.game = { $in: games.map(g => g._id) };
		}
		if (startDate && endDate) {
			filter.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate)
			};
		}

		const Progress = require('../models/Progress');
		const gameResults = await Progress.find(filter)
			.populate('game', 'title type category')
			.sort({ createdAt: -1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));

		const total = await Progress.countDocuments(filter);

		const gameStats = await Progress.aggregate([
			{ $match: { child: child._id, type: 'game' } },
			{
				$group: {
					_id: '$game',
					totalGames: { $sum: 1 },
					averageScore: { $avg: '$score' },
					bestScore: { $max: '$score' },
					totalTimeSpent: { $sum: '$timeSpent' }
				}
			},
			{
				$lookup: {
					from: 'games',
					localField: '_id',
					foreignField: '_id',
					as: 'gameInfo'
				}
			}
		]);

		res.json({
			success: true,
			data: {
				gameResults,
				gameStats,
				pagination: {
					total,
					page: parseInt(page),
					limit: parseInt(limit),
					pages: Math.ceil(total / parseInt(limit))
				}
			}
		});
	} catch (e) {
		next(e);
	}
};

const linkChildToParent = async (req, res, next) => {
	try {
		const schema = Joi.object({ childId: Joi.string().required() });
		const { childId } = await schema.validateAsync(req.body);
		const child = await Child.findById(childId);
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy trẻ' });
		if (child.parent.toString() !== req.user.id) {
			return res.status(403).json({ success: false, message: 'Không có quyền liên kết trẻ này' });
		}
		res.json({ success: true, data: child });
	} catch (e) {
		next(e);
	}
};

const inviteChildByEmail = async (req, res, next) => {
	try {
		const schema = Joi.object({
			email: Joi.string().email().required(),
			name: Joi.string().optional(),
			inviteMessage: Joi.string().optional()
		});
		const { email, name, inviteMessage } = await schema.validateAsync(req.body);

		const existingChild = await Child.findOne({ email });
		if (existingChild) {
			return res.status(400).json({ 
				success: false, 
				message: 'Trẻ với email này đã tồn tại trong hệ thống' 
			});
		}

		const createChildReq = {
			...req,
			body: {
				name: name || 'Trẻ em',
				email,
				age: 5,
				gender: 'male',
				learningLevel: 'beginner',
				inviteMessage,
				isInvitation: true
			}
		};

		await createChild(createChildReq, res, next);
	} catch (e) {
		next(e);
	}
};

const getInvitations = async (req, res, next) => {
	try {
		const { page = 1, limit = 20, status } = req.query;
		const filter = { parent: req.user.id };
		if (status) filter.status = status;

		const Invitation = require('../models/Invitation');
		const invitations = await Invitation.find(filter)
			.sort({ createdAt: -1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));

		const total = await Invitation.countDocuments(filter);

		res.json({
			success: true,
			data: {
				invitations,
				pagination: {
					total,
					page: parseInt(page),
					limit: parseInt(limit),
					pages: Math.ceil(total / parseInt(limit))
				}
			}
		});
	} catch (e) {
		next(e);
	}
};


module.exports = {
	listChildren,
	createChild,
	updateChild,
	deleteChild,
	getProgress,
	updateProgress,
	getChildById,
	getChildStats,
	linkChildToParent,
	getChildActivities,
	getChildGameResults,
	inviteChildByEmail,
	getInvitations
};
