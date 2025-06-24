// Script to populate MongoDB with initial recipe data
const mongoose = require('mongoose');
const connectDB = require('./db');

// Connect to MongoDB
connectDB();

// Import Recipe model
const Recipe = require('./models/Recipe');

// Sample recipe data
const recipes = [
  {
    id: "19",
    name: "Pite me Spinaq",
    perberesit: [
      "spinaq",
      "qepë",
      "vezë",
      "djathë",
      "vaj",
      "petë piteje"
    ],
    instructions: "1. Kaurdisni qepën dhe spinaqin.\n2. Përziejeni me vezë dhe djathë.\n3. Shtrojeni mbushjen mes petëve dhe piqeni për 30 minuta në 180°C.",
    image: "pitemespinaq.jpg"
  },
  {
    id: "1",
    name: "Tavë Kosi",
    perberesit: [
      "mish qengji",
      "oriz",
      "kos",
      "vezë",
      "gjalpë",
      "kripë",
      "piper i zi"
    ],
    instructions: "1. Vendosni mishin e qengjit në tavë dhe piqeni në furrë për 30 minuta në 180°C.\n2. Shtoni orizin dhe ujin e nevojshëm.\n3. Në një enë tjetër, përzieni kosin me vezët, kripën dhe piperin.\n4. Hidhni përzierjen e kosit mbi mish.\n5. Vendosni copëza gjalpi sipër.\n6. Piqeni në furrë për 45 minuta në 180°C derisa të marrë ngjyrë të artë.",
    image: "tavekosi.jpg"
  },
  {
    id: "2",
    name: "Byrek me Spinaq",
    perberesit: [
      "petë byrek",
      "spinaq",
      "qepë",
      "vaj ulliri",
      "kripë",
      "piper i zi"
    ],
    instructions: "1. Pastroni dhe lani spinaqin.\n2. Kaurdisni qepët në vaj ulliri.\n3. Shtoni spinaqin dhe erëzat.\n4. Vendosni petët në tepsi duke i spërkatur me vaj.\n5. Shtroni mbushjen e spinaqit.\n6. Piqeni në furrë për 30-35 minuta në 180°C.",
    image: "byrekmespinaq.jpg"
  },
  {
    id: "3",
    name: "Fërgesë Tirane",
    perberesit: [
      "djathë i bardhë",
      "speca",
      "domate",
      "vezë",
      "vaj ulliri",
      "kripë"
    ],
    instructions: "1. Skuqni specin dhe domaten në vaj ulliri.\n2. Shtoni djathin e bardhë të copëtuar.\n3. Shtoni vezët dhe përzieni.\n4. Shtoni kripë sipas dëshirës.\n5. Gatuani për 5-7 minuta duke përzier vazhdimisht.",
    image: "fergese.jpg"
  },
  {
    id: "4",
    name: "Lakror me Presh",
    perberesit: [
      "petë lakrori",
      "presh",
      "gjizë",
      "vezë",
      "kripë",
      "vaj ulliri"
    ],
    instructions: "1. Përgatisni mbushjen duke përzier preshin e prerë hollë me gjizën dhe vezët.\n2. Shtoni kripë dhe piper.\n3. Vendosni petët në tepsi duke i spërkatur me vaj.\n4. Shtroni mbushjen.\n5. Mbuloni me petë të tjera.\n6. Piqeni në furrë për 40 minuta në 180°C.",
    image: "lakror.jpg"
  },
  {
    id: "5",
    name: "Qofte të Fërguara",
    perberesit: [
      "mish i grirë",
      "qepë",
      "hudhër",
      "bukë e thekur",
      "vezë",
      "majdanoz",
      "kripë",
      "piper i zi"
    ],
    instructions: "1. Përzieni mishin e grirë me qepën dhe hudhrën e grirë imët.\n2. Shtoni bukën e thekur të njomur në ujë dhe të shtrydhur.\n3. Shtoni vezën, majdanozin, kripën dhe piperin.\n4. Formoni qoftet dhe skuqini në vaj të nxehtë ose piqini në furrë.",
    image: "qofte.jpg"
  },
  {
    id: "6",
    name: "Pica Vegjetariane",
    perberesit: [
      "brumë pice",
      "domate",
      "djathë",
      "speca",
      "kërpudha",
      "ullinj",
      "vaj ulliri"
    ],
    instructions: "1. Hapni brumin në formë të rrumbullakët.\n2. Vendosni salcë domateje mbi brumë.\n3. Shtoni djathin dhe perimet.\n4. Spërkatni me vaj ulliri.\n5. Piqeni në furrë për 15-20 minuta në 220°C.",
    image: "vegpizza.jpg"
  },
  {
    id: "7",
    name: "Pasta Carbonara",
    perberesit: [
      "spageti",
      "pancetë ose proshutë",
      "vezë",
      "djathë parmezan",
      "hudhra",
      "kripë",
      "piper i zi"
    ],
    instructions: "1. Zieni spagetit sipas udhëzimeve në paketë.\n2. Skuqni pancetën dhe hudhrën.\n3. Rrihni vezët me djathin dhe piperin.\n4. Kulloni spagetit dhe përziejini me pancetën.\n5. Shtoni përzierjen e vezëve dhe përzieni shpejt.\n6. Shërbeni menjëherë me djathë të grirë sipër.",
    image: "pastacarbonara.jpg"
  },
  {
    id: "8",
    name: "Musaka Shqiptare",
    perberesit: [
      "patate",
      "mish i grirë",
      "qepë",
      "domate",
      "vezë",
      "djathë",
      "qumësht",
      "kripë",
      "piper i zi"
    ],
    instructions: "1. Skuqni patatet e prera në feta të holla.\n2. Përgatisni mbushjen me mish të grirë, qepë dhe domate.\n3. Vendosni patatet në tepsi, mbulojini me mbushjen e mishit.\n4. Hidhni sipër përzierjen e vezëve, qumështit dhe djathit.\n5. Piqeni në furrë për 40 minuta në 180°C.",
    image: "musaka.jpg"
  },
  {
    id: "9",
    name: "Trahana me Pulë",
    perberesit: [
      "trahana",
      "pulë",
      "qepë",
      "karota",
      "selino",
      "kripë",
      "piper i zi"
    ],
    instructions: "1. Zieni pulën me perime për të krijuar supën.\n2. Shtoni trahanën dhe zieni për 10-15 minuta.\n3. Shërbeni të nxehtë me limon ose uthull sipas dëshirës.",
    image: "trahana.jpg"
  },
  {
    id: "10",
    name: "Petulla me Mjaltë",
    perberesit: [
      "miell",
      "qumësht",
      "vezë",
      "sheqer",
      "maja buke",
      "mjaltë",
      "arra"
    ],
    instructions: "1. Përzieni miellin, qumështin, vezët, sheqerin dhe majanë.\n2. Lëreni brumin të pushojë për 30 minuta.\n3. Skuqni petullat në vaj të nxehtë.\n4. Shërbejini të nxehta me mjaltë dhe arra të copëtuara.",
    image: "petulla.jpg"
  },
  {
    id: "11",
    name: "Speca të Mbushur",
    perberesit: [
      "speca",
      "oriz",
      "qepë",
      "mish i grirë",
      "domate",
      "majdanoz",
      "kripë",
      "piper i zi"
    ],
    instructions: "1. Pastroni specin duke hequr farat.\n2. Përgatisni mbushjen me oriz, mish të grirë, qepë, domate dhe erëza.\n3. Mbushni specin me përzierjen.\n4. Vendosini në një tepsi me pak ujë.\n5. Piqini në furrë për 45 minuta në 180°C.",
    image: "specatembushur.jpg"
  },
  {
    id: "12",
    name: "Revani",
    perberesit: [
      "miell",
      "griz",
      "vezë",
      "sheqer",
      "kos",
      "limon",
      "vanilje"
    ],
    instructions: "1. Përzieni vezët me sheqer.\n2. Shtoni miellin, grizin, kosin dhe vaniljen.\n3. Piqeni në furrë për 30 minuta në 180°C.\n4. Përgatisni shurupin me ujë, sheqer dhe limon.\n5. Hidheni shurupin e nxehtë mbi ëmbëlsirën e ftohtë.",
    image: "revani.jpg"
  }
];

// Function to populate the database
async function populateDB() {
  try {
    // Check if we should clear existing recipes
    const shouldClear = process.argv.includes('--clear');
    
    if (shouldClear) {
      // Clear existing recipes
      await Recipe.deleteMany({});
      console.log('Cleared existing recipes');
    } else {
      console.log('Adding recipes without clearing existing ones');
    }
    
    // Insert new data
    const result = await Recipe.insertMany(recipes);
    console.log(`Added ${result.length} recipes to the database`);
    
    // List all recipes in DB
    const allRecipes = await Recipe.find({});
    console.log('Recipes in database:');
    allRecipes.forEach(recipe => {
      console.log(`- ${recipe.name} (ID: ${recipe._id})`);
    });
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error populating database:', error);
    mongoose.connection.close();
  }
}

// Run the population function
populateDB();
