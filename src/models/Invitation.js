const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema(
	{
		parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		childEmail: { type: String, required: true },
		childName: { type: String, required: true },
		message: { type: String, optional: true },
		status: { 
			type: String, 
			enum: ['pending', 'accepted', 'declined', 'expired'], 
			default: 'pending' 
		},
		invitationCode: { type: String, required: true, unique: true },
		expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
		acceptedAt: Date,
		declinedAt: Date
	},
	{ timestamps: true }
);

InvitationSchema.pre('save', function(next) {
	if (!this.invitationCode) {
		this.invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	}
	next();
});

module.exports = mongoose.model('Invitation', InvitationSchema);
