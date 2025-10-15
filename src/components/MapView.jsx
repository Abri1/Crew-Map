import { useState, useEffect, useRef, useCallback } from 'react'
import Map, { Marker, Source, Layer } from 'react-map-gl'
import { supabase } from '../lib/supabase'
import { traccarClient } from '../lib/traccar'
import { calculateTrailOpacity, formatDayMarker } from '../utils/helpers'
import { clearSession } from '../utils/storage'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export default function MapView({ session, onLogout }) {
  const mapRef = useRef()
  const crewMembersRef = useRef([])
  const [viewport, setViewport] = useState({
    latitude: -33.9249,  // Cape Town, South Africa (default view)
    longitude: 18.4241,
    zoom: 10
  })

  const [crewMembers, setCrewMembers] = useState([])
  const [memberPositions, setMemberPositions] = useState({})
  const [trails, setTrails] = useState({})
  const [showMenu, setShowMenu] = useState(false)
  const [traccarConnected, setTraccarConnected] = useState(false)

  // Fetch crew members FIRST, then initialize Traccar
  useEffect(() => {
    const init = async () => {
      // Load crew members first
      await fetchCrewMembers()
      console.log('✅ Crew members loaded, now initializing Traccar...')

      // Then initialize Traccar
      initTraccar()
    }

    init()

    // Subscribe to crew member changes
    const channel = supabase
      .channel('crew_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crew_members',
          filter: `crew_id=eq.${session.crewId}`
        },
        () => {
          fetchCrewMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      traccarClient.disconnect()
    }
  }, [session.crewId])

  // Subscribe to location trails
  useEffect(() => {
    fetchTrails()

    const channel = supabase
      .channel('location_trails_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_trails',
          filter: `crew_id=eq.${session.crewId}`
        },
        (payload) => {
          handleNewTrailPoint(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.crewId])

  const fetchCrewMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('crew_members')
        .select('*')
        .eq('crew_id', session.crewId)

      if (error) throw error
      console.log('👥 Crew members from DB:', data)
      const members = data || []
      setCrewMembers(members)
      crewMembersRef.current = members  // Update ref for latest data
    } catch (error) {
      console.error('Error fetching crew members:', error)
    }
  }

  const initTraccar = async () => {
    try {
      await traccarClient.authenticate()
      setTraccarConnected(true)

      // Fetch initial positions
      const positions = await traccarClient.getPositions()
      console.log('📍 Traccar positions received:', positions)
      updatePositions(positions)

      // Connect to WebSocket for real-time updates
      traccarClient.connectWebSocket((data) => {
        if (data.positions) {
          console.log('📍 WebSocket position update:', data.positions)
          updatePositions(data.positions)
        }
      })
    } catch (error) {
      console.error('Traccar init error:', error)
    }
  }

  const updatePositions = (positions) => {
    console.log('🔄 Updating positions, count:', positions.length)
    const posMap = {}
    positions.forEach(pos => {
      console.log(`  Device ${pos.deviceId}:`, pos.latitude, pos.longitude)
      posMap[pos.deviceId] = {
        latitude: pos.latitude,
        longitude: pos.longitude,
        timestamp: pos.fixTime || pos.deviceTime
      }
    })
    setMemberPositions(prev => ({ ...prev, ...posMap }))

    // Save to database
    positions.forEach(pos => {
      saveLocationToDatabase(pos)
    })
  }

  const saveLocationToDatabase = async (position) => {
    try {
      // Use ref to get latest crew members (fixes closure bug)
      const members = crewMembersRef.current
      console.log(`🔍 Looking for device ${position.deviceId}`)
      console.log(`   Ref has ${members.length} members:`, members.map(m => ({ name: m.name, traccar_device_id: m.traccar_device_id })))

      const member = members.find(m => m.traccar_device_id === String(position.deviceId))
      console.log(`   Found member:`, member ? member.name : 'NOT FOUND')

      if (!member) {
        return
      }

      await supabase
        .from('location_trails')
        .insert({
          member_id: member.id,
          crew_id: session.crewId,
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: position.fixTime || position.deviceTime || new Date().toISOString(),
          day_marker: formatDayMarker()
        })
    } catch (error) {
      console.error('Error saving location:', error)
    }
  }

  const fetchTrails = async () => {
    try {
      const today = formatDayMarker()
      const { data, error } = await supabase
        .from('location_trails')
        .select('*')
        .eq('crew_id', session.crewId)
        .eq('day_marker', today)
        .order('timestamp', { ascending: true })

      if (error) throw error

      // Group trails by member
      const trailsByMember = {}
      data?.forEach(point => {
        if (!trailsByMember[point.member_id]) {
          trailsByMember[point.member_id] = []
        }
        trailsByMember[point.member_id].push(point)
      })

      setTrails(trailsByMember)
    } catch (error) {
      console.error('Error fetching trails:', error)
    }
  }

  const handleNewTrailPoint = (point) => {
    setTrails(prev => {
      const memberTrails = prev[point.member_id] || []
      return {
        ...prev,
        [point.member_id]: [...memberTrails, point]
      }
    })
  }

  const handleRecenter = useCallback(() => {
    if (Object.keys(memberPositions).length > 0 && mapRef.current) {
      // Center on first available crew member position
      const firstPosition = Object.values(memberPositions)[0]
      mapRef.current.flyTo({
        center: [firstPosition.longitude, firstPosition.latitude],
        zoom: 15,
        duration: 1000
      })
    }
  }, [memberPositions])

  const handleLogout = () => {
    clearSession()
    onLogout()
  }

  // Create GeoJSON for trails
  const getTrailGeoJSON = (memberId) => {
    const memberTrails = trails[memberId] || []
    if (memberTrails.length < 2) return null

    const coordinates = memberTrails.map(point => [point.longitude, point.latitude])

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates
      }
    }
  }

  const getMemberForDevice = (deviceId) => {
    return crewMembers.find(m => m.traccar_device_id === String(deviceId))
  }

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: '100%', height: '100%' }}
        touchZoomRotate={true}
        touchPitch={false}
        dragRotate={false}
        pitchWithRotate={false}
        attributionControl={false}
      >
        {/* Render trails */}
        {crewMembers.map(member => {
          const trailData = getTrailGeoJSON(member.id)
          if (!trailData) return null

          return (
            <Source key={`trail-${member.id}`} type="geojson" data={trailData}>
              <Layer
                id={`trail-layer-${member.id}`}
                type="line"
                paint={{
                  'line-color': member.color,
                  'line-width': 4,
                  'line-opacity': 0.7
                }}
              />
            </Source>
          )
        })}

        {/* Render member markers */}
        {Object.entries(memberPositions).map(([deviceId, position]) => {
          const member = getMemberForDevice(deviceId)
          if (!member) return null

          return (
            <Marker
              key={`marker-${deviceId}`}
              latitude={position.latitude}
              longitude={position.longitude}
            >
              <div className="flex flex-col items-center -translate-y-3">
                {/* Small circle marker */}
                <div
                  className="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                {/* Tiny name label */}
                <div className="mt-0.5 bg-black/60 text-white px-1.5 py-0 rounded text-[10px] whitespace-nowrap">
                  {member.name}
                </div>
              </div>
            </Marker>
          )
        })}
      </Map>

      {/* Recenter button */}
      <button
        onClick={handleRecenter}
        className="absolute bottom-20 right-4 w-12 h-12 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
        </svg>
      </button>

      {/* Menu button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Menu dropdown */}
      {showMenu && (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl p-4 min-w-64">
          <div className="border-b pb-3 mb-3">
            <div className="text-sm text-gray-500">Crew</div>
            <div className="font-bold text-gray-900">{session.crewName}</div>
            <div className="text-xs text-gray-500 mt-1">Code: {session.inviteCode}</div>
          </div>

          <div className="border-b pb-3 mb-3">
            <div className="text-sm text-gray-500">Your Name</div>
            <div className="font-bold text-gray-900">{session.memberName}</div>
          </div>

          <div className="border-b pb-3 mb-3">
            <div className="text-sm text-gray-500 mb-2">Crew Members ({crewMembers.length})</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {crewMembers.map(member => (
                <div key={member.id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  <span className="text-sm text-gray-700">{member.name}</span>
                  {member.id === session.memberId && (
                    <span className="text-xs text-gray-500">(you)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-b pb-3 mb-3">
            <div className="text-sm text-gray-500 mb-2">Tracking Status</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Server:</span>
                <span className={traccarConnected ? 'text-green-600' : 'text-red-600'}>
                  {traccarConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Your Device ID:</span>
                <span className="font-mono text-gray-900">{session.deviceId}</span>
              </div>
              {memberPositions[crewMembers.find(m => m.id === session.memberId)?.traccar_device_id] ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Your Status:</span>
                  <span className="text-green-600">🟢 Tracking Active</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Your Status:</span>
                  <span className="text-orange-600">⚠️ Waiting for location...</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold"
          >
            Leave Crew
          </button>
        </div>
      )}

      {/* Status bar */}
      <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-2 rounded-lg text-sm">
        {crewMembers.length} member{crewMembers.length !== 1 ? 's' : ''} online
      </div>
    </div>
  )
}
