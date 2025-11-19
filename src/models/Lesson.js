const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema(
	{
		category: { type: String, enum: ['letter', 'number', 'color', 'action'] },
		title: { type: String, required: true },
		description: String,
		imageUrl: String,
		audioUrl: String,
		content: {
			examples: [String],
			exercises: [{
				_id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
				type: { type: String, enum: ['multiple_choice', 'drag_drop', 'matching', 'coloring', 'fill_blank'] },
				question: String,
				options: [String],
				correctAnswer: mongoose.Schema.Types.Mixed,
				imageUrl: String,
				text: String,
				blanks: [{
					position: Number,
					correctAnswer: String,
					options: [String]
				}]
			}]
		},
		level: { 
			type: String, 
			enum: ['beginner', 'intermediate', 'advanced']
		},
		order: Number,
		estimatedTime: { type: Number, default: 10 }, 
		prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Lesson', LessonSchema);
