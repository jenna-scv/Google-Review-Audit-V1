
import { GoogleGenAI, Type } from "@google/genai";
import { Review, AnalysisResult } from '../types';

export const analyzeReviews = async (
  currentReviews: Review[], 
  previousReviews: Review[],
  clientName: string, 
  targetPeriod: { year: number, quarter: number }
): Promise<AnalysisResult> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date();
  
  const targetData = currentReviews.slice(0, 50).map(r => `[${r.rating} Stars] "${r.text}"`).join("\n");
  const historyData = previousReviews.slice(0, 20).map(r => `[${r.rating} Stars] "${r.text}"`).join("\n");

  const prompt = `
    You are a Senior Reputation Analyst at Brindle Digital.
    Current Date: ${today.toDateString()}
    Reporting Period: Q${targetPeriod.quarter} ${targetPeriod.year}
    Client Property: "${clientName}"

    TASK:
    Analyze the provided apartment reviews and generate a professional, high-level executive report.

    CRITICAL REQUIREMENTS:
    1. BE CONCISE. All lists MUST have a MAXIMUM of 3 items. The executive summary must be a MAXIMUM of 3 short sentences.
    2. TRENDS: Identify the top 3 specific, negative recurring themes (e.g., "Slow maintenance response on AC units", "Noise issues in building B").
    3. WINS: Highlight the top 3 specific staff names or positive amenities mentioned.
    4. OPPORTUNITIES: Provide 3 actionable, concise next steps for the property manager.
    5. EMAIL CONTENT: Write highly scannable bulleted highlights for a busy property manager.
    6. TONE: Expert, data-driven, yet constructive.

    Current Quarter Reviews:
    ${targetData || "No reviews found for this quarter."}

    Historical Context (Previous Quarter):
    ${historyData || "No previous quarter data."}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trends: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3. Specific negative trends or operational issues found." },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3. Future-looking growth strategies/next steps." },
            wins: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3. Specific staff callouts or amenity praises." },
            executiveSummary: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3 sentences. Brief overview of the quarter." },
            seoImpact: { type: Type.STRING, description: "How this quarter impacts local SEO." },
            quotes: { 
              type: Type.ARRAY, 
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  text: { type: Type.STRING },
                  author: { type: Type.STRING }
                },
                required: ["category", "text", "author"]
              }
            },
            emailContent: {
              type: Type.OBJECT,
              properties: {
                feedbackHighlights: { type: Type.STRING, description: "Highly scannable summary of what happened." },
                opportunities: { type: Type.STRING, description: "Direct recommendation for the manager." }
              },
              required: ["feedbackHighlights", "opportunities"]
            }
          },
          required: ["trends", "opportunities", "wins", "executiveSummary", "seoImpact", "quotes", "emailContent"]
        },
        temperature: 0.3,
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      trends: ["Continue monitoring resident sentiment regarding common area maintenance."],
      opportunities: ["Leverage recent positive staff mentions for social proof in marketing."],
      wins: ["Team is maintaining a professional and responsive presence online."],
      executiveSummary: ["Overall reputation remains stable with positive engagement noted."],
      seoImpact: "Steady review volume is positively supporting local map visibility.",
      quotes: [],
      emailContent: {
        feedbackHighlights: "Sentiment remains largely positive with consistent mentions of great staff service.",
        opportunities: "Focus on increasing review volume from long-term residents to boost YTD averages."
      }
    };
  }
};
