const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema(
	{
		key: { type: String, required: true, unique: true },
		type: { type: String, enum: ['coloring', 'puzzle', 'matching'], required: true },
		title: { type: String, required: true },
		description: String,
		category: { type: String, enum: ['letter', 'number', 'color', 'action'], required: true },
		level: { 
			type: String, 
			enum: ['beginner', 'intermediate', 'advanced'], 
			default: 'beginner' 
		},
		data: {
			instructions: String,
			items: [{
				id: String,
				imageUrl: String,
				text: String,
				audioUrl: String,
				position: { x: Number, y: Number }
			}],
			scoring: {
				pointsPerItem: { type: Number, default: 10 },
				timeBonus: { type: Number, default: 5 },
				maxScore: { type: Number, default: 100 }
			},
			puzzlePieces: [{
				id: String,
				imageUrl: String,
				correctPosition: { x: Number, y: Number }
			}],
			questions: [{
				id: String,
				imageUrl: String,
				question: String,
				options: [String],
				correctAnswer: String,
				explanation: String
			}],
			originalImage: String,
			pieces: [mongoose.Schema.Types.Mixed],
			rows: Number,
			cols: Number,
			coloringData: {
				outlineImage: String, 
				suggestedColors: [String], 
				colorAreas: [{
					id: String,
					path: String, 
					suggestedColor: String
				}]
			},
			matchingPairs: [{
				id: String,
				text: String,
				imageUrl: String,
				audioUrl: String,
				position: { x: Number, y: Number }
			}]
		},
		imageUrl: String,
		estimatedTime: { type: Number, default: 5 },
		ageRange: {
			min: { type: Number, default: 3 },
			max: { type: Number, default: 6 }
		},
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Game', GameSchema);
