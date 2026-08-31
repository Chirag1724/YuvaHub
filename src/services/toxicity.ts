import { GoogleGenAI } from '@google/genai';

// Simple local keyword-based check for quick offline toxicity classification
const TOXIC_KEYWORDS = [
  'bastard', 'bitch', 'asshole', 'fuck', 'shit', 'cunt', 'dick', 'cock', 'pussy',
  'motherfucker', 'retard', 'faggot', 'nigger', 'idiot', 'moron', 'kill yourself',
  'die', 'hate you'
];

/**
 * Checks if a string contains toxic content.
 * First uses a fast keyword list check. If configured, falls back to Google Gemini.
 */
export async function isToxic(text: string, genAI?: GoogleGenAI | null): Promise<boolean> {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const cleanText = text.toLowerCase().trim();

  // 1. Fast local regex / keyword check
  for (const word of TOXIC_KEYWORDS) {
    if (cleanText.includes(word)) {
      console.log(`[Toxicity Checker] Blocked by local keyword check matching word: "${word}"`);
      return true;
    }
  }

  // 2. Google Gemini fallback if instance is available
  if (genAI) {
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash", // Using a fast, standard model
        contents: `Classify if the following text is toxic, abusive, hateful, or highly inappropriate. Respond with ONLY 'toxic' or 'clean' (in lowercase): \n\n"${text}"`
      });

      const responseText = (response.text || '').toLowerCase().trim();
      console.log(`[Toxicity Checker] Gemini model response: "${responseText}"`);
      return responseText.includes('toxic');
    } catch (err: any) {
      console.warn('[Toxicity Checker] Gemini check failed, falling back to local clean:', err.message);
    }
  }

  return false;
}
