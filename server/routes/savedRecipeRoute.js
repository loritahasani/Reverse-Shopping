// server/routes/savedRecipeRoute.js
const express = require('express');
const router = express.Router();
const SavedRecipe = require('../models/SavedRecipe');

// Get all saved recipes
router.get('/', async (req, res) => {
  try {
    console.log('GET /saved-recipes - Fetching all saved recipes');
    const savedRecipes = await SavedRecipe.find().sort({ savedAt: -1 });
    console.log(`Found ${savedRecipes.length} saved recipes`);
    res.json(savedRecipes);
  } catch (error) {
    console.error('Error fetching saved recipes:', error);
    res.status(500).json({ error: 'Failed to fetch saved recipes' });
  }
});

// Save a recipe
router.post('/', async (req, res) => {
  try {
    const { recipeId, name, perberesit, instructions, image } = req.body;
    
    // Check if recipe already exists
    const existingRecipe = await SavedRecipe.findOne({ recipeId });
    if (existingRecipe) {
      return res.status(400).json({ error: 'Recipe already saved' });
    }
    
    // Create new saved recipe
    const newSavedRecipe = new SavedRecipe({
      recipeId,
      name,
      perberesit,
      instructions,
      image
    });
    
    await newSavedRecipe.save();
    console.log(`Recipe saved: ${name}`);
    res.status(201).json(newSavedRecipe);
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// Delete a saved recipe
router.delete('/:id', async (req, res) => {
  try {
    const deletedRecipe = await SavedRecipe.findByIdAndDelete(req.params.id);
    
    if (!deletedRecipe) {
      return res.status(404).json({ error: 'Saved recipe not found' });
    }
    
    console.log(`Recipe unsaved: ${deletedRecipe.name}`);
    res.json({ message: 'Recipe removed from saved recipes' });
  } catch (error) {
    console.error('Error removing saved recipe:', error);
    res.status(500).json({ error: 'Failed to remove saved recipe' });
  }
});

module.exports = router;
