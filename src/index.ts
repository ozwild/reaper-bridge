import Bridge from './Bridge.js'
import { useReaper } from './React/useReaper.js'

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

export type { UseReaperHookProps, UseReaperResult } from './React/useReaper.js'

// Named exports only - cleaner for library consumers
export { Bridge, useReaper }
