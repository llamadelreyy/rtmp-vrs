const Prompt = require('../../models/prompt');
const { logger } = require('../../utils/logger');

module.exports = {
  name: '001-update-prompt-schema',
  async up() {
    const prompts = await Prompt.find({});

    for (const prompt of prompts) {
      prompt.tags = [prompt.name];
      await prompt.save();
    }

    logger.info('Prompt schema updated successfully');
  },
};
