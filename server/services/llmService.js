// server/services/llmService.js
const axios = require('axios');
const { logger } = require('../utils/logger');
const config = require('../config/env');

class LLMService {
  constructor() {
    // Use new LLM model endpoints first, fallback to legacy VLM
    this.endpoint = config.LLM_API_URL || config.LLM_API_URL_REMOTE || config.VLM_API_URL;
    this.model = config.LLM_MODEL || config.VLM_MODEL || 'llm_model';
    this.maxTokens = config.LLM_CONTEXT_SIZE || config.VLM_MAX_TOKENS || 262144;
    
    // Use chat/completions endpoint for OpenAI-compatible APIs
    if (config.LLM_API_URL || config.LLM_API_URL_REMOTE) {
      this.endpoint = this.endpoint + (this.endpoint.endsWith('/') ? '' : '/') + 'chat/completions';
    }
    
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer dummy-key` // Most local models don't need real auth
    };
    
    logger.info(`LLMService initialized with endpoint: ${this.endpoint}, model: ${this.model}`);
  }

  /**
   * Generate text completion using the LLM
   * @param {string} prompt - The text prompt
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Generated text response
   */
  async generateCompletion(prompt, options = {}) {
    try {
      const {
        temperature = 0.7,
        maxTokens = this.maxTokens,
        systemPrompt = null
      } = options;

      logger.debug(`Generating LLM completion for prompt (length: ${prompt.length})`);
      
      const messages = [];
      
      if (systemPrompt) {
        messages.push({
          role: "system",
          content: systemPrompt
        });
      }
      
      messages.push({
        role: "user",
        content: prompt
      });

      const response = await axios.post(this.endpoint, {
        model: this.model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature
      }, {
        headers: this.headers,
        timeout: 60000 // 60 second timeout for LLM requests
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        const content = response.data.choices[0].message.content;
        logger.debug(`Successfully generated LLM completion (${content.length} chars)`);
        return content;
      } else {
        logger.error('LLM response missing expected data structure', response.data);
        return null;
      }
    } catch (error) {
      logger.error(`Error generating LLM completion: ${error.message}`);
      if (error.response) {
        logger.error(`LLM API response error: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to generate completion: ${error.message}`);
    }
  }

  /**
   * Generate a security report from surveillance data
   * @param {Object} data - Surveillance data to analyze
   * @param {string} reportType - Type of report to generate
   * @returns {Promise<string>} - Generated report
   */
  async generateReport(data, reportType = 'daily_analysis') {
    const systemPrompts = {
      daily_analysis: `You are a security analyst generating a comprehensive daily surveillance report. 
        Analyze the provided data and create a structured report with:
        1. Executive Summary
        2. Key Events and Statistics
        3. Security Incidents (if any)
        4. Traffic Patterns
        5. Recommendations
        Format the response in professional report format.`,
      
      security_incidents: `You are a security expert analyzing incidents for risk assessment.
        Focus on security threats, unauthorized access, suspicious behavior, and provide:
        1. Incident Summary
        2. Risk Assessment
        3. Immediate Actions Required
        4. Prevention Recommendations
        Use formal security report language.`,
      
      traffic_footfall: `You are a business analyst examining foot traffic and movement patterns.
        Analyze the data for:
        1. Peak Activity Hours
        2. Traffic Flow Patterns
        3. Occupancy Trends
        4. Business Insights
        5. Operational Recommendations
        Present findings with business impact focus.`,
      
      compliance: `You are a compliance officer creating regulatory documentation.
        Generate a formal compliance report covering:
        1. System Performance Metrics
        2. Data Retention Compliance
        3. Security Measure Effectiveness
        4. Regulatory Adherence
        5. Audit Trail Summary
        Use formal regulatory language suitable for audits.`
    };

    const systemPrompt = systemPrompts[reportType] || systemPrompts.daily_analysis;
    
    const prompt = `
Based on the following surveillance data, generate a ${reportType.replace('_', ' ')} report:

${JSON.stringify(data, null, 2)}

Please provide a comprehensive analysis following the specified format.
`;

    return await this.generateCompletion(prompt, {
      systemPrompt,
      temperature: 0.3, // Lower temperature for more consistent reports
      maxTokens: 4000
    });
  }

  /**
   * Evaluate a natural language alarm rule
   * @param {string} rule - Natural language rule description
   * @param {Object} context - Current context/data to evaluate against
   * @returns {Promise<Object>} - Evaluation result with reasoning
   */
  async evaluateAlarmRule(rule, context) {
    const systemPrompt = `You are an intelligent security system evaluating alarm conditions.
      You will receive a natural language rule and current surveillance context.
      Respond with a JSON object containing:
      {
        "triggered": boolean,
        "confidence": number (0-1),
        "reasoning": "explanation of the decision",
        "severity": "low|medium|high|critical"
      }`;

    const prompt = `
Alarm Rule: "${rule}"

Current Context:
${JSON.stringify(context, null, 2)}

Evaluate if this rule should trigger an alarm based on the current context.
`;

    try {
      const response = await this.generateCompletion(prompt, {
        systemPrompt,
        temperature: 0.2, // Low temperature for consistent evaluation
        maxTokens: 500
      });

      // Try to parse JSON response
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // If JSON parsing fails, extract key information
        const triggered = response.toLowerCase().includes('true') || 
                         response.toLowerCase().includes('triggered');
        return {
          triggered,
          confidence: triggered ? 0.7 : 0.3,
          reasoning: response,
          severity: triggered ? 'medium' : 'low'
        };
      }
    } catch (error) {
      logger.error(`Error evaluating alarm rule: ${error.message}`);
      return {
        triggered: false,
        confidence: 0,
        reasoning: `Error evaluating rule: ${error.message}`,
        severity: 'low'
      };
    }
  }

  /**
   * Generate behavior analysis from zone activity
   * @param {Object} zoneData - Zone activity data
   * @returns {Promise<Object>} - Behavior analysis
   */
  async analyzeBehavior(zoneData) {
    const systemPrompt = `You are a behavior analysis expert examining surveillance zone activity.
      Analyze the provided zone data and identify:
      1. Normal vs Abnormal behavior patterns
      2. Potential security concerns
      3. Behavioral insights
      Respond with JSON containing your analysis.`;

    const prompt = `
Analyze the following zone activity data:
${JSON.stringify(zoneData, null, 2)}

Provide behavioral insights and flag any concerning patterns.
`;

    try {
      const response = await this.generateCompletion(prompt, {
        systemPrompt,
        temperature: 0.4,
        maxTokens: 1000
      });

      try {
        return JSON.parse(response);
      } catch (parseError) {
        return {
          analysis: response,
          concerns: [],
          recommendations: []
        };
      }
    } catch (error) {
      logger.error(`Error analyzing behavior: ${error.message}`);
      return {
        analysis: `Error analyzing behavior: ${error.message}`,
        concerns: [],
        recommendations: []
      };
    }
  }

  /**
   * Test the LLM service connection
   * @returns {Promise<boolean>} - True if service is working
   */
  async testConnection() {
    try {
      const response = await this.generateCompletion('Hello, respond with "Service OK" if you can read this.', {
        maxTokens: 50,
        temperature: 0
      });
      
      return response && response.toLowerCase().includes('service ok');
    } catch (error) {
      logger.error(`LLM service test failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = new LLMService();