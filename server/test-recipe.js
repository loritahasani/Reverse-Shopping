// Test script for recipe creation
const axios = require('axios');

const testRecipe = {
  name: 'Test Recipe',
  perberesit: ['Ingredient 1', 'Ingredient 2', 'Ingredient 3'],
  instructions: 'This is a test recipe with detailed instructions that should be long enough to pass validation.',
  image: null,
  userId: 'test-user-123',
  createdAt: new Date().toISOString()
};

async function testRecipeCreation() {
  try {
    console.log('Testing recipe creation...');
    console.log('Test data:', testRecipe);
    
    const response = await axios.post('https://reverse-shopping-hiq9.onrender.com/recipes', testRecipe, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('Success! Recipe created:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
  } catch (error) {
    console.error('Error testing recipe creation:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testRecipeCreation(); 