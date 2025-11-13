# 🚀 Quick Start Guide

## Push to GitHub (5 minutes)

```bash
# 1. Initialize git (if not already done)
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial commit: PANDA POS System"

# 4. Add your GitHub repository (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/panda-pos-system.git

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

## Deploy to Vercel (3 minutes)

### Option A: Via Website (Easiest)
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Select your `panda-pos-system` repository
4. Click "Deploy" (use default settings)
5. Done! 🎉

### Option B: Via CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Set Up Email Schedule (2 minutes)

1. Go to https://cron-job.org
2. Create account
3. Add cron job:
   - **URL**: `https://hdjyxfbehzbajlzitrah.supabase.co/functions/v1/make-server-cc9de453/send-low-stock-email`
   - **Time**: 06:00 daily
   - **Method**: POST
   - **Header**: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkanl4ZmJlaHpiYWpseml0cmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTI3MzUsImV4cCI6MjA3ODM2ODczNX0.Y8unD6w7ZOV89mDj2jFaM-69XRlgr0wT0LbX_CyJC7M`

## That's It! ✅

Your PANDA POS is now:
- ✅ On GitHub
- ✅ Live on Vercel
- ✅ Sending daily email reports

**Share your Vercel URL with your team!**

## Need Help?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
