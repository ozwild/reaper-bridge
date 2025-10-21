## Architecture

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

## Requirements

### Runtime Requirements

- **Node.js:** 18+
- **Browser:** Modern browser with Fetch API support

### Reaper Requirements

- **Reaper:** 6.0+ (tested with 6.13+)
- **Web Control Surface:** Enabled on port 8080 (or configured port)
- **Network:** Reaper and client on same network (or accessible via IP)

### Optional Dependencies

- **ReaperBridge.lua:** Required for project loading feature