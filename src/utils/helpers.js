// Generate a random 6-character invite code
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous characters
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate a random color for crew member markers
export function generateMemberColor() {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Light Blue
    '#F8B739', // Gold
    '#52B788', // Green
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Calculate opacity based on timestamp (fresher = more opaque)
export function calculateTrailOpacity(timestamp, maxAge = 24 * 60 * 60 * 1000) {
  const age = Date.now() - new Date(timestamp).getTime()
  const opacity = Math.max(0.1, 1 - (age / maxAge))
  return opacity
}

// Get start of today (for trail reset)
export function getStartOfDay() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

// Format date as YYYY-MM-DD for day_marker
export function formatDayMarker(date = new Date()) {
  return date.toISOString().split('T')[0]
}
