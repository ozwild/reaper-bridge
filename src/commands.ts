import { REGULAR_EXPRESSIONS } from './constants.js'
import { ReaperBridgeError } from './ReaperBridgeError.js'

type Volume = number // 0.0 to 1.0

type Pan = number // -1.0 to 1.0

type Delta = number // e.g., +0.1, -0.1

type DeltaSend = number | string // e.g., +0.1, -0.1, +0.1e, -0.1E

type Monitoring = 0 | 1 | 2 // 0 cycle, 1 on, 2 auto

const validate = (
  value: number | string,
  caseType: 'volume' | 'pan' | 'delta' | 'deltaSend'
) => {
  switch (caseType) {
    case 'volume':
      if (typeof value === 'string') {
        const regex = REGULAR_EXPRESSIONS.VOLUME
        const match = regex.exec(value)
        if (!match) {
          throw new ReaperBridgeError(
            'Invalid Volume format. Use a number between 0.0 and 1.0.'
          )
        }
        value = parseFloat(match[1])
      }
      if (value < 0 || value > 1)
        throw new ReaperBridgeError('Volume value must be between 0.0 and 1.0')
      break
    case 'pan':
      if (typeof value === 'string') {
        const regex = REGULAR_EXPRESSIONS.PAN
        const match = regex.exec(value)
        if (!match) {
          throw new ReaperBridgeError(
            'Invalid Pan format. Use a number between -1.0 and 1.0.'
          )
        }
        value = parseFloat(match[1])
      }
      if (value < -1 || value > 1)
        throw new ReaperBridgeError('Pan value must be between -1.0 and 1.0')
      break
    case 'delta':
      // No specific validation for delta
      break
    case 'deltaSend':
      // Only string cases are when 'e' or 'E' is appended
      if (typeof value === 'string') {
        const regex = REGULAR_EXPRESSIONS.DELTA_SEND

        const match = regex.exec(value)

        if (!match) {
          throw new ReaperBridgeError(
            'Invalid DeltaSend format. Use a number optionally followed by "e" or "E".'
          )
        }

        const numericPart = parseFloat(match[1])

        if (isNaN(numericPart) || numericPart < -1 || numericPart > 1)
          throw new ReaperBridgeError(
            'DeltaSend value must be between -1.0 and 1.0'
          )
      }
      break
  }
}

export const NAMED_ACTION = {
  /* Transport commands */

  TRANSPORT_GET_STATE: 'TRANSPORT',
  TRANSPORT_BEAT: 'BEATPOS',

  /* Position commands */

  POSITION_GOTO_SECONDS: (position: number) => `SET/POSITION/${position}`,

  /* Marker commands */

  MARKER_LIST: 'MARKER',
  MARKER_JUMP_TO: (markerId: number) => `SET/POSITION/m${markerId}`,
  MARKER_JUMP_TO_INDEX: (markerIndex: number) => `SET/POSITION/M${markerIndex}`,

  /* Region commands */

  REGION_LIST: 'REGION',
  REGION_JUMP_TO: (regionId: number) => `SET/POSITION/r${regionId}`,
  REGION_JUMP_TO_INDEX: (regionIndex: number) => `SET/POSITION/R${regionIndex}`,

  /* External State commands */

  EXT_STATE_SET: (namespace: string, key: string, value: string) =>
    `SET/EXTSTATE/${namespace}/${key}/${encodeURIComponent(value)}`,
  EXT_STATE_GET: (namespace: string, key: string): string =>
    `GET/EXTSTATE/${namespace}/${key}`,
  EXT_STATE_SET_PERSISTENT: (namespace: string, key: string, value: string) =>
    `SET/EXTSTATEPERSIST/${namespace}/${key}/${encodeURIComponent(value)}`,

  /* OSC commands */

  OSC_SEND_EVENT: (
    address: string,
    arg: string | number | null = null,
    useStringArg = false
  ) => {
    if (arg === null) {
      return `OSC/${address}`
    }
    const prefix = useStringArg ? 's' : 'f'
    return `OSC/${address}:${prefix}${encodeURIComponent(String(arg))}`
  },

  /* Track Getters commands */

  TRACK_GET_COUNT: 'NTRACK',
  TRACK_LIST: 'TRACK',
  TRACK_GET_STATE: (index: number) => `TRACK/${index}`,
  TRACK_GET_RANGE: (from: number, to: number) => `TRACK/${from}-${to}`,

  /* Track Setters commands */

  TRACK_SET_VOLUME: (index: number, value: Volume) => {
    validate(value, 'volume')
    return `SET/TRACK/${index}/VOL/${value}`
  },
  TRACK_ADJUST_VOLUME: (index: number, delta: Delta | string) =>
    `SET/TRACK/${index}/VOL/${delta}`,

  TRACK_SET_PAN: (index: number, value: Pan) => {
    validate(value, 'pan')
    return `SET/TRACK/${index}/PAN/${value}`
  },
  TRACK_ADJUST_PAN: (index: number, delta: Delta | string) =>
    `SET/TRACK/${index}/PAN/${delta}`,

  TRACK_SET_MUTE: (index: number, state: boolean) =>
    `SET/TRACK/${index}/MUTE/${state ? 1 : 0}`,
  TRACK_TOGGLE_MUTE: (index: number) => `SET/TRACK/${index}/MUTE/-1`,

  TRACK_SET_SOLO: (index: number, state: boolean) =>
    `SET/TRACK/${index}/SOLO/${state ? 1 : 0}`,
  TRACK_TOGGLE_SOLO: (index: number) => `SET/TRACK/${index}/SOLO/-1`,

  TRACK_SET_REC_ARM: (index: number, state: boolean) =>
    `SET/TRACK/${index}/RECARM/${state ? 1 : 0}`,
  TRACK_TOGGLE_REC_ARM: (index: number) => `SET/TRACK/${index}/RECARM/-1`,

  TRACK_SET_MONITORING: (index: number, state: Monitoring) =>
    `SET/TRACK/${index}/RECMON/${state}`,
  TRACK_CYCLE_MONITORING: (index: number) => `SET/TRACK/${index}/RECMON/0`,

  TRACK_SET_SELECTION: (index: number, state: boolean) =>
    `SET/TRACK/${index}/SELECT/${state ? 1 : 0}`,
  TRACK_TOGGLE_SELECTION: (index: number) => `SET/TRACK/${index}/SELECT/-1`,

  TRACK_SET_SEND_VOLUME: (
    trackIndex: number,
    sendIndex: number,
    value: Volume
  ) => {
    validate(value, 'volume')
    return `SET/TRACK/${trackIndex}/SEND/${sendIndex}/VOL/${value}`
  },
  TRACK_ADJUST_SEND_VOLUME: (
    trackIndex: number,
    sendIndex: number,
    delta: DeltaSend
  ) => {
    validate(delta, 'deltaSend')
    return `SET/TRACK/${trackIndex}/SEND/${sendIndex}/VOL/${delta}`
  },

  TRACK_SET_SEND_PAN: (trackIndex: number, sendIndex: number, value: Pan) => {
    validate(value, 'pan')
    return `SET/TRACK/${trackIndex}/SEND/${sendIndex}/PAN/${value}`
  },
  TRACK_ADJUST_SEND_PAN: (
    trackIndex: number,
    sendIndex: number,
    delta: DeltaSend
  ) => {
    validate(delta, 'deltaSend')
    return `SET/TRACK/${trackIndex}/SEND/${sendIndex}/PAN/${delta}`
  },

  TRACK_MUTE_SEND: (trackIndex: number, sendIndex: number, state: boolean) =>
    `SET/TRACK/${trackIndex}/SEND/${sendIndex}/MUTE/${state ? 1 : 0}`,
  TRACK_TOGGLE_SEND_MUTE: (trackIndex: number, sendIndex: number) =>
    `SET/TRACK/${trackIndex}/SEND/${sendIndex}/MUTE/-1`,

  // Other App commands
  UNDO_POINT: (message: string) => `SET/UNDO/${message}`,
  UNDO_BEGIN: 'SET/UNDO_BEGIN',
  UNDO_END: 'SET/UNDO_END',
} as const

export enum ACTION_ID {
  PLAY_PAUSE = '40328',
  PLAY = '40044',
  STOP = '1016',
  RECORD = '1013',
  PAUSE = '1008',
  TOGGLE_LOOP = '1068',
  TOGGLE_MASTER_MUTE = '14',
  GOTO_PROJECT_START = '40042',
  GOTO_PREVIOUS_MARKER = '40172',
  GOTO_NEXT_MARKER = '40173',
}
