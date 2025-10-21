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
  onTransport: (state) => console.log(state),
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
