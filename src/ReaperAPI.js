import { TRANSPORT } from './commands.js'
import { DEFAULT_CONFIG } from './constants.js'
import {
  parseExtState,
  parseResponse,
  parseTransport,
} from './responseParser.js'

/**
 * ReaperAPI - Core API client for communicating with Reaper Web Control Surface
 * Handles all 4 communication channels
 */
export class ReaperAPI {
  initialized = false
  isConnected = false
  consecutiveFailures = 0
  pollingInterval = 1000
  // Event handlers
  onConnectionChange = null
  onError = null
  onResponse = null
  // Polling
  pollingTimer = null
  isPolling = false
  // Connection
  host = DEFAULT_CONFIG.connection.host
  port = DEFAULT_CONFIG.connection.port
  baseUrl = `http://${this.host}:${this.port}`

  constructor(config) {
    if (config) {
      this.init(config)
    }
  }

  init(config) {
    if (!config) {
      throw 'ReaperAPI: Configuration values are required for initialization'
    }

    this.initialized = true

    this.host = config?.connection?.host || DEFAULT_CONFIG.connection.host
    this.port = config?.connection?.port || DEFAULT_CONFIG.connection.port
    this.baseUrl = `http://${this.host}:${this.port}`

    this.failureThreshold =
      config?.connection?.failureThreshold ||
      DEFAULT_CONFIG.connection.failureThreshold

    // Polling
    this.pollingInterval =
      config?.connection?.pollingInterval ||
      DEFAULT_CONFIG.connection.pollingInterval
  }

  /**
   * Update Reaper host/port
   */
  updateConnection(host, port) {
    this.host = host
    this.port = port
    this.baseUrl = `http://${host}:${port}`

    // Reset connection state
    this.isConnected = false
    this.consecutiveFailures = 0
  }

  /**
   * Get current connection info
   */
  getConnectionInfo() {
    return {
      host: this.host,
      port: this.port,
      baseUrl: this.baseUrl,
      isConnected: this.isConnected,
    }
  }

  /**
   * Send a command to Reaper
   * @param {string} command
   * @returns {Promise<string>} Response text
   */
  async command(command) {
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
      const parsed = parseResponse(text)

      // Success - reset failure count and update connection state
      this.consecutiveFailures = 0
      this.setConnectionState(true)

      // Call response handler if set
      if (this.onResponse) {
        this.onResponse(parsed, command)
      }

      return parsed
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Reaper Command: ', error)
      this.consecutiveFailures++

      // Only mark as disconnected after threshold failures
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.setConnectionState(false)
      }

      // Call error handler if set
      if (this.onError) {
        this.onError(error, this.consecutiveFailures)
      }

      throw error
    }
  }

  /**
   * Send a command with optional argument
   * @param {string} commandId - Command ID
   * @param {string|number|float} arg - Optional argument
   * @returns {Promise<string>} Response text
   */
  async action(actionId, arg = null) {
    const command = arg !== null ? `${actionId}/${arg}` : actionId
    return this.command(command)
  }

  /**
   * Get a transport state value
   * @param {string} key - Key name
   * @returns {Promise<string>} Value
   */
  async getTransportState() {
    const response = await this.command(TRANSPORT.GET_STATE)
    const parsed = parseTransport(response.params)
    return parsed
  }

  /**
   * Get an ExtState value
   * @param {string} section - Section name
   * @param {string} key - Key name
   * @returns {Promise<string>} Value
   */
  async getExtState(section, key) {
    const command = `GET/EXTSTATE/${section}/${key}`
    const response = await this.command(command)

    if (response) {
      const extStateData = parseExtState(response.params)
      return extStateData ? extStateData.value : null
    }
    return null
  }

  /**
   * Set an ExtState value
   * Be wary there's a fairly short limit on the character size of values
   * @param {string} section - Section name
   * @param {string} key - Key name
   * @param {string|number|boolean} value - Value to set
   * @param {boolean} persist - Whether to persist the value (default: false). Persisted values survive Reaper restarts.
   * @returns {Promise<string>} Response text
   */
  async setExtState(section, key, value, persist = false) {
    const command = `SET/EXTSTATE${
      persist ? 'PERSIST' : ''
    }/${section}/${key}/${encodeURIComponent(String(value))}`
    return this.command(command)
  }

  /**
   * Trigger an OSC event
   * @param {string} address - OSC address
   * @param {string|number|float|null} arg - Optional argument
   * @param {boolean} useStringArg - By default Reaper expects float args, this lets Reaper know a string is used instead (default: false)
   * @returns {Promise<string>} Response text
   */
  async triggerOSC(address, arg = null, useStringArg = false) {
    // By default Reaper expects float args for OSC
    // in order to send a string arg we need to add an "s" prefix to the arg
    if (useStringArg && arg !== null) {
      arg = `s${arg}`
    }
    const command = arg !== null ? `OSC/${address}:${arg}` : `OSC/${address}`
    return this.command(command)
  }

  /**
   * Execute a two-step operation (ExtState + OSC pattern)
   * @param {string} prepareCmd - First command (usually ExtState SET)
   * @param {string} executeCmd - Second command (usually OSC trigger)
   * @returns {Promise<string>} Response from execute command
   */
  async preparedCommand(prepareCmd, executeCmd) {
    await this.command(prepareCmd)
    // Small delay to ensure ExtState is written
    await new Promise((resolve) => setTimeout(resolve, 50))
    return this.command(executeCmd)
  }

  /**
   * Update connection state (only if changed)
   */
  setConnectionState(connected) {
    if (this.isConnected !== connected) {
      this.isConnected = connected
      if (this.onConnectionChange) {
        this.onConnectionChange(connected)
      }
    }
  }

  /**
   * Set connection change handler
   * @param {Function} handler - Called when connection state changes
   */
  setConnectionHandler(handler) {
    this.onConnectionChange = handler
  }

  /**
   * Set error handler
   * @param {Function} handler - Called when request fails
   */
  setErrorHandler(handler) {
    this.onError = handler
  }

  /**
   * Set response handler
   * @param {Function} handler - Called on successful response
   */
  setResponseHandler(handler) {
    this.onResponse = handler
  }

  /**
   * Start polling for transport state
   * @param {Function} callback - Called with parsed transport data
   */
  startPolling(callback) {
    if (this.isPolling) {
      return
    }

    this.isPolling = true

    const poll = async () => {
      const transportState = await this.getTransportState()

      if (callback) {
        callback(transportState)
      }

      if (this.isPolling) {
        this.pollingTimer = setTimeout(poll, this.pollingInterval)
      }
    }

    poll()
  }

  /**
   * Stop polling
   */
  stopPolling() {
    this.isPolling = false
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  /**
   * Test connection
   * @returns {Promise<boolean>} True if connected
   */
  async testConnection() {
    try {
      await this.command(TRANSPORT.GET_STATE)
      return true
    } catch (_) {
      return false
    }
  }
}
