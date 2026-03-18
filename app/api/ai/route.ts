import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { AI_MODEL } from '@/config/ai-model';

export async function POST(req: Request) {
  try {
    const { imageBase64, promptType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    let prompt = '';
    
    if (promptType === 'ocr_delivery_guide') {
      prompt = `Extract the following information from this delivery guide (Guía de Despacho) image:
      1. Guide Number (Número de Guía)
      2. NV Number (Nota de Venta)
      3. List of items (SKU, Description, Quantity)
      
      Return the result strictly as a JSON object with the following structure:
      {
        "guide_number": "string",
        "nv_number": "string",
        "items": [
          { "sku": "string", "description": "string", "quantity": number }
        ]
      }`;
    } else if (promptType === 'package_photo_analysis') {
      prompt = `Analyze this package photo and extract the label information:
      1. Is the label clearly visible? (boolean)
      2. What is the label number? (string, format: NV-XXXX-Y)
      
      Return the result strictly as a JSON object with the following structure:
      {
        "label_visible": boolean,
        "label_number": "string"
      }`;
    } else {
      return NextResponse.json({ error: 'Invalid prompt type' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64.split(',')[1] || imageBase64,
              },
            },
          ],
        },
      ],
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
    return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
  }
}
