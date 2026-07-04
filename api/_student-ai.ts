import { getAI } from "./_ai";

export default async function handler(req: any, res: any) {
  // Ensure JSON parsing support for both serverless and express contexts
  if (req.body === undefined && typeof req.on === "function") {
    // Standard Node request stream reading if express.json is not run yet
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
    const { prompt, chatHistory } = req.body || {};
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
}
