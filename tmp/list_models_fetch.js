const apiKey = 'AIzaSyA4iVmMLYWO-ELIet4OzJbUWzXqPAIxjZo';

async function listAllModels() {
  console.log('Listing all models (v1) with NEW KEY...');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const data = await response.json();
    if (response.ok) {
      console.log('Models (v1):');
      if (data.models) {
        data.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
      } else {
        console.log('No models returned in v1.');
      }
    } else {
      console.log(`FAILED v1: ${data.error?.message || response.statusText}`);
    }
  } catch (e) {
    console.log(`ERROR v1: ${e.message}`);
  }

  console.log('---');
  console.log('Listing all models (v1beta) with NEW KEY...');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (response.ok) {
      console.log('Models (v1beta):');
      if (data.models) {
        data.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
      } else {
        console.log('No models returned in v1beta.');
      }
    } else {
      console.log(`FAILED v1beta: ${data.error?.message || response.statusText}`);
    }
  } catch (e) {
    console.log(`ERROR v1beta: ${e.message}`);
  }
}

listAllModels();
