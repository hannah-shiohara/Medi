import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateAISummary = async (prompt) => {
  try {
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
};
