import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet"
import { useEffect } from "react"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// Drone icon
const droneIcon = new L.Icon({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// SVG to UTF-8-safe data URL helper
const svgToDataUrl = (svg) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

// Waypoint icon
const waypointIcon = new L.Icon({
  iconUrl: svgToDataUrl(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2"/>
      <text x="12" y="16" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">W</text>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// Current waypoint icon (highlighted)
const currentWaypointIcon = new L.Icon({
  iconUrl: svgToDataUrl(`
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#10b981" stroke="white" stroke-width="3"/>
      <text x="14" y="18" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">W</text>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

// Completed waypoint icon
const completedWaypointIcon = new L.Icon({
  iconUrl: svgToDataUrl(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#6b7280" stroke="white" stroke-width="2"/>
      <text x="12" y="16" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">✓</text>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// ✅ Strict validation function
const isValidCoordinate = (val) =>
  typeof val === "number" && !isNaN(val) && isFinite(val)

// Map auto-follow (SAFE)
function MapFollower({ lat, lon }) {
  const map = useMap()

  useEffect(() => {
    if (isValidCoordinate(lat) && isValidCoordinate(lon)) {
      map.setView([lat, lon], map.getZoom())
    }
  }, [lat, lon])

  return null
}

// Default fallback (JUET Guna)
const DEFAULT_POSITION = [24.647287, 77.319182]

function MapPanel({ lat, lon, flightPath = [], waypoints = [], currentWaypointIndex = 0 }) {
  // ✅ Validate incoming GPS
  const hasCoordinates =
    isValidCoordinate(lat) && isValidCoordinate(lon)

  const position = hasCoordinates
    ? [lat, lon]
    : DEFAULT_POSITION

  // ✅ Clean flight path (VERY IMPORTANT)
  const cleanFlightPath = flightPath.filter(
    ([pLat, pLon]) =>
      isValidCoordinate(pLat) && isValidCoordinate(pLon)
  )

  // 🔍 Debug (remove later)
  console.log("GPS:", lat, lon)

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <MapContainer
        center={DEFAULT_POSITION} // Only used on first load
        zoom={17}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri"
        />
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri Labels"
/>
        {/* Auto follow only when valid */}
        {hasCoordinates && <MapFollower lat={lat} lon={lon} />}

        {/* Drone marker */}
        {hasCoordinates && (
          <Marker position={[lat, lon]} icon={droneIcon}>
            <Popup>
              <div style={{ fontFamily: "monospace", fontSize: "11px" }}>
                <div>🚁 Drone Position</div>
                <div>Lat: {lat.toFixed(6)}</div>
                <div>Lon: {lon.toFixed(6)}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Waypoint markers */}
        {waypoints.map((waypoint, index) => {
          let icon = waypointIcon
          if (index === currentWaypointIndex) {
            icon = currentWaypointIcon
          } else if (index < currentWaypointIndex) {
            icon = completedWaypointIcon
          }

          return (
            <Marker
              key={waypoint.id}
              position={[waypoint.lat, waypoint.lon]}
              icon={icon}
            >
              <Popup>
                <div style={{ fontFamily: "monospace", fontSize: "11px" }}>
                  <div>📍 {waypoint.name}</div>
                  <div>Lat: {waypoint.lat.toFixed(6)}</div>
                  <div>Lon: {waypoint.lon.toFixed(6)}</div>
                  <div>Order: {index + 1}</div>
                  <div>Status: {
                    index === currentWaypointIndex ? "CURRENT" :
                    index < currentWaypointIndex ? "COMPLETED" : "UPCOMING"
                  }</div>
                  {waypoint.alt && <div>Target Alt: {waypoint.alt}m</div>}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Flight path */}
        {cleanFlightPath.length > 1 && (
          <Polyline
            positions={cleanFlightPath}
            color="#f59e0b"
            weight={2}
            opacity={0.6}
          />
        )}

        {/* Waypoint path */}
        {waypoints.length > 1 && (
          <Polyline
            positions={waypoints.map(wp => [wp.lat, wp.lon])}
            color="#3b82f6"
            weight={3}
            opacity={0.8}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  )
}

export default MapPanel