# Deploy në Render - Udhëzime

## Backend (API) - Web Service

### 1. Krijo një Web Service në Render
- Shko në [render.com](https://render.com)
- Kliko "New" → "Web Service"
- Lidh me GitHub repository

### 2. Konfigurimi
- **Name**: `reverse-shopping-api` (ose çfarëdo emri)
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free (ose paid nëse duhet)

### 3. Environment Variables
Shto këto environment variables në Render:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/recipeDB
NODE_ENV=production
```

### 4. MongoDB Atlas Setup
1. Krijo një llogari në [MongoDB Atlas](https://mongodb.com/atlas)
2. Krijo një cluster të ri
3. Kliko "Connect" → "Connect your application"
4. Kopjo connection string dhe vendose në `MONGODB_URI`

---

## Frontend (Web App) - Static Site

### 1. Krijo një Static Site në Render
- Shko në [render.com](https://render.com)
- Kliko "New" → "Static Site"
- Lidh me GitHub repository

### 2. Konfigurimi
- **Name**: `reverse-shopping-web` (ose çfarëdo emri)
- **Root Directory**: `.` (rrënja e projektit)
- **Build Command**: `npm run build`
- **Publish Directory**: `web-build`
- **Plan**: Free

### 3. Environment Variables (nëse duhet)
Nëse frontend-i duhet të lidhet me backend-in, shto:
```
REACT_APP_API_URL=https://your-backend-url.onrender.com
```

---

## Hapat e Deploy

### 1. Deploy Backend-in së pari
1. Push kodin në GitHub
2. Krijo Web Service në Render
3. Vendos environment variables
4. Prisni që të jetë gati

### 2. Deploy Frontend-in
1. Krijo Static Site në Render
2. Vendos URL-në e backend-it në environment variables (nëse duhet)
3. Prisni që të jetë gati

### 3. Testimi
- Backend: `https://your-backend-url.onrender.com`
- Frontend: `https://your-frontend-url.onrender.com`

---

## Troubleshooting

### Backend Issues
- Kontrollo logs në Render dashboard
- Sigurohu që `MONGODB_URI` është i saktë
- Kontrollo që porti është `process.env.PORT`

### Frontend Issues
- Kontrollo që `web-build` folder është krijuar
- Sigurohu që API URL është i saktë
- Kontrollo CORS në backend

### CORS Issues
Nëse ke probleme me CORS, shto në backend:
```javascript
app.use(cors({
  origin: ['https://your-frontend-url.onrender.com', 'http://localhost:3000']
}));
``` 