import 'expo-router/entry'

const cors = require('cors');

// Allow only your frontend origin
const allowedOrigins = ['https://reverse-shopping-1.onrender.com'];

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin (like mobile apps, curl, etc.)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
