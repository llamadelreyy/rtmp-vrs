// server/scripts/check-ollama.js
const axios = require('axios');
const { logger } = require('../utils/logger');

// Configure the Ollama API endpoint
const OLLAMA_API = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text:v1.5';

async function checkOllama() {
  try {
    logger.info('Checking Ollama availability...');
    
    // Check if Ollama is running
    const healthResponse = await axios.get(`${OLLAMA_API.replace('/api', '')}/`, { timeout: 5000 });
    logger.info('Ollama server is running');
    
    // Check if model exists
    const modelResponse = await axios.get(`${OLLAMA_API}/tags`);
    const modelExists = modelResponse.data.models.some(model => 
      model.name === EMBEDDING_MODEL || model.name.startsWith(`${EMBEDDING_MODEL}:`)
    );
    
    if (!modelExists) {
      logger.info(`Downloading Nomic Embed Text model (${EMBEDDING_MODEL})...`);
      await axios.post(`${OLLAMA_API}/pull`, { name: EMBEDDING_MODEL });
      logger.info(`Successfully downloaded ${EMBEDDING_MODEL}`);
    } else {
      logger.info(`Embedding model ${EMBEDDING_MODEL} is already available`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error checking Ollama: ${error.message}`);
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        logger.error('Ollama server is not running. Please make sure Ollama is installed and running.');
        logger.info('You can install Ollama from: https://ollama.ai/');
        logger.info('For Linux/MacOS: curl -fsSL https://ollama.ai/install.sh | sh');
        logger.info('For Windows: Download from the Ollama website');
      }
      return false;
    }
  }
  
  // Run the check if this script is executed directly
  if (require.main === module) {
    checkOllama()
      .then(success => {
        if (success) {
          logger.info('Ollama setup complete!');
          process.exit(0);
        } else {
          logger.error('Ollama setup failed.');
          process.exit(1);
        }
      })
      .catch(err => {
        logger.error(`Unexpected error: ${err.message}`);
        process.exit(1);
      });
  } else {
    // Export for use in other modules
    module.exports = checkOllama;
  }