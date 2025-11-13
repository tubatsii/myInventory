# PANDA POS System - Deployment Guide

This guide will help you deploy your PANDA POS System to GitHub and Vercel.

## 📋 Prerequisites

- Git installed on your computer
- A GitHub account
- A Vercel account (sign up at https://vercel.com)

## 🚀 Step 1: Push to GitHub

### 1. Initialize Git Repository (if not already initialized)

```bash
git init
```

### 2. Add all files to Git

```bash
git add .
```

### 3. Commit your changes

```bash
git commit -m "Initial commit: PANDA POS System with barcode scanning and email notifications"
```

### 4. Create a new repository on GitHub

1. Go to https://github.com
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it `panda-pos-system` (or your preferred name)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 5. Connect your local repository to GitHub

Replace `YOUR_USERNAME` with your GitHub username:

```bash
git remote add origin https://github.com/YOUR_USERNAME/panda-pos-system.git
git branch -M main
git push -u origin main
```

## 🌐 Step 2: Deploy to Vercel

### Method 1: Deploy via Vercel Website (Recommended)

1. Go to https://vercel.com
2. Sign in with your GitHub account
3. Click "Add New" → "Project"
4. Import your `panda-pos-system` repository
5. Configure your project:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

6. **IMPORTANT:** Add Environment Variables
   - Click "Environment Variables"
   - Your Supabase variables are already configured in your Supabase project
   - Vercel will automatically use the values from `/utils/supabase/info.tsx`
   - No additional environment variables needed for basic deployment!

7. Click "Deploy"
8. Wait for deployment to complete (usually 1-2 minutes)
9. Your app will be live at `https://your-project-name.vercel.app`

### Method 2: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts:
   - Set up and deploy? Yes
   - Which scope? Select your account
   - Link to existing project? No
   - Project name? panda-pos-system (or your choice)
   - In which directory is your code located? ./
   - Want to override settings? No

5. For production deployment:
```bash
vercel --prod
```

## 🔧 Step 3: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## 📧 Step 4: Configure Email Notifications

Your email notifications are already set up in Supabase! The following environment variables are configured:

- `EMAIL_HOST` - Your SMTP server
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - Your email address
- `EMAIL_PASSWORD` - Your email password
- `EMAIL_TO` - Recipient email
- `EMAIL_FROM` - Sender email

These are configured in your Supabase Edge Functions environment and don't need to be added to Vercel.

## 🔄 Step 5: Set Up Automated Email Schedule (Optional)

To send daily low-stock emails at 06:00:

### Option 1: Use cron-job.org (Free & Easy)

1. Go to https://cron-job.org
2. Create a free account
3. Create a new cron job:
   - **Title:** PANDA POS Low Stock Email
   - **URL:** `https://hdjyxfbehzbajlzitrah.supabase.co/functions/v1/make-server-cc9de453/send-low-stock-email`
   - **Schedule:** Daily at 06:00 (Africa/Maseru timezone)
   - **HTTP Method:** POST
   - **Headers:** Add header
     - Name: `Authorization`
     - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkanl4ZmJlaHpiYWpseml0cmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTI3MzUsImV4cCI6MjA3ODM2ODczNX0.Y8unD6w7ZOV89mDj2jFaM-69XRlgr0wT0LbX_CyJC7M`
4. Save and enable the cron job

### Option 2: Use EasyCron

1. Go to https://www.easycron.com
2. Create a free account
3. Add a cron job with similar settings as above

### Option 3: Use GitHub Actions

Create `.github/workflows/email-schedule.yml` in your repository (see below for template)

## 📱 Testing Your Deployment

1. Visit your Vercel URL
2. Test login with your existing users
3. Test barcode scanning (both keyboard and camera)
4. Test email notifications from the Dashboard
5. Verify all POS functions work correctly

## 🔐 Security Notes

- Your Supabase credentials are safely stored in `/utils/supabase/info.tsx`
- The `SUPABASE_SERVICE_ROLE_KEY` is only used in Edge Functions (server-side)
- Never commit `.env` files to Git (already in .gitignore)
- Vercel automatically uses HTTPS for all deployments

## 📊 Monitoring

- View deployment logs in Vercel Dashboard
- Check Supabase logs for database queries
- Monitor Edge Function logs in Supabase Dashboard

## 🆘 Troubleshooting

### Build fails on Vercel
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Try running `npm run build` locally first

### App loads but shows errors
- Check browser console for errors
- Verify Supabase connection in browser Network tab
- Ensure all imports are correct

### Email notifications not working
- Test manually from Dashboard first
- Check Supabase Edge Function logs
- Verify EMAIL_* environment variables in Supabase

### Barcode scanner camera not working
- Ensure HTTPS is enabled (Vercel does this automatically)
- Check browser camera permissions
- Try on a different device/browser

## 🎉 You're Done!

Your PANDA POS System is now live and accessible from anywhere!

### Next Steps:
- Share the URL with your team
- Set up user accounts for bartenders and waitresses
- Train staff on using the system
- Monitor daily email reports
- Customize as needed

## 📞 Support

For issues or questions:
1. Check Vercel deployment logs
2. Check Supabase dashboard logs
3. Review browser console errors
4. Check this deployment guide

---

**Important URLs:**
- Frontend: Your Vercel deployment URL
- Supabase Dashboard: https://supabase.com/dashboard/project/hdjyxfbehzbajlzitrah
- Edge Functions: https://hdjyxfbehzbajlzitrah.supabase.co/functions/v1/
