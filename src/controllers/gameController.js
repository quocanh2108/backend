const Joi = require('joi');
const Game = require('../models/Game');
const Child = require('../models/Child');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const uploadPath = 'uploads/games';
		if (!fs.existsSync(uploadPath)) {
			fs.mkdirSync(uploadPath, { recursive: true });
		}
		cb(null, uploadPath);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
	}
});

const upload = multer({ 
	storage: storage,
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else {
			cb(new Error('Only image files are allowed'), false);
		}
	}
});

const listGames = async (req, res, next) => {
	try {
		const { page = 1, limit = 20, type, category, level } = req.query;
		const filter = { isActive: true };
		if (type) filter.type = type;
		if (category) filter.category = category;
		if (level) filter.level = level;

		const games = await Game.find(filter)
			.sort({ createdAt: -1 })
			.limit(parseInt(limit))
			.skip((parseInt(page) - 1) * parseInt(limit));

		const total = await Game.countDocuments(filter);

		res.json({
			success: true,
			data: {
				games,
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

const getGameById = async (req, res, next) => {
	try {
		const game = await Game.findById(req.params.id);
		if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
		res.json({ success: true, data: game });
	} catch (e) {
		next(e);
	}
};

const createGame = async (req, res, next) => {
	try {
		
		const schema = Joi.object({
			key: Joi.string().required(),
			type: Joi.string().valid('coloring', 'puzzle', 'matching').required(),
			title: Joi.string().required(),
			description: Joi.string().optional(),
			category: Joi.string().valid('letter', 'number', 'color', 'action').required(),
			level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
			data: Joi.object({
				instructions: Joi.string().optional(),
				items: Joi.array().items(Joi.object({
					id: Joi.string().optional(),
					imageUrl: Joi.string().optional(),
					text: Joi.string().optional(),
					audioUrl: Joi.string().optional(),
					position: Joi.object({
						x: Joi.number().optional(),
						y: Joi.number().optional()
					}).optional()
				})).optional(),
				scoring: Joi.object({
					pointsPerItem: Joi.number().optional(),
					timeBonus: Joi.number().optional(),
					maxScore: Joi.number().optional()
				}).optional(),
				puzzlePieces: Joi.array().items(Joi.object({
					id: Joi.string().optional(),
					imageUrl: Joi.string().optional(),
					correctPosition: Joi.object({
						x: Joi.number().optional(),
						y: Joi.number().optional()
					}).optional()
				})).optional(),
				questions: Joi.array().items(Joi.object({
					id: Joi.string().optional(),
					imageUrl: Joi.string().optional(),
					question: Joi.string().optional(),
					options: Joi.array().items(Joi.string()).optional(),
					correctAnswer: Joi.string().optional(),
					explanation: Joi.string().optional()
				})).optional(),
				originalImage: Joi.string().optional(),
				pieces: Joi.array().optional(),
				rows: Joi.number().optional(),
				cols: Joi.number().optional(),
				coloringData: Joi.object({
					outlineImage: Joi.string().optional(),
					suggestedColors: Joi.array().items(Joi.string()).optional(),
					colorAreas: Joi.array().items(Joi.object({
						id: Joi.string().optional(),
						path: Joi.string().optional(),
						suggestedColor: Joi.string().optional()
					})).optional()
				}).optional(),
				matchingPairs: Joi.array().items(Joi.object({
					id: Joi.string().optional(),
					text: Joi.string().optional(),
					imageUrl: Joi.string().optional(),
					audioUrl: Joi.string().optional(),
					position: Joi.object({
						x: Joi.number().optional(),
						y: Joi.number().optional()
					}).optional()
				})).optional()
			}).optional(),
			imageUrl: Joi.string().optional(),
			estimatedTime: Joi.number().optional(),
			ageRange: Joi.object({
				min: Joi.number().optional(),
				max: Joi.number().optional()
			}).optional()
		}).unknown(true);

		const gameData = await schema.validateAsync(req.body);
		
		const game = await Game.create(gameData);
		
		res.status(201).json({ success: true, data: game });
	} catch (e) {
		console.error('Error creating game:', e);
		next(e);
	}
};

const updateGame = async (req, res, next) => {
	try {
		const schema = Joi.object({
			title: Joi.string().optional(),
			description: Joi.string().optional(),
			category: Joi.string().valid('letter', 'number', 'color', 'action').optional(),
			level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
			data: Joi.object().optional(),
			imageUrl: Joi.string().optional(),
			estimatedTime: Joi.number().optional(),
			ageRange: Joi.object({
				min: Joi.number().optional(),
				max: Joi.number().optional()
			}).optional(),
			isActive: Joi.boolean().optional()
		});

		const updateData = await schema.validateAsync(req.body);
		const game = await Game.findByIdAndUpdate(
			req.params.id,
			updateData,
			{ new: true }
		);

		if (!game) {
			return res.status(404).json({ success: false, message: 'Game not found' });
		}

		res.json({ success: true, data: game });
	} catch (e) {
		next(e);
	}
};

const deleteGame = async (req, res, next) => {
	try {
		const game = await Game.findByIdAndDelete(req.params.id);
		if (!game) {
			return res.status(404).json({ success: false, message: 'Game not found' });
		}
		res.json({ success: true, message: 'Game deleted successfully' });
	} catch (e) {
		next(e);
	}
};

const uploadPuzzleImage = async (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, message: 'No image uploaded' });
		}

		const { rows = 3, cols = 3 } = req.body;
		const imagePath = req.file.path;
		const pieces = [];

		const image = sharp(imagePath);
		const metadata = await image.metadata();
		const pieceWidth = Math.floor(metadata.width / cols);
		const pieceHeight = Math.floor(metadata.height / rows);

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const pieceId = `piece_${row}_${col}`;
				const piecePath = `uploads/games/pieces/${pieceId}_${Date.now()}.jpg`;
				
				const piecesDir = 'uploads/games/pieces';
				if (!fs.existsSync(piecesDir)) {
					fs.mkdirSync(piecesDir, { recursive: true });
				}

				await image
					.extract({
						left: col * pieceWidth,
						top: row * pieceHeight,
						width: pieceWidth,
						height: pieceHeight
					})
					.jpeg()
					.toFile(piecePath);

				pieces.push({
					id: pieceId,
					imageUrl: piecePath,
					correctPosition: {
						x: col * pieceWidth,
						y: row * pieceHeight
					}
				});
			}
		}

		res.json({
			success: true,
			data: {
				originalImage: req.file.filename,
				pieces: pieces.map(piece => ({
					...piece,
					imageUrl: piece.imageUrl.split('/').pop()
				})),
				rows: parseInt(rows),
				cols: parseInt(cols)
			}
		});
	} catch (e) {
		next(e);
	}
};

const uploadGuessImage = async (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, message: 'No image uploaded' });
		}

		res.json({
			success: true,
			data: {
				imageUrl: req.file.path,
				filename: req.file.filename
			}
		});
	} catch (e) {
		next(e);
	}
};

const playGame = async (req, res, next) => {
	try {
		const schema = Joi.object({
			childId: Joi.string().required(),
			gameKey: Joi.string().required(),
			score: Joi.number().required(),
			timeSpent: Joi.number().optional(),
			answers: Joi.array().items(Joi.object({
				questionId: Joi.string().required(),
				answer: Joi.string().required(),
				isCorrect: Joi.boolean().required()
			})).optional()
		});

		const { childId, gameKey, score, timeSpent, answers } = await schema.validateAsync(req.body);
		const child = await Child.findOne({ _id: childId, parent: req.user.id });
		if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

		const game = await Game.findOne({ key: gameKey });
		if (!game) return res.status(404).json({ success: false, message: 'Game not found' });

		child.progress.games.push({
			gameKey,
			score,
			timeSpent: timeSpent || 0,
			answers: answers || [],
			completedAt: new Date()
		});

		await child.save();

		const achievements = [];
		if (score >= 90) achievements.push('excellent');
		if (score >= 80) achievements.push('good');
		if (score >= 70) achievements.push('pass');

		res.json({
			success: true,
			data: {
				score,
				achievements,
				message: score >= 80 ? 'Tuyệt vời!' : score >= 60 ? 'Tốt lắm!' : 'Cố gắng thêm nhé!'
			}
		});
	} catch (e) {
		next(e);
	}
};

const createColoringGame = async (req, res, next) => {
	try {
		
		const schema = Joi.object({
			title: Joi.string().required(),
			description: Joi.string().optional(),
			category: Joi.string().valid('letter', 'number', 'color', 'action').required(),
			level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
			suggestedColors: Joi.array().items(Joi.string().pattern(/^#[0-9A-F]{6}$/i)).optional(),
			estimatedTime: Joi.number().optional()
		});

		if (req.body.suggestedColors && typeof req.body.suggestedColors === 'string') {
			try {
				req.body.suggestedColors = JSON.parse(req.body.suggestedColors);
			} catch (e) {
				console.error('Error parsing suggestedColors:', e);
			}
		}
		
		const gameData = await schema.validateAsync(req.body);
		
		if (!req.file) {
			return res.status(400).json({ success: false, message: 'Outline image is required' });
		}

		const key = `coloring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		const imageUrl = req.file.filename;
		
		const game = await Game.create({
			key,
			type: 'coloring',
			title: gameData.title,
			description: gameData.description,
			category: gameData.category,
			level: gameData.level || 'beginner',
			imageUrl: imageUrl,
			estimatedTime: gameData.estimatedTime || 10,
			data: {
				coloringData: {
					outlineImage: imageUrl,
					suggestedColors: gameData.suggestedColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
					colorAreas: []
				}
			}
		});

		res.status(201).json({ success: true, data: game });
	} catch (e) {
		console.error('Error creating coloring game:', e);
		next(e);
	}
};

const createPuzzleGame = async (req, res, next) => {
	try {
		
		const schema = Joi.object({
			title: Joi.string().required(),
			description: Joi.string().optional(),
			category: Joi.string().valid('letter', 'number', 'color', 'action').required(),
			level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
			rows: Joi.number().min(2).max(5).required(),
			cols: Joi.number().min(2).max(5).required(),
			estimatedTime: Joi.number().optional()
		});

		const gameData = await schema.validateAsync(req.body);
		
		if (!req.file) {
			return res.status(400).json({ success: false, message: 'Original image is required' });
		}

		const key = `puzzle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		const imageUrl = req.file.filename;
		
		const game = await Game.create({
			key,
			type: 'puzzle',
			title: gameData.title,
			description: gameData.description,
			category: gameData.category,
			level: gameData.level || 'beginner',
			imageUrl: imageUrl,
			estimatedTime: gameData.estimatedTime || 15,
			data: {
				originalImage: imageUrl,
				rows: gameData.rows,
				cols: gameData.cols,
				puzzlePieces: []
			}
		});

		res.status(201).json({ success: true, data: game });
	} catch (e) {
		console.error('Error creating puzzle game:', e);
		next(e);
	}
};

const createMatchingGame = async (req, res, next) => {
	try {
		
		const schema = Joi.object({
			title: Joi.string().required(),
			description: Joi.string().optional(),
			category: Joi.string().valid('letter', 'number', 'color', 'action').required(),
			level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
			pairs: Joi.array().items(Joi.object({
				text: Joi.string().required(),
				imageUrl: Joi.string().optional()
			})).min(2).required(),
			estimatedTime: Joi.number().optional()
		});

		const gameData = await schema.validateAsync(req.body);
		
		const key = `matching_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		const processedPairs = await Promise.all(
			gameData.pairs.map(async (pair, index) => {
				const pairData = {
					id: `pair_${index}`,
					text: pair.text,
					imageUrl: pair.imageUrl || null,
					position: { x: 0, y: 0 }
				};
				return pairData;
			})
		);
		
		const game = await Game.create({
			key,
			type: 'matching',
			title: gameData.title,
			description: gameData.description,
			category: gameData.category,
			level: gameData.level || 'beginner',
			imageUrl: processedPairs[0]?.imageUrl || null,
			estimatedTime: gameData.estimatedTime || 10,
			data: {
				matchingPairs: processedPairs
			}
		});

		res.status(201).json({ success: true, data: game });
	} catch (e) {
		console.error('Error creating matching game:', e);
		next(e);
	}
};

const saveGameResult = async (req, res, next) => {
	try {
		const schema = Joi.object({
			gameId: Joi.string().required(),
			userId: Joi.string().required(),
			score: Joi.number().min(0).max(100).required(),
			timeSpent: Joi.number().min(0).required(),
			gameType: Joi.string().valid('coloring', 'puzzle', 'matching').required(),
			resultData: Joi.object({
				coloredImage: Joi.string().optional(),
				colorsUsed: Joi.array().items(Joi.string()).optional(),
				drawingData: Joi.string().optional(),
				totalPoints: Joi.number().optional(),
				brushSizes: Joi.array().items(Joi.number()).optional(),
				completionTime: Joi.number().optional(),
				isCompleted: Joi.boolean().optional(),
				difficulty: Joi.string().optional(),
				piecesPlaced: Joi.number().optional(),
				hintsUsed: Joi.number().optional(),
				finalScore: Joi.number().optional(),
				correctPairs: Joi.number().optional(),
				totalPairs: Joi.number().optional()
			}).optional()
		});

		const resultData = await schema.validateAsync(req.body);
		
		const Progress = require('../models/Progress');
		const Game = require('../models/Game');
		
		
		const game = await Game.findById(resultData.gameId);
		if (!game) {
			return res.status(404).json({
				success: false,
				message: 'Không tìm thấy trò chơi'
			});
		}
		
		const progressData = {
			child: resultData.userId,
			game: resultData.gameId,
			score: resultData.score,
			timeSpent: resultData.timeSpent,
			status: 'completed',
			type: 'game',
			completedAt: new Date(),
			answers: resultData.resultData?.answers || []
		};
		
		const existingProgress = await Progress.findOne({
			child: resultData.userId,
			game: resultData.gameId,
			type: 'game'
		});
		
		let progress;
		if (existingProgress) {
			progress = await Progress.findByIdAndUpdate(
				existingProgress._id,
				progressData,
				{ new: true }
			);
		} else {
			progress = new Progress(progressData);
			await progress.save();
		}
		
		
		res.json({
			success: true,
			data: {
				message: 'Kết quả đã được lưu thành công!',
				score: resultData.score,
				achievements: [],
				progressId: progress._id
			}
		});
	} catch (e) {
		console.error('Error saving game result:', e);
		next(e);
	}
};

const getGameHistory = async (req, res, next) => {
	try {
		const { childId } = req.params;
		const { limit = 20, page = 1 } = req.query;
		
		const Progress = require('../models/Progress');
		
		const progress = await Progress.find({ 
			child: childId, 
			status: 'completed',
			type: 'game'
		})
		.populate('game', 'title type category level imageUrl')
		.sort({ completedAt: -1 })
		.limit(parseInt(limit))
		.skip((parseInt(page) - 1) * parseInt(limit));
		
		const total = await Progress.countDocuments({ 
			child: childId, 
			status: 'completed',
			type: 'game'
		});
		
		const responseData = { 
			success: true,
			data: {
				history: progress.map(p => ({
					id: p._id,
					game: p.game ? {
						id: p.game._id,
						title: p.game.title,
						type: p.game.type,
						category: p.game.category,
						level: p.game.level,
						imageUrl: p.game.imageUrl
					} : null,
					score: p.score,
					timeSpent: p.timeSpent,
					completedAt: p.completedAt || p.createdAt,
					answers: p.answers || []
				})),
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					pages: Math.ceil(total / parseInt(limit))
				}
			}
		};
		
		res.json(responseData);
	} catch (e) {
		console.error('Error getting game history:', e);
		next(e);
	}
};

module.exports = {
	listGames,
	getGameById,
	createGame,
	updateGame,
	deleteGame,
	uploadPuzzleImage,
	uploadGuessImage,
	playGame,
	upload,
	createColoringGame,
	createPuzzleGame,
	createMatchingGame,
	saveGameResult,
	getGameHistory
};