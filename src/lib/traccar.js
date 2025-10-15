const TRACCAR_SERVER = import.meta.env.VITE_TRACCAR_SERVER
const TRACCAR_EMAIL = import.meta.env.VITE_TRACCAR_EMAIL
const TRACCAR_PASSWORD = import.meta.env.VITE_TRACCAR_PASSWORD

class TraccarClient {
  constructor() {
    this.ws = null
    this.sessionCookie = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.listeners = new Set()
  }

  async authenticate() {
    try {
      const response = await fetch(`${TRACCAR_SERVER}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `email=${encodeURIComponent(TRACCAR_EMAIL)}&password=${encodeURIComponent(TRACCAR_PASSWORD)}`,
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Traccar authentication failed')
      }

      // Store cookies for WebSocket connection
      const cookies = response.headers.get('set-cookie')
      if (cookies) {
        this.sessionCookie = cookies
      }

      return await response.json()
    } catch (error) {
      console.error('Traccar auth error:', error)
      throw error
    }
  }

  async createDevice(deviceName, uniqueId) {
    try {
      console.log('🔧 CREATE DEVICE - Input:', { deviceName, uniqueId })

      // First authenticate to get session
      await this.authenticate()

      // Check if device already exists
      const devices = await this.getDevices()
      console.log('🔧 All Traccar devices:', devices.map(d => ({ id: d.id, name: d.name, uniqueId: d.uniqueId })))

      const existingDevice = devices.find(d => d.uniqueId === uniqueId)

      if (existingDevice) {
        console.log('✅ Device already exists, using existing device:', { id: existingDevice.id, name: existingDevice.name, uniqueId: existingDevice.uniqueId })
        return existingDevice
      }

      console.log('🆕 Creating new Traccar device...')
      // Create new device
      const response = await fetch(`${TRACCAR_SERVER}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${TRACCAR_EMAIL}:${TRACCAR_PASSWORD}`)
        },
        credentials: 'include',
        body: JSON.stringify({
          name: deviceName,
          uniqueId: uniqueId
        })
      })

      if (!response.ok) {
        const error = await response.text()

        // Check if it's a duplicate error
        if (error.includes('Duplicate entry') || error.includes('uniqueId')) {
          // Device was created between our check and now, fetch it
          const devicesRetry = await this.getDevices()
          const device = devicesRetry.find(d => d.uniqueId === uniqueId)
          if (device) {
            console.log('✅ Found duplicate device:', { id: device.id, name: device.name, uniqueId: device.uniqueId })
            return device
          }
        }

        throw new Error(`Failed to create device: ${error}`)
      }

      const device = await response.json()
      console.log('✅ Created new device:', { id: device.id, name: device.name, uniqueId: device.uniqueId })
      return device
    } catch (error) {
      console.error('❌ Error creating device:', error)
      throw error
    }
  }

  async getDevices() {
    try {
      const response = await fetch(`${TRACCAR_SERVER}/api/devices`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch devices')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching devices:', error)
      return []
    }
  }

  async getPositions(deviceIds = []) {
    try {
      const url = deviceIds.length > 0
        ? `${TRACCAR_SERVER}/api/positions?${deviceIds.map(id => `deviceId=${id}`).join('&')}`
        : `${TRACCAR_SERVER}/api/positions`

      console.log('📡 Fetching positions from:', url)

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch positions')
      }

      const positions = await response.json()
      console.log('📡 Positions fetched:', positions.map(p => ({ deviceId: p.deviceId, lat: p.latitude, lng: p.longitude, time: p.fixTime })))
      return positions
    } catch (error) {
      console.error('❌ Error fetching positions:', error)
      return []
    }
  }

  connectWebSocket(onMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = TRACCAR_SERVER.replace('https://', 'wss://').replace('http://', 'ws://')
    this.ws = new WebSocket(`${wsUrl}/api/socket`)

    this.ws.onopen = () => {
      console.log('Traccar WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Notify all listeners
        this.listeners.forEach(listener => listener(data))

        if (onMessage) {
          onMessage(data)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('Traccar WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('Traccar WebSocket closed')
      this.reconnect(onMessage)
    }
  }

  reconnect(onMessage) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connectWebSocket(onMessage)
    }, delay)
  }

  addListener(callback) {
    this.listeners.add(callback)
  }

  removeListener(callback) {
    this.listeners.delete(callback)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
  }
}

export const traccarClient = new TraccarClient()
