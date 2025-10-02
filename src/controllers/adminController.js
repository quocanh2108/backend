const User = require('../models/User');
const Child = require('../models/Child');
const Lesson = require('../models/Lesson');
const Game = require('../models/Game');
const Progress = require('../models/Progress');
const Report = require('../models/Report');

const getStats = async (req, res, next) => {
	try {
		const totalUsers = await User.countDocuments();
		const totalChildren = await Child.countDocuments();
		const totalLessons = await Lesson.countDocuments();
		const totalGames = await Game.countDocuments();
		const activeUsers = await User.countDocuments({ isActive: true });
		const completedLessons = await Progress.countDocuments({ status: 'completed' });

		res.json({
			success: true,
			data: {
				totalUsers,
				totalChildren,
				totalLessons,
				totalGames,
				activeUsers,
				completedLessons
			}
		});
	} catch (e) {
		next(e);
	}
};

const getUsers = async (req, res, next) => {
	try {
		const { page = 1, limit = 20, role, isActive } = req.query;
		const filter = {};
		if (role) filter.role = role;
		if (isActive !== undefined) filter.isActive = isActive === 'true';

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

const getChildren = async (req, res, next) => {
	try {
		const { page = 1, limit = 20, learningLevel, isActive } = req.query;
		const filter = {};
		if (learningLevel) filter.learningLevel = learningLevel;
		if (isActive !== undefined) filter.isActive = isActive === 'true';

		const children = await Child.find(filter)
			.populate('parent', 'name email')
			.sort({ createdAt: -1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));

		const total = await Child.countDocuments(filter);

		res.json({
			success: true,
			data: children,
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

const getReports = async (req, res, next) => {
	try {
		const { page = 1, limit = 20, period, startDate, endDate } = req.query;
		const filter = {};
		if (period) filter.period = period;
		if (startDate && endDate) {
			filter.generatedDate = {
				$gte: new Date(startDate),
				$lte: new Date(endDate)
			};
		}

		const reports = await Report.find(filter)
			.populate('parent', 'name email')
			.populate('child', 'name avatarUrl')
			.sort({ generatedDate: -1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));

		const total = await Report.countDocuments(filter);

		res.json({
			success: true,
			data: reports,
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

module.exports = {
	getStats,
	getUsers,
	getChildren,
	getReports
};