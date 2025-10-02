const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema(
	{
		child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
		lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: false },
		game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: false },
		status: { 
			type: String, 
			enum: ['not_started', 'in_progress', 'completed'], 
			default: 'not_started' 
		},
		score: { type: Number, default: 0 },
		timeSpent: { type: Number, default: 0 }, 
		attempts: { type: Number, default: 0 },
		completedAt: Date,
		notes: String,
		answers: [{
			exerciseId: { type: String, required: true },
			answer: { type: String, required: true },
			isCorrect: { type: Boolean, required: true }
		}],
		type: { type: String, enum: ['lesson', 'game'], default: 'lesson' }
	},
	{ timestamps: true }
);

ProgressSchema.index({ child: 1, lesson: 1 }, { unique: true, partialFilterExpression: { lesson: { $exists: true } } });
ProgressSchema.index({ child: 1, game: 1 }, { unique: true, partialFilterExpression: { game: { $exists: true } } });

module.exports = mongoose.model('Progress', ProgressSchema);
