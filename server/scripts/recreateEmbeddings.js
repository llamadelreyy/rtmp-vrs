// server/scripts/recreateEmbeddings.js
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const { logger } = require('../utils/logger');
const { generateEmbedding } = require('../services/embeddingService');
const VisionResult = require('../models/VisionResult');

// Set strictQuery to suppress the deprecation warning
mongoose.set('strictQuery', false);

const batchSize = 25; // Smaller batch size to better visualize output

/**
 * Recreate embeddings for all records with text content
 */
const recreateEmbeddings = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Count total records with text content
    const totalRecords = await VisionResult.countDocuments({ 
      result: { $exists: true, $ne: null, $ne: '' }
    });
    
    if (totalRecords === 0) {
      logger.info('No records with text content found');
      process.exit(0);
    }
    
    logger.info(`Found ${totalRecords} records with text content`);
    
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    
    // Process in batches
    let hasMoreRecords = true;
    let skip = 0;
    
    while (hasMoreRecords) {
      // Get batch of records
      const records = await VisionResult.find({ 
        result: { $exists: true, $ne: null, $ne: '' }
      })
      .skip(skip)
      .limit(batchSize);
      
      if (records.length === 0) {
        hasMoreRecords = false;
        continue;
      }
      
      logger.info(`Processing batch of ${records.length} records (${skip + 1} to ${skip + records.length})`);
      
      // Process each record in the batch
      for (const record of records) {
        try {
          const textToEmbed = record.result;
          
          if (!textToEmbed) {
            logger.warn(`Record ${record._id} has no text to embed, skipping`);
            processedCount++;
            failedCount++;
            continue;
          }
          
          // Print original text to console
          console.log('\n-----------------------------------------------');
          console.log(`RECORD ID: ${record._id}`);
          console.log('TEXT CONTENT:');
          console.log(textToEmbed);
          
          // Generate embedding
          const embedding = await generateEmbedding(textToEmbed);
          
          if (!embedding || embedding.length === 0) {
            logger.warn(`Failed to generate embedding for record ${record._id}`);
            processedCount++;
            failedCount++;
            continue;
          }
          
          // Print embedding details
          console.log('\nEMBEDDING DETAILS:');
          console.log(`Dimensions: ${embedding.length}`);
          console.log(`First 5 values: [${embedding.slice(0, 5).join(', ')}]`);
          console.log(`Last 5 values: [${embedding.slice(-5).join(', ')}]`);
          console.log('-----------------------------------------------');
          
          // Update the record with the new embedding
          await VisionResult.updateOne(
            { _id: record._id },
            { $set: { embedding: embedding } }
          );
          
          successCount++;
          processedCount++;
          
          // Log progress periodically
          if (processedCount % 10 === 0 || processedCount === totalRecords) {
            logger.info(`Progress: ${processedCount}/${totalRecords} records processed (${successCount} successful, ${failedCount} failed)`);
          }
        } catch (err) {
          logger.error(`Error processing record ${record._id}: ${err.message}`);
          processedCount++;
          failedCount++;
        }
      }
      
      skip += records.length;
    }
    
    logger.info(`\n=== EMBEDDING RECREATION COMPLETE ===`);
    logger.info(`Total Records: ${totalRecords}`);
    logger.info(`Successfully Processed: ${successCount}`);
    logger.info(`Failed: ${failedCount}`);
    process.exit(0);
  } catch (err) {
    logger.error(`Error in embedding recreation script: ${err.message}`);
    process.exit(1);
  }
};

recreateEmbeddings();