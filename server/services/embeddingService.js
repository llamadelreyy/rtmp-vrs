// server/services/embeddingService.js
const axios = require('axios');
const { logger } = require('../utils/logger');

// Configure the embedding API endpoint - use new model first, fallback to Ollama
const EMBEDDING_API = process.env.EMBEDDING_API_URL || process.env.EMBEDDING_API_URL_REMOTE || process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || process.env.LEGACY_EMBEDDING_MODEL || 'embedding_model';
const IS_OPENAI_COMPATIBLE = process.env.EMBEDDING_API_URL || process.env.EMBEDDING_API_URL_REMOTE;

/**
 * Generate embeddings for a text using Nomic Embed Text model via Ollama
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]|null>} - The embedding vector or null if failed
 */
async function generateEmbedding(text) {
  if (!text) {
    logger.warn('Attempted to generate embedding for empty text');
    return null;
  }

  try {
    logger.debug(`Generating embedding for text (length: ${text.length}) using ${EMBEDDING_MODEL} at ${EMBEDDING_API}`);
    
    let requestBody, responseField;
    
    if (IS_OPENAI_COMPATIBLE) {
      // Use OpenAI-compatible API format
      requestBody = {
        model: EMBEDDING_MODEL,
        input: text,
      };
      responseField = 'data';
    } else {
      // Use Ollama format as fallback
      requestBody = {
        model: EMBEDDING_MODEL,
        prompt: text,
      };
      responseField = 'embedding';
    }
    
    const apiEndpoint = IS_OPENAI_COMPATIBLE ? `${EMBEDDING_API}/embeddings` : `${EMBEDDING_API}/embeddings`;
    
    const response = await axios.post(apiEndpoint, requestBody, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    let embedding;
    if (IS_OPENAI_COMPATIBLE && response.data && response.data.data && response.data.data[0]) {
      // OpenAI-compatible response format
      embedding = response.data.data[0].embedding;
    } else if (response.data && response.data.embedding) {
      // Ollama response format
      embedding = response.data.embedding;
    } else {
      logger.error('Embedding response missing expected data structure', response.data);
      return null;
    }
    
    if (embedding && Array.isArray(embedding)) {
      logger.debug(`Successfully generated embedding with ${embedding.length} dimensions`);
      return embedding;
    } else {
      logger.error('Invalid embedding format received', embedding);
      return null;
    }
  } catch (error) {
    logger.error(`Error generating embedding: ${error.message}`);
    if (error.response) {
      logger.error(`Response error: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} Cosine similarity (1 is most similar, -1 is most dissimilar)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find similar documents by embedding vector (for MongoDB without vector search capability)
 * @param {Object} options - Search options
 * @param {number[]} options.embedding - Query embedding vector
 * @param {Object} options.filter - Additional MongoDB filter
 * @param {number} options.limit - Max results to return
 * @param {number} options.threshold - Minimum similarity threshold (0-1)
 * @returns {Promise<Array>} - Sorted results by similarity
 */
async function findSimilarDocuments(model, options) {
  const { embedding, filter = {}, limit = 20, threshold = 0.01 } = options;
  
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Valid embedding required for similarity search');
  }
  
  // First, get documents that have embeddings
  const documents = await model.find({ 
    ...filter, 
    embedding: { $exists: true, $ne: null }
  }).limit(limit * 5); // Get more than we need to filter by similarity
  
  // Calculate similarity for each document
  const documentsWithSimilarity = documents.map(doc => {
    const similarity = cosineSimilarity(embedding, doc.embedding);
    return { doc, similarity };
  });
  
  // Filter by threshold and sort by similarity (highest first)
  return documentsWithSimilarity
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(item => ({
      ...item.doc.toObject(),
      _similarity: item.similarity
    }));
}

// Batch process multiple documents to generate embeddings
async function batchGenerateEmbeddings(texts) {
  const results = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    results.push(embedding);
  }
  return results;
}

module.exports = {
  generateEmbedding,
  findSimilarDocuments,
  batchGenerateEmbeddings,
  cosineSimilarity
};