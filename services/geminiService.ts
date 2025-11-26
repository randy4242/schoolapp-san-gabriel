import { GoogleGenAI } from "@google/genai";

const API_KEY = "AIzaSyCEWyx38AjgZ5ZSYqljEgLS2eE8xdQVtr4";

export const geminiClient = new GoogleGenAI({ apiKey: API_KEY });
