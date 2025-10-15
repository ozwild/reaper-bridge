/**
 * Reaper Command Constants Dictionary
 * Organized by the 4 communication channels
 */

export const REAPER_CHANNELS = {
  // Channel 1: Action Commands (discrete actions via command IDs)
  ACTIONS: {
    TRANSPORT: {
      PLAY_STOP: '40044',
      STOP: '40667',
      RECORD: '1013',
      LOOP: '1068',
      PAUSE: '1008',
    },
    NAVIGATION: {
      PREVIOUS_MARKER: '40172',
      NEXT_MARKER: '40173',
      PREVIOUS_TRACK: '40285',
      NEXT_TRACK: '40286',
    },
    PROJECT: {
      NEW: '40023',
      OPEN: '40025',
      SAVE: '40026',
      SAVE_AS: '40022',
    },
    TABS: {
      NEXT: '40861',
      PREVIOUS: '40862',
      CLOSE: '40860',
    },
    TRACKS: {
      INSERT: '40006',
      DUPLICATE: '40421',
      CLONE_NO_MEDIA: '40297',
    },
    MIXER: {
      TOGGLE_MUTE_ALL: '14',
      TOGGLE_SOLO_ALL: '40345',
    },
  },

  // Channel 2: Direct Property Control (SET/GET object properties)
  PROPERTIES: {
    TRACK: {
      mute: (index, value = -1) => `SET/TRACK/${index}/MUTE/${value}`,
      solo: (index, value = -1) => `SET/TRACK/${index}/SOLO/${value}`,
      recarm: (index, value = -1) => `SET/TRACK/${index}/RECARM/${value}`,
      volume: (index, value) => `SET/TRACK/${index}/VOL/${value}`,
      pan: (index, value) => `SET/TRACK/${index}/PAN/${value}`,
      name: (index, name) =>
        `SET/TRACK/${index}/NAME/${encodeURIComponent(name)}`,
      get: (index) => `TRACK/${index}`,
    },
    TRANSPORT: {
      get: () => `TRANSPORT`,
    },
    POSITION: {
      set: (seconds) => `SET/POS/${seconds}`,
      setString: (timeStr) => `SET/POS_STR/${encodeURIComponent(timeStr)}`,
    },
    REPEAT: {
      set: (value) => `SET/REPEAT/${value}`, // -1=toggle, 0=off, 1=on
      get: () => `GET/REPEAT`,
    },
    QUERIES: {
      trackCount: () => `NTRACK`,
      beat: () => `BEAT`,
    },
  },

  // Channel 3: External State (data storage for ReaScript communication)
  EXTSTATE: {
    set: (namespace, key, value) =>
      `SET/EXTSTATE/${namespace}/${key}/${encodeURIComponent(value)}`,
    get: (namespace, key) => `GET/EXTSTATE/${namespace}/${key}`,
    setPersist: (namespace, key, value) =>
      `SET/EXTSTATEPERSIST/${namespace}/${key}/${encodeURIComponent(value)}`,
    setProject: (section, key, value) =>
      `SET/PROJEXTSTATE/${section}/${key}/${encodeURIComponent(value)}`,
    getProject: (section, key) => `GET/PROJEXTSTATE/${section}/${key}`,
  },

  // Channel 4: OSC Events (trigger ReaScript actions)
  OSC: {
    trigger: (address, arg) => `OSC/${address}/${arg}`,

    // Known OSC mappings
    OSWORKS: {
      namespace: 'osworks',
      address: 'osworks',
      operations: {
        OPEN_PROJECT: 1,
      },
    },
  },
}

// Transport states (for parsing TRANSPORT responses)
export const TRANSPORT_STATES = {
  STOPPED: 0,
  PLAYING: 1,
  PAUSED: 2,
  RECORDING: 5,
  RECORD_PAUSED: 6,
}

// Track flags (bitmask values for track state)
export const TRACK_FLAGS = {
  FOLDER: 1,
  SELECTED: 2,
  HAS_FX: 4,
  MUTED: 8,
  SOLOED: 16,
  SOLO_IN_PLACE: 32,
  RECORD_ARMED: 64,
  RECORD_MONITORING: 128,
  RECORD_MONITORING_AUTO: 256,
}

// Default configuration
export const DEFAULT_CONFIG = {
  connection: {
    host: '192.168.1.36',
    port: '8080',
    failureThreshold: 3,
    pollingInterval: 500, // ms
  },
}
