
import { GoogleGenAI } from "@google/genai";

// The API key is obtained exclusively from the environment variable.
// Do not hardcode keys here to prevent leakage errors in production.
export const geminiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
