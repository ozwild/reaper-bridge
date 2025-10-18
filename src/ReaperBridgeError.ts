export class ReaperBridgeError extends Error {
  constructor(message?: string) {
    super(
      message ? `ReaperBridge: ${message}` : 'An error occurred in ReaperBridge'
    )
    this.name = 'ReaperBridgeError'
    // Fix prototype chain for older TS/ES targets
    Object.setPrototypeOf(this, ReaperBridgeError.prototype)
  }
}

// optional factory for compatibility
export const Exception = (message?: string) => new ReaperBridgeError(message)
