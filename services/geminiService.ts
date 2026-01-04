
import { GoogleGenAI } from "@google/genai";

class GeminiService {
    private localClient: GoogleGenAI | null = null;

    constructor() {
        // HÍBRIDO: Detección de entorno.
        // 1. Google AI Studio: Inyecta process.env.API_KEY automáticamente.
        // FIX: Obtained API Key exclusively from process.env.API_KEY. Fallback removed.
        
        const apiKey = process.env.API_KEY;

        if (apiKey) {
            console.log("GeminiService: API Key detectada en entorno local. Usando cliente directo.");
            this.localClient = new GoogleGenAI({ apiKey: apiKey });
        } else {
            console.log("GeminiService: No se detectó API Key local. Usando Proxy Serverless (/api/gemini).");
        }
    }

    async generateContent(params: any): Promise<{ text: string | undefined }> {
        if (this.localClient) {
            // --- MODO LOCAL (Google AI Studio / Dev) ---
            // Llamada directa al SDK sin pasar por el backend
            try {
                // Desestructuramos params para asegurar que coincidan con la firma del SDK
                const { model, contents, config } = params;

                // FIX: Updated default model to gemini-3-flash-preview for basic text tasks.
                const response = await this.localClient.models.generateContent({
                    model: model || "gemini-3-flash-preview",
                    contents,
                    config
                });
                // FIX: Accessing response.text property directly.
                return { text: response.text };
            } catch (error) {
                console.error("Gemini Local Error:", error);
                throw error;
            }
        } else {
            // --- MODO PRODUCCIÓN (Vercel) ---
            // Llamada a través de la Serverless Function para proteger la Key
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
