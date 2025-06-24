// server/models/SavedRecipe.js
const mongoose = require('mongoose');

const SavedRecipeSchema = new mongoose.Schema({
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  perberesit: {
    type: [String],
    required: true
  },
  instructions: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: false
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SavedRecipe', SavedRecipeSchema);
