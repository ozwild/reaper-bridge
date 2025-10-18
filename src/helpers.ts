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
    const ms = Math.floor((seconds % 1) * 1000)

    return (
      String(mins).padStart(2, '0') +
      ':' +
      String(secs).padStart(2, '0') +
      '.' +
      String(ms).padStart(3, '0')
    )
  },
}
