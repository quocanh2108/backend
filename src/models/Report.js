const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
	{
		child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
		parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		period: { 
			type: String, 
			enum: ['daily', 'weekly', 'monthly'], 
			required: true 
		},
		startDate: { type: Date, required: true },
		endDate: { type: Date, required: true },
		summary: {
			totalLessons: { type: Number, default: 0 },
			completedLessons: { type: Number, default: 0 },
			totalGames: { type: Number, default: 0 },
			completedGames: { type: Number, default: 0 },
			averageScore: { type: Number, default: 0 },
			timeSpent: { type: Number, default: 0 }, 
			strengths: [String],
			improvements: [String]
		},
		aiRecommendations: {
			nextSteps: [String],
			areasToFocus: [String],
			encouragement: String
		},
		generatedAt: { type: Date, default: Date.now }
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);
