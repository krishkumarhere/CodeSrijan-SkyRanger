// src/config.js
export const API_BASE = '/api'
export const WS_TELEMETRY = '/ws/telemetry'  // ← Changed from '/ws' to '/ws/telemetry'
export const STREAM_URL = '/stream/stream'

export const API = {
    health: `${API_BASE}/health`,
    telemetry: `${API_BASE}/telemetry`,
    mission: `${API_BASE}/mission`,
    uploadMission: `${API_BASE}/upload_mission`,
}