const mongoose = require('mongoose');

const NotificationHistorySchema = new mongoose.Schema(
	{
		sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		type: {
			type: String,
			enum: ['reminder', 'summary', 'achievement', 'system', 'schedule'],
			required: true
		},
		title: { type: String, required: true },
		content: { type: String, required: true },
		targetRole: { type: String, enum: ['all', 'parent', 'child'], default: 'all' },
		recipientCount: { type: Number, required: true },
		scheduledAt: { type: Date, default: Date.now },
		status: { type: String, enum: ['sent', 'scheduled', 'failed'], default: 'sent' },
		errorMessage: String
	},
	{ timestamps: true }
);

module.exports = mongoose.model('NotificationHistory', NotificationHistorySchema);
