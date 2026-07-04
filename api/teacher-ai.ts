import { getAI } from "./_ai.js";

export default async function handler(req: any, res: any) {
  // Ensure JSON parsing support for both serverless and express contexts
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
    const { action, className, difficulty, topic, numQuestions = 5, customText } = req.body || {};

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
}
