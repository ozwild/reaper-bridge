# reaper-bridge

**A JavaScript/React bridge for controlling Reaper DAW via Web Control Surface**

[![npm version](https://img.shields.io/npm/v/@ozwild/reaper-bridge.svg)](https://www.npmjs.com/package/@ozwild/reaper-bridge)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18%2B-61DAFB?logo=react)](https://react.dev/)

---

## Import Patterns

The package provides multiple import options for different use cases:

### Main Bundle (Recommended)

```javascript
// Import everything (Bridge + useReaper)
import { Bridge, useReaper } from '@ozwild/reaper-bridge'

// Use Bridge for vanilla JS
Bridge.init({ connection: { host: 'localhost', port: 8080 } })

// Use useReaper hook in React components
function MyComponent() {
  const { actions, isConnected } = useReaper()
  // ...
}
```

### Bridge Only (Vanilla JS)

```javascript
// Import only Bridge (smaller bundle for non-React apps)
import { Bridge } from '@ozwild/reaper-bridge/Bridge'

Bridge.init(config)
```

### Legacy Support

```javascript
// CommonJS (Node.js)
const { Bridge, useReaper } = require('@ozwild/reaper-bridge')

// ESM with dynamic import
const { Bridge } = await import('@ozwild/reaper-bridge')
```

### Bundle Information

- **Main bundle**: `~7.3KB` minified (Bridge + useReaper)
- **Bridge only**: `~6.3KB` minified (vanilla JS)
- **Formats**: ESM + CommonJS
- **Target**: Modern browsers + Node.js 18+
- **Tree-shakable**: Import only what you need

---

## Architecture Overview

**reaper-bridge** is a JavaScript library that provides a clean, modern API for controlling [Reaper DAW](https://www.reaper.fm/) from web applications. It leverages Reaper's built-in Web Control Surface to enable remote control over HTTP.

### Key Features

- 🎯 **Singleton Pattern** - Single shared instance across your entire application
- 🔄 **Subscription System** - Efficient event broadcasting to multiple components
- ⚛️ **React Hook** - `useReaper()` hook for seamless React integration
- 🎛️ **4 Communication Channels** - Actions, Properties, ExtState, and OSC
- 🚀 **Factory Methods** - Simple initialization and configuration
- 📡 **Auto-Polling** - Automatic transport state updates with smart lifecycle management
- 🔌 **Connection Management** - Auto-reconnect and failure handling
- 📝 **Type-Safe** - Comprehensive PropTypes for React components

### Use Cases

- **Web-based DAW controllers** - Build custom control interfaces
- **Live performance tools** - Control Reaper from tablets/phones
- **Studio automation** - Remote control from recording booth
- **Custom workflows** - Integrate Reaper into your web apps

---

## Installation

```bash
npm install @ozwild/reaper-bridge
# or
yarn add @ozwild/reaper-bridge
```

### Requirements

- **Node.js**: 18.0.0 or higher
- **React**: 18.0.0 or higher (optional, only needed for `useReaper` hook)
- **Reaper DAW** with Web Control Surface enabled

### Build Output

The package provides optimized, minified builds:
- **ESM** (`dist/*.esm.js`) - For modern bundlers (Vite, Webpack 5, Rollup)
- **CommonJS** (`dist/*.cjs.js`) - For Node.js and older bundlers
- **Source maps** included for debugging
- **Tree-shakable** - Import only what you need

---

## Quick Start

### 1. Enable Reaper Web Control Surface

1. Open Reaper → Preferences (Ctrl+P)
2. Navigate to: `Control/OSC/web`
3. Click `Add` → Select `Web browser interface`
4. Set port to `8080` (or your preferred port)
5. Check "Allow access from other computers"
6. Click OK

### 2. Vanilla JavaScript Usage

```javascript
import { Bridge } from '@ozwild/reaper-bridge'

const bridge = Bridge.getInstance()
console.log('Bridge ready:', bridge.isReady())

### 3. React Usage

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Bridge, useReaper } from '@ozwild/reaper-bridge'

// Initialize Bridge BEFORE React renders
Bridge.init({
  connection: {
    host: 'localhost',
    port: 8080,
    pollingInterval: 250,
    failureThreshold: 3
  }
})

function TransportControls() {
  const {
    isConnected,
    transportState,
    actions,
    error
  } = useReaper()

  if (!isConnected) {
    return <div>Not connected to Reaper</div>
  }

  return (
    <div>
      <p>Status: {transportState.isPlaying ? 'Playing' : 'Stopped'}</p>
      <p>Position: {transportState.positionSeconds}</p>
      <button onClick={actions.transport.play}>Play</button>
      <button onClick={actions.transport.stop}>Stop</button>
      <button onClick={actions.transport.record}>Record</button>
      {error && <p>Error: {error}</p>}
    </div>
  )
}

// Render your app
ReactDOM.createRoot(document.getElementById('root')).render(<TransportControls />)
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
    host: 'localhost',      // Reaper machine IP
    port: 8080,              // Web Control Surface port
    pollingInterval: 250,    // Transport polling rate (ms)
    failureThreshold: 3      // Failures before disconnect
  }
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
    port: 8080
  }
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

```javascript
const id = Bridge.subscribe({
  onConnectionChange: (isConnected) => {
    console.log('Connection:', isConnected)
  },
  onError: (error, failureCount) => {
    console.error('Error:', error, 'Failures:', failureCount)
  },
  onTransport: (state) => {
    console.log('Transport state:', state)
  }
})
```

**Handler Parameters:**

- `onConnectionChange(isConnected: boolean)` - Connection state changes
- `onError(error: Error, failureCount: number)` - Error occurred
- `onTransport(state: object)` - Transport state update

**Transport State Object:**
```javascript
{
  playstate: 0,           // 0=stopped, 1=playing, 2=paused, 5=recording
  positionSeconds: '...',  // Time format (mm:ss.ms)
  positionBars: '...',     // Musical time (measures.beats.ticks)
  bpm: 120.00,            // Current tempo
  isPlaying: false,       // Convenience boolean
  isRecording: false,     // Convenience boolean
  isLooping: false,       // Convenience boolean
  position: {             // Parsed position
    seconds: 0,
    measures: 1,
    beats: 1,
    ticks: 0
  }
}
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
  onTransport: newHandler
})
```

#### Actions

High-level action methods for common Reaper operations.

##### Transport

```javascript
// Playback control
await Bridge.actions.transport.play()      // Start playback
await Bridge.actions.transport.pause()     // Pause
await Bridge.actions.transport.stop()      // Stop + go to start
await Bridge.actions.transport.playPause() // Toggle play/pause
await Bridge.actions.transport.record()    // Toggle recording
await Bridge.actions.transport.toggleLoop() // Toggle repeat

// Get transport state
const state = await Bridge.actions.transport.getState()
```

##### Position

```javascript
await Bridge.actions.position.goToStart()
await Bridge.actions.position.goToPreviousMarker()
await Bridge.actions.position.goToNextMarker()
```

##### Master

```javascript
await Bridge.actions.master.mute()  // Toggle master mute
```

##### Project

```javascript
// Load a project file
await Bridge.actions.project.load('C:/Path/To/Project.rpp')
```

**Note:** Project loading requires Osworks.lua script loaded in Reaper with OSC mapping to `/osworks`.

#### Requests

Low-level request methods for direct Reaper API access.

##### `Bridge.requests.command(cmd)` → `Promise<string>`

Send a raw command to Reaper.

```javascript
const response = await Bridge.requests.command('TRANSPORT')
```

##### `Bridge.requests.action(actionId)` → `Promise<string>`

Execute a Reaper action by ID.

```javascript
await Bridge.requests.action('40044')  // Play action
await Bridge.requests.action(1016)     // Stop action (numeric also works)
```

##### ExtState

Get/set external state values for ReaScript communication.

```javascript
// Set a value
await Bridge.requests.extState.set('myapp', 'key', 'value')

// Get a value
const value = await Bridge.requests.extState.get('myapp', 'key')
```

##### OSC

Trigger OSC-mapped ReaScripts.

```javascript
await Bridge.requests.OSC.trigger('osworks', 'argument', false)
```

#### Connection

##### `Bridge.connection.update(host, port)` → `void`

Update connection settings.

```javascript
Bridge.connection.update('192.168.1.50', 8080)
```

##### `Bridge.connection.getInfo()` → `object`

Get current connection information.

```javascript
const info = Bridge.connection.getInfo()
// { host: '...', port: ..., baseUrl: '...', isConnected: true }
```

##### `Bridge.connection.test()` → `Promise<boolean>`

Test connection to Reaper.

```javascript
const isReachable = await Bridge.connection.test()
```

---

### React Hook: `useReaper()`

React hook providing access to Bridge with automatic subscription management.

#### Usage

```jsx
import { useReaper } from '@ozwild/reaper-bridge/React'

function MyComponent() {
  const {
    // State
    isConnected,
    transportState,
    error,
    
    // All Bridge methods
    actions,
    requests,
    connection,
    
    // Bridge API
    subscribe,
    unsubscribe,
    ...rest
  } = useReaper()

  // Optional: custom event handlers
  const {
    isConnected,
    transportState
  } = useReaper({
    onConnectionChange: (connected) => {
      console.log('Connection changed:', connected)
    },
    onError: (err) => {
      console.error('Reaper error:', err)
    },
    onTransport: (state) => {
      console.log('Transport update:', state)
    }
  })

  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'}
      <button onClick={actions.transport.play}>Play</button>
    </div>
  )
}
```

#### Return Value

The hook returns an object containing:

**State:**
- `isConnected` (boolean) - Connection status
- `transportState` (object) - Current transport state
- `error` (string|null) - Current error message

**Bridge API:**
- `actions` - All action methods
- `requests` - All request methods
- `connection` - Connection management methods
- All other Bridge methods

#### Lifecycle

- **Mount:** Subscribes to Bridge events, starts polling if first subscriber
- **Update:** Updates subscription handlers when props change
- **Unmount:** Unsubscribes, stops polling if last subscriber

---

## Configuration

### Default Configuration

```javascript
{
  connection: {
    host: '192.168.1.36',
    port: 8080,
    failureThreshold: 3,
    pollingInterval: 500    // milliseconds
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `connection.host` | string | `'192.168.1.36'` | Reaper machine IP address |
| `connection.port` | number | `8080` | Web Control Surface port |
| `connection.pollingInterval` | number | `500` | Transport polling rate (ms) |
| `connection.failureThreshold` | number | `3` | Failures before marking disconnected |

---

## Examples

### Basic Transport Control

```javascript
import Bridge from '@ozwild/reaper-bridge'

Bridge.init({ connection: { host: 'localhost', port: 8080 } })

// Play
await Bridge.actions.transport.play()

// Wait 5 seconds
await new Promise(resolve => setTimeout(resolve, 5000))

// Stop
await Bridge.actions.transport.stop()
```

### Monitor Transport State

```javascript
const id = Bridge.subscribe({
  onTransport: (state) => {
    if (state.isPlaying) {
      console.log(`Playing at ${state.positionSeconds}`)
    }
  }
})

// Cleanup
setTimeout(() => Bridge.unsubscribe(id), 60000)
```

### React Component with Error Handling

```jsx
function ReaperController() {
  const { isConnected, transportState, actions, error } = useReaper()
  const [loading, setLoading] = useState(false)

  const handlePlay = async () => {
    setLoading(true)
    try {
      await actions.transport.play()
    } catch (err) {
      alert(`Failed to play: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {!isConnected && <p style={{ color: 'red' }}>Not connected</p>}
      {error && <p style={{ color: 'orange' }}>{error}</p>}
      
      <p>Status: {transportState.isPlaying ? 'Playing' : 'Stopped'}</p>
      <p>Position: {transportState.positionSeconds}</p>
      <p>BPM: {transportState.bpm}</p>
      
      <button onClick={handlePlay} disabled={loading || !isConnected}>
        {loading ? 'Loading...' : 'Play'}
      </button>
    </div>
  )
}
```

### Load Project with ExtState + OSC

```javascript
// Requires Osworks.lua script in Reaper with OSC mapping
await Bridge.actions.project.load('C:/Music/MySong.rpp')
```

### Custom Action

```javascript
// Execute any Reaper action by ID
await Bridge.requests.action('40285')  // Go to previous track
```

### Multiple Components Sharing State

```jsx
// All components share the same Bridge instance and subscription
function PlayButton() {
  const { actions } = useReaper()
  return <button onClick={actions.transport.play}>Play</button>
}

function StopButton() {
  const { actions } = useReaper()
  return <button onClick={actions.transport.stop}>Stop</button>
}

function Position() {
  const { transportState } = useReaper()
  return <div>{transportState.positionSeconds}</div>
}

// Single polling loop serves all three components
function App() {
  return (
    <>
      <PlayButton />
      <StopButton />
      <Position />
    </>
  )
}
```

---

## Architecture

### Design Patterns

**Singleton:** Single Bridge instance shared across entire application

**Factory:** Bridge provides factory methods for initialization and configuration

**Subscription:** Components subscribe to events, automatic lifecycle management

**Polling:** Smart polling starts when first subscriber added, stops when last removed

### Communication Channels

reaper-bridge leverages Reaper's 4 communication channels:

1. **Action Commands** (`/_/{actionID}`) - Execute discrete actions
2. **Property Control** (`/_/SET|GET/{property}`) - Read/write properties
3. **External State** (`/_/SET|GET/EXTSTATE/{ns}/{key}`) - Data storage
4. **OSC Triggers** (`/_/OSC/{address}`) - Trigger ReaScripts

### Subscription Lifecycle

```
Component 1 mounts
  → Subscribes
  → Starts polling (first subscriber)

Component 2 mounts
  → Subscribes
  → Polling already active

Component 1 unmounts
  → Unsubscribes
  → Polling continues (Component 2 still subscribed)

Component 2 unmounts
  → Unsubscribes
  → Stops polling (last subscriber)
```

---

## Requirements

### Runtime Requirements

- **Node.js:** 18+
- **React:** 18+ (if using React hook)
- **Browser:** Modern browser with Fetch API

### Reaper Requirements

- **Reaper:** 6.0+ (tested on 6.13+)
- **Web Control Surface:** Enabled on port 8080 (or configured port)
- **Network:** Reaper and client on same network (or accessible via IP)

### Optional Dependencies

- **Osworks.lua:** Required for project loading feature (included in soloist)

---

## Troubleshooting

### "Bridge not initialized"

**Cause:** Calling Bridge methods before `init()`

**Solution:**
```javascript
// Call init() before using Bridge
Bridge.init(config)
// Now safe to use
await Bridge.actions.transport.play()
```

### Connection Fails

**Checklist:**
- ✅ Reaper is running
- ✅ Web Control Surface enabled (Preferences > Control/OSC/web)
- ✅ Port matches configuration (default 8080)
- ✅ Host IP is correct
- ✅ Firewall allows port
- ✅ Network connectivity

**Test manually:**
```bash
curl http://localhost:8080/_/TRANSPORT
```

### React Hook Warning

**Warning:** "useReaper: Bridge not initialized"

**Solution:** Call `Bridge.init()` before rendering React components:

```javascript
// App entry point (main.jsx or index.js)
import Bridge from '@ozwild/reaper-bridge'

Bridge.init(config)  // Initialize FIRST

// Then render React
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

### Polling Not Starting

**Cause:** No subscribers

**Solution:** Ensure at least one component calls `Bridge.subscribe()` or uses `useReaper()` hook

### Memory Leaks

**Cause:** Forgetting to unsubscribe

**Solution:** Always unsubscribe in cleanup:

```javascript
// Vanilla JS
const id = Bridge.subscribe(handlers)
// Later:
Bridge.unsubscribe(id)

// React (automatic)
useReaper()  // Automatically unsubscribes on unmount
```

---

## API Documentation

For detailed API documentation, see:

- [API.md](docs/API.md) - Complete API reference
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Technical architecture
- [EXAMPLES.md](docs/EXAMPLES.md) - More code examples

---

## Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/reaper-bridge.git
cd reaper-bridge

# Install dependencies
yarn install

# Lint
yarn lint

# Format
yarn format
```

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) file for details.

---

## Related Projects

- **[soloist](https://github.com/yourusername/soloist)** - Web app using reaper-bridge for live performance control

---

## Acknowledgments

- [Reaper DAW](https://www.reaper.fm/) - Digital Audio Workstation
- [React](https://react.dev/) - UI framework
- Reaper Web Control Surface documentation

---

## Links

- **Repository:** [github.com/yourusername/reaper-bridge](https://github.com/yourusername/reaper-bridge)
- **Issues:** [github.com/yourusername/reaper-bridge/issues](https://github.com/yourusername/reaper-bridge/issues)
- **npm:** [@ozwild/reaper-bridge](https://www.npmjs.com/package/@ozwild/reaper-bridge)
- **Reaper:** [reaper.fm](https://www.reaper.fm/)

---

## Support

**Need Help?**

1. Check [Troubleshooting](#troubleshooting) section
2. Read [API documentation](docs/API.md)
3. Search [existing issues](https://github.com/yourusername/reaper-bridge/issues)
4. Open a [new issue](https://github.com/yourusername/reaper-bridge/issues/new)

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
