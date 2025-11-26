
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../config";

// Initialize the Gemini client with the hardcoded key from config.ts
export const geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
