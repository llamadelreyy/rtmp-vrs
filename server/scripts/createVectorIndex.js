// server/scripts/createVectorIndex.js
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const { logger } = require('../utils/logger');

// Set strictQuery to suppress the deprecation warning
mongoose.set('strictQuery', false);

const createVectorIndex = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    // Check MongoDB version and capabilities
    const buildInfo = await db.admin().buildInfo();
    logger.info(`MongoDB version: ${buildInfo.version}`);
    
    // Check if the collection exists
    const collections = await db.listCollections({ name: 'visionresults' }).toArray();
    if (collections.length === 0) {
      logger.info('Collection visionresults does not exist yet');
      process.exit(0);
    }
    
    // Check if the vector index already exists
    const indexes = await db.collection('visionresults').listIndexes().toArray();
    const hasVectorIndex = indexes.some(idx => idx.name === 'embedding_vector_index');
    
    if (hasVectorIndex) {
      logger.info('Vector index already exists on visionresults collection');
      process.exit(0);
    }
    
    // Create the vector index using createSearchIndex for MongoDB Atlas
    try {
      // First attempt: Try Atlas Search index creation
      await db.collection('visionresults').createSearchIndex({
        name: "embedding_vector_index",
        definition: {
          mappings: {
            dynamic: false,
            fields: {
              embedding: {
                type: "knnVector",
                dimensions: 768,
                similarity: "cosine"
              }
            }
          }
        }
      });
      logger.info('Successfully created vector search index on visionresults collection using Atlas Search');
    } catch (searchIndexErr) {
      logger.warn(`Atlas Search index creation failed: ${searchIndexErr.message}`);
      
      // Second attempt: Try standard MongoDB 6.0+ vector index
      try {
        await db.collection('visionresults').createIndex(
          { embedding: 1 },
          { 
            name: "embedding_vector_index",
            vectorSize: 768,
            vectorSearchOptions: { similarity: "cosine" }
          }
        );
        logger.info('Successfully created vector index using MongoDB 6.0+ syntax');
      } catch (standardIndexErr) {
        logger.error(`Standard vector index creation failed: ${standardIndexErr.message}`);
        logger.info('Creating regular index instead as fallback');
        
        // Fallback: Create a regular index
        await db.collection('visionresults').createIndex(
          { embedding: 1 },
          { name: "embedding_vector_index" }
        );
        logger.info('Created regular index as fallback (vector search will not be available)');
      }
    }
    
    process.exit(0);
  } catch (err) {
    logger.error(`Error creating vector index: ${err.message}`);
    process.exit(1);
  }
};

createVectorIndex();