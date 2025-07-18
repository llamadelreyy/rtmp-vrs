const Prompt = require('../../models/prompt');
const { logger } = require('../../utils/logger');

module.exports = {
  name: '002-remove-prompt-tags',
  async up() {
    const prompts = await Prompt.find({});

    for (const prompt of prompts) {
      // Remove the tags field from each prompt
      delete prompt.tags;
      await prompt.save();
    }

    logger.info('Prompt tags removed successfully');
  },
};
