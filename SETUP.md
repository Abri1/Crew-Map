# CrewMap Setup Guide

Follow these steps to get your CrewMap app running.

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project (or use existing)
3. Wait for the database to initialize
4. Go to **SQL Editor** in the sidebar
5. Click **New Query**
6. Copy the entire contents of `supabase-schema.sql` and paste it
7. Click **Run** to execute the schema
8. Go to **Settings** → **API**
9. Copy your **Project URL** and **anon/public** key

## Step 2: Set Up Mapbox

1. Go to [mapbox.com](https://www.mapbox.com) and sign in (or create account)
2. Go to **Account** → **Access Tokens**
3. Click **Create a token**
4. Give it a name like "CrewMap"
5. Enable all **Public scopes**
6. Copy the token

## Step 3: Configure Environment Variables

1. In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_MAPBOX_TOKEN=pk.your-mapbox-token-here
   VITE_TRACCAR_SERVER=https://server.traccar.org
   VITE_TRACCAR_EMAIL=abribooysen@gmail.com
   VITE_TRACCAR_PASSWORD=fyjndjcu...
   ```

## Step 4: Test Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Test the App:

1. Click "Create a Crew"
2. Enter a crew name and your name
3. Note the invite code that's generated
4. Open another browser window (incognito mode)
5. Click "Join a Crew"
6. Enter the invite code and a different name
7. Both windows should show the map

## Step 5: Set Up Traccar Device Tracking

### Install Traccar Client on Your Phone:

**Android:**
- [Download from Play Store](https://play.google.com/store/apps/details?id=org.traccar.client)

**iOS:**
- [Download from App Store](https://apps.apple.com/app/traccar-client/id843156974)

### Configure Traccar Client:

1. Open Traccar Client app
2. Set **Device ID** to something unique (e.g., "john-phone")
3. Set **Server URL** to: `https://server.traccar.org`
4. Set **Frequency** to 10 seconds (or your preference)
5. Tap **Start** to begin tracking

### Link Device to CrewMap:

You need to connect your Traccar device ID to your CrewMap member profile.

**Option 1: Via Supabase Dashboard (Easiest)**

1. Go to your Supabase project dashboard
2. Click **Table Editor** in sidebar
3. Open the `crew_members` table
4. Find your member row (by name)
5. Click the `traccar_device_id` cell
6. Enter your Device ID (e.g., "john-phone")
7. Save

**Option 2: Via SQL**

1. Go to Supabase SQL Editor
2. Run this query (replace values):
   ```sql
   UPDATE crew_members
   SET traccar_device_id = 'your-device-id'
   WHERE name = 'Your Name';
   ```

### Verify Tracking:

1. Check [server.traccar.org](https://server.traccar.org) web interface
2. Log in with your Traccar credentials
3. You should see your device and its location
4. Return to CrewMap - you should see your marker moving on the map!

## Step 6: Deploy to Railway

### Using Railway Dashboard:

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Authorize Railway to access your repo
5. Select the `Crew-Map` repository
6. Once created, go to **Variables** tab
7. Add all environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MAPBOX_TOKEN`
   - `VITE_TRACCAR_SERVER`
   - `VITE_TRACCAR_EMAIL`
   - `VITE_TRACCAR_PASSWORD`
8. Go to **Settings** tab
9. Click **Generate Domain** to get a public URL
10. Railway will automatically deploy!

### Using Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project (or create new)
railway link

# Set environment variables
railway variables set VITE_SUPABASE_URL="your-value"
railway variables set VITE_SUPABASE_ANON_KEY="your-value"
railway variables set VITE_MAPBOX_TOKEN="your-value"
railway variables set VITE_TRACCAR_SERVER="https://server.traccar.org"
railway variables set VITE_TRACCAR_EMAIL="your-email"
railway variables set VITE_TRACCAR_PASSWORD="your-password"

# Deploy
railway up
```

## Step 7: Install as PWA

### On iPhone:

1. Open your Railway URL in Safari
2. Tap the **Share** button (box with arrow)
3. Scroll and tap **Add to Home Screen**
4. Name it "CrewMap"
5. Tap **Add**

### On Android:

1. Open your Railway URL in Chrome
2. Tap the **menu** (three dots)
3. Tap **Add to Home Screen** or **Install app**
4. Confirm

## Troubleshooting

### Map doesn't load
- Check Mapbox token is correct
- Open browser console (F12) and check for errors
- Verify `VITE_MAPBOX_TOKEN` starts with `pk.`

### No location tracking
- Verify Traccar Client is running on your phone
- Check device appears on server.traccar.org
- Ensure `traccar_device_id` matches exactly in database
- Check browser console for WebSocket errors

### Can't create/join crew
- Verify Supabase credentials are correct
- Check SQL schema was executed successfully
- Open browser console for error messages

### Build fails on Railway
- Ensure all environment variables are set
- Check Railway build logs
- Verify `npm run build` works locally

### Database errors
- Run the schema SQL again
- Check table names match code exactly
- Verify RLS policies are enabled

## Daily Trail Cleanup

Trails automatically persist for 24 hours based on the `day_marker` field. To manually clean old trails:

```sql
-- In Supabase SQL Editor
SELECT cleanup_old_trails();
```

Or set up a cron job to run daily at 1 AM:

```sql
-- Requires pg_cron extension
SELECT cron.schedule(
  'cleanup-old-trails',
  '0 1 * * *',
  'SELECT cleanup_old_trails()'
);
```

## Next Steps

1. Share your Railway URL with your crew
2. Test with multiple devices
3. Customize colors and styles if needed
4. Consider adding authentication for private crews
5. Set up monitoring and analytics

## Need Help?

- **Supabase Issues**: [supabase.com/docs](https://supabase.com/docs)
- **Traccar Issues**: [traccar.org/forums](https://www.traccar.org/forums/)
- **Railway Issues**: [docs.railway.app](https://docs.railway.app)
- **Mapbox Issues**: [docs.mapbox.com](https://docs.mapbox.com)

---

Congratulations! Your CrewMap is now live! 🎉
