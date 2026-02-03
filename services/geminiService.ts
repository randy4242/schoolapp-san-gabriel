
import { GoogleGenAI } from "@google/genai";

class GeminiService {
    private localClient: GoogleGenAI | null = null;

    constructor() {
        // FIX: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
        const apiKey = process.env.API_KEY;

        if (apiKey) {
            console.log("GeminiService: API Key detectada en entorno local. Usando cliente directo.");
            // FIX: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
            this.localClient = new GoogleGenAI({ apiKey });
        } else {
            console.log("GeminiService: No se detectó API Key local. Usando Proxy Serverless (/api/gemini).");
        }
    }

    async generateContent(params: any): Promise<{ text: string | undefined }> {
        if (this.localClient) {
            // --- MODO LOCAL (SDK Directo) ---
            try {
                const { model, contents, config } = params;

                // FIX: Use 'gemini-3-flash-preview' for basic text tasks if not specified.
                // FIX: Must use ai.models.generateContent to query GenAI with both the model name and prompt.
                const response = await this.localClient.models.generateContent({
                    model: model || "gemini-3-flash-preview",
                    contents,
                    config
                });
                
                // FIX: The generated text content is accessed by the .text property on the GenerateContentResponse object.
                return { text: response.text };
            } catch (error) {
                console.error("Gemini Local Error:", error);
                throw error;
            }
        } else {
            // --- MODO PRODUCCIÓN (Proxy API) ---
            try {
                const response = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error del servidor AI: ${errorText}`);
                }

                const data = await response.json();
                return data; // Se espera { text: "..." }
            } catch (error) {
                console.error("Gemini Proxy Error:", error);
                throw error;
            }
        }
    }
}

export const geminiService = new GeminiService();
