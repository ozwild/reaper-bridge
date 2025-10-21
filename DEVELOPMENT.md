# Development Workflow

## Architecture Overview

This branch introduces significant enhancements to reaper-bridge:

### State Subscriptions

Fine-grained state management with the `StateSubscriptionManager`:

```typescript
// Subscribe to specific state types
const unsubscribe = Bridge.subscribeToState('transport', (state) => {
  // Handle transport state changes
})

const unsubscribeTracks = Bridge.subscribeToState('tracks', (tracks) => {
  // Handle track state changes  
})
```

**Benefits:**
- Only poll for data you actually need
- Type-safe state handling
- Automatic subscription cleanup
- Efficient batched polling

### Immediate vs Queued Execution

Dual execution modes for optimal performance:

```typescript
// Immediate - for responsive UI interactions
await Bridge.actions.transport.play()
await Bridge.requests.executeAction(ACTION_ID.STOP, true)

// Queued - for efficiency and batching  
await Bridge.requests.executeAction(ACTION_ID.BACKGROUND_ACTION)
await Bridge.requests.executeCommand(command, false)
```

**Benefits:**
- Responsive user interfaces
- Efficient network usage
- Reduced Reaper load
- Flexible execution control

### Smart Polling

Polling automatically adapts based on active subscriptions:

- **No subscriptions** = No polling
- **Transport only** = `GET /_/TRANSPORT`
- **Transport + Tracks** = `GET /_/TRANSPORT;TRACK`
- **All states** = `GET /_/TRANSPORT;TRACK;MARKER;REGION;BEATPOS`

## Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage git hooks:

- **Pre-commit**: Runs TypeScript type checking and ESLint to ensure code quality
- **Pre-push**: Runs beachball check to ensure change files exist for versioning

## Versioning with Beachball

We use [Beachball](https://microsoft.github.io/beachball/) for automated semantic versioning and changelog generation.

### Before Making Changes

No special setup required - just start coding!

### Before Committing/Pushing

When you have changes that affect the public API or add features:

1. **Run the change command**:
   ```bash
   yarn change
   ```

2. **Select the appropriate change type**:
   - `patch` - Bug fixes, small improvements (0.1.0 → 0.1.1)
   - `minor` - New features, backwards compatible (0.1.0 → 0.2.0)
   - `major` - Breaking changes (0.1.0 → 1.0.0)

3. **Write a clear description** of your changes for the changelog

4. **Commit and push** - the pre-push hook will verify everything is ready

### Available Scripts

- `yarn change` - Create a change file for your modifications
- `yarn change:check` - Check if change files are needed (runs automatically on pre-push)
- `yarn version` - Bump version and generate changelog (typically done during releases)
- `yarn release` - Publish to npm (for maintainers)

### When Change Files Are NOT Needed

- Documentation updates
- Internal refactoring that doesn't change the API
- Build/tooling changes that don't affect consumers
- Test updates

The pre-push hook will let you know if a change file is required based on the actual code changes detected.

## Development Patterns

### Working with State Subscriptions

```typescript
// Subscribe to multiple state types
const unsubscribeTransport = Bridge.subscribeToState('transport', (state) => {
  if (state) {
    updateTransportUI(state)
  }
})

const unsubscribeTracks = Bridge.subscribeToState('tracks', (tracks) => {
  if (tracks) {
    updateTrackList(tracks)
  }
})

// Cleanup in component unmount/cleanup
useEffect(() => {
  return () => {
    unsubscribeTransport()
    unsubscribeTracks()
  }
}, [])
```

### Immediate Execution for UI

```typescript
// Always use immediate execution for user interactions
const handlePlayClick = async () => {
  try {
    // Immediate execution provides instant feedback
    await Bridge.actions.transport.play()
    
    // Update UI immediately with cached state
    const currentState = Bridge.getCurrentState('transport')
    updatePlayButton(currentState?.isPlaying)
  } catch (error) {
    showErrorToUser(error.message)
  }
}
```

### Queued Execution for Bulk Operations

```typescript
// Use queued execution for background tasks
const setupProject = async () => {
  // These can be batched together
  await Bridge.requests.executeCommand('SET/UNDO_BEGIN', false)
  await Bridge.requests.executeAction(ACTION_ID.SELECT_ALL_TRACKS, false)
  await Bridge.requests.executeCommand('SET/TRACK_VOLUME/0.8', false)
  await Bridge.requests.executeCommand('SET/UNDO_END', false)
  
  // Final immediate command to trigger UI update
  await Bridge.requests.requestData('TRACK')
}
```

### Error Handling Patterns

```typescript
// Robust error handling with state subscriptions
const setupStateHandling = () => {
  const unsubscribe = Bridge.subscribeToState('transport', (state) => {
    if (state === null) {
      // Handle missing/invalid state
      showConnectionWarning()
      return
    }
    
    // State is valid
    updateUI(state)
  })
  
  const connectionId = Bridge.subscribe({
    onError: (error, failureCount) => {
      if (failureCount >= 3) {
        showOfflineMode()
      }
    }
  })
  
  return () => {
    unsubscribe()
    Bridge.unsubscribe(connectionId)
  }
}
```