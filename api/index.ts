import express from "express";
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please add this variable to your Vercel Environment Variables in your project dashboard.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

export const app = express();
app.use((req: any, res, next) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return next();
  }
  express.json()(req, res, next);
});

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Student AI Assistant (F.R.I.D.A.Y. - English Tutor)
app.post("/api/student-ai", async (req, res) => {
  try {
    const { prompt, chatHistory } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const ai = getAI();

    const systemInstruction = `
      You are F.R.I.D.A.Y., an elite English Language AI Assistant and Tutor, built for the Ahmed Gamal English Academy.
      Your tone is friendly, professional, extremely helpful, and inspired by Marvel Studios (e.g., calling the student "Avenger" or saying "Linguistic power levels rising").
      You must respond primarily in Arabic (for explanations) with clear English examples, corrections, or lessons.
      You can help with:
      - Answering English questions.
      - Explaining grammar rules clearly with examples.
      - Translating sentences and explaining the translation.
      - Pointing out mistakes in their writing and suggesting corrections.
      - Vocabulary expansion.
      - Conversation practice.
      Keep your formatting beautiful, using markdown bullet points and code blocks for English text where applicable.
    `;

    // Structure contents with history, cleaning and ensuring strict alternating roles
    const rawContents = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        if (!msg.content || !msg.content.trim()) continue;
        rawContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content.trim() }]
        });
      }
    }

    // Filter to ensure strict alternating pattern starting with "user"
    const cleanContents = [];
    let expectedRole = "user";

    for (const item of rawContents) {
      if (item.role === expectedRole) {
        cleanContents.push(item);
        expectedRole = expectedRole === "user" ? "model" : "user";
      }
    }

    // If the clean history ends with a "user" message, pop it so we can append the fresh prompt as "user"
    if (cleanContents.length > 0 && cleanContents[cleanContents.length - 1].role === "user") {
      cleanContents.pop();
    }

    // Append current user prompt
    cleanContents.push({ role: "user", parts: [{ text: prompt.trim() }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: cleanContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error("Student AI Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI response" });
  }
});

// Teacher AI Assistant (Quiz Generator, MCQ Generator, etc.)
app.post("/api/teacher-ai", async (req, res) => {
  try {
    const { action, className, difficulty, topic, numQuestions = 5, customText } = req.body;

    let prompt = "";
    if (action === "generate_quiz") {
      prompt = `
        Generate a list of exactly ${numQuestions} multiple-choice English questions (MCQs) for class "${className}" at "${difficulty}" difficulty level.
        The topic/focus of the exam should be: "${topic || "General English Grammar, Vocabulary and Reading"}".
        ${customText ? `Additional context: "${customText}"` : ""}

        The output must be a valid JSON object. Do not include any markdown backticks or wrappers.
        The output JSON structure must be:
        {
          "questions": [
            {
              "question_text": "Write the full question here",
              "choice_a": "Option A text",
              "choice_b": "Option B text",
              "choice_c": "Option C text",
              "choice_d": "Option D text",
              "correct_answer": "A" (must be "A", "B", "C", or "D")
            }
          ]
        }
      `;
    } else {
      res.status(400).json({ error: "Invalid action" });
      return;
    }

    const ai = getAI();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "{}";
    const parsedData = JSON.parse(responseText.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Teacher AI Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate educational content" });
  }
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
