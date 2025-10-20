import { ACTION_ID, NAMED_ACTION } from './commands.js'
import {
  parseExtStateResponse,
  parseResponse,
  parseTransportResponse,
} from './responseParser.js'

import type {
  TransportStateResponse,
  ExtStateResponse,
  ParsedResponse,
} from './responseParser.js'
import type { ReaperAPIConfig } from './config.js'
import { ReaperBridgeError } from './ReaperBridgeError.js'

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

  host = '192.168.1.36'
  port = '8080'

  failureThreshold = 3

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
   * Send a command to Reaper
   */
  async sendCommand(command: string): Promise<string> {
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
   * Send a command to Reaper for a specific action
   * Reaper's action/command IDs are listed in the Action List within Reaper
   */
  async action(actionId: ACTION_ID): Promise<void> {
    await this.sendCommand(actionId)
    // No response expected other than HTTP promise resolution
  }

  /**
   * Execute a named action/command
   * Use this for complex commands that require special formatting (e.g. SET/POSITION/123.45)
   * See NAMED_ACTION enum in commands.ts for available actions
   */
  async namedAction(action: string): Promise<ParsedResponse | null> {
    const response = await this.sendCommand(action)
    if (response === null || response === '') return null
    return parseResponse(response)
  }

  /** Get current transport state */
  async getTransportState(): Promise<TransportStateResponse | null> {
    const response = await this.namedAction(NAMED_ACTION.TRANSPORT_GET_STATE)
    if (response === null) return null
    return parseTransportResponse(response)
  }

  /** Get an ExtState value */
  async getExtState(
    namespace: string,
    key: string
  ): Promise<ExtStateResponse | null> {
    const response = await this.namedAction(
      NAMED_ACTION.EXT_STATE_GET(namespace, key)
    )
    if (response === null) return null
    return parseExtStateResponse(response)
  }

  /** Set an ExtState value. Be wary there's a fairly short limit on the character size of values (16k) */
  async setExtState(
    namespace: string,
    key: string,
    value: string | number | boolean,
    persist = false
  ): Promise<void> {
    let command = ''

    if (persist) {
      command = NAMED_ACTION.EXT_STATE_SET_PERSISTENT(
        namespace,
        key,
        String(value)
      )
    } else {
      command = NAMED_ACTION.EXT_STATE_SET(namespace, key, String(value))
    }

    // Using sendCommand since no response is expected other than HTTP promise resolution
    await this.sendCommand(command)
  }

  /** Trigger an OSC event */
  async triggerOSC(
    address: string,
    arg: string | number | null = null,
    argIsString: boolean = false
  ): Promise<void> {
    // Using sendCommand since no response is expected other than HTTP promise resolution
    await this.sendCommand(
      NAMED_ACTION.OSC_SEND_EVENT(address, arg, argIsString)
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

  /** Start polling for transport state */
  // @TODO: leverage Reaper's ability to process multiple commands in one request by implementing a manager
  startPolling(callback: (state: TransportStateResponse | null) => void) {
    if (this.isPolling) {
      return
    }

    this.isPolling = true

    const poll = async (): Promise<void> => {
      const transportState = await this.getTransportState()

      if (callback) {
        callback(transportState)
      }

      if (this.isPolling) {
        this.pollingTimer = setTimeout(poll, this.pollingInterval)
      }
    }

    void poll()
  }

  stopPolling() {
    this.isPolling = false
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sendCommand(NAMED_ACTION.TRANSPORT_GET_STATE as string)
      return true
    } catch (_) {
      return false
    }
  }
}
