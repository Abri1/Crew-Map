-- CrewMap Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crews table
CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on invite_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_crews_invite_code ON crews(invite_code);

-- Crew members table
CREATE TABLE IF NOT EXISTS crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    traccar_device_id TEXT,
    color TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crew_id, name)
);

-- Create indexes for crew_members
CREATE INDEX IF NOT EXISTS idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_device_id ON crew_members(traccar_device_id);

-- Location trails table
CREATE TABLE IF NOT EXISTS location_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    day_marker DATE NOT NULL
);

-- Create indexes for location_trails
CREATE INDEX IF NOT EXISTS idx_location_trails_crew_day ON location_trails(crew_id, day_marker, timestamp);
CREATE INDEX IF NOT EXISTS idx_location_trails_member ON location_trails(member_id);

-- Enable Row Level Security (RLS)
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_trails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crews (allow all operations - no auth required)
CREATE POLICY "Allow all operations on crews" ON crews
    FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for crew_members (allow all operations - no auth required)
CREATE POLICY "Allow all operations on crew_members" ON crew_members
    FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for location_trails (allow all operations - no auth required)
CREATE POLICY "Allow all operations on location_trails" ON location_trails
    FOR ALL USING (true) WITH CHECK (true);

-- Function to clean up old trails (older than 1 day)
CREATE OR REPLACE FUNCTION cleanup_old_trails()
RETURNS void AS $$
BEGIN
    DELETE FROM location_trails
    WHERE day_marker < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup daily
-- Note: This requires the pg_cron extension which may need to be enabled
-- You can also run this manually or via a cron job in your backend
-- SELECT cron.schedule('cleanup-old-trails', '0 1 * * *', 'SELECT cleanup_old_trails()');

-- Comments for documentation
COMMENT ON TABLE crews IS 'Stores crew information and invite codes';
COMMENT ON TABLE crew_members IS 'Stores individual members within each crew';
COMMENT ON TABLE location_trails IS 'Stores location history for each crew member (reset daily)';
COMMENT ON COLUMN crews.invite_code IS 'Unique 6-character code for joining crew';
COMMENT ON COLUMN crew_members.traccar_device_id IS 'Links to Traccar device for location tracking';
COMMENT ON COLUMN location_trails.day_marker IS 'Used for daily trail reset functionality';
