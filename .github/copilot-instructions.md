# Copilot Instructions for reaper-bridge

**Last Updated:** October 21, 2025

This file provides context to GitHub Copilot about the reaper-bridge project architecture, conventions, and development practices.

---

## Project Overview

**reaper-bridge** is a TypeScript library that provides a clean, modern API for controlling Reaper DAW from JavaScript applications. It leverages Reaper's built-in Web Control Surface to enable remote control over HTTP.

### Key Features

- 🎯 **Singleton Pattern** - Single shared instance across your application
- 🔄 **State Subscriptions** - Subscribe to specific state types (transport, tracks, markers, etc.)
- ⚡ **Immediate/Queued Execution** - Dual execution modes for performance optimization
- 🎛️ **Multiple APIs** - Actions, commands, ExtState, and OSC support
- 🚀 **Simple API** - Easy initialization and configuration
- 📡 **Smart Polling** - Automatic polling based on active subscriptions
- 🔌 **Connection Management** - Connection state tracking and error handling
- 📝 **TypeScript** - Full type definitions included
- 🌐 **Framework Agnostic** - Works with any JavaScript framework

### Tech Stack

- **TypeScript 5** - Type-safe development
- **Rollup** - ESM/CommonJS dual build output
- **Beachball** - Automated semantic versioning
- **Husky** - Git hooks for quality control
- **ESLint + Prettier** - Code quality and formatting

---

## Architecture Principles

### Design Patterns

- **Singleton:** Single Bridge instance shared across entire application
- **State Subscriptions:** Fine-grained subscriptions to specific state types
- **Immediate/Queued Execution:** Dual execution modes for performance optimization
- **Smart Polling:** Automatic polling based on active state subscriptions

### Communication Channels

reaper-bridge uses Reaper's Web Control Surface endpoints:

1. **Action Commands** (`/_/{actionID}`) - Execute Reaper actions
2. **Named Commands** (`/_/{command}`) - Execute commands with parameters
3. **External State** (`/_/SET|GET/EXTSTATE/{ns}/{key}`) - Data storage
4. **OSC Triggers** (`/_/OSC/{address}`) - Trigger ReaScripts

### State Subscription System

The `StateSubscriptionManager` provides efficient, type-safe state management:

```typescript
// Subscribe to specific state types
const unsubscribe = Bridge.subscribeToState('transport', callback)

// Polling automatically includes only active subscriptions
// Transport + Tracks = "TRANSPORT;TRACK" in single request
// No subscriptions = No polling
```

**Available States:**

- `transport` - Play state, position
- `tracks` - Track mute/solo/volume states
- `markers` - Project markers
- `regions` - Project regions
- `beat` - Beat position information and time signature

---

## Code Style & Conventions

### TypeScript Patterns

**Strict typing with branded types:**

```typescript
// Use branded types for domain-specific values
type Volume = number // 0.0 to 1.0
type Pan = number // -1.0 to 1.0
type TrackIndex = number // 1-based track numbering

// Command builders with validation
export const REAPER_COMMANDS = {
  TRACK_SET_VOLUME: (index: TrackIndex, value: Volume) => {
    validate(value, 'volume')
    return `SET/TRACK/${index}/VOL/${value}`
  },
}
```

**Interface segregation:**

```typescript
// Separate interfaces for different concerns
export interface BridgeConfig {
  connection: {
    host: string
    port: string
    pollingInterval: number
    failureThreshold: number
  }
}

export interface EventHandlers {
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: Error, failureCount: number) => void
}
```

### Class Structure

**Singleton with private constructor:**

```typescript
export class ReaperAPI {
  private constructor(config?: ReaperAPIConfig) {
    // Private constructor for singleton pattern
  }

  // Factory method for initialization
  static create(config?: ReaperAPIConfig): ReaperAPI {
    return new ReaperAPI(config)
  }
}
```

**Composition over inheritance:**

```typescript
export class ReaperAPI {
  private stateManager = new StateSubscriptionManager()
  private commandQueue: CommandQueueItem[] = []

  // Methods delegate to composed objects
  subscribeToState<T extends StateType>(
    stateType: T,
    callback: StateSubscriptionCallback<T>
  ): () => void {
    return this.stateManager.subscribe(stateType, callback)
  }
}
```

### Error Handling

**Custom error types:**

```typescript
export class ReaperBridgeError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ReaperBridgeError'
  }
}

export class ReaperBridgeWarning extends Error {
  constructor(
    message: string,
    public readonly context?: unknown
  ) {
    super(message)
    this.name = 'ReaperBridgeWarning'
  }
}
```

**Graceful degradation:**

```typescript
try {
  const response = await this.sendCommandDirect(command)
  // Success handling
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err))
  this.handleConnectionFailure(error)
  throw new ReaperBridgeError(`Command failed: ${error.message}`)
}
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
await Bridge.requests.executeAction(REAPER_ACTIONS.STOP, true)
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

## State Management

### State Subscription Manager

**Fine-grained subscriptions:**

```typescript
export class StateSubscriptionManager {
  private subscriptions = new Map<
    StateType,
    Set<StateSubscriptionCallback<any>>
  >()
  private activeStates = new Set<StateType>()
  private currentState: StateData = {
    transport: null,
    tracks: null,
    markers: null,
    regions: null,
    beat: null,
  }

  subscribe<T extends StateType>(
    stateType: T,
    callback: StateSubscriptionCallback<T>
  ): () => void {
    // Implementation with automatic cleanup
  }
}
```

**Type-safe state handling:**

```typescript
export type StateSubscriptionCallback<T extends StateType> = (
  state: StateData[T]
) => void

// Usage
const unsubscribe = Bridge.subscribeToState('transport', (state) => {
  // state is typed as TransportStateResponse | null
  if (state?.isPlaying) {
    console.log('Playing!')
  }
})
```

### Smart Polling

**Adaptive polling based on subscriptions:**

```typescript
getPollingCommands(): string[] {
  const commands: string[] = []

  this.activeStates.forEach((stateType) => {
    switch (stateType) {
      case 'transport':
        commands.push(REAPER_COMMANDS.TRANSPORT_GET_STATE)
        break
      case 'tracks':
        commands.push(REAPER_COMMANDS.TRACK_LIST)
        break
      // ... other states
    }
  })

  return commands // ["TRANSPORT", "TRACK"] → single "TRANSPORT;TRACK" request
}
```

---

## Command System

### Command Builders

**Type-safe command construction:**

```typescript
export const REAPER_COMMANDS = {
  // Transport commands
  TRANSPORT_GET_STATE: 'TRANSPORT',

  // Position commands with validation
  POSITION_GOTO_SECONDS: (position: number) => `SET/POSITION/${position}`,

  // Track commands with parameter validation
  TRACK_SET_VOLUME: (index: number, value: Volume) => {
    validate(value, 'volume')
    return `SET/TRACK/${index}/VOL/${value}`
  },

  // ExtState with proper encoding
  EXT_STATE_SET: (namespace: string, key: string, value: string) =>
    `SET/EXTSTATE/${namespace}/${key}/${encodeURIComponent(value)}`,
}
```

### Action IDs

**Named constants for Reaper actions:**

```typescript
export enum REAPER_ACTIONS {
  PLAY_PAUSE = '40328',
  PLAY = '40044',
  STOP = '1016',
  RECORD = '1013',
  PAUSE = '1008',
  TOGGLE_LOOP = '1068',
  TOGGLE_MASTER_MUTE = '14',
  GOTO_PROJECT_START = '40042',
  GOTO_PREVIOUS_MARKER = '40172',
  GOTO_NEXT_MARKER = '40173',
}
```

---

## API Design

### Bridge Singleton

**Factory API for all operations:**

```typescript
const Bridge = {
  // Configuration
  configure(config: BridgeConfig): void,
  init(config?: BridgeConfig): ReaperAPI,

  // State
  isReady(): boolean,
  isConnected(): boolean,

  // Subscriptions
  subscribe(handlers: EventHandlers): number,
  unsubscribe(id: number): void,
  subscribeToState<T extends StateType>(
    stateType: T,
    callback: StateSubscriptionCallback<T>
  ): () => void,

  // Actions (high-level, immediate by default)
  actions: {
    transport: { play(): Promise<void>, stop(): Promise<void>, /* ... */ },
    tracks: { toggleMute(index: number): Promise<void>, /* ... */ },
    // ...
  },

  // Requests (low-level, queued by default)
  requests: {
    sendCommand(cmd: string, immediate?: boolean): Promise<string>,
    executeAction(actionId: REAPER_ACTIONS, immediate?: boolean): Promise<void>,
    extState: { get(ns: string, key: string): Promise<ExtStateResponse | null> },
    // ...
  },

  // Queue management
  queue: {
    flush(): Promise<void>,
    clear(): void,
    get length(): number,
  },
}
```

### Response Parsing

**Structured response handling:**

```typescript
export interface TransportStateResponse {
  isPlaying: boolean
  isRecording: boolean
  isPaused: boolean
  position: {
    seconds: number
    beats: number
    measure: number
    beat: number
    tick: number
  }
}

export interface TrackStateResponse {
  index: number
  name: string
  isMuted: boolean
  isSoloed: boolean
  volume: number
  pan: number
  // ... more properties
}
```

---

## Development Workflow

### Versioning with Beachball

**Automated semantic versioning:**

```bash
# Before committing API changes
yarn change  # Creates change file for versioning

# Select change type: patch/minor/major
# Write description for changelog

# Commit and push - hooks verify change files exist
```

### Git Hooks

**Quality control automation:**

```json
// package.json
{
  "scripts": {
    "pre-commit": "yarn type-check && yarn lint",
    "pre-push": "yarn change:check"
  }
}
```

### Build Process

**Dual output with Rollup:**

```javascript
// rollup.config.js
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.esm.js', format: 'esm' },
    { file: 'dist/index.cjs.js', format: 'cjs' },
  ],
  plugins: [typescript({ declaration: true }), terser()],
}
```

---

## Common Patterns

### Initialization

**Proper singleton setup:**

```typescript
// Configure defaults (optional)
Bridge.configure({
  connection: {
    host: '192.168.1.36',
    port: '8080',
    pollingInterval: 250,
  },
})

// Initialize singleton
Bridge.init()

// Verify connection (automatic verification starts immediately)
// Connection status is verified automatically on init
// Users can check isConnected() immediately, though verification may still be in progress
console.log('Ready:', Bridge.isReady())
console.log('Connected:', Bridge.isConnected())

// Optional: Check if initial connection verification is complete
const api = Bridge.getInstance()
if (api.isConnectionVerified()) {
  // Connection verification complete (either connected or failed)
}
```

**Automatic Connection Verification:**

When Bridge initializes, it automatically attempts to verify connectivity with Reaper:

1. **Immediate Test**: Sends a connection test request on `init()`
2. **Retry Logic**: If connection fails, retries up to `failureThreshold` times
3. **Interval**: Retries use the configured `pollingInterval` between attempts
4. **Handles Late Startup**: Works when Reaper starts after the page loads
5. **Failure Threshold**: After `failureThreshold` failures, stops retrying until refresh
6. **Initial States**: If successful initial states are retrieved for all subscribable states

This ensures `Bridge.isConnected()` reflects actual connectivity status without requiring manual user interaction.

### State Subscriptions

**Efficient state management:**

```typescript
// Subscribe to transport state
const unsubscribeTransport = Bridge.subscribeToState('transport', (state) => {
  if (state) {
    updateUI(state.isPlaying, state.position.seconds)
  }
})

// Subscribe to tracks with error handling
const unsubscribeTracks = Bridge.subscribeToState('tracks', (tracks) => {
  if (!tracks) {
    console.warn('No track data available')
    return
  }
  tracks.forEach((track) => updateTrackUI(track))
})

// Cleanup
unsubscribeTransport()
unsubscribeTracks()
```

### Immediate vs Queued Execution

**Performance optimization:**

```typescript
// Immediate for UI responsiveness
await Bridge.actions.transport.play() // User clicked play button

// Queued for bulk operations
await Bridge.requests.executeCommand('SET/TRACK/1/VOL/0.8', false)
await Bridge.requests.executeCommand('SET/TRACK/2/VOL/0.8', false)
await Bridge.requests.executeCommand('SET/TRACK/3/VOL/0.8', false)

// Flush queue when needed
await Bridge.queue.flush()
```

### Error Handling

**Robust error management:**

```typescript
const connectionId = Bridge.subscribe({
  onConnectionChange: (connected) => {
    console.log('Connection:', connected ? '✅' : '❌')
  },
  onError: (error, failureCount) => {
    if (failureCount >= 3) {
      showOfflineUI()
    }
    console.error(`Error ${failureCount}:`, error.message)
  },
})

// Cleanup
Bridge.unsubscribe(connectionId)
```

---

## Testing Strategy

### Unit Testing

**Test command builders and validation:**

```typescript
describe('REAPER_COMMANDS', () => {
  test('TRACK_SET_VOLUME validates range', () => {
    expect(() => REAPER_COMMANDS.TRACK_SET_VOLUME(1, 1.5)).toThrow()
    expect(REAPER_COMMANDS.TRACK_SET_VOLUME(1, 0.8)).toBe('SET/TRACK/1/VOL/0.8')
  })
})
```

### Integration Testing

**Test with mock Reaper server:**

```typescript
describe('Bridge integration', () => {
  let mockServer: MockReaperServer

  beforeEach(() => {
    mockServer = new MockReaperServer()
    Bridge.init({ connection: { host: 'localhost', port: mockServer.port } })
  })

  test('transport play command', async () => {
    mockServer.expectCommand('40044') // PLAY action ID
    await Bridge.actions.transport.play()
    expect(mockServer.lastCommand).toBe('40044')
  })
})
```

---

## File Structure

```
src/
├── index.ts              # Main exports
├── Bridge.ts             # Singleton factory API
├── ReaperAPI.ts          # Core implementation
├── StateSubscriptionManager.ts  # State management
├── commands.ts           # Command builders and action IDs
├── responseParser.ts     # Response parsing logic
├── config.ts             # Configuration types and defaults
├── constants.ts          # Shared constants and regex
├── helpers.ts            # Utility functions
└── ReaperBridgeError.ts  # Custom error types

docs/
├── ARCHITECTURE.md       # System architecture
├── DEVELOPMENT.md        # Development workflow
└── TROUBLESHOOTING.md    # Common issues and solutions
```

---

## When Writing Code

### ✅ Do:

- Use TypeScript strict mode with branded types
- Follow singleton pattern for Bridge instance
- Implement proper error handling with custom error types
- Use composition over inheritance
- Write comprehensive type definitions
- Validate command parameters
- Use immediate execution for UI interactions
- Use queued execution for bulk operations
- Implement proper cleanup for subscriptions
- Add JSDoc comments for public APIs
- Follow semantic versioning with change files

### ❌ Avoid:

- Direct instantiation of ReaperAPI (use Bridge.init())
- Global state outside the singleton
- Synchronous operations (everything is async)
- Magic numbers (use named constants)
- Any operations without error handling
- Large monolithic functions
- Tight coupling between components
- Breaking changes without change files

---

## Example: Adding a New Feature

```typescript
// 1. Add command to commands.ts
export const REAPER_COMMANDS = {
  // ... existing commands
  TRACK_SET_NAME: (index: number, name: string) =>
    `SET/TRACK/${index}/NAME/${encodeURIComponent(name)}`,
}

// 2. Add action to Bridge.ts actions
tracks: {
  // ... existing actions
  async setName(trackIndex: number, name: string): Promise<void> {
    await getInstance().executeCommandImmediate(
      REAPER_COMMANDS.TRACK_SET_NAME(trackIndex, name)
    )
  },
}

// 3. Add to response parser if needed
export interface TrackStateResponse {
  // ... existing properties
  name: string
}

// 4. Update JSDoc and types
// 5. Add tests
// 6. Update documentation
// 7. Create change file: yarn change
```

---

**For detailed information, see `/docs` directory.**

This library is designed for high-performance, type-safe control of Reaper DAW from modern JavaScript applications, with particular focus on live performance and studio automation scenarios.
