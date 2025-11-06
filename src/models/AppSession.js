const mongoose = require('mongoose');

const AppSessionSchema = new mongoose.Schema(
	{
		child: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: 'Child', 
			required: true 
		},
		startTime: { 
			type: Date, 
			required: true 
		},
		endTime: { 
			type: Date, 
			required: false 
		},
		duration: { 
			type: Number, 
			default: 0 
		},
		status: { 
			type: String, 
			enum: ['active', 'completed'], 
			default: 'active' 
		}
	},
	{ timestamps: true }
);

AppSessionSchema.index({ child: 1, startTime: -1 });
AppSessionSchema.index({ child: 1, status: 1 });

module.exports = mongoose.model('AppSession', AppSessionSchema);

