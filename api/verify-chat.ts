import { getAI } from "./_ai.js";
import { Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Ensure JSON parsing support
  if (req.body === undefined && typeof req.on === "function") {
    await new Promise<void>((resolve) => {
      let body = "";
      req.on("data", (chunk: any) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          req.body = JSON.parse(body);
        } catch (e) {
          req.body = {};
        }
        resolve();
      });
    });
  }

  try {
    const { text } = req.body || {};
    if (!text) {
      res.status(400).json({ error: "Text is required for verification" });
      return;
    }

    const ai = getAI();
    const systemInstruction = `
      You are an AI Moderator protecting the Ahmed Gamal English Academy chat room.
      Your task is to analyze the user's message for any Egyptian slang bad words, severe profanity, insults, sexual innuendos, or bypasses/evasions (e.g. كس, زب, طيز, شرموطة, خول, قحبة, عرص, ديوث, منيوك, كسمك, إلخ).
      Analyze both standard Arabic text and phonetic/Franco-Arab evasions (e.g. k0smk, kos, 6eez, zob, sharmota).
      Be extremely precise. Do not flag normal words like "زبون" (customer), "كسب" (won), "دخول" (entry), "بتاع" (belonging to), or general learning questions. Only flag actual bad words, insults, or profanities.
      
      You must respond in strict JSON format matching the schema provided.
    `;

    const prompt = `Analyze this message and decide if it contains severe profanity or bad words: "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isBad: {
              type: Type.BOOLEAN,
              description: "True if the message contains Egyptian bad words, severe profanity, or bypasses, false otherwise.",
            },
            matchedWord: {
              type: Type.STRING,
              description: "The specific bad word or phrase detected, if any.",
            },
            reason: {
              type: Type.STRING,
              description: "A brief reason why it was flagged or approved.",
            }
          },
          required: ["isBad", "matchedWord", "reason"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());

    res.json(resultJson);
  } catch (error: any) {
    console.error("AI Verify Chat Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze chat content" });
  }
}
