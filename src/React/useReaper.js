import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import Bridge from '../Bridge.js'

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
 * import Bridge from './reaper-bridge/Bridge'
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
} = {}) => {
  const [isConnected, setIsConnected] = useState(Bridge.isConnected())
  const [transportState, setTransportState] = useState({
    playstate: 0,
    positionSeconds: '00:00.000',
    positionBars: '1.1.00',
    isPlaying: false,
    isRecording: false,
    isLooping: false,
  })
  const [error, setError] = useState(null)
  const subscriberIdRef = useRef(null)

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
    const handlers = {
      onConnectionChange: (connected) => {
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

      onError: (err, failureCount) => {
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

useReaper.propTypes = {
  onConnectionChange: PropTypes.func,
  onError: PropTypes.func,
  onTransport: PropTypes.func,
}
