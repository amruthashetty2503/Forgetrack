import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Gemini API key missing in environment variables.');
}

export const genAI = new GoogleGenerativeAI(apiKey || 'placeholder-key');
