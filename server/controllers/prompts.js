const Prompt = require('../models/Prompt');
const { logger } = require('../utils/logger');

exports.getPrompt = async (req, res, next) => {
  try {
    const prompt = await Prompt.findById(req.params.id)
      .populate('streamId')
      .exec();

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    res.status(200).json(prompt);
  } catch (err) {
    logger.error(`Get prompt error: ${err.message}`);
    next(err);
  }
};

exports.listPrompts = async (req, res, next) => {
  try {
    const { streamId, name } = req.query;
    const prompts = await Prompt.find({
      ...(streamId ? { stream: streamId } : {}),
      ...(name ? { name: new RegExp(name, 'i') } : {}),
    })
      .populate('streamId')
      .exec();

    res.status(200).json(prompts);
  } catch (err) {
    logger.error(`List prompts error: ${err.message}`);
    next(err);
  }
};
