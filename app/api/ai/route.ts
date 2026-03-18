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

    // Determine mimeType from base64 if possible
    let mimeType = 'image/jpeg';
    if (imageBase64.includes('application/pdf')) {
      mimeType = 'application/pdf';
    } else if (imageBase64.includes('image/png')) {
      mimeType = 'image/png';
    } else if (imageBase64.includes('image/webp')) {
      mimeType = 'image/webp';
    }

    let prompt = '';
    
    if (promptType === 'ocr_delivery_guide') {
      prompt = `Extract the following information from this delivery guide (Guía de Despacho) ${mimeType === 'application/pdf' ? 'document' : 'image'}:
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
    } else if (promptType === 'ocr_purchase_order') {
      prompt = `Extract the following information from this Purchase Order (Orden de Compra - OC) ${mimeType === 'application/pdf' ? 'document' : 'image'}:
      1. OC Number (Número de OC)
      2. List of items (SKU, Description, Quantity)
      
      Return the result strictly as a JSON object with the following structure:
      {
        "oc_number": "string",
        "items": [
          { "sku": "string", "description": "string", "quantity": number }
        ]
      }`;
    } else if (promptType === 'ocr_nv') {
      prompt = `Extract information from this Sales Note (Nota de Venta - NV) or sales ${mimeType === 'application/pdf' ? 'document' : 'image'}:
      1. Document number (nv_number)
      2. Client name (client_name)
      3. List of items (SKU, Description, Quantity)
      
      If you can't find a SKU, generate a simple one based on the name.
      Return the result strictly as a JSON object with the following structure:
      {
        "nv_number": "string",
        "client_name": "string",
        "items": [
          { "sku": "string", "description": "string", "requested_qty": number }
        ]
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
                mimeType: mimeType,
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
