const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

const elevationCache = new Map()
const slopeCache = new Map()
const weatherCache = new Map()
const WHEELCHAIR_BLOCKED_HIGHWAYS = ['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link']

export const WIND_THRESHOLDS = {
  MODERATE: 20,
  STRONG: 40,
  VERY_STRONG: 60
}

export async function fetchWeather(lat, lon) {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`
  if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey)
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,temperature_2m',
      wind_speed_unit: 'kmh',
      forecast_days: 1
    })
    const resp = await fetch(`${OPEN_METEO_URL}?${params}`)
    if (!resp.ok) throw new Error(`Open-Meteo hata: ${resp.status}`)
    const data = await resp.json()
    const current = data.current
    const result = {
      windSpeed: current.wind_speed_10m,
      windGusts: current.wind_gusts_10m,
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      temperature: current.temperature_2m,
      windWarning: classifyWind(current.wind_speed_10m, current.wind_gusts_10m),
      fetchedAt: Date.now()
    }
    weatherCache.set(cacheKey, result)
    setTimeout(() => weatherCache.delete(cacheKey), 10 * 60 * 1000)
    return result
  } catch (e) {
    console.warn('fetchWeather hata:', e)
    return null
  }
}

export function classifyWind(windSpeed, windGusts) {
  const effective = Math.max(windSpeed ?? 0, (windGusts ?? 0) * 0.7)
  if (effective >= WIND_THRESHOLDS.VERY_STRONG) {
    return {
      level: 'very_strong',
      safe: false,
      text: 'Çok Şiddetli Rüzgar',
      emoji: '🌪️',
      color: '#ef4444',
      message: `Rüzgar hızı ${windSpeed} km/s, gusts ${windGusts} km/s. Tekerlekli sandalye ile dışarı çıkmak çok tehlikeli! Seyahati ertelemeniz önerilir. UÇABİLİRSİNİZ!!!`
    }
  }
  if (effective >= WIND_THRESHOLDS.STRONG) {
    return {
      level: 'strong',
      safe: false,
      text: 'Şiddetli Rüzgar',
      emoji: '💨',
      color: '#f97316',
      message: `Rüzgar hızı ${windSpeed} km/s. Açık alanda güçlük çekebilirsiniz. Korunaklı rotalar tercih edin.`
    }
  }
  if (effective >= WIND_THRESHOLDS.MODERATE) {
    return {
      level: 'moderate',
      safe: true,
      text: 'Orta Şiddetli Rüzgar',
      emoji: '🌬️',
      color: '#eab308',
      message: `Rüzgar hızı ${windSpeed} km/s. Dikkatli olun, yüksek ve açık alanlarda zorluk yaşayabilirsiniz.`
    }
  }
  return {
    level: 'calm',
    safe: true,
    text: 'Sakin',
    emoji: '✅',
    color: '#22c55e',
    message: null
  }
}

export function windDirectionText(degrees) {
  if (degrees === null || degrees === undefined) return ''
  const dirs = ['Kuzey', 'Kuzeydoğu', 'Doğu', 'Güneydoğu', 'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı']
  return dirs[Math.round(degrees / 45) % 8]
}

export async function searchNominatim(query, limit = 10, lat = null, lon = null) {
  const params = new URLSearchParams({ q: query, format: 'json', limit, addressdetails: 1, extratags: 1 })
  if (lat !== null && lon !== null) {
    params.set('viewbox', `${lon - 0.1},${lat - 0.1},${lon + 0.1},${lat + 0.1}`)
    params.set('bounded', '1')
  }
  const resp = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { Accept: 'application/json', 'Accept-Language': 'tr,en' } })
  if (!resp.ok) throw new Error(`Nominatim hata: ${resp.status}`)
  return resp.json()
}

export async function fetchElevationBatch(locations) {
  if (!locations || locations.length === 0) return []
  const cacheKey = locations.map(l => `${l.latitude.toFixed(4)},${l.longitude.toFixed(4)}`).join('|')
  if (elevationCache.has(cacheKey)) return elevationCache.get(cacheKey)
  const CHUNK_SIZE = 100
  if (locations.length <= CHUNK_SIZE) {
    const result = await _fetchElevationChunk(locations)
    if (result) elevationCache.set(cacheKey, result)
    return result
  }
  const chunks = []
  for (let i = 0; i < locations.length; i += CHUNK_SIZE) chunks.push(locations.slice(i, i + CHUNK_SIZE))
  const CONCURRENCY = 4
  const allElevations = new Array(locations.length)
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(chunk => _fetchElevationChunk(chunk)))
    let offset = i * CHUNK_SIZE
    results.forEach(res => {
      if (res) res.forEach((e, j) => { allElevations[offset + j] = e })
      offset += CHUNK_SIZE
    })
  }
  elevationCache.set(cacheKey, allElevations)
  return allElevations
}

async function _fetchElevationChunk(locations) {
  try {
    const resp = await fetch(ELEVATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ locations })
    })
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data.results) return null
    return data.results.map(r => r.elevation)
  } catch {
    return null
  }
}

export async function fetchRoadSlopeForPlace(lat, lon) {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`
  if (slopeCache.has(cacheKey)) return slopeCache.get(cacheKey)

  const query = `[out:json][timeout:5];
(
  way["highway"]["highway"!="footway"]["highway"!="steps"]["highway"!="path"](around:50,${lat.toFixed(6)},${lon.toFixed(6)});
);
out geom 1;`
  try {
    const resp = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    })
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data.elements || data.elements.length === 0) return null
    const el = data.elements[0]
    let result = null
    if (el.tags && el.tags.incline) {
      const { percent, degrees } = parseInclineTag(el.tags.incline)
      const { difficulty, wheelchairOK } = classifySlopeDifficulty(Math.abs(percent))
      result = {
        slope_percent: Math.abs(percent), slope_degrees: Math.abs(degrees),
        avg_slope_percent: Math.abs(percent), max_slope_percent: Math.abs(percent), min_slope_percent: Math.abs(percent),
        direction: inclineDirection(el.tags.incline), difficulty, wheelchair_ok: wheelchairOK,
        surface: el.tags.surface || '', smoothness: el.tags.smoothness || '', highway_type: el.tags.highway || '',
        name: el.tags.name || '', osm_source: 'overpass', elevation_source: 'osm-incline-tag', sample_points: 1
      }
    } else if (el.geometry && el.geometry.length >= 2) {
      result = await calculateRoadSlopeFromGeometry(el.geometry, el.tags || {})
    }
    if (result) slopeCache.set(cacheKey, result)
    return result
  } catch {
    return null
  }
}

async function calculateRoadSlopeFromGeometry(geometry, tags) {
  const maxSamples = 3
  const step = Math.max(1, Math.floor(geometry.length / maxSamples))
  const selected = []
  for (let i = 0; i < geometry.length && selected.length < maxSamples; i += step) selected.push(geometry[i])
  const last = geometry[geometry.length - 1]
  if (selected[selected.length - 1] !== last) selected.push(last)
  const elevations = await fetchElevationBatch(selected.map(g => ({ latitude: g.lat, longitude: g.lon })))
  if (!elevations || elevations.length < 2) return null
  const slopes = []
  for (let i = 1; i < selected.length && i < elevations.length; i++) {
    const dist = calculateDistance(selected[i - 1].lat, selected[i - 1].lon, selected[i].lat, selected[i].lon)
    if (dist > 0) slopes.push(((elevations[i] - elevations[i - 1]) / dist) * 100)
  }
  if (slopes.length === 0) return null
  const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length
  const absAvg = Math.abs(avgSlope)
  const maxSlope = Math.max(...slopes.map(Math.abs))
  const minSlope = Math.min(...slopes.map(Math.abs))
  const totalElevDiff = elevations[elevations.length - 1] - elevations[0]
  const { difficulty, wheelchairOK } = classifySlopeDifficulty(absAvg)
  return {
    slope_percent: absAvg, slope_degrees: Math.atan(absAvg / 100) * 180 / Math.PI,
    avg_slope_percent: absAvg, max_slope_percent: maxSlope, min_slope_percent: minSlope,
    direction: elevationDirection(totalElevDiff), difficulty, wheelchair_ok: wheelchairOK,
    surface: tags.surface || '', smoothness: tags.smoothness || '', highway_type: tags.highway || '',
    name: tags.name || '', osm_source: 'overpass', elevation_source: 'open-elevation', sample_points: selected.length
  }
}

export async function fetchWheelchairWaypoints(startCoords, endCoords) {
  const totalDist = calculateDistance(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon)
  const pad = Math.max(0.005, totalDist / 111000 * 0.3)
  const minLat = Math.min(startCoords.lat, endCoords.lat) - pad
  const maxLat = Math.max(startCoords.lat, endCoords.lat) + pad
  const minLon = Math.min(startCoords.lon, endCoords.lon) - pad
  const maxLon = Math.max(startCoords.lon, endCoords.lon) + pad
  const query = `[out:json][timeout:15];
(
  way["highway"~"^(footway|pedestrian|path|living_street)$"]["wheelchair"!="no"](${minLat},${minLon},${maxLat},${maxLon});
  way["footway"~"^(sidewalk|crossing)$"](${minLat},${minLon},${maxLat},${maxLon});
  way["sidewalk"~"^(yes|both|left|right)$"](${minLat},${minLon},${maxLat},${maxLon});
  way["highway"="residential"]["wheelchair"!="no"](${minLat},${minLon},${maxLat},${maxLon});
  way["highway"]["wheelchair"~"^(yes|designated)$"](${minLat},${minLon},${maxLat},${maxLon});
);
out geom;`
  try {
    const resp = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    })
    if (!resp.ok) return []
    const data = await resp.json()
    if (!data.elements || data.elements.length === 0) return []
    const candidates = []
    for (const el of data.elements) {
      if (!el.geometry || el.geometry.length === 0) continue
      const hw = (el.tags && el.tags.highway) || ''
      if (WHEELCHAIR_BLOCKED_HIGHWAYS.includes(hw)) continue
      for (const pt of el.geometry) {
        const distToLine = pointToLineDistance(pt.lat, pt.lon, startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon)
        const distFromStart = calculateDistance(startCoords.lat, startCoords.lon, pt.lat, pt.lon)
        const distFromEnd = calculateDistance(endCoords.lat, endCoords.lon, pt.lat, pt.lon)
        if (distFromStart < 30 || distFromEnd < 30) continue
        const threshold = Math.max(80, totalDist * 0.08)
        if (distToLine < threshold) {
          let score = 0
          if (el.tags?.wheelchair === 'yes' || el.tags?.wheelchair === 'designated') score += 10
          if (['footway', 'pedestrian', 'path'].includes(hw)) score += 5
          if (el.tags?.footway === 'sidewalk' || el.tags?.sidewalk) score += 8
          candidates.push({ lat: pt.lat, lon: pt.lon, distFromStart, distToLine, score })
        }
      }
    }
    if (candidates.length === 0) return []
    candidates.sort((a, b) => a.distFromStart - b.distFromStart)
    const deduped = [candidates[0]]
    for (let i = 1; i < candidates.length; i++) {
      const prev = deduped[deduped.length - 1]
      if (calculateDistance(prev.lat, prev.lon, candidates[i].lat, candidates[i].lon) > 60) deduped.push(candidates[i])
    }
    const step = Math.max(1, Math.floor(deduped.length / 8))
    const result = []
    for (let i = 0; i < deduped.length && result.length < 8; i += step) result.push(deduped[i])
    return result
  } catch {
    return []
  }
}

export async function enrichWithSlopesParallel(items, onUpdate) {
  const BATCH_SIZE = 3
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const promises = batch.map(item => fetchRoadSlopeForPlace(item.lat, item.lon))
    const slopes = await Promise.all(promises)
    batch.forEach((item, idx) => {
      if (slopes[idx]) {
        item.road_slope = slopes[idx]
        if (onUpdate) onUpdate(item, items.indexOf(item))
      }
    })
  }
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function pointToLineDistance(pLat, pLon, aLat, aLon, bLat, bLon) {
  const ax = aLon, ay = aLat, bx = bLon, by = bLat, px = pLon, py = pLat
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return calculateDistance(pLat, pLon, aLat, aLon)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return calculateDistance(pLat, pLon, ay + t * dy, ax + t * dx)
}

export function getSlopeColor(slope) {
  const abs = Math.abs(slope)
  if (abs < 2) return '#22c55e'
  if (abs < 5) return '#86efac'
  if (abs < 8) return '#eab308'
  if (abs < 12) return '#f97316'
  return '#ef4444'
}

export function getSlopeEmoji(slope) {
  const abs = Math.abs(slope)
  if (abs < 2) return '✅'
  if (abs < 5) return '👍'
  if (abs < 8) return '⚠️'
  if (abs < 12) return '🔺'
  return '🚫'
}

export function getDifficultyText(slope) {
  const abs = Math.abs(slope)
  if (abs < 2) return 'Çok Kolay'
  if (abs < 5) return 'Kolay'
  if (abs < 8) return 'Orta'
  if (abs < 12) return 'Zor'
  return 'Çok Zor'
}

export function classifySlopeDifficulty(abs) {
  if (abs < 2) return { difficulty: 'very_easy', wheelchairOK: true }
  if (abs < 5) return { difficulty: 'easy', wheelchairOK: true }
  if (abs < 8) return { difficulty: 'moderate', wheelchairOK: false }
  if (abs < 12) return { difficulty: 'difficult', wheelchairOK: false }
  return { difficulty: 'very_difficult', wheelchairOK: false }
}

export function parseInclineTag(incline) {
  incline = incline.trim()
  if (incline.includes('%')) {
    const v = parseFloat(incline.replace('%', '').trim())
    if (!isNaN(v)) return { percent: v, degrees: Math.atan(v / 100) * 180 / Math.PI }
  }
  const v = parseFloat(incline)
  if (!isNaN(v)) return { percent: v, degrees: Math.atan(v / 100) * 180 / Math.PI }
  const map_ = { up: 5, down: -5, steep: 15 }
  const pct = map_[incline.toLowerCase()] || 0
  return { percent: pct, degrees: Math.atan(Math.abs(pct) / 100) * 180 / Math.PI }
}

export function inclineDirection(raw) {
  raw = raw.trim()
  if (raw === 'down') return 'downhill'
  if (raw === 'up') return 'uphill'
  const v = parseFloat(raw.replace('%', ''))
  if (!isNaN(v)) return v > 0 ? 'uphill' : v < 0 ? 'downhill' : 'flat'
  return 'flat'
}

export function elevationDirection(diff) {
  if (diff > 1) return 'uphill'
  if (diff < -1) return 'downhill'
  return 'flat'
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export { slopeCache, elevationCache, weatherCache }
