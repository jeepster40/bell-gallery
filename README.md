# Bell Celebration Gallery

A private photo/video upload gallery for the Brent & Jasmine Bell celebration.

## Stack
- **Frontend**: React + Vite + TypeScript + Wouter + TanStack Query + shadcn/ui + Tailwind CSS
- **Backend**: Express.js + Multer + Cloudinary SDK
- **Storage**: Cloudinary (media) + JSON file (metadata)

## Setup

```bash
npm install
```

## Environment Variables

Set these before running (or they fall back to hardcoded values in `server/cloudinary.ts`):

```
CLOUDINARY_CLOUD_NAME=dsxd3fzyo
CLOUDINARY_API_KEY=713463948385651
CLOUDINARY_API_SECRET=VN0oBiMBRvi4IEQngmpQ0Ku9I_M
```

## Run (development)

```bash
npm run dev
```

## Run (production)

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

Server runs on **port 5000**.

## Credentials
- **Gallery password**: `BellWedding2026`
- **Admin PIN**: `4218`

## Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set:
   - **Build command**: `npm install && npm run build`
   - **Start command**: `NODE_ENV=production node dist/index.cjs`
   - **Port**: `5000`
5. Add the three Cloudinary environment variables above
6. Deploy — your URL will be `https://your-app.onrender.com`
