import { useState, useEffect } from 'react'
import CrewSetup from './components/CrewSetup'
import MapView from './components/MapView'
import TraccarInstructions from './components/TraccarInstructions'
import { getStoredSession } from './utils/storage'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // Check for existing session
    const storedSession = getStoredSession()
    if (storedSession) {
      setSession(storedSession)
    }
    setLoading(false)
  }, [])

  const handleSessionCreated = (newSession) => {
    setSession(newSession)
    setShowInstructions(true)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <CrewSetup onSessionCreated={handleSessionCreated} />
  }

  return (
    <>
      <MapView session={session} onLogout={() => { setSession(null); setShowInstructions(false); }} />
      {showInstructions && session.deviceId && (
        <TraccarInstructions
          deviceId={session.deviceId}
          onContinue={() => setShowInstructions(false)}
        />
      )}
    </>
  )
}

export default App
