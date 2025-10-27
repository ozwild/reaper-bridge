import { VOLUME_INTERPOLATION_POINTS } from './constants.js'

export function validateConnectionSettings(host: string, port: string) {
  const errors: string[] = []

  if (!host || host.trim() === '') {
    errors.push('Host is required')
  }

  const portNum = parseInt(port, 10)
  if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535) {
    errors.push('Port must be between 1 and 65535')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/** Format time utilities */
export const formatTime = {
  fromSeconds: (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)

    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0')
  },
}

/** Volume conversion utilities */

const fromDecibels = (
  db: number
): {
  toFaderScale: () => number
  toString: (fractionDigits?: number) => string
  toAmplitude: () => number
} => ({
  toString: (fractionDigits = 1): string => {
    if (db === -Infinity) {
      return '-∞ dB'
    }
    return db.toFixed(fractionDigits) + ' dB'
  },
  toAmplitude: () => {
    return db <= -150 ? 0 : Math.pow(10, db / 20)
  },
  toFaderScale: () => {
    const points = VOLUME_INTERPOLATION_POINTS
    const clamped = Math.max(-150, Math.min(db, 12))

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      if (clamped >= p1.db && clamped <= p2.db) {
        const t = (clamped - p1.db) / (p2.db - p1.db)
        return p1.percent + t * (p2.percent - p1.percent)
      }
    }

    return clamped <= -150 ? 0 : 1
  },
})

const fromAmplitude = (
  volume: number
): {
  toDecibels: () => number
  toString: () => string
  toFaderScale: () => number
} => {
  const db = volume <= 0 ? -Infinity : 20 * Math.log10(volume)
  return {
    toDecibels: () => db,
    toString: fromDecibels(db).toString,
    toFaderScale: fromDecibels(db).toFaderScale,
  }
}

const fromFaderScale = (
  percent: number
): {
  toDecibels: () => number
  toString: (fractionDigits?: number) => string
  toAmplitude: () => number
} => {
  const db = (() => {
    const points = VOLUME_INTERPOLATION_POINTS

    const clamped = Math.max(0, Math.min(percent, 1))

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      if (clamped >= p1.percent && clamped <= p2.percent) {
        const t = (clamped - p1.percent) / (p2.percent - p1.percent)
        return p1.db + t * (p2.db - p1.db)
      }
    }

    return clamped <= 0 ? -150 : 12
  })() as number

  return {
    toDecibels: () => db,
    toString: fromDecibels(db).toString,
    toAmplitude: fromDecibels(db).toAmplitude,
  }
}

export const volumeUtils = {
  fromDecibels,
  fromAmplitude,
  fromFaderScale,
}
