const Joi = require('joi');
const Lesson = require('../models/Lesson');
const Child = require('../models/Child');

const listLessons = async (req, res, next) => {
	try {
		const { category, level, limit = 20, page = 1 } = req.query;
		const filter = { isActive: true };
		if (category) filter.category = category;
		if (level) filter.level = level;
		
		const lessons = await Lesson.find(filter)
			.sort({ order: 1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));
		
		const total = await Lesson.countDocuments(filter);
		
		res.json({ 
			success: true, 
			data: { 
				lessons, 
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

const getLessonById = async (req, res, next) => {
	try {
		const lesson = await Lesson.findById(req.params.id);
		if (!lesson) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		res.json({ success: true, data: lesson });
	} catch (e) {
		next(e);
	}
};

const getRandomExercises = async (req, res, next) => {
	try {
		const { id: lessonId } = req.params;
		const { count = 5 } = req.query;
		console.log('Getting random exercises for lessonId:', lessonId);
		
		const lesson = await Lesson.findById(lessonId);
		if (!lesson) {
			console.log('Lesson not found for ID:', lessonId);
			return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
		}
		
		console.log('Lesson found:', lesson.title);
		console.log('Lesson content:', JSON.stringify(lesson.content, null, 2));
		
		const exercises = lesson.content.exercises || [];
		console.log('Exercises count:', exercises.length);
		
		if (exercises.length === 0) {
			return res.status(400).json({ success: false, message: 'Bài học không có câu hỏi' });
		}
		
		const randomExercises = [];
		const availableExercises = [...exercises];
		const maxCount = Math.min(parseInt(count), availableExercises.length);
		
		for (let i = 0; i < maxCount; i++) {
			const randomIndex = Math.floor(Math.random() * availableExercises.length);
			randomExercises.push(availableExercises[randomIndex]);
			availableExercises.splice(randomIndex, 1);
		}
		
		res.json({ 
			success: true, 
			data: {
				lessonId: lesson._id,
				lessonTitle: lesson.title,
				exercises: randomExercises,
				totalExercises: exercises.length,
				selectedCount: randomExercises.length
			}
		});
	} catch (e) {
		next(e);
	}
};

const completeLesson = async (req, res, next) => {
	try {
		const schema = Joi.object({ childId: Joi.string().required() });
		const { childId } = await schema.validateAsync(req.body);
		const lesson = await Lesson.findById(req.params.id);
		if (!lesson) return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
		const child = await Child.findOne({ _id: childId, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy trẻ' });
		switch (lesson.category) {
			case 'letter':
				child.progress.lettersCompleted = (child.progress.lettersCompleted || 0) + 1;
				break;
			case 'number':
				child.progress.numbersCompleted = (child.progress.numbersCompleted || 0) + 1;
				break;
			case 'color':
				child.progress.colorsCompleted = (child.progress.colorsCompleted || 0) + 1;
				break;
			case 'action':
				child.progress.actionsCompleted = (child.progress.actionsCompleted || 0) + 1;
				break;
			default:
				break;
		}
		await child.save();
		res.status(201).json({ success: true, data: child.progress });
	} catch (e) {
		next(e);
	}
};

const createLesson = async (req, res, next) => {
	try {
		
		const schema = Joi.object({
			category: Joi.string().valid('letter', 'number', 'color', 'action').required(),
			title: Joi.string().required(),
			description: Joi.string().optional(),
			imageUrl: Joi.string().optional(), 
			audioUrl: Joi.string().optional(), 
			text: Joi.string().optional(),
			content: Joi.object({
				text: Joi.string().optional(),
				examples: Joi.array().items(Joi.string()).optional(),
				exercises: Joi.array().items(Joi.object({
					id: Joi.string().optional(),
					type: Joi.string().valid('multiple_choice', 'drag_drop', 'matching', 'coloring', 'fill_blank').optional(),
					question: Joi.string().optional(),
					options: Joi.array().items(Joi.string()).optional(),
					correctAnswer: Joi.any().optional(),
					imageUrl: Joi.string().optional(),
					text: Joi.string().optional(),
					blanks: Joi.array().items(Joi.object({
						position: Joi.number().optional(),
						correctAnswer: Joi.string().optional(),
						options: Joi.array().items(Joi.string()).optional()
					})).optional()
				})).optional()
			}).optional(),
			level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
			order: Joi.number().optional(),
			estimatedTime: Joi.number().optional(), 
			prerequisites: Joi.array().items(Joi.string()).optional()
		}).unknown(true); 
		const value = await schema.validateAsync(req.body);
		
		if (value.content && value.content.exercises) {
			value.content.exercises.forEach(exercise => {
				if (exercise.type === 'multiple_choice' && exercise.options) {
					if (exercise.options && Array.isArray(exercise.options)) {
						exercise.options = exercise.options.map((option, index) => {
							if (typeof option === 'string' && option.includes(': ')) {
								return option;
							}
							const letter = String.fromCharCode(65 + index);
							return option.trim() ? `${letter}: ${option.trim()}` : '';
						}).filter(option => option !== '');
					}
				}
			});
		}
		
		const lesson = await Lesson.create(value);
		
		res.status(201).json({ success: true, data: lesson });
	} catch (e) {
		console.error('Error creating lesson:', e);
		next(e);
	}
};

const updateLesson = async (req, res, next) => {
	try {
	const schema = Joi.object({ 
		category: Joi.string().valid('letter', 'number', 'color', 'action'), 
		title: Joi.string(), 
		description: Joi.string().optional(),
		imageUrl: Joi.string().optional(), 
		text: Joi.string().optional(),
		level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
		estimatedTime: Joi.number().optional(),
		content: Joi.any(), 
		order: Joi.number() 
	});
		const value = await schema.validateAsync(req.body);
		
		if (value.content && value.content.exercises) {
			value.content.exercises.forEach(exercise => {
				if (exercise.type === 'multiple_choice' && exercise.options && exercise.correctAnswer) {
					if (typeof exercise.correctAnswer === 'string' && exercise.correctAnswer.length === 1) {
						const letterIndex = exercise.correctAnswer.charCodeAt(0) - 65; 
						if (letterIndex >= 0 && letterIndex < exercise.options.length) {
							exercise.correctAnswer = letterIndex;
						}
					}
				}
			});
		}
		
		const lesson = await Lesson.findByIdAndUpdate(req.params.id, value, { new: true });
		if (!lesson) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		res.json({ success: true, data: lesson });
	} catch (e) {
		next(e);
	}
};

const deleteLesson = async (req, res, next) => {
	try {
		const lesson = await Lesson.findByIdAndDelete(req.params.id);
		if (!lesson) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
		res.json({ success: true });
	} catch (e) {
		next(e);
	}
};

const getLessonsByCategory = async (req, res, next) => {
	try {
		const { category } = req.params;
		const { level, limit = 20, page = 1 } = req.query;
		
		const filter = { category, isActive: true };
		if (level) filter.level = level;
		
		const lessons = await Lesson.find(filter)
			.sort({ order: 1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));
		
		const total = await Lesson.countDocuments(filter);
		
		res.json({ 
			success: true, 
			data: { 
				lessons, 
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

const getRecommendedLessons = async (req, res, next) => {
	try {
		const { childId } = req.params;
		const child = await Child.findOne({ _id: childId, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy trẻ' });
		
		const level = child.learningLevel || 'beginner';
		const learningStyle = child.preferences?.learningStyle || 'visual';
		
		const lessons = await Lesson.find({
			level: { $lte: level },
			isActive: true
		})
		.sort({ order: 1 })
		.limit(10);
		
		res.json({ success: true, data: lessons });
	} catch (e) {
		next(e);
	}
};

const searchLessons = async (req, res, next) => {
	try {
		const { q, category, level, limit = 20, page = 1 } = req.query;
		
		const filter = { isActive: true };
		if (q) {
			filter.$or = [
				{ title: { $regex: q, $options: 'i' } },
				{ description: { $regex: q, $options: 'i' } }
			];
		}
		if (category) filter.category = category;
		if (level) filter.level = level;
		
		const lessons = await Lesson.find(filter)
			.sort({ order: 1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));
		
		const total = await Lesson.countDocuments(filter);
		
		res.json({ 
			success: true, 
			data: { 
				lessons, 
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

const checkLessonCompletion = async (req, res, next) => {
	try {
		const { id: lessonId } = req.params;
		const { childId } = req.params;
		
		const Progress = require('../models/Progress');
		const progress = await Progress.findOne({ 
			child: childId, 
			lesson: lessonId, 
			status: 'completed' 
		}).populate('lesson', 'title category level');
		
		if (progress) {
			res.json({ 
				success: true, 
				data: { 
					completed: true, 
					progress: {
						id: progress._id,
						score: progress.score,
						timeSpent: progress.timeSpent,
						completedAt: progress.completedAt,
						answers: progress.answers,
						lesson: progress.lesson
					}
				} 
			});
		} else {
			res.json({ 
				success: true, 
				data: { 
					completed: false 
				} 
			});
		}
	} catch (e) {
		next(e);
	}
};

const getLessonHistory = async (req, res, next) => {
	try {
		const { childId } = req.params;
		const { limit = 20, page = 1 } = req.query;
		
		const Progress = require('../models/Progress');
		
		const allProgress = await Progress.find({ child: childId });
		console.log('All progress records for child:', allProgress.map(p => ({
			id: p._id,
			child: p.child,
			status: p.status,
			type: p.type,
			lesson: p.lesson
		})));
		
		const completedProgress = await Progress.find({ 
			child: childId, 
			status: 'completed'
		});
		
		const lessonProgress = await Progress.find({ 
			child: childId, 
			type: 'lesson'
		});
		
		const progress = await Progress.find({ 
			child: childId, 
			status: 'completed',
			type: 'lesson'
		})
		.populate('lesson', 'title category level description imageUrl')
		.sort({ completedAt: -1 })
		.limit(parseInt(limit))
		.skip((parseInt(page) - 1) * parseInt(limit));
		
		
		const nullLessons = progress.filter(p => !p.lesson);
		
		const total = await Progress.countDocuments({ 
			child: childId, 
			status: 'completed',
			type: 'lesson'
		});
		
		
		const responseData = { 
			success: true, 
			data: { 
				history: progress.map(p => ({
					id: p._id,
					lesson: p.lesson,
					score: p.score,
					timeSpent: p.timeSpent,
					completedAt: p.completedAt,
					answers: p.answers
				})),
				pagination: { 
					total, 
					page: parseInt(page), 
					limit: parseInt(limit), 
					pages: Math.ceil(total / parseInt(limit)) 
				} 
			} 
		};
		
		res.json(responseData);
	} catch (e) {
		next(e);
	}
};

module.exports = {
	listLessons,
	getLessonById,
	getRandomExercises,
	completeLesson,
	createLesson,
	updateLesson,
	deleteLesson,
	getLessonsByCategory,
	getRecommendedLessons,
	searchLessons,
	checkLessonCompletion,
	getLessonHistory
};
