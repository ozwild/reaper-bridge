export const APP_NAME = 'ReaperBridge'
export const APP_VERSION = '0.1.0'
export const OSC_ADDRESS = 'reaper_bridge'

/**
 * Command separator for batching multiple commands in a single request
 *
 * Reference (from Reaper's main.js file used by it's default web server):
 * All interaction with the server is done via
 * wwr_req("command;command;command")
 * or
 * wwr_req_recur("command;command",interval):
 * (which are internally sent as /_/command;command;command;command to the server)
 */
export const COMMAND_SEPARATOR = ';'

export const RESPONSE_SEPARATOR = '\n'

export const GET_RESPONSE_NULL_FILTER =
  <T>() =>
  (t: T | null): t is NonNullable<T> =>
    t !== null

export const REGULAR_EXPRESSIONS = {
  QUOTES: /^"|"$/g, // Matches leading and trailing quotes,
  DELTA: /^([+-]?\d+(\.\d+)?)$/, // Matches delta values like +0.1e or -0.1E
  DELTA_SEND: /^([+-]?\d+(\.\d+)?)([eE])?$/, // Matches delta send values like +0.1e or -0.1E
  VOLUME: /^([0]?(\.\d+)?|4(\.0+)?)$/, // Matches volume values between 0.0 and 1.0
  PAN: /^([+-]?(\d+(\.\d+)?))$/, // Matches pan values between -1.0 and 1.0
}

export enum RESPONSE_TYPES {
  TRANSPORT = 'TRANSPORT',
  TRACK = 'TRACK',
  BEAT = 'BEATPOS',
  MARKER = 'MARKER',
  REGION = 'REGION',
  EXTSTATE = 'EXTSTATE',
}

// Playstate Transport constants
export enum PLAYSTATE {
  STOPPED = 0,
  PLAYING = 1,
  PAUSED = 2,
  RECORDING = 5,
  RECORD_PAUSED = 6,
}

// Track flags (bitmask values for track state)
export enum TRACK_FLAGS {
  FOLDER = 1,
  SELECTED = 2,
  HAS_FX = 4,
  MUTED = 8,
  SOLOED = 16,
  SOLO_IN_PLACE = 32,
  RECORD_ARMED = 64,
  RECORD_MONITORING_ON = 128,
  RECORD_MONITORING_AUTO = 256,
}

export enum VOLUME_VALUES {
  VOLUME_MIN = 0.0, // Silent
  VOLUME_MAX = 1.0, // Unity gain
}

export enum PAN_VALUES {
  PAN_MIN = -1.0, // Full left
  PAN_CENTER = 0.0, // Center
  PAN_MAX = 1.0, // Full right
}

export enum MONITORING_VALUES {
  MONITORING_OFF = 0,
  MONITORING_ON = 1,
  MONITORING_AUTO = 2,
}

export const VOLUME_INTERPOLATION_POINTS = [
  { db: -150, percent: 0.0 },
  { db: -50, percent: 0.1173 },
  { db: -30, percent: 0.2495 },
  { db: -18, percent: 0.3892 },
  { db: -12, percent: 0.4823 },
  { db: 6, percent: 0.851 },
  { db: 12, percent: 1.0 },
]
