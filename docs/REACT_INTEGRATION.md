# React Integration

While `@ozwild/reaper-bridge` is framework-agnostic, here's a reference implementation for React applications.

## Installation

```bash
npm install @ozwild/reaper-bridge
# or
yarn add @ozwild/reaper-bridge
```

## Basic Setup

```javascript
import { Bridge } from '@ozwild/reaper-bridge'

// Configure and initialize the bridge
Bridge.configure({
  connection: {
    host: 'localhost',
    port: 8080,
  },
})

await Bridge.init()
```

## React Hook Implementation

Create a `useReaper` hook in your React project:

```javascript
// hooks/useReaper.js
import { Bridge } from '@ozwild/reaper-bridge'
import { useState, useEffect } from 'react'

export const useReaper = ({
  onConnectionChange,
  onError,
  onResponse,
  enablePolling = true,
  pollingInterval = 100,
} = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [transportState] = useState({
    isPlaying: false,
    isRecording: false,
    isLooping: false,
    positionSeconds: '00:00.000',
  })

  useEffect(() => {
    if (!Bridge.isInitialized()) {
      throw new Error(
        'useReaper: Bridge not initialized. Call Bridge.configure() and Bridge.init() first.'
      )
    }

    // Set up event handlers
    Bridge.onConnectionChange((connected) => {
      setIsConnected(connected)
      onConnectionChange?.(connected)
    })

    Bridge.onError((error, consecutiveFailures) => {
      onError?.(error, consecutiveFailures)
    })

    Bridge.onResponse((response, command) => {
      onResponse?.(response, command)
    })

    // Enable polling if requested
    if (enablePolling) {
      Bridge.enablePolling(pollingInterval)
    }

    // Cleanup on unmount
    return () => {
      Bridge.disablePolling()
    }
  }, [onConnectionChange, onError, onResponse, enablePolling, pollingInterval])

  // Actions object with all Bridge methods
  const actions = {
    // Transport controls
    transport: {
      play: Bridge.transport.play,
      pause: Bridge.transport.pause,
      playPause: Bridge.transport.playPause,
      record: Bridge.transport.record,
      toggleLoop: Bridge.transport.toggleLoop,
      getState: Bridge.transport.getState,
    },

    // Position controls
    position: {
      gotoStart: Bridge.position.gotoStart,
      gotoPreviousMarker: Bridge.position.gotoPreviousMarker,
      gotoNextMarker: Bridge.position.gotoNextMarker,
      gotoSeconds: Bridge.position.gotoSeconds,
    },

    // Master controls
    master: {
      toggleMute: Bridge.master.toggleMute,
    },

    // Track controls
    tracks: {
      getAll: Bridge.tracks.getAll,
      getTrack: Bridge.tracks.getTrack,
      setVolume: Bridge.tracks.setVolume,
    },

    // Project controls
    project: {
      load: Bridge.project.load,
    },

    // OSC messaging
    osc: {
      send: Bridge.osc.send,
    },

    // Direct actions
    action: Bridge.action,
    namedAction: Bridge.namedAction,
  }

  // Request methods for getting data
  const requests = {
    extState: {
      get: Bridge.extState.get,
      set: Bridge.extState.set,
    },
  }

  return {
    isConnected,
    transportState,
    actions,
    requests,
  }
}
```

## Usage in Components

```javascript
import { useReaper } from './hooks/useReaper'

const MyComponent = () => {
  const {
    isConnected,
    actions: { transport, project },
    requests: { extState },
  } = useReaper({
    onConnectionChange: (connected) => {
      console.log('Connection changed:', connected)
    },
    onError: (error) => {
      console.error('Bridge error:', error)
    },
  })

  const handlePlay = async () => {
    await transport.play()
  }

  const loadProject = async (projectPath) => {
    await project.load(projectPath)
  }

  const saveSettings = async () => {
    await extState.set('MyApp', 'lastProject', '/path/to/project.rpp')
  }

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={handlePlay}>Play</button>
      <button onClick={() => loadProject('/my/project.rpp')}>
        Load Project
      </button>
      <button onClick={saveSettings}>Save Settings</button>
    </div>
  )
}
```

## Advanced Usage

For more advanced use cases, you can use the Bridge directly:

```javascript
import { Bridge, ACTION_ID, NAMED_ACTION } from '@ozwild/reaper-bridge'

// Direct action execution
await Bridge.action(ACTION_ID.PLAY)

// Named actions with parameters
await Bridge.namedAction(NAMED_ACTION.POSITION_GOTO_SECONDS(120))

// OSC messaging
await Bridge.osc.send('track/1/volume', 0.8)
```

## TypeScript Support

The library includes full TypeScript definitions:

```typescript
import {
  Bridge,
  BridgeConfig,
  TransportStateResponse,
} from '@ozwild/reaper-bridge'

const config: BridgeConfig = {
  connection: {
    host: 'localhost',
    port: 8080,
  },
}

const state: TransportStateResponse = await Bridge.transport.getState()
```
