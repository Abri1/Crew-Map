# CrewMap

A Progressive Web App (PWA) for real-time crew location tracking using Traccar and Mapbox.

## Features

- **No Registration Required**: Simply create or join a crew with a name
- **Real-time Location Tracking**: See crew members' locations on a live map
- **Location Trails**: Visual trails showing movement history with opacity fade
- **Daily Reset**: Trails automatically reset every day
- **Satellite View**: Full-screen map with satellite imagery and road overlay
- **Touch Controls**: Pinch to zoom, recenter button for easy navigation
- **PWA Support**: Install as an app on mobile devices
- **Crew Management**: Create crews and invite members with unique codes

## Tech Stack

- **Frontend**: React 18 + Vite
- **Map**: Mapbox GL JS with satellite-streets style
- **Database**: Supabase (PostgreSQL + Realtime)
- **Location Tracking**: Traccar API + WebSocket
- **Styling**: Tailwind CSS
- **PWA**: Vite PWA Plugin with Workbox
- **Deployment**: Railway

## Prerequisites

1. **Supabase Account**: [Sign up at supabase.com](https://supabase.com)
2. **Mapbox Account**: [Get API token at mapbox.com](https://www.mapbox.com)
3. **Traccar Server**: Your existing Traccar server at `https://server.traccar.org`
4. **Railway Account**: [Sign up at railway.app](https://railway.app) (for deployment)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Abri1/Crew-Map.git
cd Crew-Map
npm install
```

### 2. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script to create tables and policies

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox Configuration
VITE_MAPBOX_TOKEN=your_mapbox_access_token

# Traccar Configuration
VITE_TRACCAR_SERVER=https://server.traccar.org
VITE_TRACCAR_EMAIL=abribooysen@gmail.com
VITE_TRACCAR_PASSWORD=your_traccar_password
```

**How to get credentials:**

- **Supabase URL & Key**: Project Settings → API → Project URL and anon/public key
- **Mapbox Token**: Account → Access Tokens → Create a token
- **Traccar**: Your existing login credentials

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to test the app locally.

### 5. Deploy to Railway

#### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables
railway variables set VITE_SUPABASE_URL=your_value
railway variables set VITE_SUPABASE_ANON_KEY=your_value
railway variables set VITE_MAPBOX_TOKEN=your_value
railway variables set VITE_TRACCAR_SERVER=https://server.traccar.org
railway variables set VITE_TRACCAR_EMAIL=your_email
railway variables set VITE_TRACCAR_PASSWORD=your_password

# Deploy
railway up
```

#### Option B: Using Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Add environment variables in the Variables tab
5. Railway will automatically deploy on each push

## Usage

### For Crew Leaders (Creating a Crew)

1. Open the app
2. Click "Create a Crew"
3. Enter crew name and your name
4. Share the generated 6-character invite code with your crew

### For Crew Members (Joining a Crew)

1. Open the app
2. Click "Join a Crew"
3. Enter the invite code and your name
4. You'll join the crew immediately

### Linking Traccar Device

To enable live location tracking:

1. Install [Traccar Client](https://www.traccar.org/client/) on your mobile device
2. Configure it to connect to `https://server.traccar.org`
3. Note your Device ID from the Traccar web interface
4. In the CrewMap database, update your `crew_members` record with your `traccar_device_id`

```sql
UPDATE crew_members
SET traccar_device_id = 'your_device_id'
WHERE name = 'Your Name' AND crew_id = 'crew_uuid';
```

## Database Schema

### Tables

- **crews**: Stores crew information and invite codes
- **crew_members**: Individual members within each crew
- **location_trails**: Location history (automatically reset daily)

### Daily Trail Reset

The database includes a cleanup function that removes trails older than 1 day. You can:

- Run manually: `SELECT cleanup_old_trails();`
- Set up a cron job (if pg_cron is enabled)
- Implement in your backend/serverless function

## PWA Installation

### iOS (Safari)

1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android (Chrome)

1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen"

## Project Structure

```
CrewMap/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── CrewSetup.jsx    # Crew creation/joining UI
│   │   └── MapView.jsx      # Main map interface
│   ├── lib/              # External service clients
│   │   ├── supabase.js      # Supabase client
│   │   └── traccar.js       # Traccar API/WebSocket client
│   ├── utils/            # Helper functions
│   │   ├── storage.js       # LocalStorage management
│   │   └── helpers.js       # Utility functions
│   ├── App.jsx           # Root component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── supabase-schema.sql   # Database schema
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
├── railway.json          # Railway deployment config
└── package.json          # Dependencies
```

## Troubleshooting

### Map not loading

- Verify your Mapbox token is correct
- Check browser console for errors
- Ensure VITE_MAPBOX_TOKEN is set in .env

### Location tracking not working

- Confirm Traccar credentials are correct
- Check that devices are reporting to Traccar
- Verify `traccar_device_id` is set in database
- Test Traccar WebSocket connection in browser console

### Database errors

- Ensure Supabase schema SQL was executed successfully
- Check RLS policies are enabled
- Verify environment variables are correct

### Build fails on Railway

- Ensure all environment variables are set
- Check build logs in Railway dashboard
- Verify `package.json` scripts are correct

## Security Notes

- **No Authentication**: This app uses no user authentication for simplicity
- **Public Access**: Anyone with an invite code can join a crew
- **API Keys**: Keep your `.env` file secure and never commit it
- **Traccar Credentials**: Consider using tokens instead of passwords in production

## Future Enhancements

- [ ] Add device linking UI (no SQL required)
- [ ] Crew member roles (admin/member)
- [ ] Custom trail colors and opacity settings
- [ ] Geofencing and notifications
- [ ] Historical playback of trails
- [ ] Export trail data
- [ ] Dark/light mode toggle
- [ ] Multiple crew membership

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
- Open a GitHub issue
- Check Traccar documentation: [traccar.org/documentation](https://www.traccar.org/documentation/)
- Check Supabase docs: [supabase.com/docs](https://supabase.com/docs)
- Check Mapbox docs: [docs.mapbox.com](https://docs.mapbox.com)

---

Built with React, Supabase, Traccar, and Mapbox
