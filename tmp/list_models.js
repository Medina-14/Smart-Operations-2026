const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = 'AIzaSyBcu0dsRgbzRJdOFTrGowmo7DX_XtbFNyE';
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const models = await genAI.listModels();
    console.log('Available models:');
    models.models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
    });
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

listModels();
