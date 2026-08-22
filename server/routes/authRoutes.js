const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');

router.post('/google', authController.googleAuth);
router.get('/me', requireAuth, authController.getCurrentUser);

module.exports = router;
