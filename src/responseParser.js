// Utility to format time from seconds to mm:ss.ms
const formatTime = {
  fromSeconds: (seconds) => {
    const num = parseFloat(seconds)
    
    if (isNaN(num)) return '00:00.000'

    const mins = Math.floor(num / 60)
    const secs = Math.floor(num % 60)
    const ms = Math.floor((num % 1) * 1000)

    return (
      String(mins).padStart(2, '0') +
      ':' +
      String(secs).padStart(2, '0') +
      '.' +
      String(ms).padStart(3, '0')
    )
  },
}

/**
 * Response Parser for Reaper Web Control API
 * Parses tab-delimited responses from Reaper
 */

/**
 * Parse a tab-delimited response line
 * @param {string} responseText - Raw response from Reaper
 * @returns {Object} Parsed response object
 */
export function parseResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return null
  }

  const trimmed = responseText.trim()
  if (!trimmed) {
    return null
  }

  const parts = trimmed.split('\t')
  const command = parts[0]
  const params = parts.slice(1)

  return {
    command,
    params,
    raw: responseText,
  }
}

/**
 * Parse multiple response lines
 * @param {string} responseText - Raw response with multiple lines
 * @returns {Array<Object>} Array of parsed responses
 */
export function parseMultiResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return []
  }

  return responseText
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => parseResponse(line))
    .filter((parsed) => parsed !== null)
}

/**
 * Parse TRANSPORT response
 * @param {Array<string>} params - Parameters from parsed response
 * @returns {Object} Transport state object
 */
export function parseTransport(params) {
  if (!params || params.length < 2) {
    return null
  }

  // TRANSPORT response format from Reaper:
  // playstate \t position_seconds \t isRepeatOn \t position_string \t position_string_beats
  // playstate is a bitmask: 0=stopped, 1=playing, 2=paused, 5=recording, 6=rec paused
  const playstate = parseInt(params[0], 10) || 0
  const position = params[1] || 0
  const positionString = formatTime.fromSeconds(position) || '00:00.000' // Time format (seconds)
  const isLooping = params[2] === '1'

  // Additional params (may vary by Reaper version)

  const positionBars = params[4] || '1.1.00' // Bar.beat.fraction format

  // Parse playstate flags
  const isPlaying = (playstate & 1) !== 0
  const isRecording = (playstate & 5) !== 0

  return {
    originalResponse: params,
    state: playstate,
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

/**
 * Parse TRACK response
 * @param {Array<string>} params - Parameters from parsed response
 * @returns {Object} Track info object
 */
export function parseTrack(params) {
  if (!params || params.length < 6) {
    return null
  }

  const [index, name, flags, volume, pan] = params

  return {
    index: parseInt(index, 10),
    name: name.replace(/^"|"$/g, ''), // Remove quotes
    flags: parseInt(flags, 10),
    volume: parseFloat(volume),
    pan: parseFloat(pan),
    isMuted: (parseInt(flags, 10) & 8) !== 0,
    isSoloed: (parseInt(flags, 10) & 16) !== 0,
    isRecordArmed: (parseInt(flags, 10) & 64) !== 0,
    isSelected: (parseInt(flags, 10) & 2) !== 0,
  }
}

/**
 * Parse BEAT response
 * @param {Array<string>} params - Parameters from parsed response
 * @returns {Object} Beat info object
 */
export function parseBeat(params) {
  if (!params || params.length < 4) {
    return null
  }

  const [beat, bpm, timeSigNum, timeSigDenom] = params

  return {
    beat: parseFloat(beat),
    bpm: parseFloat(bpm),
    timeSigNum: parseInt(timeSigNum, 10),
    timeSigDenom: parseInt(timeSigDenom, 10),
    timeSig: `${timeSigNum}/${timeSigDenom}`,
  }
}

/**
 * Parse EXTSTATE response
 * @param {Array<string>} params - Parameters from parsed response
 * @returns {Object} ExtState object
 */
export function parseExtState(params) {
  if (!params || params.length < 3) {
    return null
  }

  const namespace = params[0]
  const key = params[1]
  const value = params[2] || ''

  // Decode special characters (\n, \t, \\)
  const decodedValue = value
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')

  return {
    namespace,
    key,
    value: decodedValue === 'null' ? null : decodedValue, // Treat 'null' string as null
  }
}

/**
 * Get transport state as text
 * @param {number} playstate - Playstate value from transport
 * @returns {string} Human-readable state
 */
export function getTransportStateText(playstate) {
  switch (parseInt(playstate, 10)) {
    case 0:
      return 'STOPPED'
    case 1:
      return 'PLAYING'
    case 2:
      return 'PAUSED'
    case 5:
      return 'RECORDING'
    case 6:
      return 'REC PAUSED'
    default:
      return 'UNKNOWN'
  }
}

/**
 * Format time position (seconds to mm:ss.ms)
 * @param {string|number} position - Position in seconds or time string
 * @returns {string} Formatted time string
 */
export function formatPosition(position) {
  if (typeof position === 'string' && position.includes(':')) {
    return position // Already formatted
  }

  const seconds = parseFloat(position)
  if (isNaN(seconds)) {
    return '00:00.000'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(
    2,
    '0'
  )}.${String(ms).padStart(3, '0')}`
}
