// server/scripts/addMissingEmbeddings.js
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const { logger } = require('../utils/logger');
const { generateEmbedding } = require('../services/embeddingService');
const VisionResult = require('../models/VisionResult');

// Set strictQuery to suppress the deprecation warning
mongoose.set('strictQuery', false);

const batchSize = 50; // Process records in batches to avoid memory issues

/**
 * Add embeddings to records that don't have them
 */
const addMissingEmbeddings = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Count total records without embeddings
    const totalMissing = await VisionResult.countDocuments({ 
      $or: [
        { embedding: { $exists: false } },
        { embedding: null },
        { embedding: [] }
      ],
      result: { $exists: true, $ne: null, $ne: '' }
    });
    
    if (totalMissing === 0) {
      logger.info('No records missing embeddings found');
      process.exit(0);
    }
    
    logger.info(`Found ${totalMissing} records missing embeddings`);
    
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    
    // Process in batches to avoid memory issues
    let hasMoreRecords = true;
    
    while (hasMoreRecords) {
      // Get batch of records without embeddings
      const records = await VisionResult.find({ 
        $or: [
          { embedding: { $exists: false } },
          { embedding: null },
          { embedding: [] }
        ],
        result: { $exists: true, $ne: null, $ne: '' }
      }).limit(batchSize);
      
      if (records.length === 0) {
        hasMoreRecords = false;
        continue;
      }
      
      logger.info(`Processing batch of ${records.length} records`);
      
      // Process each record in the batch
      for (const record of records) {
        try {
          // Get the text to embed from the result field based on your schema
          const textToEmbed = record.result;
          
          if (!textToEmbed) {
            logger.warn(`Record ${record._id} has no text to embed, skipping`);
            processedCount++;
            failedCount++;
            continue;
          }
          
          // Generate embedding
          const embedding = await generateEmbedding(textToEmbed);
          
          if (!embedding) {
            logger.warn(`Failed to generate embedding for record ${record._id}`);
            processedCount++;
            failedCount++;
            continue;
          }
          
          // Update the record with the embedding
          await VisionResult.updateOne(
            { _id: record._id },
            { $set: { embedding: embedding } }
          );
          
          successCount++;
          processedCount++;
          
          // Log progress periodically
          if (processedCount % 10 === 0 || processedCount === totalMissing) {
            logger.info(`Progress: ${processedCount}/${totalMissing} records processed (${successCount} successful, ${failedCount} failed)`);
          }
        } catch (err) {
          logger.error(`Error processing record ${record._id}: ${err.message}`);
          processedCount++;
          failedCount++;
        }
      }
    }
    
    logger.info(`Embedding generation complete. Total: ${totalMissing}, Successful: ${successCount}, Failed: ${failedCount}`);
    process.exit(0);
  } catch (err) {
    logger.error(`Error in embedding generation script: ${err.message}`);
    process.exit(1);
  }
};

addMissingEmbeddings();