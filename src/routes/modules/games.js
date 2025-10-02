const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { 
	listGames, 
	getGameById, 
	playGame, 
	createGame, 
	updateGame, 
	deleteGame,
	uploadPuzzleImage,
	uploadGuessImage,
	upload,
	createColoringGame,
	createPuzzleGame,
	createMatchingGame,
	saveGameResult,
	getGameHistory
} = require('../../controllers/gameController');
const router = express.Router();
router.use(authenticate);
router.get('/', listGames);
router.get('/:id', getGameById);
router.post('/:id/play', authorize(['parent', 'child', 'admin']), playGame);
router.post('/', authorize(['admin']), createGame);
router.put('/:id', authorize(['admin']), updateGame);
router.delete('/:id', authorize(['admin']), deleteGame);
router.post('/upload/puzzle', authorize(['admin']), upload.single('image'), uploadPuzzleImage);
router.post('/upload/guess', authorize(['admin']), upload.single('image'), uploadGuessImage);
router.post('/create/coloring', authorize(['admin']), upload.single('outlineImage'), createColoringGame);
router.post('/create/puzzle', authorize(['admin']), upload.single('originalImage'), createPuzzleGame);
router.post('/create/matching', authorize(['admin']), createMatchingGame);
router.post('/result', authorize(['parent', 'child', 'admin']), saveGameResult);
router.get('/child/:childId/history', authorize(['parent', 'child', 'admin']), getGameHistory);

module.exports = router;