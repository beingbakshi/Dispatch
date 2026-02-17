# Mumuksh Impex - Enterprise Inventory System

A modern React-based inventory management system for Mumuksh Impex LLP.

## Features

- Executive Dashboard with real-time stock overview
- Material Inward/Outward tracking
- Finished Goods management
- Vehicle Loading & Dispatch with PDF challan generation
- Live Stock Reports with search functionality
- Low stock alerts

## Tech Stack

- React 18
- Vite (Build Tool)
- Tailwind CSS
- Lucide React Icons
- jsPDF (for PDF generation)

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Deployment on Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel will automatically detect Vite and configure the build settings
5. Click Deploy

### Option 3: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository or upload the project folder
4. Vercel will auto-detect the framework (Vite)
5. Click Deploy

## Configuration

The app connects to a Google Apps Script backend. The API URL is configured in `App.jsx`:

```javascript
const API_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

Make sure your Google Apps Script is deployed as a web app with appropriate permissions.

## Project Structure

```
.
├── App.jsx              # Main application component
├── main.jsx             # React entry point
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js      # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── vercel.json          # Vercel deployment configuration
└── src/
    └── index.css        # Tailwind CSS imports
```

## Notes

- The app uses external CDN scripts for PDF generation (jsPDF)
- All animations and styling use Tailwind CSS
- The app is fully responsive and works on mobile devices
