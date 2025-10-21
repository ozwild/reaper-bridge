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

/** Utility to convert linear volume (0.0 - 1.0) to decibels and provide helper methods */
export function withVolume(volume: number): {
  decibels: number
  toString: () => string
  linearPercent: (minDb?: number, maxDb?: number) => number
  linearPercentWithCurve: (
    minDb?: number,
    maxDb?: number,
    curve?: number
  ) => number
  logarithmicPercent: (minDb?: number, maxDb?: number) => number
} {
  let db: number
  if (volume <= 0) {
    db = -Infinity // Representing silence
  }
  db = 20 * Math.log10(volume)
  return {
    decibels: db,
    toString: (): string => {
      if (db === -Infinity) {
        return '-∞ dB'
      }
      return db.toFixed(1) + ' dB'
    },
    linearPercent: (minDb = -130, maxDb = 12) => {
      const clampedDb = Math.max(minDb, Math.min(db, maxDb))

      const percent = ((clampedDb - minDb) / (maxDb - minDb)) * 100

      return percent
    },
    linearPercentWithCurve: (minDb = -130, maxDb = 12, curve = 2.5) => {
      const clampedDb = Math.max(minDb, Math.min(db, maxDb))
      const normalized = (clampedDb - minDb) / (maxDb - minDb)
      const curved = Math.pow(normalized, curve)
      return curved * 100
    },
    logarithmicPercent: (minDb = -130, maxDb = 12) => {
      // Clamp input
      const clampedDb = Math.max(minDb, Math.min(db, maxDb))

      // Shift range to positive domain
      const shifted = clampedDb + Math.abs(minDb)

      // Apply tuned logarithmic curve
      const percent = Math.pow(shifted / 142, 2.2) * 100

      return Math.max(0, Math.min(percent, 100))
    },
  }
}
