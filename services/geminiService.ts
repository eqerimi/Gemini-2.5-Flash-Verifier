import { GoogleGenAI } from "@google/genai";
import { TestResult } from "../types";

// ==============================================================================
// CONFIGURATION
// ==============================================================================
const MODEL_NAME = 'gemini-2.5-flash';
// ==============================================================================

export const checkApiKeyPresence = (): boolean => {
  return !!process.env.API_KEY;
};

export const runBasicGenerationTest = async (): Promise<TestResult> => {
  const startTime = performance.now();

  try {
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing. Please set process.env.API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "Respond with exactly the word 'Confirmed' to verify connectivity.",
    });

    const endTime = performance.now();
    const text = response.text || '';

    return {
      latencyMs: Math.round(endTime - startTime),
      model: MODEL_NAME,
      responsePreview: text.trim(),
      success: true
    };
  } catch (error: any) {
    const endTime = performance.now();
    return {
      latencyMs: Math.round(endTime - startTime),
      model: MODEL_NAME,
      responsePreview: '',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export const runStreamingTest = async (
  onChunk: (text: string) => void,
  customPrompt?: string
): Promise<TestResult> => {
  const startTime = performance.now();
  let fullText = '';

  try {
     if (!process.env.API_KEY) {
      throw new Error("API Key is missing. Please set process.env.API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const responseStream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: customPrompt || "Write a haiku about speed.",
    });

    for await (const chunk of responseStream) {
      const text = chunk.text || '';
      fullText += text;
      onChunk(text);
    }

    const endTime = performance.now();

    return {
      latencyMs: Math.round(endTime - startTime),
      model: MODEL_NAME,
      responsePreview: fullText.trim(),
      success: true
    };

  } catch (error: any) {
    const endTime = performance.now();
    return {
      latencyMs: Math.round(endTime - startTime),
      model: MODEL_NAME,
      responsePreview: fullText, // Return whatever we got
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};