import type {
  TransportStateResponse,
  TrackStateResponse,
  MarkerStateResponse,
  RegionStateResponse,
  BeatStateResponse,
} from './responseParser.js'

export type StateType = 'transport' | 'tracks' | 'markers' | 'regions' | 'beat'

export interface StateSubscriptionConfig {
  transport?: boolean
  tracks?: boolean
  markers?: boolean
  regions?: boolean
  beat?: boolean
}

export interface StateCallbacks {
  transport?: (state: TransportStateResponse | null) => void
  tracks?: (state: TrackStateResponse[] | null) => void
  markers?: (state: MarkerStateResponse[] | null) => void
  regions?: (state: RegionStateResponse[] | null) => void
  beat?: (state: BeatStateResponse | null) => void
}

export interface StateData {
  transport: TransportStateResponse | null
  tracks: TrackStateResponse[] | null
  markers: MarkerStateResponse[] | null
  regions: RegionStateResponse[] | null
  beat: BeatStateResponse | null
}

export type StateSubscriptionCallback<T extends StateType> = (
  state: StateData[T]
) => void

export class StateSubscriptionManager {
  private subscriptions = new Map<StateType, Set<StateSubscriptionCallback<any>>>()
  private activeStates = new Set<StateType>()
  private currentState: StateData = {
    transport: null,
    tracks: null,
    markers: null,
    regions: null,
    beat: null,
  }

  /**
   * Subscribe to a specific state type
   */
  subscribe<T extends StateType>(
    stateType: T,
    callback: StateSubscriptionCallback<T>
  ): () => void {
    if (!this.subscriptions.has(stateType)) {
      this.subscriptions.set(stateType, new Set())
    }

    this.subscriptions.get(stateType)!.add(callback)
    this.activeStates.add(stateType)

    // If we already have data, call the callback immediately
    if (this.currentState[stateType] !== null) {
      callback(this.currentState[stateType])
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(stateType)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.subscriptions.delete(stateType)
          this.activeStates.delete(stateType)
        }
      }
    }
  }

  /**
   * Update state and notify all subscribers
   */
  updateState<T extends StateType>(stateType: T, data: StateData[T]): void {
    this.currentState[stateType] = data

    const callbacks = this.subscriptions.get(stateType)
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(data)
      })
    }
  }

  /**
   * Get currently active state types
   */
  getActiveStates(): StateType[] {
    return Array.from(this.activeStates)
  }

  /**
   * Get current state value for a specific type
   */
  getCurrentState<T extends StateType>(stateType: T): StateData[T] {
    return this.currentState[stateType]
  }

  /**
   * Check if a state type has subscribers
   */
  hasSubscribers(stateType: StateType): boolean {
    const callbacks = this.subscriptions.get(stateType)
    return callbacks ? callbacks.size > 0 : false
  }

  /**
   * Get the polling commands for all active subscriptions
   */
  getPollingCommands(): string[] {
    const commands: string[] = []

    this.activeStates.forEach((stateType) => {
      switch (stateType) {
        case 'transport':
          commands.push('TRANSPORT')
          break
        case 'tracks':
          commands.push('TRACK')
          break
        case 'markers':
          commands.push('MARKER')
          break
        case 'regions':
          commands.push('REGION')
          break
        case 'beat':
          commands.push('BEATPOS')
          break
      }
    })

    return commands
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear()
    this.activeStates.clear()
    this.currentState = {
      transport: null,
      tracks: null,
      markers: null,
      regions: null,
      beat: null,
    }
  }
}