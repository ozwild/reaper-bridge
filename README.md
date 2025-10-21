# reaper-bridge

**A TypeScript library for controlling Reaper DAW via Web Control Surface**

[![npm version](https://img.shields.io/npm/v/@ozwild/reaper-bridge.svg)](https://www.npmjs.com/package/@ozwild/reaper-bridge)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## Overview

**reaper-bridge** is a TypeScript library that provides a clean, modern API for controlling [Reaper DAW](https://www.reaper.fm/) from JavaScript applications. It leverages Reaper's built-in Web Control Surface to enable remote control over HTTP.

### Key Features

- 🎯 **Singleton Pattern** - Single shared instance across your application
- 🔄 **State Subscriptions** - Subscribe to specific state types (transport, tracks, markers, etc.)
- ⚡ **Immediate Execution** - Responsive UI with immediate vs. queued command execution
- 🎛️ **Multiple APIs** - Actions, commands, ExtState, and OSC support
- 🚀 **Simple API** - Easy initialization and configuration
- 📡 **Smart Polling** - Automatic polling based on active subscriptions
- 🔌 **Connection Management** - Connection state tracking and error handling
- 📝 **TypeScript** - Full type definitions included
- 🌐 **Framework Agnostic** - Works with any JavaScript framework

### Use Cases

- **Web-based DAW controllers** - Build custom control interfaces
- **Live performance tools** - Control Reaper from tablets/phones
- **Studio automation** - Remote control from recording booth
- **Custom workflows** - Integrate Reaper into your applications

---

## Installation

```bash
npm install @ozwild/reaper-bridge
# or
yarn add @ozwild/reaper-bridge
```

### Requirements

- **Node.js**: 18.0.0 or higher
- **Reaper DAW** with Web Control Surface enabled

### Build Output

- **ESM** (`dist/*.esm.js`) - For modern bundlers and browsers
- **CommonJS** (`dist/*.cjs.js`) - For Node.js compatibility
- **TypeScript declarations** (`dist/*.d.ts`) - Full type support

---

## Quick Start

### 1. Enable Reaper Web Control Surface

1. Open Reaper → Preferences (Ctrl+P)
2. Navigate to: `Control/OSC/web`
3. Click `Add` → Select `Web browser interface`
4. Set port to `8080` (or your preferred port)
5. Check "Allow access from other computers"
6. Click OK

### 2. Basic Usage

```typescript
import { Bridge } from '@ozwild/reaper-bridge'

// Initialize with connection settings
Bridge.init({
  connection: {
    host: 'localhost',
    port: 8080,
    pollingInterval: 250,
    failureThreshold: 3,
  },
})

// Check if ready and connected
console.log('Bridge ready:', Bridge.isReady())
console.log('Connected:', Bridge.isConnected())

// Subscribe to specific state changes
const unsubscribeTransport = Bridge.subscribeToState('transport', (state) => {
  if (state) {
    console.log('Transport:', state.isPlaying ? 'Playing' : 'Stopped')
    console.log('Position:', state.position.seconds)
  }
})

const unsubscribeTracks = Bridge.subscribeToState('tracks', (tracks) => {
  console.log(`Found ${tracks?.length || 0} tracks`)
})

// Subscribe to connection events
const id = Bridge.subscribe({
  onConnectionChange: (connected) => {
    console.log('Connection status:', connected)
  },
  onError: (error) => {
    console.error('Reaper error:', error.message)
  },
})

// Control transport with immediate execution (responsive UI)
await Bridge.actions.transport.play()
await Bridge.actions.transport.stop()
await Bridge.actions.transport.record()

// Get current state manually
const transportState = Bridge.getCurrentState('transport')
console.log('Current state:', transportState)

// Cleanup when done
unsubscribeTransport()
unsubscribeTracks()
Bridge.unsubscribe(id)
```

---

## API Reference

### Bridge (Singleton)

The main Bridge object provides a factory API for all Reaper interactions.

#### Initialization

##### `Bridge.init(config)` → `ReaperAPI`

Initialize the Bridge singleton with configuration.

```javascript
Bridge.init({
  connection: {
    host: 'localhost', // Reaper machine IP
    port: 8080, // Web Control Surface port
    pollingInterval: 250, // Transport polling rate (ms)
    failureThreshold: 3, // Failures before disconnect
  },
})
```

##### `Bridge.configure(config)` → `void`

Set default configuration before calling `init()`.

```javascript
// Set defaults
import { Bridge } from '@ozwild/reaper-bridge'

// Configure and initialize (do this once in your app)
Bridge.configure({
  connection: {
    host: '192.168.1.36',
    port: 8080,
  },
})

// Later, init with defaults
Bridge.init()
```

##### `Bridge.isReady()` → `boolean`

Check if Bridge has been initialized.

```javascript
if (Bridge.isReady()) {
  // Safe to use Bridge
}
```

##### `Bridge.isConnected()` → `boolean`

Check if currently connected to Reaper.

```javascript
if (Bridge.isConnected()) {
  console.log('Connected to Reaper')
}
```

#### Subscription

##### `Bridge.subscribe(handlers)` → `number`

Subscribe to Bridge events. Returns subscription ID for cleanup.

```typescript
const id = Bridge.subscribe({
  onConnectionChange: (isConnected) => {
    console.log('Connection:', isConnected)
  },
  onError: (error, failureCount) => {
    console.error('Error:', error, 'Failures:', failureCount)
  },
})
```

**Event Handlers:**

- `onConnectionChange(isConnected: boolean)` - Connection state changes
- `onError(error: Error, failureCount: number)` - Error occurred

##### `Bridge.subscribeToState(stateType, callback)` → `UnsubscribeFunction`

Subscribe to specific state updates with fine-grained control.

```typescript
// Subscribe to transport state changes
const unsubscribe = Bridge.subscribeToState('transport', (state) => {
  if (state) {
    console.log(
      `Playing: ${state.isPlaying}, Position: ${state.position.seconds}`
    )
  }
})

// Subscribe to track changes
const unsubscribeTracks = Bridge.subscribeToState('tracks', (tracks) => {
  tracks?.forEach((track, i) => {
    console.log(
      `Track ${i + 1}: Muted: ${track.isMuted}, Solo: ${track.isSoloed}`
    )
  })
})

// Subscribe to markers
const unsubscribeMarkers = Bridge.subscribeToState('markers', (markers) => {
  console.log(`Found ${markers?.length || 0} markers`)
})

// Cleanup
unsubscribe()
unsubscribeTracks()
unsubscribeMarkers()
```

**Available State Types:**

- `'transport'` - Transport state (play, stop, position)
- `'tracks'` - All track states (mute, solo, volume, etc.)
- `'markers'` - Project markers
- `'regions'` - Project regions
- `'beat'` - Beat position information and time signature

##### `Bridge.getCurrentState(stateType)` → `StateData | null`

Get the current cached state for a specific type without subscribing.

```typescript
const transportState = Bridge.getCurrentState('transport')
const tracks = Bridge.getCurrentState('tracks')
```

##### `Bridge.unsubscribe(id)` → `void`

Unsubscribe from Bridge events.

```javascript
Bridge.unsubscribe(id)
```

##### `Bridge.updateSubscriber(id, handlers)` → `void`

Update an existing subscriber's handlers.

```javascript
Bridge.updateSubscriber(id, {
  onTransport: newHandler,
})
```

---

## Execution Modes

reaper-bridge supports two execution modes for optimal performance and user experience:

### Immediate Execution

Commands are sent to Reaper instantly when called. Use for:

- **User interactions** (button clicks, transport controls)
- **Responsive UI updates**
- **Critical timing operations**

```typescript
// All Bridge.actions methods use immediate execution by default
await Bridge.actions.transport.play()

// Explicitly request immediate execution
await Bridge.requests.executeAction(REAPER_ACTIONS.PLAY, true)
```

### Queued Execution

Commands are batched and sent during the next polling cycle. Use for:

- **Background operations**
- **Bulk updates**
- **Non-critical operations**

```typescript
// Default behavior for Bridge.requests methods
await Bridge.requests.executeAction(REAPER_ACTIONS.SOME_BACKGROUND_ACTION)

// Explicitly queue (immediate = false)
await Bridge.requests.executeAction(REAPER_ACTIONS.SOME_ACTION, false)
```

### Benefits

- **Immediate**: Instant feedback, responsive UI
- **Queued**: Reduced network traffic, efficient batching
- **Automatic**: High-level actions choose the appropriate mode
- **Flexible**: Low-level control when needed

---

#### Actions

High-level action methods for common Reaper operations.

##### Transport

```typescript
// Playback control
await Bridge.actions.transport.play() // Start playback
await Bridge.actions.transport.pause() // Pause
await Bridge.actions.transport.stop() // Stop + go to start
await Bridge.actions.transport.playPause() // Toggle play/pause
await Bridge.actions.transport.record() // Toggle recording
await Bridge.actions.transport.toggleLoop() // Toggle repeat

// Get transport state
const state = await Bridge.actions.transport.getState()
```

##### Position

```typescript
await Bridge.actions.position.goToStart()
await Bridge.actions.position.goToPreviousMarker()
await Bridge.actions.position.goToNextMarker()
await Bridge.actions.position.goToTime(120.5) // Go to specific time in seconds
```

##### Master

```typescript
await Bridge.actions.master.toggleMute() // Toggle master mute
```

##### Tracks

```typescript
// Get all tracks
const tracks = await Bridge.actions.tracks.getAll()

// Get specific track
const track = await Bridge.actions.tracks.getTrack(1)

// Control track
await Bridge.actions.tracks.toggleMute(1)
await Bridge.actions.tracks.toggleSolo(1)
```

##### Project

```typescript
// Load a project file
await Bridge.actions.project.load('C:/Path/To/Project.rpp')
```

**Note:** Project loading requires ReaperBridge.lua script loaded in Reaper with OSC mapping to `/reaper_bridge`.

#### Requests

Low-level request methods for direct Reaper API access.

##### `Bridge.requests.sendCommand(cmd, immediate?)` → `Promise<string>`

Send a raw command to Reaper.

```typescript
// Queued execution (default)
const response = await Bridge.requests.sendCommand('TRANSPORT')

// Immediate execution for responsive UI
const response = await Bridge.requests.sendCommand('TRANSPORT', true)
```

##### `Bridge.requests.executeAction(actionId, immediate?)` → `Promise<void>`

Execute a Reaper action by ID (fire-and-forget).

```typescript
import { REAPER_ACTIONS } from '@ozwild/reaper-bridge'

// Queued execution (default)
await Bridge.requests.executeAction(REAPER_ACTIONS.PLAY)

// Immediate execution
await Bridge.requests.executeAction(REAPER_ACTIONS.PLAY, true)
```

##### `Bridge.requests.executeCommand(command, immediate?)` → `Promise<void>`

Execute a complex command (fire-and-forget).

```typescript
import { REAPER_COMMANDS } from '@ozwild/reaper-bridge'

// Queued execution
await Bridge.requests.executeCommand(REAPER_COMMANDS.POSITION_GOTO_SECONDS(120))

// Immediate execution
await Bridge.requests.executeCommand(
  REAPER_COMMANDS.POSITION_GOTO_SECONDS(120),
  true
)
```

##### `Bridge.requests.requestData(command)` → `Promise<ParsedResponse | null>`

Request data from Reaper (always immediate, expects response).

```typescript
// Always immediate - use for getting current state
const response = await Bridge.requests.requestData('TRANSPORT')
```

##### ExtState

Get/set external state values for ReaScript communication.

```typescript
// Set a value (queued by default)
await Bridge.requests.extState.set('myapp', 'key', 'value')

// Set a value immediately
await Bridge.requests.extState.set('myapp', 'key', 'value', false, true)

// Get a value (always immediate)
const response = await Bridge.requests.extState.get('myapp', 'key')
console.log(response?.value) // The stored value
```

##### OSC

Trigger OSC-mapped ReaScripts.

```typescript
await Bridge.requests.OSC.trigger('your-mapped-osc-address', 'argument', true)
```

#### Connection

##### Connection

```typescript
// Update connection settings
Bridge.actions.connection.update('192.168.1.50', '8080')

// Get current connection information
const info = Bridge.actions.connection.getInfo()
// { host: '...', port: '...', baseUrl: '...', isConnected: true }

// Test connection to Reaper
const isReachable = await Bridge.actions.connection.test()
```

---

### TypeScript Support

The library is written in TypeScript and includes full type definitions:

```typescript
import type {
  BridgeConfig,
  EventHandlers,
  TransportStateResponse,
  TrackStateResponse,
  StateType,
  StateSubscriptionCallback,
} from '@ozwild/reaper-bridge'

const config: BridgeConfig = {
  connection: {
    host: 'localhost',
    port: '8080',
    pollingInterval: 250,
    failureThreshold: 3,
  },
}

const handlers: EventHandlers = {
  onConnectionChange: (connected: boolean) => {
    console.log('Connected:', connected)
  },
}

// Type-safe state subscriptions
const unsubscribe: () => void = Bridge.subscribeToState(
  'transport',
  (state: TransportStateResponse | null) => {
    if (state) {
      console.log(`Playing: ${state.isPlaying}`)
    }
  }
)

// State type checking
const stateType: StateType = 'tracks'
const callback: StateSubscriptionCallback<'tracks'> = (tracks) => {
  tracks?.forEach((track) => console.log(track.name))
}
```

---

## Configuration

### Configuration Options

```typescript
interface BridgeConfig {
  connection: {
    host: string // Reaper machine IP address
    port: string // Web Control Surface port
    pollingInterval: number // Transport polling rate (ms)
    failureThreshold: number // Failures before marking disconnected
  }
}
```

### Default Configuration

```typescript
{
  connection: {
    host: '192.168.1.36',
    port: '8080',
    failureThreshold: 3,
    pollingInterval: 1000
  }
}
```

---

## Examples

### Basic Transport Control

```typescript
import { Bridge } from '@ozwild/reaper-bridge'

Bridge.init({
  connection: {
    host: 'localhost',
    port: '8080',
  },
})

// Play
await Bridge.actions.transport.play()

// Wait 5 seconds
await new Promise((resolve) => setTimeout(resolve, 5000))

// Stop
await Bridge.actions.transport.stop()
```

### Monitor State Changes

```typescript
// Subscribe to transport state
const unsubscribeTransport = Bridge.subscribeToState('transport', (state) => {
  if (state?.isPlaying) {
    console.log(`Playing at ${state.positionSeconds}`)
  }
})

// Subscribe to track changes
const unsubscribeTracks = Bridge.subscribeToState('tracks', (tracks) => {
  tracks?.forEach((track, i) => {
    console.log(`Track ${i + 1}: ${track.mute ? 'Muted' : 'Unmuted'}`)
  })
})

// Subscribe to connection events
const id = Bridge.subscribe({
  onConnectionChange: (connected) => {
    console.log(`Connection: ${connected ? 'Connected' : 'Disconnected'}`)
  },
})

// Cleanup after 60 seconds
setTimeout(() => {
  unsubscribeTransport()
  unsubscribeTracks()
  Bridge.unsubscribe(id)
}, 60000)
```

### Working with Tracks

```typescript
// Get all tracks
const tracks = await Bridge.actions.tracks.getAll()
console.log(`Found ${tracks?.length || 0} tracks`)

// Control specific track
await Bridge.actions.tracks.toggleMute(1) // Mute/unmute track 1
await Bridge.actions.tracks.toggleSolo(2) // Solo/unsolo track 2

// Get track info
const track = await Bridge.actions.tracks.getTrack(1)
console.log(`Track 1 - Muted: ${track?.mute}, Solo: ${track?.solo}`)
```

### Load Project with OSC

```typescript
// Requires ReaperBridge.lua script in Reaper with OSC mapping
await Bridge.actions.project.load('C:/Music/MySong.rpp')
```

### Immediate vs Queued Execution

```typescript
import { Bridge, REAPER_ACTIONS, REAPER_COMMANDS } from '@ozwild/reaper-bridge'

// Immediate execution for responsive UI
await Bridge.actions.transport.play() // Always immediate
await Bridge.requests.executeAction(REAPER_ACTIONS.STOP, true) // Explicit immediate

// Queued execution for efficiency
await Bridge.requests.executeAction(REAPER_ACTIONS.SOME_BACKGROUND_ACTION) // Default queued
await Bridge.requests.executeCommand(
  REAPER_COMMANDS.TRACK_SET_VOLUME(1, 0.8),
  false
) // Explicit queued

// Mixed workflow - immediate user actions, queued bulk operations
async function handleUserPlayback() {
  // User clicked play - immediate for responsiveness
  await Bridge.actions.transport.play()

  // Update UI state immediately
  const currentState = Bridge.getCurrentState('transport')
  updateUI(currentState)

  // Background tasks can be queued
  await Bridge.requests.executeCommand('SET/UNDO_BEGIN', false)
}
```

### Error Handling with State Subscriptions

```typescript
const id = Bridge.subscribe({
  onError: (error, failureCount) => {
    console.error(`Error (${failureCount} failures):`, error.message)

    if (failureCount >= 3) {
      console.log('Connection lost, attempting to reconnect...')
      // Handle reconnection logic
    }
  },
})

// Error handling with state subscriptions
const unsubscribe = Bridge.subscribeToState('transport', (state) => {
  if (state === null) {
    console.warn('Transport state unavailable')
    return
  }

  // State is available and valid
  updateTransportUI(state)
})

try {
  // Immediate actions for user interactions
  await Bridge.actions.transport.play()
} catch (error) {
  console.error('Failed to play:', error.message)
  // Show user feedback
}
```

---

## API Documentation

See the TypeScript definitions for complete API reference.

## Additional Documentation

See these resources for additional details:

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

- [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

- [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

---

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow the development workflow in [DEVELOPMENT.md](DEVELOPMENT.md)
4. Submit a pull request

---

## License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Reaper DAW](https://www.reaper.fm/) - Digital Audio Workstation
- Reaper Web Control Surface documentation

---

## Links

- **Repository:** [github.com/ozwild/reaper-bridge](https://github.com/ozwild/reaper-bridge)
- **Issues:** [github.com/ozwild/reaper-bridge/issues](https://github.com/ozwild/reaper-bridge/issues)
- **npm:** [@ozwild/reaper-bridge](https://www.npmjs.com/package/@ozwild/reaper-bridge)
- **Reaper:** [reaper.fm](https://www.reaper.fm/)

---

## Support

**Need Help?**

1. Check [Troubleshooting](#troubleshooting) section
2. Read [API documentation](docs/API.md)
3. Search [existing issues](https://github.com/ozwild/reaper-bridge/issues)
4. Open a [new issue](https://github.com/ozwild/reaper-bridge/issues/new)

**Found a Bug?**

Please open an issue with:

- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, React version, Reaper version)

---

<p align="center">
  <strong>Built for the Reaper community</strong>
</p>

<p align="center">
  <sub>Star ⭐ this repo if you find it useful!</sub>
</p>
