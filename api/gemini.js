
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Manejar pre-flight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // FIX: Must use named parameter for apiKey.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    if (!process.env.API_KEY) {
      throw new Error("La API Key no está configurada en el servidor (Vercel).");
    }

    const { model, contents, config } = req.body;
    
    // FIX: Using gemini-3-flash-preview as the standard model.
    // FIX: Access response via .text property.
    const result = await ai.models.generateContent({
      model: model || "gemini-3-flash-preview",
      contents,
      config
    });

    return res.status(200).json({ text: result.text });

  } catch (error) {
    console.error("Error en el servidor /api/gemini:", error);
    return res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
}
