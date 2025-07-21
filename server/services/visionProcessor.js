// server/services/visionProcessor.js
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const config = require('../config/env');

class VisionProcessor {
  constructor(openAIKey) {
    this.openAIKey = openAIKey || config.OPENAI_API_KEY;
    this.endpoint = config.VLM_API_URL; // Use VLM API URL from environment variables
    this.model = config.VLM_MODEL; // Use VLM model from environment variables
    this.maxTokens = config.VLM_MAX_TOKENS; // Use max tokens from environment variables
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.openAIKey}`
    };
  }

  async processImage(imageBase64, prompt) {
    try {
      logger.info('Processing image...');
      const response = await axios.post(
        this.endpoint,
        {
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: this.maxTokens
        },
        { headers: this.headers }
      );

      const rawContent = response.data.choices[0].message.content;
      
      // Extract and parse JSON content from the model's response
      const parsedContent = this.extractJsonFromResponse(rawContent);

      return {
        content: parsedContent,
        usage: response.data.usage,
        processingTime: response.data.created - response.data.created
      };
    } catch (error) {
      logger.error(`Vision API error: ${error.message}`);
      if (error.response) {
        logger.error(`Vision API response error: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Extract valid JSON from the model's response text
   * @param {string} text - The text response from the LLM
   * @returns {object|string} Either parsed JSON or fallback to original
   */
  extractJsonFromResponse(text) {
    if (!text) {
      logger.warn('Empty response from vision model');
      return { description: "No response from vision model" };
    }
    
    try {
      // First try direct parsing in case it's already valid JSON
      let parsed;
      
      // Pre-process to handle Python-style booleans
      let preprocessedText = text.replace(/True/g, 'true').replace(/False/g, 'false');
      
      try {
        parsed = JSON.parse(preprocessedText);
      } catch (preProcessError) {
        parsed = JSON.parse(text);
      }
      
      // Convert Python-style booleans to JavaScript booleans if needed
      if (parsed) {
        if (parsed.fire !== undefined) {
          parsed.fire = parsed.fire === true || parsed.fire === "True" || parsed.fire === "true";
        }
        
        if (parsed.gun !== undefined) {
          parsed.gun = parsed.gun === true || parsed.gun === "True" || parsed.gun === "true";
        }
        
        if (parsed.danger !== undefined) {
          parsed.danger = parsed.danger === true || parsed.danger === "True" || parsed.danger === "true";
        }
        
        if (parsed.theft !== undefined) {
          parsed.theft = parsed.theft === true || parsed.theft === "True" || parsed.theft === "true";
        }
        
        if (parsed.medical !== undefined) {
          parsed.medical = parsed.medical === true || parsed.medical === "True" || parsed.medical === "true";
        }
      }
      
      return parsed;
    } catch (e) {
      // Not direct JSON, look for JSON blocks in markdown
      try {
        // Look for ```json ... ``` blocks
        const jsonBlockRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/g;
        const match = jsonBlockRegex.exec(text);
        
        let parsed;
        if (match && match[1]) {
          // Pre-process to handle Python-style booleans
          let preprocessedMatch = match[1].replace(/True/g, 'true').replace(/False/g, 'false');
          
          try {
            parsed = JSON.parse(preprocessedMatch);
          } catch (preProcessError) {
            parsed = JSON.parse(match[1]);
          }
        } else {
          // Look for { ... } blocks without markdown
          const jsonRegex = /({(?:[^{}]|{[^{}]*})*})/g;
          const potentialMatches = [...text.matchAll(jsonRegex)];
          
          if (potentialMatches.length > 0) {
            // Try each potential JSON block
            for (const [index, potentialMatch] of potentialMatches.entries()) {
              try {
                // Pre-process to handle Python-style booleans
                let preprocessedMatch = potentialMatch[0].replace(/True/g, 'true').replace(/False/g, 'false');
                
                try {
                  parsed = JSON.parse(preprocessedMatch);
                } catch (preProcessError) {
                  parsed = JSON.parse(potentialMatch[0]);
                }
                
                // Ensure it has key properties we expect
                if (typeof parsed === 'object' && (parsed.description || 
                    parsed.fire !== undefined || parsed.danger !== undefined)) {
                  break;
                } else {
                  parsed = undefined;
                }
              } catch (err) {
                // Continue to next candidate
                continue;
              }
            }
          }
        }
        
        // If no JSON was found, return the text wrapped in a description field
        if (!parsed) {
          return {
            description: text.trim()
          };
        }
        
        // Convert Python-style booleans to JavaScript booleans
        if (parsed.fire !== undefined) {
          parsed.fire = parsed.fire === true || parsed.fire === "True" || parsed.fire === "true";
        }
        
        if (parsed.gun !== undefined) {
          parsed.gun = parsed.gun === true || parsed.gun === "True" || parsed.gun === "true";
        }
        
        if (parsed.danger !== undefined) {
          parsed.danger = parsed.danger === true || parsed.danger === "True" || parsed.danger === "true";
        }
        
        if (parsed.theft !== undefined) {
          parsed.theft = parsed.theft === true || parsed.theft === "True" || parsed.theft === "true";
        }
        
        if (parsed.medical !== undefined) {
          parsed.medical = parsed.medical === true || parsed.medical === "True" || parsed.medical === "true";
        }
        
        return parsed;
      } catch (finalError) {
        logger.error(`Failed to extract JSON: ${finalError.message}`);
        return {
          description: text.trim()
        };
      }
    }
  }
}

module.exports = new VisionProcessor();