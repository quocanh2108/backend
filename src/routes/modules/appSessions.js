const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { 
	startSession, 
	endSession,
	getChildSessions,
	getTotalUsageTime,
	getLastActivityTime
} = require('../../controllers/appSessionController');
const router = express.Router();

router.use(authenticate);

const canManageSession = (req, res, next) => {
	if (req.user.role === 'child' && req.body.childId === req.user.id) {
		return next();
	}
	if (req.user.role === 'parent' || req.user.role === 'admin') {
		return next();
	}
	return res.status(403).json({ success: false, message: 'Unauthorized' });
};

router.post('/start', canManageSession, startSession);
router.post('/end', canManageSession, endSession);

router.get('/child/:childId', authorize(['parent', 'admin']), getChildSessions);
router.get('/child/:childId/total-time', authorize(['parent', 'admin']), getTotalUsageTime);
router.get('/child/:childId/last-activity', authorize(['parent', 'admin']), getLastActivityTime);

module.exports = router;

