const mongoose = require('mongoose');

const ChildSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		birthdate: { type: Date, required: false },
		gender: { type: String, enum: ['male', 'female'], required: true },
		avatarUrl: String,
		classroom: { type: String },
		parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		learningLevel: { 
			type: String, 
			enum: ['beginner', 'intermediate', 'advanced'], 
			default: 'beginner' 
		},
		preferences: {
			favoriteColors: [String],
			favoriteActivities: [String],
			learningStyle: { type: String, enum: ['visual', 'auditory', 'kinesthetic'] }
		},
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Child', ChildSchema);
