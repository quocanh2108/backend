const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { listLessons, getLessonById, completeLesson, createLesson, updateLesson, deleteLesson, getLessonsByCategory, getRecommendedLessons, searchLessons, checkLessonCompletion, getLessonHistory } = require('../../controllers/lessonController');
const router = express.Router();
router.get('/', listLessons);
router.get('/search', searchLessons);
router.get('/category/:category', getLessonsByCategory);
router.get('/:id', getLessonById);
router.use(authenticate);
router.post('/:id/complete', authorize(['parent','admin']), completeLesson);
router.get('/child/:childId/recommended', authorize(['parent','admin']), getRecommendedLessons);
router.get('/:id/completion/:childId', authenticate, checkLessonCompletion);
router.get('/child/:childId/history', authenticate, getLessonHistory);
router.post('/', authorize(['admin']), createLesson);
router.put('/:id', authorize(['admin']), updateLesson);
router.delete('/:id', authorize(['admin']), deleteLesson);

module.exports = router;
