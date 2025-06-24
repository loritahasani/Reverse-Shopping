// server/models/Recipe.js
const mongoose = require('mongoose');

// Schema that matches the exact structure in MongoDB recetas collection
const recipeSchema = new mongoose.Schema({
  id: String,
  name: String,
  perberesit: [String], // ingredients in Albanian
  instructions: String,
  image: String
}, { 
  // This tells Mongoose not to add __v field and to use the existing _id
  versionKey: false,
  // This tells Mongoose not to transform the _id field
  id: false
});

// Use 'recetas' as the collection name to match your existing MongoDB collection
module.exports = mongoose.model('recetas', recipeSchema);
