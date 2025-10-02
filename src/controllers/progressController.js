const Joi = require('joi');
const Progress = require('../models/Progress');
const Child = require('../models/Child');
const Lesson = require('../models/Lesson');

const getProgressById = async (req, res, next) => {
	try {
		const progress = await Progress.findById(req.params.id)
			.populate('lesson', 'title category level description imageUrl content')
			.populate('child', 'name age');
		
		if (!progress) {
			return res.status(404).json({ success: false, message: 'Không tìm thấy tiến độ' });
		}
		
		res.json({ success: true, data: progress });
	} catch (e) {
		next(e);
	}
};

const getProgressByChild = async (req, res, next) => {
	try {
		const child = await Child.findOne({ _id: req.params.childId, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy trẻ' });
		
		const progress = await Progress.find({ child: req.params.childId })
			.populate('lesson', 'title category level')
			.sort({ updatedAt: -1 });
		
		res.json({ success: true, data: progress });
	} catch (e) {
		next(e);
	}
};

const updateProgress = async (req, res, next) => {
	try {
		const schema = Joi.object({
			lessonId: Joi.string().required(),
			status: Joi.string().valid('not_started', 'in_progress', 'completed').optional(),
			score: Joi.number().min(0).max(100).optional(),
			timeSpent: Joi.number().min(0).optional(),
			notes: Joi.string().optional()
		});
		const updateData = await schema.validateAsync(req.body);
		
		const child = await Child.findOne({ _id: req.params.childId, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy trẻ' });
		
		const lesson = await Lesson.findById(updateData.lessonId);
		if (!lesson) return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
		
		const progress = await Progress.findOneAndUpdate(
			{ child: req.params.childId, lesson: updateData.lessonId },
			{
				...updateData,
				attempts: { $inc: 1 },
				completedAt: updateData.status === 'completed' ? new Date() : undefined
			},
			{ upsert: true, new: true }
		).populate('lesson', 'title category level');
		
		res.json({ success: true, data: progress });
	} catch (e) {
		next(e);
	}
};

const getProgressStats = async (req, res, next) => {
	try {
		let targetChildId = req.params.childId;
		if (req.user.role === 'child') {
			targetChildId = req.user.id;
		} else {
			const child = await Child.findOne({ _id: req.params.childId, parent: req.user.id });
			if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy trẻ' });
			targetChildId = child._id;
		}
		
		const stats = await Progress.aggregate([
			{ $match: { child: targetChildId } },
			{
				$group: {
					_id: null,
					totalLessons: { $sum: 1 },
					completedLessons: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
					inProgressLessons: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
					averageScore: { $avg: '$score' },
					totalTimeSpent: { $sum: '$timeSpent' }
				}
			},
			{
				$addFields: {
					completionRate: {
						$cond: [
							{ $gt: ['$totalLessons', 0] },
							{ $multiply: [{ $divide: ['$completedLessons', '$totalLessons'] }, 100] },
							0
						]
					}
				}
			}
		]);
		
		const categoryStats = await Progress.aggregate([
			{ $match: { child: targetChildId } },
			{
				$lookup: {
					from: 'lessons',
					localField: 'lesson',
					foreignField: '_id',
					as: 'lessonData'
				}
			},
			{ $unwind: '$lessonData' },
			{
				$group: {
					_id: '$lessonData.category',
					total: { $sum: 1 },
					completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
					averageScore: { $avg: '$score' }
				}
			}
		]);
		
		res.json({ 
			success: true, 
			data: { 
				overall: stats[0] || { totalLessons: 0, completedLessons: 0, inProgressLessons: 0, averageScore: 0, totalTimeSpent: 0, completionRate: 0 },
				byCategory: categoryStats
			}
		});
	} catch (e) {
		next(e);
	}
};

const getRecentProgress = async (req, res, next) => {
	try {
		let targetChildId = req.params.childId;
		if (req.user.role === 'child') {
			targetChildId = req.user.id;
		} else {
			const child = await Child.findOne({ _id: req.params.childId, parent: req.user.id });
			if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy trẻ' });
			targetChildId = child._id;
		}
		
		const recentProgress = await Progress.find({ child: targetChildId })
			.populate('lesson', 'title category level')
			.sort({ updatedAt: -1 })
			.limit(10);
		
		res.json({ success: true, data: recentProgress });
	} catch (e) {
		next(e);
	}
};

const recordGameResult = async (req, res, next) => {
	try {
		const schema = Joi.object({
			gameId: Joi.string().required(),
			score: Joi.number().min(0).max(100).required(),
			timeSpent: Joi.number().min(0).optional(),
			answers: Joi.array().items(Joi.object({
				questionId: Joi.string().required(),
				answer: Joi.string().required(),
				isCorrect: Joi.boolean().required()
			})).optional(),
			achievements: Joi.array().items(Joi.string()).optional()
		});

		const { gameId, score, timeSpent, answers, achievements } = await schema.validateAsync(req.body);
		const childId = req.user.role === 'child' ? req.user.id : req.body.childId;
		
		if (!childId) {
			return res.status(400).json({ success: false, message: 'Child ID is required' });
		}

		const progress = await Progress.create({
			child: childId,
			game: gameId,
			type: 'game',
			status: 'completed',
			score,
			timeSpent: timeSpent || 0,
			completedAt: new Date(),
			answers: answers || [],
			achievements: achievements || []
		});

		const newAchievements = [];
		if (score >= 90) newAchievements.push('excellent');
		if (score >= 80) newAchievements.push('good');
		if (score >= 70) newAchievements.push('pass');
		if (timeSpent && timeSpent < 60) newAchievements.push('fast');

		res.json({
			success: true,
			data: {
				progress,
				achievements: newAchievements,
				message: score >= 80 ? 'Tuyệt vời!' : score >= 60 ? 'Tốt lắm!' : 'Cố gắng thêm nhé!'
			}
		});
	} catch (e) {
		next(e);
	}
};

const recordLessonResult = async (req, res, next) => {
	try {
		const schema = Joi.object({
			lessonId: Joi.string().required(),
			childId: Joi.string().optional(), 
			score: Joi.number().min(0).max(100).required(),
			timeSpent: Joi.number().min(0).optional(),
			answers: Joi.array().items(Joi.object({
				exerciseId: Joi.string().required(),
				answer: Joi.string().required(),
				isCorrect: Joi.boolean().required()
			})).optional()
		});

		const { lessonId, score, timeSpent, answers } = await schema.validateAsync(req.body);
		
		const childId = req.user.role === 'child' ? req.user.id : req.body.childId;
		
		if (!childId) {
			return res.status(400).json({ success: false, message: 'Child ID is required' });
		}

		const existingProgress = await Progress.findOne({
			child: childId,
			lesson: lessonId,
			type: 'lesson'
		});

		let progress;
		if (existingProgress) {
			progress = await Progress.findByIdAndUpdate(existingProgress._id, {
				type: 'lesson',
				status: 'completed',
				score,
				timeSpent: timeSpent || 0,
				completedAt: new Date(),
				answers: answers || []
			}, { new: true });
		} else {
			progress = await Progress.create({
				child: childId,
				lesson: lessonId,
				type: 'lesson',
				status: 'completed',
				score,
				timeSpent: timeSpent || 0,
				completedAt: new Date(),
				answers: answers || []
			});
		}
		
		const newAchievements = [];
		if (score >= 90) newAchievements.push('excellent');
		if (score >= 80) newAchievements.push('good');
		if (score >= 70) newAchievements.push('pass');

		res.json({
			success: true,
			data: {
				progress,
				achievements: newAchievements,
				message: score >= 80 ? 'Tuyệt vời!' : score >= 60 ? 'Tốt lắm!' : 'Cố gắng thêm nhé!'
			}
		});
	} catch (e) {
		next(e);
	}
};

const getChildAchievements = async (req, res, next) => {
	try {
		const { childId } = req.params;
		
		let targetChildId = childId;
		if (req.user.role === 'child') {
			targetChildId = req.user.id;
		} else {
			const child = await Child.findById(childId);
			if (!child) {
				return res.status(404).json({ success: false, message: 'Child not found' });
			}
			targetChildId = child._id;
		}

		const achievements = await Progress.aggregate([
			{ $match: { child: targetChildId, status: 'completed' } },
			{
				$group: {
					_id: null,
					totalActivities: { $sum: 1 },
					averageScore: { $avg: '$score' },
					excellentCount: { $sum: { $cond: [{ $gte: ['$score', 90] }, 1, 0] } },
					goodCount: { $sum: { $cond: [{ $gte: ['$score', 80] }, 1, 0] } },
					passCount: { $sum: { $cond: [{ $gte: ['$score', 70] }, 1, 0] } },
					totalTimeSpent: { $sum: '$timeSpent' }
				}
			}
		]);

		const stats = achievements[0] || {
			totalActivities: 0,
			averageScore: 0,
			excellentCount: 0,
			goodCount: 0,
			passCount: 0,
			totalTimeSpent: 0
		};

		const badges = [];
		if (stats.excellentCount >= 10) badges.push({ name: 'Học giỏi', icon: 'trophy', color: '#FFD700' });
		if (stats.goodCount >= 20) badges.push({ name: 'Chăm chỉ', icon: 'star', color: '#FF6B6B' });
		if (stats.totalActivities >= 50) badges.push({ name: 'Kiên trì', icon: 'medal', color: '#4ECDC4' });
		if (stats.averageScore >= 85) badges.push({ name: 'Xuất sắc', icon: 'crown', color: '#9C27B0' });

		res.json({
			success: true,
			data: {
				stats,
				badges,
				recentAchievements: badges.slice(0, 3) 
			}
		});
	} catch (e) {
		next(e);
	}
};

module.exports = {
	getProgressById,
	getProgressByChild,
	updateProgress,
	getProgressStats,
	getRecentProgress,
	recordGameResult,
	recordLessonResult,
	getChildAchievements
};
