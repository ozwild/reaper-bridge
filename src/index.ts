import Bridge from './Bridge.js'

import { withVolume } from './helpers.js'

// Re-export types for consumers
export type { BridgeConfig, EventHandlers } from './Bridge.js'

export type { ConnectionInfo } from './ReaperAPI.js'

export type {
  ParsedResponse,
  TransportPosition,
  TransportStateResponse,
  TrackStateResponse,
  BeatStateResponse,
  MarkerStateResponse,
  RegionStateResponse,
  ExtStateResponse,
} from './responseParser.js'

// Export constants and commands for advanced usage
export { REAPER_ACTIONS, REAPER_COMMANDS } from './commands.js'

// Export the main Bridge class
export { Bridge }

export const utilities = {
  withVolume,
}
