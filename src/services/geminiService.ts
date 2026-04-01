import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getNearbyGyms = async (lat: number, lng: number) => {
  const model = genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Yaqin atrofdagi fitnes zallarni (gyms) ro'yxatini topib ber. Har bir zalning nomi, manzili va xaritadagi linkini ko'rsat.",
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      }
    },
  });

  const response = await model;
  const text = response.text;
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  // Extract map links from grounding chunks
  const mapLinks = groundingChunks
    .filter((chunk: any) => chunk.maps?.uri)
    .map((chunk: any) => ({
      title: chunk.maps.title,
      uri: chunk.maps.uri
    }));

  return { text, mapLinks };
};

export const getAIResponse = async (message: string, context: string) => {
  const model = genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: `Context: ${context}\n\nUser Message: ${message}` }],
      },
    ],
    config: {
      systemInstruction: "You are a professional health and fitness assistant. Provide concise, helpful advice based on the user's health data. Respond in the user's preferred language (Uzbek, Russian, or English).",
    },
  });

  const response = await model;
  return response.text;
};

export const getHealthTips = async (healthData: any, profile: any, language: string) => {
  const prompt = `Based on this health data: ${JSON.stringify(healthData)} and user profile: ${JSON.stringify(profile)}, provide 4 personalized health tips in ${language}. Return them as a JSON array of objects with 'title', 'desc', and 'priority' (high, medium, low).`;
  
  const model = genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    }
  });

  const response = await model;
  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI tips", e);
    return [];
  }
};
