import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const outputSchema = z.object({
  feedback: z.string().describe("Feedback for the user"),
  score: z.number().int().describe("Score out of 10 for their interview"),
});

const RESULT_PROMPT = `
    You are an expert evaluator. Your job is to evaluate the users interview. Give them a score out of 10
    and also let them know any feedback you have about their interview.

    Please return only a JSON object which looks like this:
    {
        "feedback": string,
        "score": number
    }

    DO NOT RETURN ANY OTHER TEXT
    {{USER_TRANSCRIPT}}
`;

/**
 * Uses Gemini to score and give feedback on an interview transcript.
 */
export async function calculateResult(
  messages: { type: "Assistant" | "User"; message: string; createdAt: Date }[]
) {
  const prompt = RESULT_PROMPT.replace(
    `{{USER_TRANSCRIPT}}`,
    JSON.stringify(messages)
  );

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const result = outputSchema.parse(JSON.parse(response.text!));
  return result;
}
