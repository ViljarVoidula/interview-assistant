import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { getPrompt, InterviewType } from './promptFactory';

dotenv.config();

let openai: OpenAI | null = null;
let language = process.env.LANGUAGE || "Python";
let model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
let interviewType: InterviewType = 'algorithmic';

interface Config {
  apiKey: string;
  language: string;
  model: string;
  interviewType: InterviewType;
}

function updateConfig(config: Config) {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  try {
    openai = new OpenAI({
      apiKey: config.apiKey.trim(),
    });
    language = config.language || 'Python';
    model = config.model || 'gpt-3.5-turbo';
    interviewType = config.interviewType || 'algorithmic';
    // console.log('OpenAI client initialized with new config');
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
    throw error;
  }
}

// Initialize with environment variables if available
if (process.env.OPENAI_API_KEY) {
  try {
    updateConfig({
      apiKey: process.env.OPENAI_API_KEY,
      language: process.env.LANGUAGE || 'Python',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      interviewType: (process.env.INTERVIEW_TYPE as InterviewType) || 'algorithmic'
    });
  } catch (error) {
    console.error('Error initializing OpenAI with environment variables:', error);
  }
}

interface ProcessedSolution {
  approach: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
}

type MessageContent = 
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export async function processScreenshots(screenshots: { path: string }[]): Promise<ProcessedSolution> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Please configure API key first. Click CTRL/CMD + P to open settings and set the API key.');
  }

  try {
    const prompt = getPrompt(interviewType, language);
    const messages = [
      {
        role: "system" as const,
        content: prompt.system
      },
      {
        role: "user" as const,
        content: [
          { type: "text", text: prompt.user } as MessageContent
        ]
      }
    ];

    // Add screenshots as image URLs
    for (const screenshot of screenshots) {
      const base64Image = await fs.readFile(screenshot.path, { encoding: 'base64' });
      messages.push({
        role: "user" as const,
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`
            }
          } as MessageContent
        ]
      });
    }

    // Get response from OpenAI
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages as any,
      // max_tokens: 2000,
      //temperature: 0.7,
      response_format: { type: "json_object" }
    });
    console.debug(`Using OpenAI model: ${response.model}`);
    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as ProcessedSolution;
  } catch (error) {
    console.error('Error processing screenshots:', error);
    throw error;
  }
}

export default {
  processScreenshots,
  updateConfig
};
