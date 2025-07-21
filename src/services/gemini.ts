import { GoogleGenAI } from '@google/genai';
import { getPrompt, InterviewType } from './promptFactory';

let genAI: GoogleGenAI | null = null;
let language = 'Python';
let model = 'gemini-2.5-flash';
let interviewType: InterviewType = 'algorithmic';

interface Config {
  geminiApiKey: string;
  language: string;
  model: string;
  interviewType: InterviewType;
}

function updateConfig(config: Config) {
  if (!config.geminiApiKey) {
    throw new Error('Google AI API key is required');
  }
  
  try {
    genAI = new GoogleGenAI({
      apiKey: config.geminiApiKey.trim(),
      apiVersion: 'v1alpha'
    });
    language = config.language || 'Python';
    model = config.model || 'gemini-2.5-flash';
    interviewType = config.interviewType || 'algorithmic';
    console.log('Google AI client initialized with new config');
  } catch (error) {
    console.error('Error initializing Google AI client:', error);
    throw error;
  }
}

interface ProcessedSolution {
  approach: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
}

async function processImages(base64Images: string[]): Promise<ProcessedSolution> {
  if (!genAI) {
    throw new Error('Google AI client not initialized. Please configure your API key.');
  }

  try {
    const prompt = getPrompt(interviewType, language).system;

    // Convert base64 images to the format expected by Gemini
    const imageParts = base64Images.map(base64 => ({
      inlineData: {
        data: base64.split(',')[1], // Remove data:image/jpeg;base64, prefix
        mimeType: 'image/jpeg'
      }
    }));

    const response = await genAI.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...imageParts
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            approach: { type: 'string' },
            code: { type: 'string' },
            timeComplexity: { type: 'string' },
            spaceComplexity: { type: 'string' }
          },
          required: ['approach', 'code', 'timeComplexity', 'spaceComplexity']
        }
      }
    });
    
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Raw Gemini response:', text);

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Gemini response');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    
    // Validate response structure
    if (!parsedResponse.approach || !parsedResponse.code || !parsedResponse.timeComplexity || !parsedResponse.spaceComplexity) {
      throw new Error('Invalid response structure from Gemini');
    }

    return {
      approach: parsedResponse.approach,
      code: parsedResponse.code,
      timeComplexity: parsedResponse.timeComplexity,
      spaceComplexity: parsedResponse.spaceComplexity
    };

  } catch (error) {
    console.error('Error processing with Gemini:', error);
    if (error instanceof Error) {
      throw new Error(`Gemini processing failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred during Gemini processing');
  }
}

// Process audio with streaming response
async function processAudioStream(
  audioBase64: string, 
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!genAI) {
    throw new Error('Google AI client not initialized. Please configure your API key.');
  }

  try {
    const prompt = `You are an expert coding interview assistant. Listen to the audio question and provide a comprehensive solution. 

Analyze the coding question and provide:
1. A clear understanding of the problem , extract problem statement from audio
2. Step-by-step approach explanation
3. Complete, working code solution in ${language}
4. Time and space complexity analysis if applicable
5. Edge cases and optimizations

Please provide a conversational, detailed explanation as if you're helping someone understand the solution in real-time.`;

    const audioPart = {
      inlineData: {
        data: audioBase64,
        mimeType: 'audio/wav'
      }
    };

    // Use streaming for real-time response
    console.log('Starting streaming request to Gemini...');
    const streamResult = await genAI.models.generateContentStream({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            audioPart
          ]
        }
      ]
    });

    console.log('Stream started, processing chunks...');
    let chunkCount = 0;
    let hasReceivedContent = false;
    
    for await (const chunk of streamResult) {
      chunkCount++;

      if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content) {
        const content = chunk.candidates[0].content;
        if (content.parts && content.parts[0] && content.parts[0].text) {
          const chunkText = content.parts[0].text;
          console.log(`Received chunk ${chunkCount}:`, chunkText);
          hasReceivedContent = true;
          onChunk(chunkText);
        }
      }
    }
    
    console.log(`Streaming completed. Total chunks processed: ${chunkCount}, Content received: ${hasReceivedContent}`);
    
    // If no streaming content was received, try a fallback non-streaming request
    if (!hasReceivedContent) {
      console.log('No streaming content received, trying fallback non-streaming request...');
      const fallbackResponse = await genAI.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              audioPart
            ]
          }
        ]
      });
      
      const text = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) {
        console.log('Fallback response received:', text);
        onChunk(text);
      }
    }
    
  } catch (error) {
    console.error('Error processing audio with Gemini:', error);
    if (error instanceof Error) {
      throw new Error(`Gemini audio processing failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred during Gemini audio processing');
  }
}

export default {
  updateConfig,
  processImages,
  processAudioStream
};
