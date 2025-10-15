const SESSION_KEY = 'crewmap_session'

export function storeSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('Error storing session:', error)
  }
}

export function getStoredSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (error) {
    console.error('Error clearing session:', error)
  }
}
