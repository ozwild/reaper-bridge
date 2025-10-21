# reaper-bridge

**A TypeScript library for controlling Reaper DAW via Web Control Surface**

[![npm version](https://img.shields.io/npm/v/@ozwild/reaper-bridge.svg)](https://www.npmjs.com/package/@ozwild/reaper-bridge)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## Quick Start

```typescript
import { Bridge } from '@ozwild/reaper-bridge'

// Initialize connection to Reaper
Bridge.init({
  connection: {
    host: 'localhost',
    port: 8080
  }
})

// Use actions
await Bridge.actions.transport.play()
await Bridge.actions.transport.stop()

// Subscribe to events
const id = Bridge.subscribe({
  onConnectionChange: (connected) => console.log('Connected:', connected),
  onTransport: (state) => console.log('Transport:', state)
})

// Cleanup
Bridge.unsubscribe(id)
```

### Import Options

```typescript
// Main import (TypeScript)
import { Bridge, ACTION_ID, NAMED_ACTION } from '@ozwild/reaper-bridge'

// CommonJS (Node.js)
const { Bridge } = require('@ozwild/reaper-bridge')

// Bridge only (smaller bundle)
import { Bridge } from '@ozwild/reaper-bridge/Bridge'
```

---

## Overview

**reaper-bridge** is a TypeScript library that provides a clean, modern API for controlling [Reaper DAW](https://www.reaper.fm/) from JavaScript applications. It leverages Reaper's built-in Web Control Surface to enable remote control over HTTP.

### Key Features

- 🎯 **Singleton Pattern** - Single shared instance across your application
- 🔄 **Event System** - Subscribe to connection and transport state changes
- 🎛️ **Multiple APIs** - Actions, commands, ExtState, and OSC support
- 🚀 **Simple API** - Easy initialization and configuration
- 📡 **Transport Polling** - Automatic transport state updates
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
    failureThreshold: 3
  }
})

// Check if ready and connected
console.log('Bridge ready:', Bridge.isReady())
console.log('Connected:', Bridge.isConnected())

// Subscribe to events
const id = Bridge.subscribe({
  onConnectionChange: (connected) => {
    console.log('Connection status:', connected)
  },
  onTransport: (state) => {
    console.log('Transport:', state.isPlaying ? 'Playing' : 'Stopped')
    console.log('Position:', state.positionSeconds)
  },
  onError: (error) => {
    console.error('Reaper error:', error.message)
  }
})

// Control transport
await Bridge.actions.transport.play()
await Bridge.actions.transport.stop()
await Bridge.actions.transport.record()

// Get transport state manually
const state = await Bridge.actions.transport.getState()
console.log('Current state:', state)

// Cleanup when done
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

```typescript
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

**Event Handlers:**

- `onConnectionChange(isConnected: boolean)` - Connection state changes
- `onError(error: Error, failureCount: number)` - Error occurred  
- `onTransport(state: TransportStateResponse)` - Transport state update

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

```typescript
// Playback control
await Bridge.actions.transport.play()       // Start playback
await Bridge.actions.transport.pause()      // Pause
await Bridge.actions.transport.stop()       // Stop + go to start
await Bridge.actions.transport.playPause()  // Toggle play/pause
await Bridge.actions.transport.record()     // Toggle recording
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

**Note:** Project loading requires Osworks.lua script loaded in Reaper with OSC mapping to `/osworks`.

#### Requests

Low-level request methods for direct Reaper API access.

##### `Bridge.requests.sendCommand(cmd)` → `Promise<string>`

Send a raw command to Reaper.

```typescript
const response = await Bridge.requests.sendCommand('TRANSPORT')
```

##### `Bridge.requests.action(actionId)` → `Promise<void>`

Execute a Reaper action by ID.

```typescript
import { ACTION_ID } from '@ozwild/reaper-bridge'

await Bridge.requests.action(ACTION_ID.PLAY)
await Bridge.requests.action(ACTION_ID.STOP)
```

##### `Bridge.requests.namedAction(action)` → `Promise<ParsedResponse | null>`

Execute a named action with parameters.

```typescript
import { NAMED_ACTION } from '@ozwild/reaper-bridge'

await Bridge.requests.namedAction(NAMED_ACTION.POSITION_GOTO_SECONDS(120))
```

##### ExtState

Get/set external state values for ReaScript communication.

```typescript
// Set a value
await Bridge.requests.extState.set('myapp', 'key', 'value')

// Get a value
const response = await Bridge.requests.extState.get('myapp', 'key')
console.log(response?.value) // The stored value
```

##### OSC

Trigger OSC-mapped ReaScripts.

```typescript
await Bridge.requests.OSC.trigger('osworks', 'argument', true)
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
  TrackStateResponse 
} from '@ozwild/reaper-bridge'

const config: BridgeConfig = {
  connection: {
    host: 'localhost',
    port: '8080',
    pollingInterval: 250,
    failureThreshold: 3
  }
}

const handlers: EventHandlers = {
  onTransport: (state: TransportStateResponse) => {
    console.log(state.isPlaying)
  }
}
```

---

## Configuration

### Configuration Options

```typescript
interface BridgeConfig {
  connection: {
    host: string           // Reaper machine IP address
    port: string           // Web Control Surface port  
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
    port: '8080' 
  } 
})

// Play
await Bridge.actions.transport.play()

// Wait 5 seconds
await new Promise(resolve => setTimeout(resolve, 5000))

// Stop
await Bridge.actions.transport.stop()
```

### Monitor Transport State

```typescript
const id = Bridge.subscribe({
  onTransport: (state) => {
    if (state.isPlaying) {
      console.log(`Playing at ${state.positionSeconds}`)
    }
  },
  onConnectionChange: (connected) => {
    console.log(`Connection: ${connected ? 'Connected' : 'Disconnected'}`)
  }
})

// Cleanup after 60 seconds
setTimeout(() => Bridge.unsubscribe(id), 60000)
```

### Working with Tracks

```typescript
// Get all tracks
const tracks = await Bridge.actions.tracks.getAll()
console.log(`Found ${tracks?.length || 0} tracks`)

// Control specific track
await Bridge.actions.tracks.toggleMute(1)  // Mute/unmute track 1
await Bridge.actions.tracks.toggleSolo(2)  // Solo/unsolo track 2

// Get track info
const track = await Bridge.actions.tracks.getTrack(1)
console.log(`Track 1 - Muted: ${track?.mute}, Solo: ${track?.solo}`)
```

### Load Project with OSC

```typescript
// Requires Osworks.lua script in Reaper with OSC mapping
await Bridge.actions.project.load('C:/Music/MySong.rpp')
```

### Direct Commands

```typescript
import { ACTION_ID, NAMED_ACTION } from '@ozwild/reaper-bridge'

// Execute action by ID
await Bridge.requests.action(ACTION_ID.PLAY)

// Execute named action with parameters
await Bridge.requests.namedAction(NAMED_ACTION.POSITION_GOTO_SECONDS(120))

// Send raw command
const response = await Bridge.requests.sendCommand('TRANSPORT')
```

### Error Handling

```typescript
const id = Bridge.subscribe({
  onError: (error, failureCount) => {
    console.error(`Error (${failureCount} failures):`, error.message)
    
    if (failureCount >= 3) {
      console.log('Connection lost, attempting to reconnect...')
      // Handle reconnection logic
    }
  }
})

try {
  await Bridge.actions.transport.play()
} catch (error) {
  console.error('Failed to play:', error.message)
}
```

---

## Architecture

### Design Patterns

- **Singleton:** Single Bridge instance shared across entire application
- **Event System:** Subscribe to connection and transport state changes
- **Automatic Polling:** Transport state polling starts/stops based on subscribers

### Communication Channels

reaper-bridge uses Reaper's Web Control Surface endpoints:

1. **Action Commands** (`/_/{actionID}`) - Execute Reaper actions
2. **Named Commands** (`/_/{command}`) - Execute commands with parameters  
3. **External State** (`/_/SET|GET/EXTSTATE/{ns}/{key}`) - Data storage
4. **OSC Triggers** (`/_/OSC/{address}`) - Trigger ReaScripts

---

## Requirements

### Runtime Requirements

- **Node.js:** 18+
- **Browser:** Modern browser with Fetch API support

### Reaper Requirements

- **Reaper:** 6.0+ (tested with 6.13+)
- **Web Control Surface:** Enabled on port 8080 (or configured port)
- **Network:** Reaper and client on same network (or accessible via IP)

### Optional Dependencies

- **Osworks.lua:** Required for project loading feature

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

### Polling Not Starting

**Cause:** No subscribers registered

**Solution:** Ensure at least one subscriber is active:

```typescript
const id = Bridge.subscribe({
  onTransport: (state) => console.log(state)
})
```

### Memory Leaks

**Cause:** Forgetting to unsubscribe

**Solution:** Always unsubscribe when done:

```typescript
const id = Bridge.subscribe(handlers)

// Later - cleanup
Bridge.unsubscribe(id)
```

---

## API Documentation

See the TypeScript definitions for complete API reference.

---

## Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/reaper-bridge.git
cd reaper-bridge

# Install dependencies
yarn install

# Build
yarn build

# Type check
yarn type-check

# Lint
yarn lint

# Format
yarn format
```

### Versioning Workflow

This project uses automated semantic versioning. Before committing changes that affect the API:

```bash
# Create a change file for your modifications
yarn change
```

Git hooks will automatically:
- Run type checking and linting before commits
- Verify change files exist before pushes (for code changes)

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed workflow information.

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

## Related Projects

- **[soloist](https://github.com/ozwild/soloist)** - Web app built with reaper-bridge for live performance control

---

## Acknowledgments

- [Reaper DAW](https://www.reaper.fm/) - Digital Audio Workstation
- [React](https://react.dev/) - UI framework
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
