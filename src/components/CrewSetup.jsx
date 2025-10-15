import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traccarClient } from '../lib/traccar'
import { generateInviteCode, generateMemberColor } from '../utils/helpers'
import { storeSession } from '../utils/storage'

export default function CrewSetup({ onSessionCreated }) {
  const [mode, setMode] = useState(null) // 'create' or 'join'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [crewName, setCrewName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const handleCreateCrew = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!crewName.trim() || !memberName.trim() || !deviceId.trim()) {
        throw new Error('Please fill in all fields')
      }

      // Generate unique invite code
      let code = generateInviteCode()
      let isUnique = false

      while (!isUnique) {
        const { data: existing } = await supabase
          .from('crews')
          .select('id')
          .eq('invite_code', code)
          .single()

        if (!existing) {
          isUnique = true
        } else {
          code = generateInviteCode()
        }
      }

      // Create Traccar device
      let traccarDevice
      try {
        traccarDevice = await traccarClient.createDevice(memberName.trim(), deviceId.trim())
      } catch (traccarError) {
        throw new Error(`Failed to create tracking device: ${traccarError.message}`)
      }

      // Create crew
      const { data: crew, error: crewError } = await supabase
        .from('crews')
        .insert({
          name: crewName.trim(),
          invite_code: code
        })
        .select()
        .single()

      if (crewError) throw crewError

      // Create member with traccar device ID
      const { data: member, error: memberError } = await supabase
        .from('crew_members')
        .insert({
          crew_id: crew.id,
          name: memberName.trim(),
          traccar_device_id: String(traccarDevice.id),
          color: generateMemberColor()
        })
        .select()
        .single()

      if (memberError) throw memberError

      // Store session
      const session = {
        crewId: crew.id,
        crewName: crew.name,
        memberId: member.id,
        memberName: member.name,
        memberColor: member.color,
        inviteCode: code,
        deviceId: deviceId.trim()
      }

      storeSession(session)
      onSessionCreated(session)

    } catch (err) {
      console.error('Error creating crew:', err)
      setError(err.message || 'Failed to create crew')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinCrew = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!inviteCode.trim() || !memberName.trim() || !deviceId.trim()) {
        throw new Error('Please fill in all fields')
      }

      // Find crew by invite code
      const { data: crew, error: crewError } = await supabase
        .from('crews')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()

      if (crewError || !crew) {
        throw new Error('Invalid invite code')
      }

      // Check if name already exists in this crew
      const { data: existingMember } = await supabase
        .from('crew_members')
        .select('id')
        .eq('crew_id', crew.id)
        .eq('name', memberName.trim())
        .single()

      if (existingMember) {
        throw new Error('This name is already taken in this crew')
      }

      // Create Traccar device
      let traccarDevice
      try {
        traccarDevice = await traccarClient.createDevice(memberName.trim(), deviceId.trim())
      } catch (traccarError) {
        throw new Error(`Failed to create tracking device: ${traccarError.message}`)
      }

      // Create member with traccar device ID
      const { data: member, error: memberError } = await supabase
        .from('crew_members')
        .insert({
          crew_id: crew.id,
          name: memberName.trim(),
          traccar_device_id: String(traccarDevice.id),
          color: generateMemberColor()
        })
        .select()
        .single()

      if (memberError) throw memberError

      // Store session
      const session = {
        crewId: crew.id,
        crewName: crew.name,
        memberId: member.id,
        memberName: member.name,
        memberColor: member.color,
        inviteCode: crew.invite_code,
        deviceId: deviceId.trim()
      }

      storeSession(session)
      onSessionCreated(session)

    } catch (err) {
      console.error('Error joining crew:', err)
      setError(err.message || 'Failed to join crew')
    } finally {
      setLoading(false)
    }
  }

  if (!mode) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-3">CrewMap</h1>
            <p className="text-gray-400 text-lg">Track your crew in real-time</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold transition-colors"
            >
              Create a Crew
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-lg font-semibold transition-colors"
            >
              Join a Crew
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-md w-full">
          <button
            onClick={() => setMode(null)}
            className="text-gray-400 hover:text-white mb-6 flex items-center"
          >
            ← Back
          </button>

          <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-6">Create a Crew</h2>

            <form onSubmit={handleCreateCrew} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Crew Name</label>
                <input
                  type="text"
                  value={crewName}
                  onChange={(e) => setCrewName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Awesome Crew"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Device ID for Tracking</label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john-phone"
                  disabled={loading}
                />
                <p className="text-gray-400 text-xs mt-1">Use this ID in Traccar Client app</p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                {loading ? 'Creating...' : 'Create Crew'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'join') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-md w-full">
          <button
            onClick={() => setMode(null)}
            className="text-gray-400 hover:text-white mb-6 flex items-center"
          >
            ← Back
          </button>

          <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-6">Join a Crew</h2>

            <form onSubmit={handleJoinCrew} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 uppercase text-center text-2xl tracking-widest"
                  placeholder="ABC123"
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="John"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Device ID for Tracking</label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="john-phone"
                  disabled={loading}
                />
                <p className="text-gray-400 text-xs mt-1">Use this ID in Traccar Client app</p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                {loading ? 'Joining...' : 'Join Crew'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }
}
