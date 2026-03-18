const apiKey = 'AIzaSyBcu0dsRgbzRJdOFTrGowmo7DX_XtbFNyE';
const models = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
  'gemini-pro'
];

async function testModels() {
  for (const model of models) {
    console.log(`Testing model: ${model} (v1)...`);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }]
        })
      });
      const data = await response.json();
      if (response.ok) {
        console.log(`SUCCESS: ${model} works on v1!`);
        return model;
      } else {
        console.log(`FAILED: ${model} on v1: ${data.error?.message || response.statusText}`);
      }
    } catch (e) {
      console.log(`ERROR: ${model} on v1: ${e.message}`);
    }

    console.log(`Testing model: ${model} (v1beta)...`);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }]
        })
      });
      const data = await response.json();
      if (response.ok) {
        console.log(`SUCCESS: ${model} works on v1beta!`);
        return model;
      } else {
        console.log(`FAILED: ${model} on v1beta: ${data.error?.message || response.statusText}`);
      }
    } catch (e) {
      console.log(`ERROR: ${model} on v1beta: ${e.message}`);
    }
    console.log('---');
  }
}

testModels();
