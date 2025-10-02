const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { 
	getProgressById,
	getProgressByChild, 
	updateProgress, 
	getProgressStats, 
	getRecentProgress,
	recordGameResult,
	recordLessonResult,
	getChildAchievements
} = require('../../controllers/progressController');
const router = express.Router();

router.use(authenticate);
router.get('/:id', authorize(['parent','child','admin']), getProgressById);
router.get('/child/:childId', authorize(['parent','admin']), getProgressByChild);
router.put('/child/:childId', authorize(['parent','admin']), updateProgress);
router.get('/child/:childId/stats', authorize(['parent','admin']), getProgressStats);
router.get('/child/:childId/recent', authorize(['parent','admin']), getRecentProgress);
router.get('/child/:childId/achievements', authorize(['parent','admin','child']), getChildAchievements);
router.post('/game', authorize(['parent','child','admin']), recordGameResult);
router.post('/lesson', authorize(['parent','child','admin']), recordLessonResult);
router.get('/stats/:userId', getProgressStats);
router.get('/recent/:userId', getRecentProgress);

module.exports = router;
