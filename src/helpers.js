/**
 * Validate Reaper connection settings
 */
export function validateConnectionSettings(host, port) {
  const errors = []

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