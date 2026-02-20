<template>
  <div class="app" :class="[theme, { 'vi-mode': accessibility.settings.visuallyImpaired, 'high-contrast': accessibility.settings.highContrast }]">
    <button class="menu-toggle-fixed" :class="{ open: menuOpen }" @click="menuOpen = !menuOpen" :aria-label="menuOpen ? 'Menüyü kapat' : 'Menüyü aç'">
      <i class="fa-solid fa-table-columns"></i>
    </button>

    <button class="a11y-fab" @click="accessibility.settingsOpen.value = true" aria-label="Erişilebilirlik ayarları">
      <i class="fa-solid fa-universal-access"></i>
      <span v-if="accessibility.settings.visuallyImpaired" class="a11y-fab-dot"></span>
    </button>

    <aside class="sidebar" :class="{ open: menuOpen }" role="navigation">
      <div class="logo">
        <i class="fa-solid fa-wheelchair"></i>
        <span>ErişimNavi</span>
      </div>

      <div class="sidebar-content">
        <div class="mode-tabs">
          <button class="mode-tab" :class="{ active: currentMode === 'search' }" @click="switchMode('search')">
            <i class="fa-solid fa-magnifying-glass"></i> Ara
          </button>
          <button class="mode-tab" :class="{ active: currentMode === 'route' }" @click="switchMode('route')">
            <i class="fa-solid fa-route"></i> Rota
          </button>
        </div>

        <div v-if="currentMode === 'search'" class="search-panel">
          <div class="input-wrapper">
            <i class="fa-solid fa-magnifying-glass input-icon"></i>
            <input type="text" class="panel-input" placeholder="Konum ara..." v-model="searchQuery" @keyup.enter="performSearch" aria-label="Konum arama" @focus="speakLabel('Konum arama alanı')" />
          </div>
          <button class="primary-btn" @click="performSearch">
            <i class="fa-solid fa-search"></i> Ara
          </button>
        </div>

        <div v-if="currentMode === 'route'" class="route-panel">
          <div class="route-inputs">
            <div class="route-input-row">
              <span class="route-label">Başlangıç</span>
              <div class="route-input-wrapper">
                <div class="route-dot start"></div>
                <div class="route-input-group">
                  <input type="text" class="panel-input" placeholder="Adres veya haritadan seç..." v-model="routeStart" @keyup.enter="focusRouteEnd" aria-label="Başlangıç adresi" @focus="speakLabel('Başlangıç noktası')" />
                  <button class="pick-btn" :class="{ active: pickingMode === 'start' }" @click="startPickingPoint('start')" aria-label="Haritadan başlangıç noktası seç">
                    <i class="fa-solid fa-location-crosshairs"></i> Haritadan Seç
                  </button>
                </div>
              </div>
            </div>
            <div class="route-connector"></div>
            <div class="route-input-row">
              <span class="route-label">Varış</span>
              <div class="route-input-wrapper">
                <div class="route-dot end"></div>
                <div class="route-input-group">
                  <input type="text" class="panel-input" placeholder="Adres veya haritadan seç..." v-model="routeEnd" @keyup.enter="calculateRoute" ref="routeEndRef" aria-label="Varış adresi" @focus="speakLabel('Varış noktası')" />
                  <button class="pick-btn" :class="{ active: pickingMode === 'end' }" @click="startPickingPoint('end')" aria-label="Haritadan varış noktası seç">
                    <i class="fa-solid fa-location-crosshairs"></i> Haritadan Seç
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="route-options">
            <label class="option-row">
              <input type="checkbox" v-model="wheelchairMode" />
              <i class="fa-solid fa-wheelchair"></i>
              <span>Tekerlekli Sandalye Modu</span>
            </label>
            <label class="option-row">
              <input type="checkbox" v-model="avoidSteep" />
              <i class="fa-solid fa-mountain"></i>
              <span>Dik Eğimlerden Kaçın</span>
            </label>
          </div>

          <button class="primary-btn" @click="calculateRoute">
            <i class="fa-solid fa-diamond-turn-right"></i> Rota Hesapla
          </button>
        </div>

        <div class="nav-divider"></div>

        <div v-if="routeInfoVisible" class="route-info-block" aria-live="polite">
          <div class="block-title"><i class="fa-solid fa-map-pin"></i> Rota Bilgisi</div>
          <div class="route-stats-grid">
            <div class="route-stat">
              <div class="stat-label">Mesafe</div>
              <div class="stat-value">{{ routeDistance }}</div>
            </div>
            <div class="route-stat">
              <div class="stat-label">Süre</div>
              <div class="stat-value">{{ routeDuration }}</div>
            </div>
          </div>
          <div v-if="wheelchairMode" class="wc-badge">
            <i class="fa-solid fa-wheelchair"></i>
            Erişilebilir rota — kaldırım ve yaya yolları tercih edildi.
          </div>
          <div class="legend-block">
            <div class="legend-title"><i class="fa-solid fa-palette"></i> Eğim Göstergesi</div>
            <div class="legend-list">
              <div class="legend-item"><span class="legend-dot" style="background:#22c55e;"></span><span>Düz (0–2%)</span></div>
              <div class="legend-item"><span class="legend-dot" style="background:#86efac;"></span><span>Hafif (2–5%)</span></div>
              <div class="legend-item"><span class="legend-dot" style="background:#eab308;"></span><span>Orta (5–8%)</span></div>
              <div class="legend-item"><span class="legend-dot" style="background:#f97316;"></span><span>Dik (8–12%)</span></div>
              <div class="legend-item"><span class="legend-dot" style="background:#ef4444;"></span><span>Çok Dik (12%+)</span></div>
            </div>
          </div>
        </div>

        <div v-if="statsVisible" class="stats-grid" aria-live="polite">
          <div class="stat-card">
            <div class="stat-card-label">Toplam Sonuç</div>
            <div class="stat-card-value">{{ totalCount }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Ort. Eğim</div>
            <div class="stat-card-value" :style="{ color: avgSlopeColor }">{{ avgSlopeText }}</div>
          </div>
        </div>

        <div class="result-list" role="list" aria-live="polite">
          <div
            v-for="(result, index) in results"
            :key="result.place_id || index"
            class="result-item"
            @click="focusResult(result, index)"
            role="listitem"
            tabindex="0"
            @keydown.enter="focusResult(result, index)"
          >
            <div class="result-header">
              <div class="result-number" :style="{ background: getSlopeColor(result.road_slope?.avg_slope_percent || 0) }">{{ index + 1 }}</div>
              <div class="result-title">{{ result.display_name }}</div>
            </div>
            <div class="result-meta">
              <span v-if="result.road_slope" class="result-badge" :style="{ background: getSlopeColor(result.road_slope.avg_slope_percent || 0) + '22', color: getSlopeColor(result.road_slope.avg_slope_percent || 0) }">
                {{ getSlopeEmoji(result.road_slope.avg_slope_percent || 0) }} {{ (result.road_slope.avg_slope_percent || 0).toFixed(1) }}% Eğim
                <span v-if="result.road_slope.elevation_source === 'estimated'" style="opacity:0.7;font-size:9px;">(tahmini)</span>
              </span>
              <span v-else class="result-badge muted">Hesaplanıyor...</span>
            </div>
          </div>
        </div>

        <div v-if="emptyState && results.length === 0" class="empty-state">
          <i class="fa-solid fa-map"></i>
          <p>Arama yapın veya rota oluşturun</p>
        </div>

        <div class="nav-divider"></div>

        <button class="nav-item theme-toggle" @click="toggleTheme">
          <i :class="theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'"></i>
          <span class="nav-text">{{ theme === 'light' ? 'Koyu Tema' : 'Açık Tema' }}</span>
        </button>

        <button class="nav-item" @click="accessibility.settingsOpen.value = true">
          <i class="fa-solid fa-universal-access"></i>
          <span class="nav-text">Erişilebilirlik</span>
        </button>
      </div>
    </aside>

    <div class="overlay" :class="{ visible: menuOpen }" @click="closeOverlay"></div>

    <div class="map-container" :class="{ 'picking-mode': !!pickingMode }">
      <div id="map"></div>
      <div class="picking-overlay" :class="{ active: !!pickingMode }">
        <div class="picking-text">
          <i class="fa-solid fa-crosshairs"></i>
          {{ pickingMode === 'start' ? 'Başlangıç' : 'Varış' }} noktasını haritadan seçin...
          <button class="cancel-pick" @click="stopPickingPoint">İptal</button>
        </div>
      </div>
    </div>

    <div class="loading-overlay" :class="{ active: loading }" role="status" aria-live="polite">
      <div class="spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>

    <AccessibilitySettings
      :open="accessibility.settingsOpen.value"
      :settings="accessibility.settings"
      :theme="theme"
      :speak="accessibility.speak"
      :stop-speaking="accessibility.stopSpeaking"
      @close="accessibility.settingsOpen.value = false"
      @update:settings="handleSettingsUpdate"
      @test-voice="handleTestVoice"
      @reset-settings="handleResetSettings"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAccessibility } from '../api/useAccessibility.js'
import AccessibilitySettings from './AccessibilitySettings.vue'

const route = useRoute()
const menuOpen = ref(false)
const theme = ref('light')
const currentMode = ref('search')
const searchQuery = ref('')
const routeStart = ref('')
const routeEnd = ref('')
const wheelchairMode = ref(true)
const avoidSteep = ref(true)
const pickingMode = ref(null)
const loading = ref(false)
const loadingText = ref('Yükleniyor...')
const emptyState = ref(true)
const statsVisible = ref(false)
const routeInfoVisible = ref(false)
const totalCount = ref(0)
const avgSlopeText = ref('0%')
const avgSlopeColor = ref('#22c55e')
const routeDistance = ref('')
const routeDuration = ref('')
const results = ref([])
const routeEndRef = ref(null)

const accessibility = useAccessibility()

let lastMaxSlope = 0

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const elevationCache = new Map()
const slopeCache = new Map()
const WHEELCHAIR_BLOCKED_HIGHWAYS = ['motorway','motorway_link','trunk','trunk_link','primary','primary_link']

let mapInstance = null
let markers = []
let routeControl = null
let routePolylines = []
let tempMarkers = { start: null, end: null }

const handleSettingsUpdate = (key, value) => {
  accessibility.updateSetting(key, value)
}

const handleTestVoice = () => {
  accessibility.speak('Merhaba! Bu ErişimNavi sesli okuma testidir. Tekerlekli sandalye dostu rotanız hazırlanıyor.')
}

const handleResetSettings = () => {
  accessibility.stopSpeaking()
  const defaults = ['visuallyImpaired', 'highContrast', 'voiceEnabled', 'announceRoute', 'announceSlope']
  const boolDefaults = { visuallyImpaired: false, highContrast: false, voiceEnabled: true, announceRoute: true, announceSlope: true }
  defaults.forEach(k => accessibility.updateSetting(k, boolDefaults[k]))
  accessibility.updateSetting('fontSize', 'normal')
  accessibility.updateSetting('speechRate', 1.0)
  accessibility.updateSetting('speechPitch', 1.0)
  accessibility.updateSetting('speechVolume', 1.0)
}

const speakLabel = (label) => {
  if (accessibility.settings.visuallyImpaired) {
    accessibility.speak(label, { interrupt: true })
  }
}

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('en-theme', theme.value)
}

const closeOverlay = () => {
  menuOpen.value = false
}

const getSlopeColor = (slope) => {
  const abs = Math.abs(slope)
  if (abs < 2) return '#22c55e'
  if (abs < 5) return '#86efac'
  if (abs < 8) return '#eab308'
  if (abs < 12) return '#f97316'
  return '#ef4444'
}

const getSlopeEmoji = (slope) => {
  const abs = Math.abs(slope)
  if (abs < 2) return '✅'
  if (abs < 5) return '👍'
  if (abs < 8) return '⚠️'
  if (abs < 12) return '🔺'
  return '🚫'
}

const getDifficultyText = (slope) => {
  const abs = Math.abs(slope)
  if (abs < 2) return 'Çok Kolay'
  if (abs < 5) return 'Kolay'
  if (abs < 8) return 'Orta'
  if (abs < 12) return 'Zor'
  return 'Çok Zor'
}

const classifySlopeDifficulty = (abs) => {
  if (abs < 2) return { difficulty: 'very_easy', wheelchairOK: true }
  if (abs < 5) return { difficulty: 'easy', wheelchairOK: true }
  if (abs < 8) return { difficulty: 'moderate', wheelchairOK: false }
  if (abs < 12) return { difficulty: 'difficult', wheelchairOK: false }
  return { difficulty: 'very_difficult', wheelchairOK: false }
}

const parseInclineTag = (incline) => {
  incline = incline.trim()
  if (incline.includes('%')) {
    const v = parseFloat(incline.replace('%','').trim())
    if (!isNaN(v)) return { percent: v, degrees: Math.atan(v/100)*180/Math.PI }
  }
  const v = parseFloat(incline)
  if (!isNaN(v)) return { percent: v, degrees: Math.atan(v/100)*180/Math.PI }
  const map_ = { up: 5, down: -5, steep: 15 }
  const pct = map_[incline.toLowerCase()] || 0
  return { percent: pct, degrees: Math.atan(Math.abs(pct)/100)*180/Math.PI }
}

const inclineDirection = (raw) => {
  raw = raw.trim()
  if (raw === 'down') return 'downhill'
  if (raw === 'up') return 'uphill'
  const v = parseFloat(raw.replace('%',''))
  if (!isNaN(v)) return v > 0 ? 'uphill' : v < 0 ? 'downhill' : 'flat'
  return 'flat'
}

const elevationDirection = (diff) => {
  if (diff > 1) return 'uphill'
  if (diff < -1) return 'downhill'
  return 'flat'
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000
  const dLat = (lat2-lat1)*Math.PI/180
  const dLon = (lon2-lon1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const pointToLineDistance = (pLat, pLon, aLat, aLon, bLat, bLon) => {
  const dx = bLon-aLon, dy = bLat-aLat
  const lenSq = dx*dx+dy*dy
  if (lenSq === 0) return calculateDistance(pLat,pLon,aLat,aLon)
  let t = ((pLon-aLon)*dx+(pLat-aLat)*dy)/lenSq
  t = Math.max(0,Math.min(1,t))
  return calculateDistance(pLat,pLon,aLat+t*dy,aLon+t*dx)
}

const showLoading = (show, text = 'Yükleniyor...') => {
  loading.value = show
  loadingText.value = text
  if (show && accessibility.settings.visuallyImpaired) {
    accessibility.announceLoading(text)
  }
}

const initMap = () => {
  const L = window.L
  mapInstance = L.map('map', { attributionControl: true, zoomControl: false }).setView([41.0082, 28.9784], 12)
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(mapInstance)
  mapInstance.createPane('routePane')
  mapInstance.getPane('routePane').style.zIndex = 450
  mapInstance.getPane('routePane').style.pointerEvents = 'none'
  mapInstance.on('click', handleMapClick)
  requestUserLocation()

  const fromParam = route.query.from
  const toParam = route.query.to
  if (fromParam || toParam) {
    currentMode.value = 'route'
    if (fromParam) routeStart.value = fromParam
    if (toParam) routeEnd.value = toParam
    if (fromParam && toParam) {
      menuOpen.value = true
      setTimeout(() => { calculateRoute() }, 800)
    }
  }
}

const requestUserLocation = () => {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords
      mapInstance.setView([latitude, longitude], 14)
      window.L.marker([latitude, longitude], {
        icon: window.L.divIcon({
          html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
          iconSize: [16,16],
          className: ''
        })
      }).addTo(mapInstance)
    },
    () => {}
  )
}

const handleMapClick = (e) => {
  if (!pickingMode.value) return
  const { lat, lng } = e.latlng
  const isStart = pickingMode.value === 'start'
  if (isStart) {
    routeStart.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    if (accessibility.settings.visuallyImpaired) accessibility.speak('Başlangıç noktası seçildi')
  } else {
    routeEnd.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    if (accessibility.settings.visuallyImpaired) accessibility.speak('Varış noktası seçildi')
  }
  if (tempMarkers[pickingMode.value]) mapInstance.removeLayer(tempMarkers[pickingMode.value])
  const color = isStart ? '#22c55e' : '#ef4444'
  const label = isStart ? 'A' : 'B'
  tempMarkers[pickingMode.value] = window.L.marker([lat, lng], {
    icon: window.L.divIcon({
      html: `<div style="width:32px;height:32px;background:${color};border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:13px;">${label}</div>`,
      iconSize: [32,32],
      className: ''
    })
  }).addTo(mapInstance)
  stopPickingPoint()
}

const startPickingPoint = (type) => {
  pickingMode.value = type
  menuOpen.value = false
  if (accessibility.settings.visuallyImpaired) {
    accessibility.speak(`${type === 'start' ? 'Başlangıç' : 'Varış'} noktasını seçmek için haritaya dokunun`)
  }
}

const stopPickingPoint = () => {
  pickingMode.value = null
}

const switchMode = (mode) => {
  currentMode.value = mode
  statsVisible.value = mode === 'search'
  routeInfoVisible.value = mode === 'route' && routeDistance.value !== ''
  emptyState.value = true
  results.value = []
  if (mode === 'search') stopPickingPoint()
  if (accessibility.settings.visuallyImpaired) {
    accessibility.speak(mode === 'search' ? 'Konum arama modu' : 'Rota hesaplama modu')
  }
}

const searchNominatim = async (query, limit = 10, lat = null, lon = null) => {
  const params = new URLSearchParams({ q: query, format: 'json', limit, addressdetails: 1, extratags: 1 })
  if (lat !== null && lon !== null) {
    params.set('viewbox', `${lon-0.1},${lat-0.1},${lon+0.1},${lat+0.1}`)
    params.set('bounded', '1')
  }
  const resp = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'Accept': 'application/json', 'Accept-Language': 'tr,en' } })
  if (!resp.ok) throw new Error(`Nominatim hata: ${resp.status}`)
  return resp.json()
}

const geocodeAddress = async (address) => {
  try {
    const res = await searchNominatim(address, 1)
    if (res && res.length > 0) return { lat: parseFloat(res[0].lat), lon: parseFloat(res[0].lon) }
  } catch (e) {
    console.warn(e)
  }
  return null
}

const performSearch = async () => {
  const query = searchQuery.value.trim()
  if (!query) return
  showLoading(true, 'Aranıyor...')
  clearMarkers()
  results.value = []
  emptyState.value = false

  try {
    const nominatimResults = await searchNominatim(query, 10)
    results.value = nominatimResults.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      class: item.class,
      importance: item.importance,
      place_id: item.place_id,
      osm_type: item.osm_type,
      osm_id: item.osm_id,
      road_slope: null
    }))

    if (results.value.length === 0) {
      emptyState.value = true
      showLoading(false)
      if (accessibility.settings.visuallyImpaired) accessibility.speak('Sonuç bulunamadı')
      return
    }

    displayResults()
    emptyState.value = false
    if (results.value[0]) mapInstance.setView([results.value[0].lat, results.value[0].lon], 15)
    showLoading(false)
    accessibility.announceSearchResults(results.value.length)
    enrichWithSlopesParallel(results.value)
  } catch (error) {
    console.error(error)
    emptyState.value = true
    showLoading(false)
    accessibility.announceError('Arama sırasında hata oluştu')
  }
}

const displayResults = () => {
  clearMarkers()
  results.value.forEach((result, index) => addMarker(result, index))
}

const displayStats = () => {
  const slopeResults = results.value.filter(r => r.road_slope?.avg_slope_percent !== null)
  const avg = slopeResults.length > 0
    ? slopeResults.reduce((s,r) => s+(r.road_slope.avg_slope_percent||0), 0) / slopeResults.length
    : 0
  totalCount.value = results.value.length
  avgSlopeText.value = avg.toFixed(1) + '%'
  avgSlopeColor.value = getSlopeColor(avg)
  statsVisible.value = true
}

const estimateSlopeFromTags = (tags, defaultSlope = 4) => {
  const highwaySlopes = {
    'motorway': 3, 'motorway_link': 3, 'trunk': 4, 'trunk_link': 4,
    'primary': 5, 'primary_link': 5, 'secondary': 5, 'secondary_link': 5,
    'tertiary': 6, 'tertiary_link': 6, 'residential': 4, 'service': 3,
    'unclassified': 6, 'footway': 3, 'pedestrian': 2, 'path': 5,
    'living_street': 3, 'track': 7, 'cycleway': 3
  }
  const highwayType = tags?.highway || ''
  let estimatedSlope = highwaySlopes[highwayType] || defaultSlope
  const smoothness = tags?.smoothness || ''
  if (smoothness === 'excellent' || smoothness === 'good') estimatedSlope = Math.max(1, estimatedSlope - 1)
  else if (smoothness === 'bad' || smoothness === 'horrible' || smoothness === 'impassable') estimatedSlope += 2
  const surface = tags?.surface || ''
  if (surface === 'asphalt' || surface === 'concrete' || surface === 'paving_stones') estimatedSlope = Math.max(1, estimatedSlope - 0.5)
  else if (surface === 'cobblestone' || surface === 'sett') estimatedSlope += 1
  else if (surface === 'gravel' || surface === 'fine_gravel' || surface === 'compacted') estimatedSlope += 0.5
  else if (surface === 'dirt' || surface === 'earth' || surface === 'ground') estimatedSlope += 1
  else if (surface === 'grass' || surface === 'sand') estimatedSlope += 2
  if (tags?.incline === 'yes' || tags?.incline === 'steep') estimatedSlope = Math.max(estimatedSlope, 8)
  estimatedSlope = Math.min(20, Math.max(1, estimatedSlope))
  const { difficulty, wheelchairOK } = classifySlopeDifficulty(estimatedSlope)
  return {
    slope_percent: estimatedSlope,
    slope_degrees: Math.atan(estimatedSlope / 100) * 180 / Math.PI,
    avg_slope_percent: estimatedSlope,
    max_slope_percent: estimatedSlope + 2,
    min_slope_percent: Math.max(0, estimatedSlope - 2),
    direction: 'unknown', difficulty, wheelchair_ok: wheelchairOK,
    surface, smoothness, highway_type: highwayType,
    name: tags?.name || '', osm_source: 'overpass', elevation_source: 'estimated', sample_points: 0
  }
}

const enrichWithSlopesParallel = async (items) => {
  for (let i = 0; i < items.length; i++) {
    try {
      const result = await fetchRoadSlopeForPlaceWithRetry(items[i].lat, items[i].lon, 3)
      items[i].road_slope = result
      const globalIdx = results.value.indexOf(items[i])
      if (globalIdx >= 0) {
        updateMarker(globalIdx, items[i])
        if (accessibility.settings.visuallyImpaired && globalIdx === 0 && result) {
          accessibility.announceLocation(items[i].display_name.split(',')[0], result.avg_slope_percent)
        }
      }
      displayStats()
    } catch (e) {
      console.warn('Slope fetch failed for', items[i].display_name, e)
      items[i].road_slope = estimateSlopeFromTags({})
      const globalIdx = results.value.indexOf(items[i])
      if (globalIdx >= 0) updateMarker(globalIdx, items[i])
      displayStats()
    }
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 200))
  }
}

const fetchRoadSlopeForPlaceWithRetry = async (lat, lon, maxRetries = 3) => {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`
  if (slopeCache.has(cacheKey)) return slopeCache.get(cacheKey)
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fetchRoadSlopeForPlace(lat, lon)
      if (result) { slopeCache.set(cacheKey, result); return result }
    } catch (e) {
      console.warn(`Attempt ${attempt + 1} failed:`, e.message)
    }
    if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
  }
  return estimateSlopeFromTags({})
}

const fetchRoadSlopeForPlace = async (lat, lon) => {
  const query = `[out:json][timeout:15];(way["highway"](around:150,${lat.toFixed(6)},${lon.toFixed(6)}););out geom 5;`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const resp = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    if (!data.elements || data.elements.length === 0) return estimateSlopeFromTags({})
    const validWays = data.elements.filter(el => {
      if (!el.tags?.highway) return false
      const hw = el.tags.highway
      if (['footway','steps','path','cycleway','pedestrian'].includes(hw)) return true
      if (['residential','service','tertiary','secondary','primary','unclassified','living_street','track'].includes(hw)) return true
      return false
    })
    if (validWays.length === 0) return estimateSlopeFromTags({})
    for (const el of validWays) {
      if (el.tags?.incline) {
        const { percent, degrees } = parseInclineTag(el.tags.incline)
        const { difficulty, wheelchairOK } = classifySlopeDifficulty(Math.abs(percent))
        return {
          slope_percent: Math.abs(percent), slope_degrees: Math.abs(degrees),
          avg_slope_percent: Math.abs(percent), max_slope_percent: Math.abs(percent), min_slope_percent: Math.abs(percent),
          direction: inclineDirection(el.tags.incline), difficulty, wheelchair_ok: wheelchairOK,
          surface: el.tags.surface || '', smoothness: el.tags.smoothness || '',
          highway_type: el.tags.highway || '', name: el.tags.name || '',
          osm_source: 'overpass', elevation_source: 'osm-incline-tag', sample_points: 1
        }
      }
    }
    for (const el of validWays) {
      if (el.geometry && el.geometry.length >= 2) {
        const result = await calculateRoadSlopeFromGeometry(el.geometry, el.tags || {})
        if (result && result.elevation_source !== 'estimated') return result
      }
    }
    return estimateSlopeFromTags(validWays[0].tags)
  } catch (e) {
    clearTimeout(timeoutId)
    throw e
  }
}

const calculateRoadSlopeFromGeometry = async (geometry, tags) => {
  if (!geometry || geometry.length < 2) return estimateSlopeFromTags(tags)
  const maxSamples = Math.min(5, geometry.length)
  const step = Math.max(1, Math.floor(geometry.length / maxSamples))
  const selected = []
  for (let i = 0; i < geometry.length && selected.length < maxSamples; i += step) selected.push(geometry[i])
  const last = geometry[geometry.length - 1]
  if (selected[selected.length - 1] !== last) selected.push(last)
  const elevations = await fetchElevationBatch(selected.map(g => ({ latitude: g.lat, longitude: g.lon })))
  if (!elevations || elevations.length < 2 || elevations.some(e => e === null || e === undefined)) return estimateSlopeFromTags(tags)
  const slopes = []
  for (let i = 1; i < selected.length && i < elevations.length; i++) {
    const dist = calculateDistance(selected[i-1].lat, selected[i-1].lon, selected[i].lat, selected[i].lon)
    if (dist > 3) {
      const slope = ((elevations[i] - elevations[i-1]) / dist) * 100
      if (Math.abs(slope) <= 40) slopes.push(slope)
    }
  }
  if (slopes.length === 0) return estimateSlopeFromTags(tags)
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

const fetchElevationBatch = async (locations) => {
  if (!locations || locations.length === 0) return []
  const cacheKey = locations.map(l => `${l.latitude.toFixed(4)},${l.longitude.toFixed(4)}`).join('|')
  if (elevationCache.has(cacheKey)) return elevationCache.get(cacheKey)
  try {
    const resp = await fetch(ELEVATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ locations })
    })
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data.results) return null
    const result = data.results.map(r => r.elevation)
    elevationCache.set(cacheKey, result)
    return result
  } catch (e) {
    console.warn('Elevation API error:', e)
    return null
  }
}

const fetchWheelchairWaypoints = async (startCoords, endCoords) => {
  const totalDist = calculateDistance(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon)
  const pad = Math.max(0.005, totalDist/111000*0.3)
  const minLat = Math.min(startCoords.lat, endCoords.lat)-pad
  const maxLat = Math.max(startCoords.lat, endCoords.lat)+pad
  const minLon = Math.min(startCoords.lon, endCoords.lon)-pad
  const maxLon = Math.max(startCoords.lon, endCoords.lon)+pad
  const query = `[out:json][timeout:15];(way["highway"~"^(footway|pedestrian|path|living_street)$"]["wheelchair"!="no"](${minLat},${minLon},${maxLat},${maxLon});way["footway"~"^(sidewalk|crossing)$"](${minLat},${minLon},${maxLat},${maxLon});way["sidewalk"~"^(yes|both|left|right)$"](${minLat},${minLon},${maxLat},${maxLon});way["highway"="residential"]["wheelchair"!="no"](${minLat},${minLon},${maxLat},${maxLon});way["highway"]["wheelchair"~"^(yes|designated)$"](${minLat},${minLon},${maxLat},${maxLon}););out geom;`
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
        const threshold = Math.max(80, totalDist*0.08)
        if (distToLine < threshold) {
          let score = 0
          if (el.tags?.wheelchair === 'yes' || el.tags?.wheelchair === 'designated') score += 10
          if (['footway','pedestrian','path'].includes(hw)) score += 5
          if (el.tags?.footway === 'sidewalk' || el.tags?.sidewalk) score += 8
          candidates.push({ lat: pt.lat, lon: pt.lon, distFromStart, distToLine, score })
        }
      }
    }
    if (candidates.length === 0) return []
    candidates.sort((a,b) => a.distFromStart-b.distFromStart)
    const deduped = [candidates[0]]
    for (let i = 1; i < candidates.length; i++) {
      const prev = deduped[deduped.length-1]
      if (calculateDistance(prev.lat, prev.lon, candidates[i].lat, candidates[i].lon) > 60) deduped.push(candidates[i])
    }
    const step = Math.max(1, Math.floor(deduped.length/8))
    const result = []
    for (let i = 0; i < deduped.length && result.length < 8; i += step) result.push(deduped[i])
    return result
  } catch (e) {
    console.warn(e)
    return []
  }
}

const calculateRoute = async () => {
  const start = routeStart.value.trim()
  const end = routeEnd.value.trim()
  if (!start || !end) {
    const msg = 'Lütfen başlangıç ve varış noktalarını girin'
    alert(msg)
    accessibility.announceError(msg)
    return
  }
  const L = window.L
  const isWheelchair = wheelchairMode.value
  showLoading(true, isWheelchair ? 'Erişilebilir rota hesaplanıyor...' : 'Rota hesaplanıyor...')
  try {
    let startCoords, endCoords
    if (start.includes(',')) {
      const [lat, lng] = start.split(',').map(s => parseFloat(s.trim()))
      startCoords = { lat, lon: lng }
    } else {
      startCoords = await geocodeAddress(start)
    }
    if (end.includes(',')) {
      const [lat, lng] = end.split(',').map(s => parseFloat(s.trim()))
      endCoords = { lat, lon: lng }
    } else {
      endCoords = await geocodeAddress(end)
    }
    if (!startCoords || !endCoords) {
      const msg = 'Adresler bulunamadı'
      alert(msg)
      accessibility.announceError(msg)
      showLoading(false)
      return
    }
    clearRoute()
    let intermediateWaypoints = []
    if (isWheelchair) {
      showLoading(true, 'Kaldırımlar ve erişilebilir yollar aranıyor...')
      const wpPromise = fetchWheelchairWaypoints(startCoords, endCoords)
      const timeout = new Promise(res => setTimeout(() => res([]), 6000))
      intermediateWaypoints = await Promise.race([wpPromise, timeout])
    }
    const allWaypoints = [
      L.latLng(startCoords.lat, startCoords.lon),
      ...intermediateWaypoints.map(wp => L.latLng(wp.lat, wp.lon)),
      L.latLng(endCoords.lat, endCoords.lon)
    ]
    showLoading(true, 'Rota hesaplanıyor...')
    const markerFn = (i, wp, n) => {
      if (i !== 0 && i !== n-1) return null
      const isStart = i === 0
      return L.marker(wp.latLng, {
        icon: L.divIcon({
          html: `<div style="width:32px;height:32px;background:${isStart ? '#22c55e' : '#ef4444'};border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:13px;">${isStart ? 'A' : 'B'}</div>`,
          iconSize: [32,32],
          className: ''
        })
      })
    }
    routeControl = L.Routing.control({
      waypoints: allWaypoints,
      routeWhileDragging: false,
      show: false,
      router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', profile: 'foot', requestParameters: { overview: 'full', steps: false } }),
      createMarker: markerFn
    }).addTo(mapInstance)

    routeControl.on('routesfound', async (e) => {
      try {
        const r = e.routes[0]
        const dist = (r.summary.totalDistance/1000).toFixed(2)
        const dur = Math.round(r.summary.totalTime/60)
        routeDistance.value = dist + ' km'
        routeDuration.value = dur + ' dk'
        routeInfoVisible.value = true
        emptyState.value = false
        await drawSlopeBasedRoute(r, isWheelchair)
        showLoading(false)
        menuOpen.value = true
        accessibility.announceRoute(dist, dur, isWheelchair, lastMaxSlope)
      } catch (error) {
        console.error(error)
        showLoading(false)
      }
    })

    routeControl.on('routingerror', (e) => {
      console.error(e)
      const msg = 'Rota oluşturulamadı. Lütfen farklı noktalar deneyin.'
      alert(msg)
      accessibility.announceError(msg)
      showLoading(false)
    })
  } catch (error) {
    console.error(error)
    showLoading(false)
  }
}

const drawSlopeBasedRoute = async (r, isWheelchair) => {
  routePolylines.forEach(p => mapInstance.removeLayer(p))
  routePolylines = []
  const L = window.L
  const coordinates = r.coordinates
  const segmentSize = Math.max(2, Math.floor(coordinates.length/20))
  const segments = []
  for (let i = 0; i < coordinates.length-segmentSize; i += segmentSize) {
    segments.push({
      coords: coordinates.slice(i, Math.min(i+segmentSize+1, coordinates.length)),
      start: coordinates[i],
      end: coordinates[Math.min(i+segmentSize, coordinates.length-1)]
    })
  }
  showLoading(true, 'Yükseklik verisi alınıyor...')
  const allPoints = []
  segments.forEach(seg => {
    allPoints.push({ latitude: seg.start.lat, longitude: seg.start.lng })
    allPoints.push({ latitude: seg.end.lat, longitude: seg.end.lng })
  })
  let elevationResults = null
  try { elevationResults = await fetchElevationBatch(allPoints) } catch(e) { console.warn(e) }
  showLoading(true, 'Rota eğimleri hesaplanıyor...')
  const rawSlopes = segments.map((seg, idx) => {
    if (!elevationResults || elevationResults.length < (idx*2+2)) return null
    const elevStart = elevationResults[idx*2]
    const elevEnd = elevationResults[idx*2+1]
    if (typeof elevStart !== 'number' || !isFinite(elevStart) || elevStart < -500 || elevStart > 9000) return null
    if (typeof elevEnd !== 'number' || !isFinite(elevEnd) || elevEnd < -500 || elevEnd > 9000) return null
    const dist = calculateDistance(seg.start.lat, seg.start.lng, seg.end.lat, seg.end.lng)
    if (dist < 5) return null
    const s = ((elevEnd-elevStart)/dist)*100
    return Math.abs(s) <= 60 ? s : null
  })
  const smoothedSlopes = rawSlopes.map((s, i) => {
    if (s === null) return null
    const neighbors = [rawSlopes[i-1], s, rawSlopes[i+1]].filter(v => v !== null && v !== undefined)
    return neighbors.reduce((a,b)=>a+b,0)/neighbors.length
  })
  const validSlopes = smoothedSlopes.filter(s => s !== null)
  lastMaxSlope = validSlopes.length > 0 ? Math.max(...validSlopes.map(Math.abs)) : 0
  segments.forEach((seg, idx) => {
    const slope = smoothedSlopes[idx]
    const valid = slope !== null
    const slopeVal = valid ? slope : 0
    const isSteep = valid && Math.abs(slopeVal) > 8
    const color = valid ? getSlopeColor(slopeVal) : '#22c55e'
    const lineColor = (isWheelchair && isSteep) ? '#f97316' : color
    const dashArray = (isWheelchair && isSteep) ? '10, 6' : null
    const opacity = (isWheelchair && isSteep) ? 0.7 : 1.0
    const polyline = L.polyline(seg.coords.map(c => [c.lat, c.lng]), {
      color: lineColor, weight: 7, opacity, smoothFactor: 1, dashArray, pane: 'routePane'
    }).addTo(mapInstance)
    const slopeText = valid ? `Eğim: ${slopeVal.toFixed(1)}%` : 'Eğim verisi yok'
    const warning = (isWheelchair && isSteep) ? '<br><span style="color:#f97316">⚠️ Dik eğim — erişim güç</span>' : ''
    polyline.bindPopup(`${slopeText}<br>${valid ? getDifficultyText(slopeVal) : ''}${warning}`)
    routePolylines.push(polyline)
  })
  if (accessibility.settings.visuallyImpaired && lastMaxSlope >= 8) {
    setTimeout(() => accessibility.announceSlopeWarning(lastMaxSlope), 2500)
  }
}

const addMarker = (result, index) => {
  if (!result.lat || !result.lon) return
  const L = window.L
  const slope = result.road_slope?.avg_slope_percent || 0
  const color = getSlopeColor(slope)
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:${color};border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;color:white;font-weight:800;">${index+1}</span></div>`,
    iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-32]
  })
  const marker = L.marker([result.lat, result.lon], { icon }).addTo(mapInstance)
  const estimatedLabel = result.road_slope?.elevation_source === 'estimated' ? ' (tahmini)' : ''
  marker.bindPopup(`<div style="padding:12px;min-width:220px;"><div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#000;">${result.display_name}</div>${result.road_slope ? `<div style="margin-top:8px;font-size:13px;color:${color};font-weight:600;">${getSlopeEmoji(slope)} ${slope.toFixed(1)}% Eğim${estimatedLabel}</div>` : ''}</div>`, { maxWidth: 260 })
  marker.on('click', () => {
    if (accessibility.settings.visuallyImpaired) {
      accessibility.announceLocation(result.display_name.split(',')[0], slope)
    }
  })
  markers[index] = marker
}

const updateMarker = (index, result) => {
  if (markers[index]) { mapInstance.removeLayer(markers[index]); markers[index] = null }
  addMarker(result, index)
}

const clearMarkers = () => {
  markers.forEach(m => { if (m) mapInstance.removeLayer(m) })
  markers = []
}

const clearRoute = () => {
  if (routeControl) { mapInstance.removeControl(routeControl); routeControl = null }
  routePolylines.forEach(p => mapInstance.removeLayer(p))
  routePolylines = []
}

const focusResult = (result, index) => {
  if (!mapInstance) return
  mapInstance.setView([result.lat, result.lon], 16)
  if (markers[index]) markers[index].openPopup()
  menuOpen.value = false
  if (accessibility.settings.visuallyImpaired) {
    accessibility.announceLocation(result.display_name.split(',')[0], result.road_slope?.avg_slope_percent)
  }
}

const focusRouteEnd = () => {
  if (routeEndRef.value) routeEndRef.value.focus()
}

const loadLeaflet = () => {
  return new Promise((resolve) => {
    if (window.L) { resolve(); return }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const cssR = document.createElement('link')
    cssR.rel = 'stylesheet'
    cssR.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css'
    document.head.appendChild(cssR)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const scriptR = document.createElement('script')
      scriptR.src = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js'
      scriptR.onload = resolve
      document.head.appendChild(scriptR)
    }
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  const savedTheme = localStorage.getItem('en-theme')
  if (savedTheme) theme.value = savedTheme
  await accessibility.init()
  await loadLeaflet()
  await nextTick()
  initMap()
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pickingMode.value) stopPickingPoint()
  })
  if (accessibility.settings.visuallyImpaired) {
    setTimeout(() => {
      accessibility.speak('Harita sayfasındasınız. Rota sekmesine geçerek başlangıç ve varış noktalarını girin.')
    }, 800)
  }
})

onUnmounted(() => {
  if (mapInstance) { mapInstance.remove(); mapInstance = null }
})
</script>

<style>
[data-high-contrast] .app.light {
  --bg: #fff !important;
  --text: #000 !important;
  --muted: #333 !important;
  --border: rgba(0,0,0,0.5) !important;
  --input-bg: #fff !important;
  --accent: #006633 !important;
  --sidebar-bg: #fff !important;
}

[data-high-contrast] .app.dark {
  --bg: #000 !important;
  --text: #fff !important;
  --muted: #ddd !important;
  --border: rgba(255,255,255,0.6) !important;
  --input-bg: #111 !important;
  --accent: #00ff88 !important;
  --sidebar-bg: #000 !important;
}
</style>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

* { margin: 0; padding: 0; box-sizing: border-box; }

.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  font-family: 'DM Sans', sans-serif;
  overflow: hidden;
  transition: background 0.35s ease, color 0.35s ease;
}

.app.light {
  --bg: #eef5ee;
  --sidebar-bg: rgba(255,255,255,0.92);
  --border: rgba(0,0,0,0.09);
  --text: #0f1a10;
  --muted: rgba(15,26,16,0.45);
  --accent: #16a667;
  --accent-dim: rgba(22,166,103,0.11);
  --accent-glow: rgba(22,166,103,0.22);
  --input-bg: rgba(255,255,255,0.7);
  --btn-text: #ffffff;
  background: #eef5ee;
  color: #0f1a10;
}

.app.dark {
  --bg: #07100a;
  --sidebar-bg: rgba(5,10,7,0.97);
  --border: rgba(255,255,255,0.08);
  --text: #e2f0e5;
  --muted: rgba(226,240,229,0.44);
  --accent: #2dd4a0;
  --accent-dim: rgba(45,212,160,0.11);
  --accent-glow: rgba(45,212,160,0.22);
  --input-bg: rgba(255,255,255,0.05);
  --btn-text: #07100a;
  background: #07100a;
  color: #e2f0e5;
}

.vi-mode .primary-btn,
.vi-mode .pick-btn,
.vi-mode .mode-tab,
.vi-mode .nav-item { min-height: 50px; font-size: 15px !important; }

.vi-mode .panel-input { font-size: 16px !important; padding: 14px !important; }
.vi-mode .result-item { padding: 16px !important; }
.vi-mode .result-title { font-size: 14px !important; }

.a11y-fab {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--accent);
  border: none;
  color: var(--btn-text);
  font-size: 20px;
  cursor: pointer;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px var(--accent-glow);
  transition: all 0.25s;
}

.vi-mode .a11y-fab { width: 64px; height: 64px; font-size: 24px; bottom: 32px; right: 32px; }
.a11y-fab:hover { transform: scale(1.08); }

.a11y-fab-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--accent);
}

.menu-toggle-fixed {
  position: fixed;
  top: 24px;
  left: 24px;
  background: var(--sidebar-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.35s ease;
  border-radius: 12px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
}

.vi-mode .menu-toggle-fixed { width: 56px; height: 56px; font-size: 20px; }
.menu-toggle-fixed.open { left: 272px; border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
.menu-toggle-fixed:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); opacity: 0; pointer-events: none; transition: opacity 0.3s ease; z-index: 998; }
.overlay.visible { opacity: 1; pointer-events: all; }

.sidebar {
  width: 0;
  height: 100vh;
  background: var(--sidebar-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  padding: 0;
  position: fixed;
  left: -264px;
  top: 0;
  transition: all 0.4s ease;
  overflow: hidden;
  opacity: 0;
  border-radius: 0 20px 20px 0;
  border-right: 1px solid var(--border);
  z-index: 999;
  box-shadow: 4px 0 24px rgba(0,0,0,0.08);
}
.sidebar.open { left: 0; width: 280px; padding: 28px 0; opacity: 1; }

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 22px;
  margin-bottom: 28px;
  white-space: nowrap;
  font-family: 'DM Serif Display', serif;
  font-size: 20px;
  color: var(--text);
}
.logo i { color: var(--accent); font-size: 16px; }

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.mode-tabs { display: flex; gap: 6px; margin-bottom: 14px; }

.mode-tab {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.mode-tab.active { background: var(--accent-dim); color: var(--accent); border-color: var(--accent); }
.mode-tab:hover:not(.active) { border-color: var(--accent); color: var(--accent); }

.search-panel { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 14px; color: var(--muted); font-size: 14px; }
.panel-input {
  width: 100%;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px 11px 38px;
  color: var(--text);
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: all 0.2s;
}
.panel-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.panel-input::placeholder { color: var(--muted); }

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: var(--accent);
  border: none;
  border-radius: 10px;
  color: var(--btn-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
}
.primary-btn:hover { opacity: 0.88; }

.route-panel { display: flex; flex-direction: column; gap: 12px; margin-bottom: 10px; }
.route-inputs { display: flex; flex-direction: column; gap: 0; }
.route-input-row { display: flex; flex-direction: column; gap: 6px; }
.route-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.route-input-wrapper { display: flex; align-items: flex-start; gap: 10px; }
.route-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 10px; }
.route-dot.start { background: #22c55e; }
.route-dot.end { background: #ef4444; }
.route-input-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.route-connector { width: 12px; height: 12px; margin-left: 0; border-left: 2px dashed var(--border); margin: 4px 0 4px 5px; }

.pick-btn {
  padding: 7px 12px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
}
.pick-btn:hover { border-color: var(--accent); color: var(--accent); }
.pick-btn.active { background: rgba(234,179,8,0.15); border-color: rgba(234,179,8,0.4); color: #eab308; animation: pulse 1.5s ease-in-out infinite; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }

.route-options { display: flex; flex-direction: column; gap: 10px; padding: 12px; background: var(--input-bg); border-radius: 10px; margin-bottom: 12px; border: 1px solid var(--border); }
.option-row { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text); }
.option-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer; }
.option-row i { color: var(--accent); font-size: 14px; width: 16px; text-align: center; }

.nav-divider { height: 1px; background: var(--border); margin: 14px 0; }

.route-info-block { margin-bottom: 12px; }
.block-title { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px; display: flex; align-items: center; gap: 7px; }
.block-title i { color: var(--accent); }
.route-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.route-stat { background: var(--input-bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px; text-align: center; }
.stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.stat-value { font-size: 18px; font-weight: 700; color: var(--text); }

.wc-badge { background: var(--accent-dim); border: 1px solid var(--accent); border-radius: 8px; padding: 10px 12px; font-size: 12px; color: var(--accent); font-weight: 500; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
.wc-badge i { margin-top: 1px; flex-shrink: 0; }

.legend-block { margin-top: 8px; }
.legend-title { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; display: flex; align-items: center; gap: 7px; }
.legend-list { display: flex; flex-direction: column; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text); font-weight: 500; }
.legend-dot { width: 24px; height: 6px; border-radius: 3px; flex-shrink: 0; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.stat-card { background: var(--input-bg); border: 1px solid var(--border); border-radius: 12px; padding: 14px; text-align: center; }
.stat-card-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600; }
.stat-card-value { font-size: 20px; font-weight: 800; color: var(--text); }

.result-list { display: flex; flex-direction: column; gap: 8px; }
.result-item { background: var(--input-bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.2s; }
.result-item:hover, .result-item:focus { border-color: var(--accent); background: var(--accent-dim); transform: translateY(-1px); outline: 2px solid var(--accent); }
.result-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
.result-number { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: white; flex-shrink: 0; }
.result-title { flex: 1; font-size: 12px; font-weight: 600; color: var(--text); line-height: 1.4; }
.result-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.result-badge { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.result-badge.muted { background: var(--input-bg); color: var(--muted); }

.empty-state { text-align: center; padding: 30px 20px; color: var(--muted); }
.empty-state i { margin-bottom: 12px; opacity: 0.4; display: block; font-size: 28px; }
.empty-state p { font-size: 13px; font-weight: 500; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 12px;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.22s ease;
  border-radius: 12px;
  white-space: nowrap;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-family: 'DM Sans', sans-serif;
  border-left: 2px solid transparent;
}
.nav-item:hover { background: var(--accent-dim); color: var(--accent); border-left-color: var(--accent); }
.nav-item i { font-size: 15px; width: 17px; text-align: center; flex-shrink: 0; }

.map-container { width: 100vw; height: 100vh; position: relative; }
.map-container.picking-mode #map { cursor: crosshair; }
#map { width: 100%; height: 100%; }

.picking-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: none;
  align-items: flex-end;
  justify-content: center;
  z-index: 10000;
  pointer-events: none;
  padding-bottom: 40px;
}
.picking-overlay.active { display: flex; }
.picking-text {
  background: var(--sidebar-bg);
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: all;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.cancel-pick { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; margin-left: 8px; }
.cancel-pick:hover { background: rgba(239,68,68,0.2); }

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 20000;
  flex-direction: column;
  gap: 16px;
}
.loading-overlay.active { display: flex; }
.spinner { width: 44px; height: 44px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 15px; font-weight: 600; color: #fff; }

:global(.leaflet-routing-container) { display: none !important; }
:global(.leaflet-popup-content) { color: #000 !important; }
:global(.leaflet-popup-content-wrapper) { color: #000 !important; }
:global(.leaflet-control-attribution) { font-size: 10px; opacity: 0.5; }
:global(.leaflet-control-zoom) { border: 1px solid var(--border) !important; border-radius: 12px !important; box-shadow: 0 2px 12px rgba(0,0,0,0.15) !important; overflow: hidden; }
:global(.leaflet-control-zoom a) { background: var(--sidebar-bg) !important; color: var(--text) !important; border-bottom: 1px solid var(--border) !important; width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 18px !important; }
:global(.leaflet-control-zoom a:last-child) { border-bottom: none !important; }
:global(.leaflet-control-zoom a:hover) { background: var(--accent-dim) !important; color: var(--accent) !important; }

@media (max-width: 768px) {
  .menu-toggle-fixed { top: 16px; left: 16px; }
  .menu-toggle-fixed.open { left: 16px; }
  .sidebar.open { width: 88%; max-width: 320px; }
  .a11y-fab { bottom: 20px; right: 20px; }
}

@media (hover: none) and (pointer: coarse) {
  .menu-toggle-fixed, .mode-tab, .primary-btn, .pick-btn, .nav-item, .result-item, .a11y-fab { -webkit-tap-highlight-color: transparent; }
  .result-item:active { background: var(--accent-dim); border-color: var(--accent); }
}
</style>