
import { GoogleGenAI } from "@google/genai";

class GeminiService {
    private localClient: GoogleGenAI | null = null;

    constructor() {
        // En desarrollo (Local), usamos la clave de .env si existe.
        // Vite expone variables con prefijo VITE_
        const localKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (localKey) {
            console.log("GeminiService: Usando cliente local con API Key.");
            this.localClient = new GoogleGenAI({ apiKey: localKey });
        } else {
            console.log("GeminiService: Modo producción (o sin llave local). Usando Proxy /api/gemini.");
        }
    }

    async generateContent(params: any): Promise<{ text: string | undefined }> {
        if (this.localClient) {
            // Modo Local: Llamada directa al SDK para mayor velocidad en desarrollo
            try {
                const response = await this.localClient.models.generateContent(params);
                return { text: response.text };
            } catch (error) {
                console.error("Gemini Local Error:", error);
                throw error;
            }
        } else {
            // Modo Producción: Llamada a través de la Serverless Function para proteger la Key
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