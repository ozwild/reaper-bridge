import { ReaperAPI } from './ReaperAPI.js'
import { ACTION_ID, NAMED_ACTION } from './commands.js'
import { parseMultiResponse, parseTrackResponse } from './responseParser.js'
import { DEFAULT_CONFIG } from './config.js'

import type { ReaperAPIConfig } from './config.js'
import type { ConnectionInfo } from './ReaperAPI.js'
import type {
  ExtStateResponse,
  ParsedResponse,
  TrackStateResponse,
  TransportStateResponse,
} from './responseParser.js'
import { ReaperBridgeError } from './ReaperBridgeError.js'

export type BridgeConfig = ReaperAPIConfig

export interface EventHandlers {
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: Error, failureCount: number) => void
  onTransport?: (response: TransportStateResponse) => void
}

// ============================================================================
// Singleton Instance & Factory
// ============================================================================

let instance: ReaperAPI | null = null

// ============================================================================
// Subscription Management
// ============================================================================

const subscribers = new Map<number, EventHandlers>()
let subscriberIdCounter = 0
let isPollingActive = false

/**
 * Ensure the singleton instance exists
 * @private
 */
function getInstance(): ReaperAPI {
  if (!instance) {
    throw new ReaperBridgeError(
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
  const inst = getInstance()

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
    const inst = getInstance()
    isPollingActive = true

    inst.startPolling((response) => {
      // Broadcast to all subscribers
      subscribers.forEach((subscriber) => {
        if (subscriber.onTransport && response) {
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
    const inst = getInstance()
    isPollingActive = false
    inst.stopPolling()
  }
}

/**
 * Subscribe to instance events
 * @param handlers - Event handlers { onConnectionChange?, onError?, onTransport? }
 * @returns subscriberId - Use this to unsubscribe
 */
function subscribe(handlers: EventHandlers = {}): number {
  const id = subscriberIdCounter++
  subscribers.set(id, handlers)

  // Start polling if needed
  ensurePolling()

  return id
}

/**
 * Unsubscribe from instance events
 * @param id - Subscriber ID returned from subscribe()
 */
function unsubscribe(id: number): void {
  subscribers.delete(id)
  stopPollingIfUnused()
}

/**
 * Update a subscriber's handlers
 * @param id - Subscriber ID
 * @param handlers - New handlers
 */
function updateSubscriber(id: number, handlers: EventHandlers): void {
  if (subscribers.has(id)) {
    subscribers.set(id, handlers)
  }
}

// Default configuration (can be overridden via configure())
let defaultConfig: BridgeConfig | null = null

const Bridge = {
  /**
   * Set default configuration for Bridge
   * Call this before init() to provide default settings
   */
  configure(config: BridgeConfig): void {
    defaultConfig = config
  },

  /**
   * Get current default configuration
   */
  getDefaultConfig(): BridgeConfig | null {
    return defaultConfig
  },

  /**
   * Initialize the Bridge singleton
   */
  init(config?: BridgeConfig): ReaperAPI {
    // Use provided config, or fall back to default config
    const finalConfig = config || defaultConfig || DEFAULT_CONFIG

    if (!instance) {
      instance = new ReaperAPI(finalConfig)
      initializeHandlers()
    }
    return instance
  },

  /**
   * Check if Bridge is initialized
   */
  isReady(): boolean {
    return instance !== null
  },

  /** Is Bridge currently connected to Reaper */
  isConnected(): boolean {
    return getInstance().isConnected
  },

  /**
   * Subscribe to Bridge events. Returns a subscriber ID for later unsubscription
   */
  subscribe(handlers: EventHandlers = {}): number {
    return subscribe(handlers)
  },

  /**
   * Unsubscribe from Bridge events. Requires the subscriber ID returned from subscribe()
   */
  unsubscribe(id: number): void {
    unsubscribe(id)
  },

  /**
   * Update a subscriber's handlers. Requires the subscriber ID returned from subscribe()
   */
  updateSubscriber(id: number, handlers: EventHandlers): void {
    updateSubscriber(id, handlers)
  },

  /**
   * Direct request methods
   */
  requests: {
    /**
     * Send a raw command to Reaper and returns the raw response text
     */
    sendCommand(cmd: string): Promise<string> {
      return getInstance().sendCommand(cmd)
    },

    /**
     * Execute a Reaper action by ID
     * Most common actions are available in the ACTION_ID enum
     * Look up action IDs in Reaper's Action List
     */
    action(actionId: ACTION_ID): Promise<void> {
      return getInstance().action(actionId)
    },

    /**
     * Execute a named action by string
     * Most common actions are available in the NAMED_ACTION enum
     */
    namedAction(action: string): Promise<ParsedResponse | null> {
      return getInstance().namedAction(action)
    },

    extState: {
      get(namespace: string, key: string): Promise<ExtStateResponse | null> {
        return getInstance().getExtState(namespace, key)
      },

      async set(namespace: string, key: string, value: string): Promise<void> {
        await getInstance().setExtState(namespace, key, value)
      },
    },

    OSC: {
      /**
       * Trigger an OSC event
       */
      async trigger(
        address: string,
        arg: string | number | null = null,
        argIsString?: boolean
      ): Promise<void> {
        await getInstance().triggerOSC(address, arg, argIsString)
      },
    },
  },

  /**
   * High-level action shortcuts
   */
  actions: {
    transport: {
      play: (): Promise<void> => getInstance().action(ACTION_ID.PLAY),
      pause: (): Promise<void> => getInstance().action(ACTION_ID.PAUSE),
      async stop(): Promise<void> {
        const reaper = getInstance()
        await reaper.action(ACTION_ID.STOP)
        await reaper.action(ACTION_ID.GOTO_PROJECT_START)
      },
      playPause: (): Promise<void> =>
        getInstance().action(ACTION_ID.PLAY_PAUSE),
      record: (): Promise<void> => getInstance().action(ACTION_ID.RECORD),
      toggleLoop: (): Promise<void> =>
        getInstance().action(ACTION_ID.TOGGLE_LOOP),
      getState: (): Promise<TransportStateResponse | null> =>
        getInstance().getTransportState(),
    },

    position: {
      goToStart(): Promise<void> {
        return getInstance().action(ACTION_ID.GOTO_PROJECT_START)
      },

      goToPreviousMarker(): Promise<void> {
        return getInstance().action(ACTION_ID.GOTO_PREVIOUS_MARKER)
      },

      goToNextMarker(): Promise<void> {
        return getInstance().action(ACTION_ID.GOTO_NEXT_MARKER)
      },

      async goToTime(position: number): Promise<void> {
        await getInstance().namedAction(
          NAMED_ACTION.POSITION_GOTO_SECONDS(position)
        )
      },
    },

    master: {
      toggleMute: (): Promise<void> =>
        getInstance().action(ACTION_ID.TOGGLE_MASTER_MUTE),
    },

    tracks: {
      async getAll(): Promise<TrackStateResponse[] | null> {
        const reaper = getInstance()
        // We use sendCommand here to get the raw response text for multi-response parsing
        const responseText = await reaper.sendCommand(NAMED_ACTION.TRACK_LIST)
        if (responseText === null) return null
        return parseMultiResponse(responseText, parseTrackResponse)
      },

      async getTrack(trackNumber: number): Promise<TrackStateResponse | null> {
        const reaper = getInstance()
        const response = await reaper.namedAction(
          NAMED_ACTION.TRACK_GET_STATE(trackNumber)
        )
        if (response === null) return null
        return parseTrackResponse(response)
      },
    },

    project: {
      load(filename: string): Promise<void> {
        const reaper = getInstance()
        // const argument = `open_project|${encodeURIComponent(filename)}`
        // @TODO: make OSC address customizable
        const address = 'osworks'
        // @todo: make sure that filename is properly encoded by the underlying command method
        const argument = `open_project|${filename}`
        return reaper.triggerOSC(address, argument, true)
      },
    },

    /**
     * Connection management
     */
    connection: {
      update(host: string, port: string): void {
        return getInstance().updateConnection(host, port)
      },

      getInfo(): ConnectionInfo {
        return getInstance().connectionInfo
      },

      test(): Promise<boolean> {
        return getInstance().testConnection()
      },
    },
  },

  /**
   * Get the singleton instance (for advanced usage)
   * @returns The singleton instance
   */
  getInstance(): ReaperAPI {
    return getInstance()
  },
}

export default Bridge
