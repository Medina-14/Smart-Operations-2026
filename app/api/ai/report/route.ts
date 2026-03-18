import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { AI_MODEL } from '@/config/ai-model';

export async function POST(req: Request) {
  try {
    const { data } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analyze the following daily logistics operations data for ANTKO Group:
    ${JSON.stringify(data)}
    
    Provide a brief analysis of the performance and 2-3 actionable recommendations for the warehouse team.
    The analysis and recommendations MUST be in Spanish.
    
    Return the result strictly as a JSON object with the following structure:
    {
      "date": "string (formatted date)",
      "metrics": {
        "packages_shipped": number,
        "pending_nvs": number,
        "purchase_delays": number
      },
      "analysis": "string (1-2 paragraphs)",
      "recommendations": ["string", "string"]
    }`;

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text returned from Gemini');
    }

    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate report' }, { status: 500 });
  }
}
