// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const recipeRoutes = require('./routes/recipeRoute');
const savedRecipeRoutes = require('./routes/savedRecipeRoute');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'https://reverse-shopping-1.onrender.com',
    'http://localhost:3000'
  ]
}));
app.use(express.json());

// Serve static files from the images directory
app.use('/images', express.static(path.join(__dirname, 'images')));
console.log(`Serving images from: ${path.join(__dirname, 'images')}`);

// Connect to MongoDB
connectDB();

// Routes
app.use('/recipes', recipeRoutes);
app.use('/saved-recipes', savedRecipeRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Recipe API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
