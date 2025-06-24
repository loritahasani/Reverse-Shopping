// server/routes/recipeRoute.js
const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');

// Function to normalize text by removing diacritics and converting to lowercase
function normalizeText(text) {
  if (!text) return '';
  return text.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase() // Convert to lowercase for case-insensitive search
    .trim(); // Remove leading/trailing whitespace
}

// Get all recipes
router.get('/', async (req, res) => {
  try {
    console.log('GET / - Fetching all recipes');
    const recipes = await Recipe.find();
    console.log(`Found ${recipes.length} recipes in the database`);
    console.log('Recipe sample:', recipes.length > 0 ? recipes[0] : 'No recipes found');
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Create a new recipe
router.post('/', async (req, res) => {
  try {
    console.log('POST / - Creating new recipe');
    console.log('Recipe data:', req.body);
    
    const { name, perberesit, instructions, image } = req.body;
    
    // Validate required fields
    if (!name || !perberesit || !instructions) {
      return res.status(400).json({ error: 'Name, ingredients, and instructions are required' });
    }
    
    // Create new recipe
    const newRecipe = new Recipe({
      name,
      perberesit: Array.isArray(perberesit) ? perberesit : [perberesit],
      instructions,
      image: image || null
    });
    
    await newRecipe.save();
    console.log(`Recipe created: ${name}`);
    res.status(201).json(newRecipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Enhanced search functionality - search by title and ingredients, handle diacritics
router.get('/search', async (req, res) => {
  const query = req.query.q?.split(',') || [];

  try {
    if (query.length === 0) {
      const recipes = await Recipe.find();
      return res.json(recipes);
    }
    
    // Create normalized search terms from the query
    const searchTerms = query.map(q => normalizeText(q));
    
    // Create an array of conditions for each search term
    const searchConditions = searchTerms.map(term => {
      if (!term) return {}; // Skip empty terms
      
      // Escape special regex characters
      const regexPattern = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      // Create a case-insensitive regex
      // We don't need the 'i' flag since we've already normalized to lowercase
      const regex = new RegExp(regexPattern);
      
      return {
        $or: [
          // Search in normalized name (title) field
          { normalizedName: { $regex: regex } },
          // Search in normalized perberesit (ingredients) array
          { normalizedIngredients: { $elemMatch: { $regex: regex } } }
        ]
      };
    }).filter(condition => Object.keys(condition).length > 0); // Remove empty conditions
    
    if (searchConditions.length === 0) {
      const recipes = await Recipe.find();
      return res.json(recipes);
    }
    
    // Find all recipes
    const allRecipes = await Recipe.find();
    
    // Process recipes in memory to normalize text fields
    const processedRecipes = allRecipes.map(recipe => {
      const normalizedName = normalizeText(recipe.name);
      const normalizedIngredients = recipe.perberesit.map(ingredient => normalizeText(ingredient));
      
      return {
        ...recipe.toObject(),
        normalizedName,
        normalizedIngredients
      };
    });
    
    // Filter recipes that match ALL search terms (in either title or ingredients)
    const filteredRecipes = processedRecipes.filter(recipe => {
      return searchConditions.every(condition => {
        if (!condition.$or) return true; // Skip empty conditions
        
        const nameRegex = condition.$or[0].normalizedName.$regex;
        const nameMatch = nameRegex.test(recipe.normalizedName);
        
        const ingredientsMatch = recipe.normalizedIngredients.some(ingredient => 
          nameRegex.test(ingredient)
        );
        
        return nameMatch || ingredientsMatch;
      });
    });
    
    // Convert back to plain objects without the added normalized fields
    const results = filteredRecipes.map(recipe => {
      const { normalizedName, normalizedIngredients, ...rest } = recipe;
      return rest;
    });
    
    console.log(`Found ${results.length} recipes matching ALL search terms: ${searchTerms.join(', ')}`);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get recipe by ID
router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findOne({ id: req.params.id });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Update recipe by ID
router.patch('/:id', async (req, res) => {
  try {
    console.log(`PATCH /${req.params.id} - Updating recipe`);
    console.log('Update data:', req.body);
    
    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    console.log(`Recipe updated: ${recipe.name}`);
    res.json(recipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

module.exports = router;
