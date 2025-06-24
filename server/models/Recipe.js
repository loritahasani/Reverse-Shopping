const mongoose = require('mongoose');

// Schema that matches the exact structure in MongoDB recetas collection
const recipeSchema = new mongoose.Schema({
  id: String,
  name: String,
  perberesit: [String],
  instructions: String,
  image: String
}, {
  versionKey: false,
  id: false,
  collection: 'recetas' // 👈 kjo është mënyra e saktë për të lidhur me koleksionin 'recetas'
});

// Krijon modelin me emër 'Recipe', por lidhet me koleksionin 'recetas'
module.exports = mongoose.model('Recipe', recipeSchema);
