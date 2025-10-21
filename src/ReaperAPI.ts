import { REAPER_ACTIONS, REAPER_COMMANDS } from './commands.js'
import {
  parseExtStateResponse,
  parseResponse,
  parseTransportResponse,
  parseTrackResponse,
  parseMarkerResponse,
  parseRegionResponse,
  parseBeatResponse,
} from './responseParser.js'
import { StateSubscriptionManager } from './StateSubscriptionManager.js'

import type {
  TransportStateResponse,
  ExtStateResponse,
  ParsedResponse,
} from './responseParser.js'
import type { ReaperAPIConfig } from './config.js'
import type {
  StateType,
  StateSubscriptionCallback,
} from './StateSubscriptionManager.js'
import { ReaperBridgeError, ReaperBridgeWarning } from './ReaperBridgeError.js'
import {
  COMMAND_SEPARATOR,
  GET_RESPONSE_NULL_FILTER,
  RESPONSE_SEPARATOR,
  RESPONSE_TYPES,
} from './constants.js'

export interface ConnectionInfo {
  host: string
  port: string
  baseUrl: string
  isConnected: boolean
}

export class ReaperAPI {
  initialized = false
  isConnected = false
  consecutiveFailures = 0
  pollingInterval = 1000

  onConnectionChange: (isConnected: boolean) => void = () => {}
  onError: (error: Error, consecutiveFailures: number) => void = () => {}
  onResponse: (response: string, command: string) => void = () => {}

  pollingTimer: number | null = null
  isPolling = false

  // Debounced immediate execution for responsive UI
  private immediateDebounceTimer: number | null = null
  private immediateDebounceDelay = 50 // 50ms debounce for immediate actions

  host = '192.168.1.36'
  port = '8080'

  failureThreshold = 3

  // Request queue for batching commands
  private commandQueue: Array<{
    command: string
    resolve: (value: string) => void
    reject: (reason: Error) => void
    immediate: boolean // Whether this command should be sent immediately
  }> = []
  private isProcessingQueue = false

  // State subscription manager
  private stateManager = new StateSubscriptionManager()

  constructor(config?: ReaperAPIConfig) {
    if (config) {
      this.init(config)
    }
  }

  init({
    connection: { host, port, failureThreshold, pollingInterval },
  }: ReaperAPIConfig) {
    if (!host || !port) {
      throw new Error(
        'ReaperAPI: Configuration values are required for initialization'
      )
    }

    this.host = host
    this.port = port

    if (failureThreshold !== undefined) {
      this.failureThreshold = failureThreshold
    }

    if (pollingInterval !== undefined) {
      this.pollingInterval = pollingInterval
    }

    this.initialized = true
  }

  get baseUrl() {
    return `http://${this.host}:${this.port}`
  }

  updateConnection(host: string, port: string) {
    this.host = host
    this.port = port

    // Reset connection state
    this.isConnected = false
    this.consecutiveFailures = 0
  }

  get connectionInfo(): ConnectionInfo {
    return {
      host: this.host,
      port: this.port,
      baseUrl: this.baseUrl,
      isConnected: this.isConnected,
    }
  }

  /**
   * Add a command to the queue for batch processing
   */
  private queueCommand(command: string, immediate = false): Promise<string> {
    return new Promise((resolve, reject) => {
      this.commandQueue.push({
        command,
        resolve,
        reject,
        immediate,
      })

      // If immediate or not polling, process the queue now
      if (immediate || !this.isPolling) {
        void this.processQueue()
      }
    })
  }

  /**
   * Process all queued commands in a single request
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.commandQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true
    const currentBatch = [...this.commandQueue]
    this.commandQueue = []

    try {
      // Separate immediate commands from batched commands
      const immediateCommands = currentBatch.filter((item) => item.immediate)
      const batchedCommands = currentBatch.filter((item) => !item.immediate)

      // Process immediate commands first (one by one)
      for (const item of immediateCommands) {
        try {
          const response = await this.sendCommandDirect(item.command)
          item.resolve(response)
        } catch (error) {
          item.reject(error as Error)
        }
      }

      // Process batched commands together
      if (batchedCommands.length > 0) {
        try {
          const combinedCommand = batchedCommands
            .map((item) => item.command)
            .join(COMMAND_SEPARATOR)

          const response = await this.sendCommandDirect(combinedCommand)

          batchedCommands.forEach((item) => {
            item.resolve(response)
          })
        } catch (error) {
          // If batch fails, reject all batched commands
          batchedCommands.forEach((item) => {
            item.reject(error as Error)
          })
        }
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * Send a command to Reaper directly (bypassing queue)
   */
  private async sendCommandDirect(command: string): Promise<string> {
    const url = `${this.baseUrl}/_/${command}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()

      // Success - reset failure count and update connection state
      this.consecutiveFailures = 0
      this.setConnectionState(true)

      // Call response handler if set
      if (this.onResponse) {
        this.onResponse(text, command)
      }

      return text
    } catch (err: unknown) {
      this.consecutiveFailures++

      // Only mark as disconnected after threshold failures
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.setConnectionState(false)
      }

      // Normalize unknown error to an Error instance
      const errorObj = err instanceof Error ? err : new Error(String(err))

      // Call error handler if set
      if (this.onError) {
        this.onError(errorObj, this.consecutiveFailures)
      }

      throw new ReaperBridgeError(
        `Failed to send command "${command}": ${errorObj.message}`
      )
    }
  }

  /**
   * Send a command to Reaper (queued for batch processing)
   * @param command - The command to send
   * @param immediate - Whether to send immediately or queue for next poll
   */
  async sendCommand(command: string, immediate = false): Promise<string> {
    return this.queueCommand(command, immediate)
  }

  /**
   * Execute an action by ID (fire-and-forget, queueable)
   * @param actionId - The action ID to execute
   * @param immediate - Whether to send immediately or queue for next poll
   */
  async executeAction(
    actionId: REAPER_ACTIONS,
    immediate = false
  ): Promise<void> {
    await this.sendCommand(actionId, immediate)
  }

  /**
   * Execute an action with immediate feedback (debounced state polling)
   * Executes the action immediately and triggers debounced state polling
   * Perfect for user interactions that need responsive UI feedback
   * @param actionId - The action ID to execute
   */
  async executeActionImmediate(actionId: REAPER_ACTIONS): Promise<void> {
    // Execute the action immediately
    await this.sendCommand(actionId, true) // Immediate execution

    // Schedule debounced state polling for UI updates
    this.scheduleImmediateStatePoll()
  }

  /**
   * Execute a complex command (fire-and-forget, queueable)
   * @param command - The command to execute
   * @param immediate - Whether to send immediately or queue for next poll
   */
  async executeCommand(command: string, immediate = false): Promise<void> {
    await this.sendCommand(command, immediate)
  }

  /**
   * Execute a complex command with immediate feedback (debounced state polling)
   * Executes the command immediately and triggers debounced state polling
   * @param command - The command to execute
   */
  async executeCommandImmediate(command: string): Promise<void> {
    // Execute the command immediately
    await this.sendCommand(command, true) // Immediate execution

    // Schedule debounced state polling for UI updates
    this.scheduleImmediateStatePoll()
  }

  /**
   * Request data from Reaper (always immediate, expects response)
   * @param command - The command to send
   */
  async requestData(command: string): Promise<ParsedResponse | null> {
    const response = await this.sendCommand(command, true) // Always immediate
    if (response === null || response === '') return null
    return parseResponse(response)
  }

  /**
   * @deprecated Use executeAction() instead
   */
  async action(actionId: REAPER_ACTIONS, immediate = false): Promise<void> {
    return this.executeAction(actionId, immediate)
  }

  /**
   * @deprecated Use requestData() or executeCommand() instead
   */
  async namedAction(
    action: string,
    immediate = false
  ): Promise<ParsedResponse | null> {
    if (immediate) {
      return this.requestData(action)
    } else {
      await this.executeCommand(action)
      return null
    }
  }

  /** Get current transport state */
  async getTransportState(): Promise<TransportStateResponse | null> {
    const response = await this.requestData(REAPER_COMMANDS.TRANSPORT_GET_STATE)
    if (response === null) return null
    return parseTransportResponse(response)
  }

  /** Get an ExtState value */
  async getExtState(
    namespace: string,
    key: string
  ): Promise<ExtStateResponse | null> {
    const response = await this.requestData(
      REAPER_COMMANDS.EXT_STATE_GET(namespace, key)
    )
    if (response === null) return null
    return parseExtStateResponse(response)
  }

  /** Set an ExtState value. Be wary there's a fairly short limit on the character size of values (16k) */
  async setExtState(
    namespace: string,
    key: string,
    value: string | number | boolean,
    persist = false,
    immediate = false
  ): Promise<void> {
    let command = ''

    if (persist) {
      command = REAPER_COMMANDS.EXT_STATE_SET_PERSISTENT(
        namespace,
        key,
        String(value)
      )
    } else {
      command = REAPER_COMMANDS.EXT_STATE_SET(namespace, key, String(value))
    }

    await this.executeCommand(command, immediate)
  }

  /** Trigger an OSC event */
  async triggerOSC(
    address: string,
    arg: string | number | null = null,
    argIsString: boolean = false,
    immediate = false
  ): Promise<void> {
    await this.executeCommand(
      REAPER_COMMANDS.OSC_SEND_EVENT(address, arg, argIsString),
      immediate
    )
  }

  private setConnectionState(connected: boolean) {
    if (this.isConnected !== connected) {
      this.isConnected = connected
      if (this.onConnectionChange) {
        this.onConnectionChange(connected)
      }
    }
  }

  setConnectionHandler(handler: (connected: boolean) => void) {
    this.onConnectionChange = handler
  }

  setErrorHandler(
    handler: (error: Error, consecutiveFailures: number) => void
  ) {
    this.onError = handler
  }

  setResponseHandler(handler: (response: string, command: string) => void) {
    this.onResponse = handler
  }

  /** Start polling for state updates and process command queue */
  startPolling() {
    if (this.isPolling) {
      return
    }

    this.isPolling = true

    const poll = async (): Promise<void> => {
      // Process any queued commands first
      await this.processQueue()

      // Get active polling commands from subscription manager
      const pollingCommands = this.stateManager.getPollingCommands()

      if (pollingCommands.length > 0) {
        try {
          // Send combined commands for efficiency
          const combinedCommand = pollingCommands.join(COMMAND_SEPARATOR)

          const response = await this.sendCommandDirect(combinedCommand)

          // Parse the multi-response
          await this.parseAndDistributeStates(response, pollingCommands)
        } catch (error) {
          // Handle polling errors gracefully
          ReaperBridgeWarning('Polling error', error as Error)
        }
      }

      if (this.isPolling) {
        this.pollingTimer = setTimeout(poll, this.pollingInterval)
      }
    }

    void poll()
  }

  /**
   * Parse multi-response and distribute to state subscribers
   */
  private async parseAndDistributeStates(
    response: string,
    commands: string[]
  ): Promise<void> {
    if (!response || response.trim() === '') return

    // Split response into lines and parse each
    const responseLines = response
      .split(RESPONSE_SEPARATOR)
      .filter((line) => line.trim())
    const parsedResponses = responseLines
      .map((line) => parseResponse(line))
      .filter((parsed): parsed is ParsedResponse => parsed !== null)

    // Group parsed responses by command type
    const responsesByType: Record<string, ParsedResponse[]> = {}
    parsedResponses.forEach((parsed) => {
      const commandType = parsed.command
      if (!responsesByType[commandType]) {
        responsesByType[commandType] = []
      }
      responsesByType[commandType].push(parsed)
    })

    // Process each command type that was requested
    commands.forEach((command) => {
      const responsesForCommand = responsesByType[command] || []

      if (responsesForCommand.length === 0) return

      const isMultiResponse = [
        RESPONSE_TYPES.TRACK,
        RESPONSE_TYPES.MARKER,
        RESPONSE_TYPES.REGION,
      ].includes(command as RESPONSE_TYPES)

      try {
        if (isMultiResponse) {
          if (command === RESPONSE_TYPES.TRACK) {
            const trackStates = responsesForCommand
              .map((r) => parseTrackResponse(r))
              .filter(GET_RESPONSE_NULL_FILTER())
            this.stateManager.updateState('tracks', trackStates)
          } else if (command === RESPONSE_TYPES.MARKER) {
            const markerStates = responsesForCommand
              .map((r) => parseMarkerResponse(r))
              .filter(GET_RESPONSE_NULL_FILTER())
            this.stateManager.updateState('markers', markerStates)
          } else if (command === RESPONSE_TYPES.REGION) {
            const regionStates = responsesForCommand
              .map((r) => parseRegionResponse(r))
              .filter(GET_RESPONSE_NULL_FILTER())
            this.stateManager.updateState('regions', regionStates)
          }
        } else if (responsesForCommand.length > 0) {
          const response = responsesForCommand[0]
          if (command === RESPONSE_TYPES.TRANSPORT) {
            const transportState = parseTransportResponse(response)
            this.stateManager.updateState('transport', transportState)
          } else if (command === RESPONSE_TYPES.BEAT) {
            const beatState = parseBeatResponse(response)
            this.stateManager.updateState('beat', beatState)
          }
        }
      } catch (error) {
        ReaperBridgeWarning(`Error parsing ${command} response`, error as Error)
      }
    })
  }

  stopPolling() {
    this.isPolling = false
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }
    // Clear immediate debounce timer if active
    if (this.immediateDebounceTimer) {
      clearTimeout(this.immediateDebounceTimer)
      this.immediateDebounceTimer = null
    }
    // Process any remaining commands in the queue
    void this.processQueue()
  }

  /**
   * Schedule debounced immediate state polling (without command execution)
   * Multiple calls within the debounce delay will result in a single state poll
   * @private
   */
  private scheduleImmediateStatePoll(): void {
    // Clear existing timer to restart debounce period
    if (this.immediateDebounceTimer) {
      clearTimeout(this.immediateDebounceTimer)
    }

    // Schedule state poll after debounce delay
    this.immediateDebounceTimer = setTimeout(async () => {
      try {
        // Only trigger state poll - commands were already executed
        await this.triggerStatePoll()
      } catch (error) {
        ReaperBridgeWarning('Error in immediate state poll', error as Error)
      } finally {
        this.immediateDebounceTimer = null
      }
    }, this.immediateDebounceDelay)
  }

  /**
   * Trigger an immediate state poll (same as polling logic but executed on-demand)
   * @private
   */
  private async triggerStatePoll(): Promise<void> {
    // Get active polling commands from subscription manager
    const pollingCommands = this.stateManager.getPollingCommands()

    if (pollingCommands.length > 0) {
      try {
        // Send combined commands for efficiency
        const combinedCommand = pollingCommands.join(COMMAND_SEPARATOR)
        const response = await this.sendCommandDirect(combinedCommand)

        // Parse and distribute states to subscribers
        await this.parseAndDistributeStates(response, pollingCommands)
      } catch (error) {
        // Handle polling errors gracefully
        ReaperBridgeWarning('Immediate state poll error', error as Error)
      }
    }
  }

  /**
   * Flush the command queue immediately
   */
  async flushQueue(): Promise<void> {
    await this.processQueue()
  }

  /**
   * Clear all pending commands in the queue
   */
  clearQueue(): void {
    // Reject all pending commands
    this.commandQueue.forEach((item) => {
      item.reject(new Error('Command queue cleared'))
    })
    this.commandQueue = []
  }

  /**
   * Get the number of pending commands in the queue
   */
  get queueLength(): number {
    return this.commandQueue.length
  }

  /**
   * Subscribe to state updates
   */
  subscribeToState<T extends StateType>(
    stateType: T,
    callback: StateSubscriptionCallback<T>
  ): () => void {
    return this.stateManager.subscribe(stateType, callback)
  }

  /**
   * Get current state for a specific type
   */
  getCurrentState<T extends StateType>(stateType: T) {
    return this.stateManager.getCurrentState(stateType)
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.requestData(REAPER_COMMANDS.TRANSPORT_GET_STATE as string)
      return true
    } catch (_) {
      return false
    }
  }
}
