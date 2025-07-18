const express = require('express');
const { check } = require('express-validator');
const promptController = require('../controllers/prompts');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get(
  '/',
  [
    check('name').optional().isString().trim(),
    check('streamId').optional().isString().trim(),
    validate,
  ],
  promptController.listPrompts
);

router.get(
  '/:id',
  [check('id').isMongoId(), validate],
  promptController.getPrompt
);

module.exports = router;
