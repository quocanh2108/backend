// là xử lý ở backen như lấy danh ách game ,
//muốn xem logic thế nào thì click và controller 
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
	createGuessingGame,
	saveGameResult,
	getGameHistory
} = require('../../controllers/gameController');
const router = express.Router();
router.use(authenticate);
//loaays danh sách game 
router.get('/', listGames);
//lâys game nào cụ thể 
router.get('/:id', getGameById);
//sau đó hiển thị game đó lên giao diện để trẻ em chơi
//kết quả gọi route này để lưu
router.post('/:id/play', authorize(['parent', 'child', 'admin']), playGame);
// admin
router.post('/', authorize(['admin']), createGame);//tạo game 
router.put('/:id', authorize(['admin']), updateGame);//sửa game 
router.delete('/:id', authorize(['admin']), deleteGame);//xóa game 
router.post('/upload/puzzle', authorize(['admin']), upload.single('image'), uploadPuzzleImage);//upload ảnh game// có máy game bỏ rồi
router.post('/upload/guess', authorize(['admin']), upload.single('image'), uploadGuessImage);
router.post('/create/coloring', authorize(['admin']), upload.single('outlineImage'), createColoringGame);
router.post('/create/puzzle', authorize(['admin']), upload.single('originalImage'), createPuzzleGame);
router.post('/create/matching', authorize(['admin']), createMatchingGame);
router.post('/create/guessing', authorize(['admin']), upload.array('media', 20), createGuessingGame);
router.post('/result', authorize(['parent', 'child', 'admin']), saveGameResult);
router.get('/child/:childId/history', authorize(['parent', 'child', 'admin']), getGameHistory);

module.exports = router;