export default function TraccarInstructions({ deviceId, onContinue }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Set Up Tracking</h2>

        <div className="space-y-4 text-gray-300">
          <p>To start tracking your location, follow these steps:</p>

          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Step 1: Install Traccar Client</h3>
            <p className="text-sm mb-2">Download from your app store:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>iPhone: App Store</li>
              <li>Android: Play Store</li>
            </ul>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Step 2: Configure the App</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-semibold text-white">Device ID:</span>
                <div className="bg-gray-900 p-2 rounded mt-1 font-mono text-blue-400">
                  {deviceId}
                </div>
              </div>
              <div>
                <span className="font-semibold text-white">Server URL:</span>
                <div className="bg-gray-900 p-2 rounded mt-1 font-mono text-blue-400">
                  https://server.traccar.org
                </div>
              </div>
              <div>
                <span className="font-semibold text-white">Frequency:</span>
                <span className="ml-2">10-30 seconds</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Step 3: Start Tracking</h3>
            <p className="text-sm">
              Tap the <span className="font-semibold">START</span> button in Traccar Client.
              Your location will appear on the CrewMap!
            </p>
          </div>

          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              <span className="font-semibold">Tip:</span> Enable "Always" location permission
              for background tracking.
            </p>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          Continue to Map
        </button>
      </div>
    </div>
  )
}
