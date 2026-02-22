<template>
  <div class="app" :class="[theme, { 'vi-mode': accessibility.settings.visuallyImpaired, 'high-contrast': accessibility.settings.highContrast, 'nav-active': navigationActive }]">

    <button v-if="!navigationActive" class="menu-toggle-fixed" :class="{ open: menuOpen }" @click="menuOpen = !menuOpen" :aria-label="menuOpen ? 'Menüyü kapat' : 'Menüyü aç'">
      <i class="fa-solid fa-table-columns"></i>
    </button>

    <button v-if="!navigationActive" class="a11y-fab" @click="accessibility.settingsOpen.value = true" aria-label="Erişilebilirlik ayarları">
      <i class="fa-solid fa-universal-access"></i>
      <span v-if="accessibility.settings.visuallyImpaired" class="a11y-fab-dot"></span>
    </button>

    <aside v-if="!navigationActive" class="sidebar" :class="{ open: menuOpen }" role="navigation" aria-label="Uygulama menüsü">

      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon"><i class="fa-solid fa-wheelchair"></i></div>
          <span class="logo-text">ErişimNavi</span>
        </div>
      </div>

      <div class="mode-tabs">
        <button class="mode-tab" :class="{ active: currentMode === 'search' }" @click="switchMode('search')">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>Ara</span>
        </button>
        <button class="mode-tab" :class="{ active: currentMode === 'route' }" @click="switchMode('route')">
          <i class="fa-solid fa-route"></i>
          <span>Rota</span>
        </button>
        <button class="mode-tab" :class="{ active: currentMode === 'history' }" @click="switchMode('history')">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>Geçmiş</span>
        </button>
      </div>

      <div class="sidebar-body">

        <div v-if="currentMode === 'search'" class="search-panel">
          <div class="field-group">
            <label class="field-label">Nereyi arıyorsunuz?</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-magnifying-glass input-icon"></i>
              <input type="text" class="panel-input" placeholder="Yer adı, adres..." v-model="searchQuery" @keyup.enter="performSearch" aria-label="Konum arama" @focus="speakLabel('Konum arama alanı')" />
            </div>
          </div>
          <button class="btn-primary" @click="performSearch">
            <i class="fa-solid fa-search"></i> Ara
          </button>
        </div>

        <div v-if="currentMode === 'route'" class="route-panel">

          <div class="route-card">
            <div class="route-point">
              <div class="point-indicator start-indicator">
                <i class="fa-solid fa-circle-dot"></i>
              </div>
              <div class="point-content">
                <label class="field-label">Başlangıç</label>
                <input type="text" class="panel-input" placeholder="Mevcut konumunuz..." v-model="routeStart" @keyup.enter="focusRouteEnd" aria-label="Başlangıç adresi" @focus="speakLabel('Başlangıç noktası')" />
                <button class="pick-btn" :class="{ active: pickingMode === 'start' }" @click="startPickingPoint('start')" aria-label="Haritadan başlangıç noktası seç">
                  <i class="fa-solid fa-location-crosshairs"></i> Haritadan seç
                </button>
              </div>
            </div>

            <div class="route-line-connector"></div>

            <div class="route-point">
              <div class="point-indicator end-indicator">
                <i class="fa-solid fa-location-dot"></i>
              </div>
              <div class="point-content">
                <label class="field-label">Varış Noktası</label>
                <input type="text" class="panel-input" placeholder="Hedef adres..." v-model="routeEnd" @keyup.enter="calculateRoute" ref="routeEndRef" aria-label="Varış adresi" @focus="speakLabel('Varış noktası')" />
                <button class="pick-btn" :class="{ active: pickingMode === 'end' }" @click="startPickingPoint('end')" aria-label="Haritadan varış noktası seç">
                  <i class="fa-solid fa-location-crosshairs"></i> Haritadan seç
                </button>
              </div>
            </div>
          </div>

          <div class="options-card">
            <div class="option-toggle" :class="{ checked: wheelchairMode }" @click="wheelchairMode = !wheelchairMode">
              <div class="toggle-left">
                <div class="toggle-icon" :style="{ background: wheelchairMode ? 'rgba(22,166,103,0.15)' : 'var(--input-bg)', color: wheelchairMode ? 'var(--accent)' : 'var(--muted)' }">
                  <i class="fa-solid fa-wheelchair"></i>
                </div>
                <div class="toggle-info">
                  <span class="toggle-title">Tekerlekli Sandalye</span>
                  <span class="toggle-desc">Erişilebilir yollar tercih edilir</span>
                </div>
              </div>
              <div class="custom-switch" :class="{ on: wheelchairMode }">
                <div class="switch-thumb"></div>
              </div>
            </div>

            <div class="options-divider"></div>

            <div class="option-toggle" :class="{ checked: avoidSteep }" @click="avoidSteep = !avoidSteep">
              <div class="toggle-left">
                <div class="toggle-icon" :style="{ background: avoidSteep ? 'rgba(234,179,8,0.15)' : 'var(--input-bg)', color: avoidSteep ? '#eab308' : 'var(--muted)' }">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div class="toggle-info">
                  <span class="toggle-title">Dik Eğimden Kaçın</span>
                  <span class="toggle-desc">%8 üzeri eğimler işaretlenir</span>
                </div>
              </div>
              <div class="custom-switch" :class="{ on: avoidSteep }">
                <div class="switch-thumb"></div>
              </div>
            </div>
          </div>

          <button class="btn-primary" @click="calculateRoute" :disabled="loading">
            <i class="fa-solid fa-diamond-turn-right"></i>
            {{ loading ? 'Hesaplanıyor...' : 'Rota Hesapla' }}
          </button>

          <button v-if="routeInfoVisible && !navigationActive" class="btn-nav-start" @click="startNavigation" aria-label="Navigasyonu başlat">
            <i class="fa-solid fa-location-arrow"></i>
            <span>Navigasyonu Başlat</span>
          </button>

          <div v-if="routeInfoVisible" class="route-summary-card">
            <div class="summary-row">
              <div class="summary-item">
                <i class="fa-solid fa-ruler-horizontal"></i>
                <div>
                  <div class="summary-label">Mesafe</div>
                  <div class="summary-value">{{ routeDistance }}</div>
                </div>
              </div>
              <div class="summary-sep"></div>
              <div class="summary-item">
                <i class="fa-solid fa-clock"></i>
                <div>
                  <div class="summary-label">Tahmini Süre</div>
                  <div class="summary-value">{{ routeDuration }}</div>
                </div>
              </div>
            </div>
            <div v-if="wheelchairMode" class="accessible-badge">
              <i class="fa-solid fa-circle-check"></i>
              Tekerlekli sandalye dostu yollar seçildi
            </div>

            <div class="slope-legend">
              <div class="legend-header">Eğim Renk Göstergesi</div>
              <div class="legend-items">
                <div class="legend-item"><span class="legend-bar" style="background:#22c55e;"></span><span>Düz 0–2%</span></div>
                <div class="legend-item"><span class="legend-bar" style="background:#86efac;"></span><span>Hafif 2–5%</span></div>
                <div class="legend-item"><span class="legend-bar" style="background:#eab308;"></span><span>Orta 5–8%</span></div>
                <div class="legend-item"><span class="legend-bar" style="background:#f97316;"></span><span>Dik 8–12%</span></div>
                <div class="legend-item"><span class="legend-bar" style="background:#ef4444;"></span><span>Çok Dik 12%+</span></div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="statsVisible && results.length > 0" class="stats-row">
          <div class="stats-chip">
            <i class="fa-solid fa-list"></i>
            {{ totalCount }} sonuç
          </div>
          <div class="stats-chip" :style="{ color: avgSlopeColor }">
            <i class="fa-solid fa-chart-line"></i>
            Ort. {{ avgSlopeText }} eğim
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
            <div class="result-num" :style="{ background: getSlopeColor(result.road_slope?.avg_slope_percent || 0) }">{{ index + 1 }}</div>
            <div class="result-body">
              <div class="result-name">{{ result.display_name.split(',')[0] }}</div>
              <div class="result-addr">{{ result.display_name.split(',').slice(1, 3).join(',').trim() }}</div>
              <div class="result-slope-tag" v-if="result.road_slope" :style="{ background: getSlopeColor(result.road_slope.avg_slope_percent || 0) + '20', color: getSlopeColor(result.road_slope.avg_slope_percent || 0), borderColor: getSlopeColor(result.road_slope.avg_slope_percent || 0) + '40' }">
                {{ getSlopeEmoji(result.road_slope.avg_slope_percent || 0) }} {{ (result.road_slope.avg_slope_percent || 0).toFixed(1) }}% · {{ getDifficultyText(result.road_slope.avg_slope_percent || 0) }}
                <span v-if="result.road_slope.elevation_source === 'estimated'" class="estimated-tag">tahmini</span>
              </div>
              <div class="result-slope-tag loading-tag" v-else>
                <i class="fa-solid fa-spinner fa-spin"></i> Eğim hesaplanıyor...
              </div>
            </div>
            <i class="fa-solid fa-chevron-right result-arrow"></i>
          </div>
        </div>

        <div v-if="emptyState && results.length === 0 && currentMode !== 'history'" class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-map-location-dot"></i></div>
          <p class="empty-title">Başlayalım</p>
          <p class="empty-sub">Konum arayın veya rota oluşturun</p>
        </div>

        <div v-if="currentMode === 'history'" class="history-panel">
          <div class="history-header-row">
            <span class="history-title"><i class="fa-solid fa-clock-rotate-left"></i> Geçmiş Rotalar</span>
            <button v-if="routeHistory.length > 0" class="history-clear-btn" @click="clearHistory">
              <i class="fa-solid fa-trash"></i> Temizle
            </button>
          </div>

          <div v-if="historyLoading" class="history-loading">
            <i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...
          </div>

          <div v-else-if="routeHistory.length === 0" class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
            <p class="empty-title">Henüz rota yok</p>
            <p class="empty-sub">Hesapladığınız rotalar burada görünür</p>
          </div>

          <div v-else class="history-list">
            <div
              v-for="item in routeHistory"
              :key="item.id"
              class="history-item"
              @click="loadHistoryRoute(item)"
            >
              <div class="history-item-icon">
                <i class="fa-solid fa-route"></i>
              </div>
              <div class="history-item-body">
                <div class="history-item-from">
                  <span class="history-dot start-dot"></span>
                  <span class="history-addr">{{ item.startLabel }}</span>
                </div>
                <div class="history-item-to">
                  <span class="history-dot end-dot"></span>
                  <span class="history-addr">{{ item.endLabel }}</span>
                </div>
                <div class="history-item-meta">
                  <span class="history-badge">{{ item.distance }}</span>
                  <span class="history-badge">{{ item.duration }}</span>
                  <span v-if="item.wheelchair" class="history-badge wc-badge-sm"><i class="fa-solid fa-wheelchair"></i></span>
                  <span class="history-time">{{ item.dateStr }}</span>
                </div>
              </div>
              <i class="fa-solid fa-chevron-right history-arrow"></i>
            </div>
          </div>
        </div>

      </div>

      <div class="sidebar-footer">
        <button class="footer-btn home-btn" @click="goHome">
          <i class="fa-solid fa-house"></i>
          <span>Ana Sayfa</span>
        </button>
        <button class="footer-btn" @click="toggleTheme">
          <i :class="theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'"></i>
          <span>{{ theme === 'light' ? 'Koyu' : 'Açık' }}</span>
        </button>
        <button class="footer-btn" @click="accessibility.settingsOpen.value = true">
          <i class="fa-solid fa-universal-access"></i>
          <span>Erişim</span>
        </button>
      </div>
    </aside>

    <div v-if="!navigationActive" class="overlay" :class="{ visible: menuOpen }" @click="closeOverlay"></div>

    <div class="map-container" :class="{ 'picking-mode': !!pickingMode, 'nav-mode': navigationActive }">
      <div id="map"></div>
      <div class="picking-overlay" :class="{ active: !!pickingMode }">
        <div class="picking-text">
          <i class="fa-solid fa-crosshairs"></i>
          {{ pickingMode === 'start' ? 'Başlangıç' : 'Varış' }} noktasını haritaya dokunarak seçin
          <button class="cancel-pick" @click="stopPickingPoint">İptal</button>
        </div>
      </div>
    </div>

    <div v-if="navigationActive" class="nav-hud" :class="theme">
      <div class="nav-top-bar">
        <button class="nav-stop-btn" @click="stopNavigation" aria-label="Navigasyonu durdur">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="nav-dest-info">
          <div class="nav-dest-label">Hedefe kalan</div>
          <div class="nav-dest-value">{{ navRemainingDist }} · {{ navRemainingTime }}</div>
        </div>
        <button class="nav-voice-btn" :class="{ muted: !accessibility.settings.navigationVoice }" @click="toggleNavVoice" aria-label="Sesi aç/kapat">
          <i :class="accessibility.settings.navigationVoice ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'"></i>
        </button>
      </div>

      <div class="nav-arrow-panel">
        <div class="nav-arrow-icon" :class="navCurrentStep.turnClass">
          <i :class="navCurrentStep.icon"></i>
        </div>
        <div class="nav-step-info">
          <div class="nav-step-dist">{{ navCurrentStep.distance }}</div>
          <div class="nav-step-text">{{ navCurrentStep.text }}</div>
        </div>
      </div>

      <div v-if="navNextStep.text" class="nav-next-step">
        <span class="nav-next-label">Ardından</span>
        <i :class="navNextStep.icon" class="nav-next-icon"></i>
        <span class="nav-next-text">{{ navNextStep.text }}</span>
      </div>

      <div class="nav-bottom-bar">
        <div class="nav-slope-indicator" :style="{ background: currentSlopeColor }">
          <i class="fa-solid fa-road"></i>
          <span>Eğim: {{ currentSlopeText }}</span>
        </div>
        <div v-if="wheelchairMode" class="nav-wc-badge">
          <i class="fa-solid fa-wheelchair"></i>
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
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import { useAccessibility } from '../api/useAccessibility.js'
import AccessibilitySettings from './AccessibilitySettings.vue'

const route = useRoute()
const router = useRouter()
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
const routeHistory = ref([])
const historyLoading = ref(false)
let historyClientId = null

const navigationActive = ref(false)
const navCurrentStep = reactive({ text: 'Rotaya devam edin', distance: '', icon: 'fa-solid fa-arrow-up', turnClass: 'straight' })
const navNextStep = reactive({ text: '', icon: 'fa-solid fa-arrow-up' })
const navRemainingDist = ref('')
const navRemainingTime = ref('')
const currentSlopeText = ref('0%')
const currentSlopeColor = ref('#22c55e')

const accessibility = useAccessibility()

let lastMaxSlope = 0
let routeSteps = []
let navWatchId = null
let navInterval = null

let routeCoordinates = []



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
let userMarker = null


const goHome = () => {
  router.push('/')
}

const getHistoryKey = () => `en_history_${historyClientId || 'local'}`

const loadHistory = async () => {
  historyLoading.value = true
  try {
    const raw = localStorage.getItem(getHistoryKey())
    routeHistory.value = raw ? JSON.parse(raw) : []
  } catch (e) {
    routeHistory.value = []
  }
  historyLoading.value = false
}

const saveHistory = (entry) => {
  try {
    const history = routeHistory.value
    history.unshift(entry)
    if (history.length > 20) history.pop()
    routeHistory.value = [...history]
    localStorage.setItem(getHistoryKey(), JSON.stringify(routeHistory.value))
  } catch (e) {
    console.warn('History save error:', e)
  }
}

const clearHistory = () => {
  routeHistory.value = []
  localStorage.removeItem(getHistoryKey())
}

const loadHistoryRoute = (item) => {
  currentMode.value = 'route'
  routeStart.value = item.startRaw
  routeEnd.value = item.endRaw
  wheelchairMode.value = item.wheelchair
  menuOpen.value = true
}

const formatHistoryDate = (ts) => {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Az önce'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} sa önce`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const initClientId = async () => {
  try {
    const stored = sessionStorage.getItem('en_cid')
    if (stored) { historyClientId = stored; return }
    const resp = await fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
    if (resp.ok) {
      const { ip } = await resp.json()
      const parts = ip.split('.')
      if (parts.length === 4) { parts[2] = '0'; parts[3] = '0' }
      const encoder = new TextEncoder()
      const data = encoder.encode(parts.join('.') + '_en_salt_v1')
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      historyClientId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
      sessionStorage.setItem('en_cid', historyClientId)
    }
  } catch (e) {
    historyClientId = navigator.language + '_' + (navigator.platform || 'web')
  }
}

const handleSettingsUpdate = (key, value) => {
  accessibility.updateSetting(key, value)
}

const handleTestVoice = () => {
  accessibility.speak('Merhaba! Bu ErişimNavi sesli okuma testidir. Tekerlekli sandalye dostu rotanız hazırlanıyor.')
}

const handleResetSettings = () => {
  accessibility.stopSpeaking()
  const boolDefaults = { visuallyImpaired: false, highContrast: false, voiceEnabled: true, announceRoute: true, announceSlope: true, navigationVoice: true }
  Object.keys(boolDefaults).forEach(k => accessibility.updateSetting(k, boolDefaults[k]))
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

const toggleNavVoice = () => {
  accessibility.updateSetting('navigationVoice', !accessibility.settings.navigationVoice)
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
      if (userMarker) mapInstance.removeLayer(userMarker)
      userMarker = window.L.marker([latitude, longitude], {
        icon: window.L.divIcon({
          html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
          iconSize: [16,16],
          className: ''
        })
      }).addTo(mapInstance)
      if (!routeStart.value) {
        routeStart.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      }
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
  emptyState.value = mode !== 'history'
  results.value = []
  if (mode === 'search') stopPickingPoint()
  if (mode === 'history') loadHistory()
  if (accessibility.settings.visuallyImpaired) {
    const modeMap = { search: 'Konum arama modu', route: 'Rota hesaplama modu', history: 'Geçmiş rotalar' }
    accessibility.speak(modeMap[mode] || mode)
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
  const slopeResults = results.value.filter(r => r.road_slope != null && typeof r.road_slope.avg_slope_percent === 'number')
  const avg = slopeResults.length > 0
    ? slopeResults.reduce((s, r) => s + (r.road_slope.avg_slope_percent || 0), 0) / slopeResults.length
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
  const BATCH = 3
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)
    await Promise.all(batch.map(async (item) => {
      try {
        const result = await fetchRoadSlopeForPlaceWithRetry(item.lat, item.lon, 2)
        item.road_slope = result != null ? result : estimateSlopeFromTags({})
      } catch (e) {
        item.road_slope = estimateSlopeFromTags({})
      }
      const globalIdx = results.value.indexOf(item)
      if (globalIdx >= 0) {
        updateMarker(globalIdx, item)
        if (accessibility.settings.visuallyImpaired && globalIdx === 0 && item.road_slope) {
          accessibility.announceLocation(item.display_name.split(',')[0], item.road_slope.avg_slope_percent)
        }
      }
      displayStats()
    }))
    if (i + BATCH < items.length) await new Promise(r => setTimeout(r, 300))
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
  const query = `[out:json][timeout:10];(way["highway"](around:300,${lat.toFixed(6)},${lon.toFixed(6)}););out geom 8;`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 9000)
  try {
    const resp = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    if (!resp.ok) return estimateSlopeFromTags({})
    const data = await resp.json()
    if (!data.elements || data.elements.length === 0) return estimateSlopeFromTags({})
    const validWays = data.elements.filter(el => !!el.tags?.highway)
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
        if (result) return result
      }
    }
    return estimateSlopeFromTags(validWays[0]?.tags || {})
  } catch (e) {
    clearTimeout(timeoutId)
    return estimateSlopeFromTags({})
  }
}

const calculateRoadSlopeFromGeometry = async (geometry, tags) => {
  if (!geometry || geometry.length < 2) return estimateSlopeFromTags(tags)
  const maxSamples = Math.min(4, geometry.length)
  const step = Math.max(1, Math.floor(geometry.length / maxSamples))
  const selected = []
  for (let i = 0; i < geometry.length && selected.length < maxSamples; i += step) selected.push(geometry[i])
  const last = geometry[geometry.length - 1]
  if (selected[selected.length - 1] !== last) selected.push(last)
  let elevations = null
  try {
    const elevPromise = fetchElevationBatch(selected.map(g => ({ latitude: g.lat, longitude: g.lon })))
    const elevTimeout = new Promise(res => setTimeout(() => res(null), 5000))
    elevations = await Promise.race([elevPromise, elevTimeout])
  } catch (e) { elevations = null }
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
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5000)
    const resp = await fetch(ELEVATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ locations }),
      signal: controller.signal
    })
    clearTimeout(tid)
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data.results) return null
    const result = data.results.map(r => r.elevation)
    elevationCache.set(cacheKey, result)
    return result
  } catch (e) {
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
      router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', profile: 'foot', requestParameters: { overview: 'full', steps: true } }),
      createMarker: markerFn
    }).addTo(mapInstance)

    routeControl.on('routesfound', async (e) => {
      try {
        const r = e.routes[0]
        const dist = (r.summary.totalDistance/1000).toFixed(2)
        const dur = Math.round(r.summary.totalTime/60)
        routeDistance.value = dist + ' km'
        routeDuration.value = dur + ' dk'


        routeCoordinates = r.coordinates
        routeSteps = (r.instructions || []).map(step => ({
          text: step.text || '',
          distance: step.distance || 0,
          type: step.type || '',
          direction: step.direction || ''
        }))
        routeInfoVisible.value = true
        emptyState.value = false
        await drawSlopeBasedRoute(r, isWheelchair)
        showLoading(false)
        menuOpen.value = true
        accessibility.announceRoute(dist, dur, isWheelchair, lastMaxSlope)
        const startLabel = routeStart.value.includes(',') ? 'Mevcut Konum' : routeStart.value.split(',')[0].trim()
        const endLabel = routeEnd.value.split(',')[0].trim()
        saveHistory({
          id: Date.now(),
          startRaw: routeStart.value,
          endRaw: routeEnd.value,
          startLabel: startLabel.length > 30 ? startLabel.slice(0, 30) + '…' : startLabel,
          endLabel: endLabel.length > 30 ? endLabel.slice(0, 30) + '…' : endLabel,
          distance: dist + ' km',
          duration: dur + ' dk',
          wheelchair: isWheelchair,
          ts: Date.now(),
          dateStr: formatHistoryDate(Date.now())
        })
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
  if (lastMaxSlope >= 8) {
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

const translateInstruction = (text, type, direction) => {
  if (!text) return 'İlerleyin'
  const t = (type || '').toLowerCase()
  const d = (direction || '').toLowerCase()
  const raw = text.toLowerCase()

  if (t === 'destination' || t === 'arrive' || raw.includes('arrive') || raw.includes('destination')) return 'Hedefinize ulaştınız'
  if (t === 'depart' || raw.startsWith('head ') || raw.startsWith('depart')) {
    const dirMap = { north: 'kuzeye', south: 'güneye', east: 'doğuya', west: 'batıya', northeast: 'kuzeydoğuya', northwest: 'kuzeybatıya', southeast: 'güneydoğuya', southwest: 'güneybatıya' }
    for (const [eng, tr] of Object.entries(dirMap)) {
      if (raw.includes(eng)) return `${tr.charAt(0).toUpperCase() + tr.slice(1)} doğrultusunda ilerleyin`
    }
    return 'Rotaya başlayın'
  }
  if (t === 'roundabout' || t === 'rotary' || raw.includes('roundabout') || raw.includes('rotary')) {
    const match = text.match(/(\d+)/)
    if (match) return `Dönel kavşakta ${match[1]}. çıkışı alın`
    return 'Dönel kavşakta çıkışı alın'
  }
  if (d === 'uturn' || t === 'uturn' || raw.includes('u-turn') || raw.includes('uturn') || raw.includes('u turn')) return 'U dönüşü yapın'
  if (raw.includes('keep left') || raw.includes('bear left') || d === 'slight left') return 'Hafif sola yönelin'
  if (raw.includes('keep right') || raw.includes('bear right') || d === 'slight right') return 'Hafif sağa yönelin'
  if (raw.includes('sharp left') || d === 'sharp left') return 'Sert sola dönün'
  if (raw.includes('sharp right') || d === 'sharp right') return 'Sert sağa dönün'
  if (raw.includes('turn left') || d === 'left') return 'Sola dönün'
  if (raw.includes('turn right') || d === 'right') return 'Sağa dönün'
  if (raw.includes('continue') || t === 'continue' || t === 'straight' || d === 'straight') return 'Düz devam edin'
  if (raw.includes('merge')) return 'Şeride birleşin'
  if (raw.includes('fork left')) return 'Çatalda sola gidin'
  if (raw.includes('fork right')) return 'Çatalda sağa gidin'
  if (raw.includes('exit') && (raw.includes('left') || d === 'left')) return 'Soldan çıkış alın'
  if (raw.includes('exit') && (raw.includes('right') || d === 'right')) return 'Sağdan çıkış alın'
  if (t.includes('left') || d === 'left') return 'Sola dönün'
  if (t.includes('right') || d === 'right') return 'Sağa dönün'
  return 'Düz devam edin'
}

const sendNavNotification = (message) => {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification('ErişimNavi', {
      body: message,
      icon: '/favicon.ico',
      tag: 'nav-step',
      renotify: true
    })
  }
}

const focusRouteEnd = () => {
  if (routeEndRef.value) routeEndRef.value.focus()
}

const startNavigation = () => {
  if (!routeCoordinates || routeCoordinates.length === 0) return
  navigationActive.value = true
  menuOpen.value = false

  navRemainingDist.value = routeDistance.value
  navRemainingTime.value = routeDuration.value

  updateCurrentStep(0)

  if (mapInstance) {
    mapInstance.invalidateSize()
    if (routeCoordinates[0]) {
      mapInstance.setView([routeCoordinates[0].lat, routeCoordinates[0].lng], 17)
    }
  }

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  if (navigator.geolocation) {
    navWatchId = navigator.geolocation.watchPosition(
      onNavPositionUpdate,
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
  } else {
    simulateNavigation()
  }

  const startMsg = 'Navigasyon başladı. İyi yolculuklar!'
  accessibility.speakNavigation(startMsg)
  sendNavNotification(startMsg)
}

const stopNavigation = () => {
  navigationActive.value = false
  if (navWatchId !== null) {
    navigator.geolocation.clearWatch(navWatchId)
    navWatchId = null
  }
  if (navInterval !== null) {
    clearInterval(navInterval)
    navInterval = null
  }
  if (mapInstance) {
    mapInstance.invalidateSize()
  }
  const stopMsg = 'Navigasyon durduruldu.'
  accessibility.speakNavigation(stopMsg)
  sendNavNotification(stopMsg)
}

const updateCurrentStep = (stepIndex) => {
  const step = routeSteps[stepIndex]
  if (!step) {
    navCurrentStep.text = 'Hedefe ulaşıyorsunuz'
    navCurrentStep.distance = ''
    navCurrentStep.icon = 'fa-solid fa-flag-checkered'
    navCurrentStep.turnClass = 'arrival'
    navNextStep.text = ''
    return
  }
  const translatedText = translateInstruction(step.text, step.type, step.direction)
  navCurrentStep.text = translatedText
  navCurrentStep.distance = step.distance > 1000
    ? `${(step.distance / 1000).toFixed(1)} km`
    : `${Math.round(step.distance)} m`
  const turnInfo = getTurnIcon(step.type, step.direction)
  navCurrentStep.icon = turnInfo.icon
  navCurrentStep.turnClass = turnInfo.cls

  const nextStep = routeSteps[stepIndex + 1]
  if (nextStep) {
    const nextTurn = getTurnIcon(nextStep.type, nextStep.direction)
    navNextStep.text = translateInstruction(nextStep.text, nextStep.type, nextStep.direction)
    navNextStep.icon = nextTurn.icon
  } else {
    navNextStep.text = ''
  }

  if (navigationActive.value && stepIndex > 0) {
    const distText = step.distance > 1000
      ? `${(step.distance / 1000).toFixed(1)} kilometre sonra`
      : step.distance > 50
        ? `${Math.round(step.distance)} metre sonra`
        : 'Simdi'
    const navMsg = `${distText}, ${translatedText}`
    accessibility.speakNavigation(navMsg)
    sendNavNotification(navMsg)
  }
}

const getTurnIcon = (type, direction) => {
  const t = (type || '').toLowerCase()
  const d = (direction || '').toLowerCase()
  if (t === 'destination' || t === 'arrive') return { icon: 'fa-solid fa-flag-checkered', cls: 'arrival' }
  if (d === 'left' || t.includes('left')) return { icon: 'fa-solid fa-turn-left', cls: 'turn-left' }
  if (d === 'right' || t.includes('right')) return { icon: 'fa-solid fa-turn-right', cls: 'turn-right' }
  if (d === 'sharp left') return { icon: 'fa-solid fa-arrow-turn-left', cls: 'sharp-left' }
  if (d === 'sharp right') return { icon: 'fa-solid fa-arrow-turn-right', cls: 'sharp-right' }
  if (d === 'uturn' || t.includes('uturn')) return { icon: 'fa-solid fa-rotate-left', cls: 'uturn' }
  if (t === 'roundabout') return { icon: 'fa-solid fa-rotate-right', cls: 'roundabout' }
  return { icon: 'fa-solid fa-arrow-up', cls: 'straight' }
}

const onNavPositionUpdate = (pos) => {
  const { latitude, longitude } = pos.coords


  if (userMarker) mapInstance.removeLayer(userMarker)
  userMarker = window.L.marker([latitude, longitude], {
    icon: window.L.divIcon({
      html: `<div style="width:22px;height:22px;background:#3b82f6;border:4px solid #fff;border-radius:50%;box-shadow:0 2px 12px rgba(59,130,246,0.6);"></div>`,
      iconSize: [22,22],
      className: ''
    }),
    zIndexOffset: 1000
  }).addTo(mapInstance)

  mapInstance.setView([latitude, longitude], 17)

  if (!routeCoordinates || routeCoordinates.length === 0) return

  let closestIdx = 0
  let closestDist = Infinity
  routeCoordinates.forEach((coord, idx) => {
    const d = calculateDistance(latitude, longitude, coord.lat, coord.lng)
    if (d < closestDist) { closestDist = d; closestIdx = idx }
  })

  const remainingCoords = routeCoordinates.slice(closestIdx)
  let remainingDist = 0
  for (let i = 1; i < remainingCoords.length; i++) {
    remainingDist += calculateDistance(
      remainingCoords[i-1].lat, remainingCoords[i-1].lng,
      remainingCoords[i].lat, remainingCoords[i].lng
    )
  }

  navRemainingDist.value = remainingDist > 1000
    ? `${(remainingDist/1000).toFixed(1)} km`
    : `${Math.round(remainingDist)} m`

  const walkSpeed = 1.2
  const remainingSec = remainingDist / walkSpeed
  navRemainingTime.value = remainingSec > 3600
    ? `${Math.round(remainingSec/3600)} sa ${Math.round((remainingSec%3600)/60)} dk`
    : `${Math.round(remainingSec/60)} dk`

  let accDist = 0
  let stepIdx = 0
  for (let i = 0; i < closestIdx; i++) {
    if (i + 1 < routeCoordinates.length) {
      accDist += calculateDistance(routeCoordinates[i].lat, routeCoordinates[i].lng, routeCoordinates[i+1].lat, routeCoordinates[i+1].lng)
    }
    let stepAccDist = 0
    for (let s = 0; s < routeSteps.length; s++) {
      stepAccDist += routeSteps[s].distance
      if (accDist <= stepAccDist) { stepIdx = s; break }
      stepIdx = s
    }
  }
  updateCurrentStep(stepIdx)

  if (remainingDist < 20) {
    const arrivalMsg = 'Hedefinize ulaştınız. Navigasyon tamamlandı.'
    accessibility.speakNavigation(arrivalMsg)
    sendNavNotification(arrivalMsg)
    setTimeout(() => stopNavigation(), 3000)
  }

  const slopeForPos = lastMaxSlope
  currentSlopeText.value = `${slopeForPos.toFixed(1)}%`
  currentSlopeColor.value = getSlopeColor(slopeForPos)
}

const simulateNavigation = () => {
  if (!routeCoordinates || routeCoordinates.length === 0) return
  let idx = 0
  navInterval = setInterval(() => {
    if (idx >= routeCoordinates.length - 1) {
      clearInterval(navInterval)
      const arrMsg = 'Hedefinize ulaştınız. Navigasyon tamamlandı.'
      accessibility.speakNavigation(arrMsg)
      sendNavNotification(arrMsg)
      setTimeout(() => stopNavigation(), 2000)
      return
    }
    idx = Math.min(idx + 3, routeCoordinates.length - 1)
    const coord = routeCoordinates[idx]
    onNavPositionUpdate({ coords: { latitude: coord.lat, longitude: coord.lng } })
  }, 2000)
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
  await initClientId()
  await accessibility.init()
  await loadHistory()
  await loadLeaflet()
  await nextTick()
  initMap()
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pickingMode.value) stopPickingPoint()
    if (e.key === 'Escape' && navigationActive.value) stopNavigation()
  })
  if (accessibility.settings.visuallyImpaired) {
    setTimeout(() => {
      accessibility.speak('Harita sayfasındasınız. Rota sekmesine geçerek başlangıç ve varış noktalarını girin.')
    }, 800)
  }
})

onUnmounted(() => {
  if (navWatchId !== null) navigator.geolocation.clearWatch(navWatchId)
  if (navInterval !== null) clearInterval(navInterval)
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

* { margin: 0; padding: 0; box-sizing: border-box; }

.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.app.light {
  --bg: #f0f4f0;
  --sidebar-bg: #ffffff;
  --border: #e5e9e5;
  --text: #111c12;
  --text-secondary: #6b7a6c;
  --accent: #16a667;
  --accent-light: #e8f7f1;
  --accent-glow: rgba(22,166,103,0.2);
  --input-bg: #f7faf7;
  --input-border: #dde3dd;
  --btn-text: #ffffff;
  --card-bg: #f7faf7;
  --shadow: rgba(0,0,0,0.06);
  background: #f0f4f0;
  color: #111c12;
}

.app.dark {
  --bg: #0a0f0b;
  --sidebar-bg: #111a12;
  --border: #1e2b1f;
  --text: #e4ede5;
  --text-secondary: #7a917c;
  --accent: #2dd4a0;
  --accent-light: rgba(45,212,160,0.1);
  --accent-glow: rgba(45,212,160,0.2);
  --input-bg: #151f16;
  --input-border: #243125;
  --btn-text: #0a0f0b;
  --card-bg: #151f16;
  --shadow: rgba(0,0,0,0.3);
  background: #0a0f0b;
  color: #e4ede5;
}

.vi-mode .btn-primary,
.vi-mode .pick-btn,
.vi-mode .mode-tab,
.vi-mode .footer-btn { min-height: 52px; font-size: 15px !important; }
.vi-mode .panel-input { font-size: 16px !important; padding: 14px 14px 14px 40px !important; }
.vi-mode .result-item { padding: 16px !important; }

.search-panel { display: flex; flex-direction: column; gap: 14px; }
.route-panel { display: flex; flex-direction: column; gap: 14px; }

.menu-toggle-fixed {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--sidebar-bg);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px var(--shadow);
  transition: all 0.25s;
}
.menu-toggle-fixed.open { left: 296px; color: var(--accent); border-color: var(--accent); background: var(--accent-light); }
.menu-toggle-fixed:hover { color: var(--accent); border-color: var(--accent); }

.a11y-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 50px;
  height: 50px;
  border-radius: 14px;
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
  transition: all 0.2s;
}
.vi-mode .a11y-fab { width: 62px; height: 62px; font-size: 24px; }
.a11y-fab:hover { transform: scale(1.06); }
.a11y-fab-dot { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; background: #fff; border: 2px solid var(--accent); }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; pointer-events: none; transition: opacity 0.3s; z-index: 998; }
.overlay.visible { opacity: 1; pointer-events: all; }

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 999;
  overflow: hidden;
  opacity: 0;
  transition: width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, left 0.35s;
  box-shadow: 4px 0 32px var(--shadow);
}
.sidebar.open { width: 308px; opacity: 1; }

.sidebar-header {
  padding: 24px 20px 0;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.logo-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 1px solid var(--accent-glow);
}
.logo-text {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.3px;
}

.mode-tabs {
  display: flex;
  padding: 0 20px;
  gap: 6px;
  flex-shrink: 0;
  margin-bottom: 4px;
}

.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 4px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
}
.mode-tab.active {
  background: var(--accent-light);
  color: var(--accent);
  border-color: var(--accent);
}
.mode-tab:hover:not(.active) { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  -webkit-overflow-scrolling: touch;
}
.sidebar-body::-webkit-scrollbar { width: 4px; }
.sidebar-body::-webkit-scrollbar-track { background: transparent; }
.sidebar-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.input-wrapper { position: relative; }
.input-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 13px; }

.panel-input {
  width: 100%;
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 10px;
  padding: 11px 12px 11px 38px;
  color: var(--text);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: all 0.2s;
  -webkit-appearance: none;
}
.panel-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); background: var(--sidebar-bg); }
.panel-input::placeholder { color: var(--text-secondary); font-size: 13px; }

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px;
  background: var(--accent);
  border: none;
  border-radius: 12px;
  color: var(--btn-text);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
  min-height: 46px;
  touch-action: manipulation;
  letter-spacing: -0.1px;
}
.btn-primary:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 16px var(--accent-glow); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

.btn-nav-start {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  padding: 14px;
  background: #2563eb;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
  min-height: 50px;
  touch-action: manipulation;
  letter-spacing: -0.2px;
  box-shadow: 0 4px 20px rgba(37,99,235,0.35);
  animation: navPulse 2.5s ease-in-out infinite;
}
.btn-nav-start:hover { opacity: 0.92; transform: translateY(-1px); }
@keyframes navPulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(37,99,235,0.35); }
  50% { box-shadow: 0 6px 30px rgba(37,99,235,0.6); }
}

.route-card {
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.route-card .route-point:first-child { padding-bottom: 4px; }
.route-card .route-point:last-child { padding-top: 4px; }
.route-point {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.point-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 18px;
}
.start-indicator { background: rgba(34,197,94,0.12); color: #22c55e; }
.end-indicator { background: rgba(239,68,68,0.12); color: #ef4444; }
.point-content { flex: 1; display: flex; flex-direction: column; gap: 5px; }

.route-line-connector {
  height: 20px;
  margin-left: 15px;
  border-left: 2px dashed var(--border);
  margin-top: 4px;
  margin-bottom: 4px;
}

.pick-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: transparent;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
  align-self: flex-start;
  touch-action: manipulation;
}
.pick-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.pick-btn.active { background: rgba(234,179,8,0.12); border-color: #eab308; color: #eab308; animation: pulse 1.5s ease-in-out infinite; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.options-card {
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 4px 0;
  overflow: hidden;
}
.options-divider { height: 1px; background: var(--border); margin: 0; }

.option-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  gap: 12px;
  transition: background 0.15s;
  user-select: none;
  -webkit-user-select: none;
}
.option-toggle:hover { background: var(--accent-light); }
.option-toggle * { pointer-events: none; }
.toggle-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.toggle-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.2s;
}
.toggle-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.toggle-title { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; }
.toggle-desc { font-size: 11px; color: var(--text-secondary); }

.custom-switch {
  width: 42px;
  height: 24px;
  border-radius: 12px;
  background: var(--border);
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.25s;
}
.custom-switch.on { background: var(--accent); }
.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  transition: left 0.25s;
}
.custom-switch.on .switch-thumb { left: 21px; }

.route-summary-card {
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}
.summary-row {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 0;
}
.summary-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}
.summary-item > i { font-size: 20px; color: var(--accent); flex-shrink: 0; }
.summary-label { font-size: 11px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
.summary-value { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
.summary-sep { width: 1px; height: 36px; background: var(--border); margin: 0 16px; flex-shrink: 0; }

.accessible-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(22,166,103,0.08);
  border-top: 1px solid rgba(22,166,103,0.2);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}

.slope-legend {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
}
.legend-header {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.legend-items { display: flex; flex-direction: column; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text); font-weight: 500; }
.legend-bar { width: 28px; height: 5px; border-radius: 3px; flex-shrink: 0; }

.stats-row { display: flex; gap: 8px; }
.stats-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.result-list { display: flex; flex-direction: column; gap: 6px; }
.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.18s;
  touch-action: manipulation;
}
.result-item:hover, .result-item:focus { border-color: var(--accent); background: var(--accent-light); outline: none; }
.result-num {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}
.result-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.result-name { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-addr { font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-slope-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid transparent;
  width: fit-content;
}
.loading-tag { background: var(--input-bg); color: var(--text-secondary); border-color: var(--border) !important; }
.estimated-tag { opacity: 0.65; font-weight: 400; font-size: 10px; }
.result-arrow { color: var(--text-secondary); font-size: 11px; flex-shrink: 0; }

.empty-state { text-align: center; padding: 40px 20px; }
.empty-icon { font-size: 36px; color: var(--accent); opacity: 0.35; margin-bottom: 12px; }
.empty-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.empty-sub { font-size: 13px; color: var(--text-secondary); }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
}
.footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 8px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
  touch-action: manipulation;
}
.footer-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.home-btn { border-color: rgba(59,130,246,0.3); }
.home-btn:hover { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,0.08); }

.map-container { width: 100vw; height: 100vh; position: relative; }
.map-container.picking-mode #map { cursor: crosshair; }
#map { width: 100%; height: 100%; }

.picking-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: none;
  align-items: flex-end;
  justify-content: center;
  z-index: 10000;
  pointer-events: none;
  padding-bottom: 48px;
}
.picking-overlay.active { display: flex; }
.picking-text {
  background: var(--sidebar-bg);
  border: 1.5px solid var(--accent);
  color: var(--accent);
  padding: 14px 22px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: all;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.cancel-pick {
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  margin-left: 8px;
  touch-action: manipulation;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  gap: 16px;
}
.loading-overlay.active { display: flex; }
.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: #fff; font-size: 14px; font-weight: 600; letter-spacing: -0.1px; }

.nav-hud {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5000;
  pointer-events: none;
}

.nav-top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  pointer-events: all;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.nav-stop-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(239,68,68,0.18);
  border: 1px solid rgba(239,68,68,0.35);
  color: #ef4444;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
}
.nav-dest-info { flex: 1; text-align: center; }
.nav-dest-label { font-size: 10px; color: rgba(255,255,255,0.5); font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; }
.nav-dest-value { font-size: 15px; font-weight: 700; color: #fff; margin-top: 1px; }

.nav-voice-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: #fff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
}
.nav-voice-btn.muted { color: rgba(255,255,255,0.3); }

.nav-arrow-panel {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 20px;
  background: rgba(17, 24, 39, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  pointer-events: all;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.nav-arrow-icon {
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(59,130,246,0.45);
  transition: background 0.3s;
}
.nav-arrow-icon.arrival { background: #22c55e; box-shadow: 0 4px 20px rgba(34,197,94,0.45); }
.nav-arrow-icon.turn-left, .nav-arrow-icon.sharp-left { background: #f59e0b; box-shadow: 0 4px 20px rgba(245,158,11,0.45); }
.nav-arrow-icon.turn-right, .nav-arrow-icon.sharp-right { background: #f59e0b; box-shadow: 0 4px 20px rgba(245,158,11,0.45); }
.nav-arrow-icon.uturn { background: #ef4444; box-shadow: 0 4px 20px rgba(239,68,68,0.45); }
.nav-arrow-icon.roundabout { background: #8b5cf6; box-shadow: 0 4px 20px rgba(139,92,246,0.45); }

.nav-step-info { flex: 1; }
.nav-step-dist { font-size: 30px; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 5px; letter-spacing: -0.5px; }
.nav-step-text { font-size: 15px; color: rgba(255,255,255,0.8); font-weight: 500; line-height: 1.35; }

.nav-next-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(10, 16, 20, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.nav-next-label { font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; flex-shrink: 0; }
.nav-next-icon { color: rgba(255,255,255,0.55); font-size: 13px; flex-shrink: 0; }
.nav-next-text { font-size: 13px; color: rgba(255,255,255,0.65); font-weight: 500; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.nav-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: all;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.nav-slope-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 100px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  transition: background 0.4s;
}
.nav-wc-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(22,166,103,0.18);
  border: 1px solid rgba(22,166,103,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #22c55e;
  font-size: 16px;
}

:global(.leaflet-routing-container) { display: none !important; }
:global(.leaflet-popup-content) { color: #000 !important; }
:global(.leaflet-popup-content-wrapper) { color: #000 !important; }
:global(.leaflet-control-attribution) { font-size: 10px; opacity: 0.5; }
:global(.leaflet-control-zoom) { border: 1px solid var(--border) !important; border-radius: 12px !important; box-shadow: 0 2px 12px var(--shadow) !important; overflow: hidden; }
:global(.leaflet-control-zoom a) { background: var(--sidebar-bg) !important; color: var(--text) !important; border-bottom: 1px solid var(--border) !important; width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 18px !important; }
:global(.leaflet-control-zoom a:last-child) { border-bottom: none !important; }
:global(.leaflet-control-zoom a:hover) { background: var(--accent-light) !important; color: var(--accent) !important; }

@media (max-width: 768px) {
  .sidebar.open { width: 88vw; max-width: 320px; }
  .menu-toggle-fixed.open { left: calc(88vw - 20px); }
  .nav-arrow-panel { padding: 14px 16px; gap: 14px; }
  .nav-arrow-icon { width: 58px; height: 58px; font-size: 24px; border-radius: 14px; }
  .nav-step-dist { font-size: 24px; }
  .nav-step-text { font-size: 14px; }
}

@media (max-width: 480px) {
  .menu-toggle-fixed { top: 14px; left: 14px; width: 42px; height: 42px; }
  .sidebar.open { width: 92vw; max-width: 300px; }
  .nav-top-bar { padding: 10px 12px; }
  .nav-arrow-panel { padding: 12px 14px; gap: 12px; }
  .nav-arrow-icon { width: 52px; height: 52px; font-size: 22px; }
  .nav-step-dist { font-size: 20px; }
}

@media (hover: none) and (pointer: coarse) {
  .menu-toggle-fixed, .mode-tab, .btn-primary, .btn-nav-start, .pick-btn, .footer-btn, .result-item, .a11y-fab { -webkit-tap-highlight-color: transparent; }
  .result-item:active { background: var(--accent-light); border-color: var(--accent); }
  .btn-nav-start:active { transform: scale(0.97); }
}

@media (orientation: landscape) and (max-height: 500px) {
  .nav-arrow-panel { padding: 8px 16px; }
  .nav-arrow-icon { width: 48px; height: 48px; font-size: 20px; border-radius: 12px; }
  .nav-step-dist { font-size: 18px; }
  .nav-top-bar { padding: 6px 12px; }
}

.history-panel { display: flex; flex-direction: column; gap: 12px; }

.history-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.history-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 7px;
}
.history-title i { color: var(--accent); }
.history-clear-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  color: #ef4444;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
}
.history-clear-btn:hover { background: rgba(239,68,68,0.15); }

.history-loading {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.history-list { display: flex; flex-direction: column; gap: 8px; }

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.18s;
  touch-action: manipulation;
}
.history-item:hover { border-color: var(--accent); background: var(--accent-light); }

.history-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.history-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }

.history-item-from,
.history-item-to {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.history-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.start-dot { background: #22c55e; }
.end-dot { background: #ef4444; }
.history-addr {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.history-item-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  flex-wrap: wrap;
}
.history-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}
.wc-badge-sm { color: var(--accent); border-color: var(--accent-glow); background: var(--accent-light); }
.history-time {
  font-size: 10px;
  color: var(--text-secondary);
  margin-left: auto;
}
.history-arrow { color: var(--text-secondary); font-size: 11px; flex-shrink: 0; }

</style>