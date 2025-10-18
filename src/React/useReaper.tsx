import { useState, useEffect, useRef } from 'react'

import Bridge, { EventHandlers } from '../Bridge.js'

import type { TransportStateResponse } from '../responseParser.js'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export type UseReaperHookProps = EventHandlers & {
  // EventHandlers already includes onConnectionChange, onError, onTransport
}

export interface UseReaperResult {
  // Bridge API
  configure: typeof Bridge.configure
  getDefaultConfig: typeof Bridge.getDefaultConfig
  init: typeof Bridge.init
  isReady: typeof Bridge.isReady
  subscribe: typeof Bridge.subscribe
  unsubscribe: typeof Bridge.unsubscribe
  updateSubscriber: typeof Bridge.updateSubscriber
  requests: typeof Bridge.requests
  actions: typeof Bridge.actions
  getInstance: typeof Bridge.getInstance

  // Hook state
  isConnected: boolean
  transportState: TransportStateResponse
  error: string | null
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * Custom React hook for managing Reaper connection and state
 * Uses the Bridge singleton instance shared across all components
 *
 * IMPORTANT: Bridge must be initialized before using this hook.
 * Call Bridge.configure() and Bridge.init() in your app entry point.
 *
 * @example
 * // In your app entry (before React render):
 * import {Bridge} from './reaper-bridge/Bridge'
 * Bridge.configure({ host: 'localhost', port: 8080 })
 * Bridge.init()
 *
 * // Then use the hook in components:
 * function MyComponent() {
 *   const { actions, isConnected } = useReaper()
 *   // ...
 * }
 */
export const useReaper = ({
  onConnectionChange,
  onError,
  onTransport,
}: UseReaperHookProps = {}): UseReaperResult => {
  const [isConnected, setIsConnected] = useState<boolean>(Bridge.isConnected())
  const [transportState, setTransportState] = useState<TransportStateResponse>({
    playstate: 0,
    position: { seconds: 0, string: '00:00.00', bars: '1.1.00' },
    source: [],
    isPlaying: false,
    isRecording: false,
    isLooping: false,
  })
  const [error, setError] = useState<string | null>(null)
  const subscriberIdRef = useRef<number | null>(null)

  // Warn if Bridge not initialized
  useEffect(() => {
    if (!Bridge.isReady()) {
      // eslint-disable-next-line no-console
      console.warn(
        'useReaper: Bridge not initialized. Call Bridge.configure() and Bridge.init() before rendering components that use useReaper().'
      )
    }
  }, [])

  // Subscribe to Bridge events
  useEffect(() => {
    const handlers: EventHandlers = {
      onConnectionChange: (connected: boolean) => {
        setIsConnected(connected)
        if (!connected) {
          setError('Disconnected from Reaper')
        } else {
          setError(null)
        }
        if (onConnectionChange) {
          onConnectionChange(connected)
        }
      },

      onError: (err: Error, failureCount: number) => {
        const instance = Bridge.getInstance()
        if (failureCount >= instance.failureThreshold) {
          setError(`Connection failed: ${err.message}`)
        }
        if (onError) {
          onError(err, failureCount)
        }
      },

      onTransport: (response) => {
        if (!response) return

        setTransportState(response)

        if (onTransport) {
          onTransport(response)
        }
      },
    }

    if (subscriberIdRef.current !== null) {
      Bridge.updateSubscriber(subscriberIdRef.current, handlers)
    } else {
      const id = Bridge.subscribe(handlers)
      subscriberIdRef.current = id
    }

    // Cleanup on unmount
    return () => {
      if (subscriberIdRef.current !== null) {
        Bridge.unsubscribe(subscriberIdRef.current)
      }
    }
  }, [onConnectionChange, onError, onTransport])

  return {
    // Spread Bridge API for direct access
    ...Bridge,

    // State
    isConnected,
    transportState,
    error,
  }
}
