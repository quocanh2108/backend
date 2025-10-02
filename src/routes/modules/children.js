const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { 
	listChildren, 
	createChild, 
	updateChild, 
	deleteChild, 
	getProgress, 
	updateProgress, 
	getChildById, 
	getChildStats, 
	linkChildToParent,
	getChildActivities,
	getChildGameResults,
	inviteChildByEmail,
	getInvitations
} = require('../../controllers/childController');
const router = express.Router();

router.use(authenticate);
router.post('/invite', authorize(['parent','admin']), inviteChildByEmail);
router.get('/invitations', authorize(['parent','admin']), getInvitations);
router.get('/', authorize(['parent','admin']), listChildren);
router.post('/', authorize(['parent','admin']), createChild);
router.get('/:id', authorize(['parent','admin']), getChildById);
router.put('/:id', authorize(['parent','admin']), updateChild);
router.delete('/:id', authorize(['parent','admin']), deleteChild);
router.get('/:id/progress', authorize(['parent','admin']), getProgress);
router.put('/:id/progress', authorize(['parent','admin']), updateProgress);
router.get('/:id/stats', authorize(['parent','admin']), getChildStats);
router.get('/:childId/activities', authorize(['parent','admin']), getChildActivities);
router.get('/:childId/game-results', authorize(['parent','admin']), getChildGameResults);
router.post('/link', authorize(['parent','admin']), linkChildToParent);

module.exports = router;
