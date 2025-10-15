import { ReaperAPI } from './ReaperAPI'
import { TRANSPORT, MASTER, POSITION } from './commands'

// ============================================================================
// Singleton Instance & Factory
// ============================================================================

let instance = null

// ============================================================================
// Subscription Management
// ============================================================================

const subscribers = new Map()
let subscriberIdCounter = 0
let isPollingActive = false

/**
 * Ensure the singleton instance exists
 * @private
 * @returns {ReaperAPI} The singleton instance
 * @throws {Error} If instance is not initialized
 */
function ensureInstance() {
  if (!instance) {
    throw new Error(
      'Bridge not initialized. Call Bridge.init(config) before using.'
    )
  }
  return instance
}

/**
 * Initialize singleton handlers to broadcast to all subscribers
 * @private
 */
function initializeHandlers() {
  const inst = ensureInstance()

  // Connection state changes
  inst.setConnectionHandler((connected) => {
    subscribers.forEach((subscriber) => {
      if (subscriber.onConnectionChange) {
        subscriber.onConnectionChange(connected)
      }
    })
  })

  // Error handling
  inst.setErrorHandler((err, failureCount) => {
    subscribers.forEach((subscriber) => {
      if (subscriber.onError) {
        subscriber.onError(err, failureCount)
      }
    })
  })
}

/**
 * Start polling if not already active
 * @private
 */
function ensurePolling() {
  if (!isPollingActive && subscribers.size > 0) {
    const inst = ensureInstance()
    isPollingActive = true

    inst.startPolling((response) => {
      // Broadcast to all subscribers
      subscribers.forEach((subscriber) => {
        if (subscriber.onTransport) {
          subscriber.onTransport(response)
        }
      })
    })
  }
}

/**
 * Stop polling if no more subscribers
 * @private
 */
function stopPollingIfUnused() {
  if (subscribers.size === 0 && isPollingActive) {
    const inst = ensureInstance()
    isPollingActive = false
    inst.stopPolling()
  }
}

/**
 * Subscribe to instance events
 * @param {Object} handlers - Event handlers { onConnectionChange?, onError?, onTransport? }
 * @returns {number} subscriberId - Use this to unsubscribe
 */
function subscribe(handlers = {}) {
  const id = subscriberIdCounter++
  subscribers.set(id, handlers)

  // Start polling if needed
  ensurePolling()

  return id
}

/**
 * Unsubscribe from instance events
 * @param {number} id - Subscriber ID returned from subscribe()
 */
function unsubscribe(id) {
  subscribers.delete(id)
  stopPollingIfUnused()
}

/**
 * Update a subscriber's handlers
 * @param {number} id - Subscriber ID
 * @param {Object} handlers - New handlers
 */
function updateSubscriber(id, handlers) {
  if (subscribers.has(id)) {
    subscribers.set(id, handlers)
  }
}

// ============================================================================
// Public API (Factory Pattern)
// ============================================================================

/**
 * Bridge Factory - Singleton API for interacting with Reaper
 *
 * Usage:
 *   import Bridge from './Bridge'
 *
 *   // Initialize once (typically in app startup)
 *   Bridge.init({ host: 'localhost', port: 8080 })
 *
 *   // Or configure with a custom default config
 *   Bridge.configure(myDefaultConfig)
 *   Bridge.init()  // Uses configured defaults
 *
 *   // Subscribe to events
 *   const id = Bridge.subscribe({ onTransport: handleTransport })
 *
 *   // Use actions
 *   await Bridge.actions.transport.play()
 *
 *   // Cleanup
 *   Bridge.unsubscribe(id)
 */

// Default configuration (can be overridden via configure())
let defaultConfig = null

const Bridge = {
  /**
   * Set default configuration for Bridge
   * Call this before init() to provide default settings
   * @param {Object} config - Default configuration object
   */
  configure(config) {
    defaultConfig = config
  },

  /**
   * Get current default configuration
   * @returns {Object|null} Current default config
   */
  getDefaultConfig() {
    return defaultConfig
  },

  /**
   * Initialize the Bridge singleton
   * @param {Object} config - Configuration for ReaperAPI (optional if configure() was called)
   * @returns {ReaperAPI} The singleton instance
   */
  init(config) {
    // Use provided config, or fall back to default config
    const finalConfig = config || defaultConfig || {}

    if (!instance) {
      instance = new ReaperAPI(finalConfig)
      initializeHandlers()
    }
    return instance
  },

  /**
   * Check if Bridge is initialized
   * @returns {boolean}
   */
  isReady() {
    return instance !== null
  },

  /** Is Bridge currently connected to Reaper */
  isConnected() {
    return ensureInstance().isConnected
  },

  /**
   * Subscribe to Bridge events
   * @param {Object} handlers - Event handlers { onConnectionChange?, onError?, onTransport? }
   * @returns {number} subscriberId - Use this to unsubscribe
   */
  subscribe(handlers = {}) {
    return subscribe(handlers)
  },

  /**
   * Unsubscribe from Bridge events
   * @param {number} id - Subscriber ID returned from subscribe()
   */
  unsubscribe(id) {
    unsubscribe(id)
  },

  /**
   * Update a subscriber's handlers
   * @param {number} id - Subscriber ID
   * @param {Object} handlers - New handlers
   */
  updateSubscriber(id, handlers) {
    updateSubscriber(id, handlers)
  },

  /**
   * Direct request methods
   */
  requests: {
    /**
     * Send a raw command to Reaper
     * @param {string} cmd - Command string
     * @returns {Promise<string>}
     */
    command(cmd) {
      return ensureInstance().command(cmd)
    },

    /**
     * Execute a Reaper action by ID
     * @param {string|number} actionId - Reaper action ID
     * @returns {Promise<string>}
     */
    action(actionId) {
      return ensureInstance().action(actionId)
    },

    /**
     * ExtState operations
     */
    extState: {
      /**
       * Get an extstate value
       * @param {string} namespace - ExtState namespace
       * @param {string} key - ExtState key
       * @returns {Promise<string>}
       */
      get(namespace, key) {
        return ensureInstance().getExtState(namespace, key)
      },

      /**
       * Set an extstate value
       * @param {string} namespace - ExtState namespace
       * @param {string} key - ExtState key
       * @param {string} value - Value to set
       * @returns {Promise<string>}
       */
      set(namespace, key, value) {
        return ensureInstance().setExtState(namespace, key, value)
      },
    },

    /**
     * OSC operations
     */
    OSC: {
      /**
       * Trigger an OSC message
       * @param {string} address - OSC address
       * @param {*} arg - OSC argument
       * @param {boolean} useStringArg - Whether to use string argument
       * @returns {Promise<string>}
       */
      trigger(address, arg, useStringArg) {
        return ensureInstance().triggerOSC(address, arg, useStringArg)
      },
    },
  },

  /**
   * High-level action shortcuts
   */
  actions: {
    transport: {
      play() {
        return ensureInstance().action(TRANSPORT.PLAY)
      },
      pause() {
        return ensureInstance().action(TRANSPORT.PAUSE)
      },
      async stop() {
        const inst = ensureInstance()
        await inst.action(TRANSPORT.STOP)
        return await inst.action(POSITION.GOTO_START)
      },
      playPause() {
        return ensureInstance().action(TRANSPORT.PLAY_PAUSE)
      },
      record() {
        return ensureInstance().action(TRANSPORT.RECORD)
      },
      toggleLoop() {
        return ensureInstance().action(TRANSPORT.TOGGLE_LOOP)
      },
      getState() {
        return ensureInstance().getTransportState()
      },
    },

    position: {
      goToStart() {
        return ensureInstance().action(POSITION.GOTO_START)
      },
      goToPreviousMarker() {
        return ensureInstance().action(POSITION.GOTO_PREVIOUS_MARKER)
      },
      goToNextMarker() {
        return ensureInstance().action(POSITION.GOTO_NEXT_MARKER)
      },
    },

    master: {
      mute() {
        return ensureInstance().action(MASTER.MUTE)
      },
    },

    project: {
      /**
       * Load a Reaper project
       * @param {string} filename - Full path to project file
       * @returns {Promise<string>}
       */
      load(filename) {
        const inst = ensureInstance()
        const argument = `open_project|${encodeURIComponent(filename)}`
        return inst.triggerOSC('osworks', argument, true)
      },
    },
  },

  /**
   * Connection management
   */
  connection: {
    /**
     * Update connection settings
     * @param {string} host - Reaper host
     * @param {number} port - Reaper port
     */
    update(host, port) {
      return ensureInstance().updateConnection(host, port)
    },

    /**
     * Get current connection info
     * @returns {Object} Connection details
     */
    getInfo() {
      return ensureInstance().getConnectionInfo()
    },

    /**
     * Test connection to Reaper
     * @returns {Promise<boolean>}
     */
    test() {
      return ensureInstance().testConnection()
    },
  },

  /**
   * Get the singleton instance (for advanced usage)
   * @returns {ReaperAPI}
   */
  getInstance() {
    return ensureInstance()
  },
}

export default Bridge
