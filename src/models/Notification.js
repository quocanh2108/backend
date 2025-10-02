const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema(
	{
		parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' },
		daysOfWeek: [{ type: Number, min: 0, max: 6 }], 
		timeOfDay: { type: String, required: true }, 
		sessionsPerWeek: { type: Number, default: 3, min: 1, max: 7 },
		duration: { type: Number, default: 30 }, 
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

const NotificationSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' },
		type: { 
			type: String, 
			enum: ['reminder', 'summary', 'achievement', 'system', 'schedule'], 
			required: true 
		},
		title: { type: String, required: true },
		content: { type: String, required: true },
		data: {
			lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
			gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
			score: Number,
			achievement: String
		},
		isRead: { type: Boolean, default: false },
		sentAt: Date,
		readAt: Date
	},
	{ timestamps: true }
);

module.exports = {
	Schedule: mongoose.model('Schedule', ScheduleSchema),
	Notification: mongoose.model('Notification', NotificationSchema)
};
