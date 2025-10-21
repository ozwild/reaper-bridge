export interface ReaperAPIConfig {
  connection: {
    host: string
    port: string
    failureThreshold?: number
    pollingInterval?: number
  }
}

export const DEFAULT_CONFIG: ReaperAPIConfig = {
  connection: {
    host: '192.168.1.36',
    port: '8080',
    failureThreshold: 3,
    pollingInterval: 500, // ms
  },
}
