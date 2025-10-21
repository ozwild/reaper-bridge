/**
 * Response Parsers for Reaper Web Control API
 *
 * Parses string responses from Reaper into structured objects.
 *
 */

import {
  REGULAR_EXPRESSIONS,
  RESPONSE_TYPES,
  TRACK_FLAGS,
  PLAYSTATE,
} from './constants.js'
import { formatTime } from './helpers.js'
import { ReaperBridgeError } from './ReaperBridgeError.js'

export interface ParsedResponse {
  command: string
  params: string[]
  raw: string
}

/** Parse a Reaper string response */
export function parseResponse(responseText: string): ParsedResponse | null {
  // @TODO: Verify if there's a possibility for non-string responses
  if (!responseText || typeof responseText !== 'string') {
    throw new ReaperBridgeError('Invalid response format')
  }

  const trimmed = responseText.trim()

  if (!trimmed) {
    return null
  }

  const parts = trimmed.split('\t')

  // @TODO: Is it possible to receive a response without command and params?
  if (parts.length < 2) {
    return null
  }

  const command = parts[0]
  const params = parts.slice(1)

  return {
    command,
    params,
    raw: responseText,
  }
}

/** Parse multiple Reaper string responses separated by newlines */
export function parseMultiResponse<T>(
  responseText: string,
  parseFunction: (parsedResponse: ParsedResponse) => T | null
): T[] {
  return responseText
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const parsed = parseResponse(line)
      return parsed ? parseFunction(parsed) : null
    })
    .filter((parsed): parsed is T => parsed !== null)
}

export interface TransportPosition {
  seconds: number
  string: string
  bars: string
}

export interface TransportStateResponse {
  source: string[]
  playstate: PLAYSTATE
  position: TransportPosition
  isPlaying: boolean
  isRecording: boolean
  isLooping: boolean
}

/** Parse TRANSPORT state from a Reaper parsed response */
export function parseTransportResponse(
  parsedResponse: ParsedResponse
): TransportStateResponse | null {
  const { command, params } = parsedResponse

  if (!command || command !== (RESPONSE_TYPES.TRANSPORT as string)) {
    throw new ReaperBridgeError(`Invalid command for Transport: ${command}`)
  }

  if (params.length < 5) {
    throw new ReaperBridgeError(
      `Invalid parameters for Transport: ${params.join(', ')}`
    )
  }

  /*
   * TRANSPORT response format from Reaper:
   * playstate \t position_seconds \t isRepeatOn \t position_string \t position_string_beats
   */
  const playstate = parseInt(params[0], 10) || 0
  const position = parseInt(params[1], 10) || 0
  const positionString = formatTime.fromSeconds(position) || '00:00.000' // Time format (minutes:seconds.100ths of a second)
  const isLooping = params[2] === '1'

  // Additional params (may vary by Reaper version)
  const positionBars = params[4] || '1.1.00' // Bar.beat.fraction format

  // Parse playstate flags
  const isPlaying = (playstate & PLAYSTATE.PLAYING) !== 0
  const isRecording = (playstate & PLAYSTATE.RECORDING) !== 0

  return {
    source: params,
    playstate,
    position: {
      seconds: position,
      string: positionString,
      bars: positionBars,
    },
    isPlaying,
    isRecording,
    isLooping,
  }
}

export interface TrackStateResponse {
  index: number
  name: string
  flags: TRACK_FLAGS
  volume: number // 0.0 to 1.0
  pan: number // -1.0 (left) to 1.0 (right)
  isMuted: boolean
  isSoloed: boolean
  isRecordArmed: boolean
  isSelected: boolean
  isFolder: boolean
  hasFX: boolean
  isRecordMonitoringOn: boolean
  isRecordMonitoringAuto: boolean
}

/** Parse TRACK state from a Reaper parsed response */
export function parseTrackResponse(
  parsedResponse: ParsedResponse
): TrackStateResponse | null {
  const { command, params } = parsedResponse

  if (!command || command !== (RESPONSE_TYPES.TRACK as string)) {
    throw new ReaperBridgeError(`Invalid command for Track: ${command}`)
  }

  if (params.length < 5) {
    throw new ReaperBridgeError(
      `Invalid parameters for Track: ${params.join(', ')}`
    )
  }

  /**
   * Track response format from Reaper:
   * TRACK \t tracknumber \t trackname \t trackflags \t volume \t pan \t last_meter_peak \t last_meter_pos \t width/pan2 \t panmode \t sendcnt \t recvcnt \t hwoutcnt \t color
   */
  const [index, name, flags, volume, pan] = params

  return {
    index: parseInt(index, 10),
    name: name.replace(REGULAR_EXPRESSIONS.QUOTES, ''), // Remove quotes
    flags: parseInt(flags, 10),
    volume: parseFloat(volume),
    pan: parseFloat(pan),
    isMuted: (parseInt(flags, 10) & TRACK_FLAGS.MUTED) !== 0,
    isSoloed: (parseInt(flags, 10) & TRACK_FLAGS.SOLOED) !== 0,
    isRecordArmed: (parseInt(flags, 10) & TRACK_FLAGS.RECORD_ARMED) !== 0,
    isSelected: (parseInt(flags, 10) & TRACK_FLAGS.SELECTED) !== 0,
    isFolder: (parseInt(flags, 10) & TRACK_FLAGS.FOLDER) !== 0,
    hasFX: (parseInt(flags, 10) & TRACK_FLAGS.HAS_FX) !== 0,
    isRecordMonitoringOn:
      (parseInt(flags, 10) & TRACK_FLAGS.RECORD_MONITORING_ON) !== 0,
    isRecordMonitoringAuto:
      (parseInt(flags, 10) & TRACK_FLAGS.RECORD_MONITORING_AUTO) !== 0,
  }
}

export type BeatStateResponse = {
  playstate: PLAYSTATE
  positionSeconds: number
  fullBeatPosition: string
  measureCount: number
  beatsInMeasure: number
  timeSigNum: number
  timeSigDenom: number
  timeSig: string
}

/** Parse BEAT state from a Reaper parsed response */
export function parseBeatResponse(
  parsedResponse: ParsedResponse
): BeatStateResponse | null {
  const { command, params } = parsedResponse

  if (!command || command !== (RESPONSE_TYPES.BEAT as string)) {
    throw new ReaperBridgeError(`Invalid command for Beat: ${command}`)
  }

  if (params.length < 7) {
    throw new ReaperBridgeError(
      `Invalid parameters for Beat: ${params.join(', ')}`
    )
  }

  /*
   * Beat state response format from Reaper:
   * BEATPOS \t playstate \t position_seconds \t full_beat_position \t measure_cnt \t beats_in_measure \t ts_numerator \t ts_denominator
   */

  const [
    playstate,
    positionSeconds,
    fullBeatPosition,
    measureCount,
    beatsInMeasure,
    timeSigNum,
    timeSigDenom,
  ] = params

  return {
    playstate: parseInt(playstate, 10) || 0,
    positionSeconds: parseInt(positionSeconds, 10) || 0,
    fullBeatPosition: fullBeatPosition || '1.1.00',
    measureCount: parseInt(measureCount, 10) || 1,
    beatsInMeasure: parseInt(beatsInMeasure, 10) || 4,
    timeSigNum: parseInt(timeSigNum, 10) || 4,
    timeSigDenom: parseInt(timeSigDenom, 10) || 4,
    timeSig: `${timeSigNum}/${timeSigDenom}`,
  }
}

export interface MarkerStateResponse {
  id: number
  name: string
  position: number // in seconds
  color?: number
}

/** Parse MARKER from a Reaper parsed response */
export function parseMarkerResponse(
  parsedResponse: ParsedResponse
): MarkerStateResponse {
  const { command, params } = parsedResponse

  if (!command || command !== (RESPONSE_TYPES.MARKER as string)) {
    throw new ReaperBridgeError(`Invalid command for Marker: ${command}`)
  }

  if (params.length < 3) {
    throw new ReaperBridgeError(
      `Invalid parameters for Marker: ${params.join(', ')}`
    )
  }

  /*
   * Marker state response format from Reaper:
   * MARKER \t name \t ID \t position [\t color]
   */

  const [name, id, positionSeconds] = params

  return {
    id: parseInt(id, 10),
    name: name.replace(REGULAR_EXPRESSIONS.QUOTES, ''), // Remove quotes
    position: parseInt(positionSeconds, 10),
    color: params[3] ? parseInt(params[3], 10) : undefined,
  }
}

export interface RegionStateResponse {
  name: string
  id: number
  startPosition: number // in seconds
  endPosition: number // in seconds
  color?: string
}

/** Parse REGION from a Reaper parsed response */
export function parseRegionResponse(
  parsedResponse: ParsedResponse
): RegionStateResponse {
  const { command, params } = parsedResponse

  if (!command || command !== (RESPONSE_TYPES.REGION as string)) {
    throw new ReaperBridgeError(`Invalid command for Region: ${command}`)
  }

  if (params.length < 3) {
    throw new ReaperBridgeError(
      'Invalid parameters for Region: ' + params.join(', ')
    )
  }

  /*
   * Region state response format from Reaper:
   * REGION \t name \t ID \t start-position \t end-position [\t color]
   */

  const [name, id, startPosition, endPosition] = params

  return {
    name: name.replace(REGULAR_EXPRESSIONS.QUOTES, ''), // Remove quotes
    id: parseInt(id, 10),
    startPosition: parseInt(startPosition, 10),
    endPosition: parseInt(endPosition, 10),
    color: params[4],
  }
}

export type ExtStateResponse = {
  namespace: string
  key: string
  value: string | null
}

/** Parse EXTSTATE from a Reaper parsed response */
export function parseExtStateResponse(
  parsedResponse: ParsedResponse
): ExtStateResponse | null {
  const { command, params } = parsedResponse

  if (!command || command !== (RESPONSE_TYPES.EXTSTATE as string)) {
    throw new ReaperBridgeError(`Invalid command for ExtState: ${command}`)
  }

  if (params.length < 2) {
    throw new ReaperBridgeError(
      `Invalid response parameters for ExtState: ${params.join(', ')}`
    )
  }

  const [namespace, key, value = null] = params

  // Decode special characters (\n, \t, \\) if value exists
  const decodedValue = value
    ? value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\')
    : null

  return {
    namespace,
    key,
    value: decodedValue === 'null' ? null : decodedValue, // Treat 'null' string as null
  }
}

/** Get textual representation of playstate */
export function getTransportStateText(playstate: PLAYSTATE): string {
  switch (playstate) {
    case PLAYSTATE.STOPPED:
      return 'STOPPED'
    case PLAYSTATE.PLAYING:
      return 'PLAYING'
    case PLAYSTATE.PAUSED:
      return 'PAUSED'
    case PLAYSTATE.RECORDING:
      return 'RECORDING'
    case PLAYSTATE.RECORD_PAUSED:
      return 'REC PAUSED'
    default:
      return 'UNKNOWN'
  }
}
