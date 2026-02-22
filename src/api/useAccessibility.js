import { ref, reactive, watch } from 'vue'

const STORAGE_KEY_PREFIX = 'en_a11y_'
const SETTINGS_VERSION = 1

const defaultSettings = () => ({
  version: SETTINGS_VERSION,
  visuallyImpaired: false,
  fontSize: 'normal',
  highContrast: false,
  voiceEnabled: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  announceRoute: true,
  announceSlope: true,
  navigationVoice: true
})

function getStorageKey(ipHash) {
  return `${STORAGE_KEY_PREFIX}${ipHash}`
}

async function hashString(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

async function getClientId() {
  try {
    const stored = sessionStorage.getItem('en_cid')
    if (stored) return stored
    const resp = await fetch('https://api64.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000)
    })
    if (!resp.ok) throw new Error('ip fetch failed')
    const { ip } = await resp.json()
    const parts = ip.split('.')
    if (parts.length === 4) { parts[2] = '0'; parts[3] = '0' }
    const hash = await hashString(parts.join('.') + '_en_salt_v1')
    sessionStorage.setItem('en_cid', hash)
    return hash
  } catch (e) {
    console.warn('Client ID error:', e)
    const fallback = await hashString(
      (navigator.language || 'tr') + '_' + (navigator.platform || 'web') + '_en_local'
    )
    return fallback
  }
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== SETTINGS_VERSION) return null
    return parsed
  } catch (e) {
    console.warn('loadFromStorage error:', e)
  }
}

function saveToStorage(key, settings) {
  try {
    const sanitized = {
      version: settings.version,
      visuallyImpaired: Boolean(settings.visuallyImpaired),
      fontSize: ['normal', 'large', 'xlarge'].includes(settings.fontSize) ? settings.fontSize : 'normal',
      highContrast: Boolean(settings.highContrast),
      voiceEnabled: Boolean(settings.voiceEnabled),
      speechRate: Math.min(2, Math.max(0.5, Number(settings.speechRate) || 1)),
      speechPitch: Math.min(2, Math.max(0, Number(settings.speechPitch) || 1)),
      speechVolume: Math.min(1, Math.max(0, Number(settings.speechVolume) || 1)),
      announceRoute: Boolean(settings.announceRoute),
      announceSlope: Boolean(settings.announceSlope),
      navigationVoice: Boolean(settings.navigationVoice)
    }
    localStorage.setItem(key, JSON.stringify(sanitized))
  } catch (e) {
    console.warn('Settings save error:', e)
  }
}

let synth = null
let currentUtterance = null

function getSynth() {
  if (!synth && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    synth = window.speechSynthesis
  }
  return synth
}

function findTurkishVoice() {
  const s = getSynth()
  if (!s) return null
  const voices = s.getVoices()
  return (
    voices.find(v => v.lang.startsWith('tr')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    null
  )
}

export function useAccessibility() {
  const settings = reactive(defaultSettings())
  const storageKey = ref(null)
  const ready = ref(false)
  const speaking = ref(false)
  const settingsOpen = ref(false)

  const init = async () => {
    const clientId = await getClientId()
    storageKey.value = getStorageKey(clientId)
    const saved = loadFromStorage(storageKey.value)
    if (saved) {
      Object.assign(settings, saved)
    }
    ready.value = true
    applyGlobalStyles()
  }

  const saveSettings = () => {
    if (storageKey.value) {
      saveToStorage(storageKey.value, settings)
    }
  }

  const applyGlobalStyles = () => {
    const root = document.documentElement
    const fontMap = { normal: '16px', large: '19px', xlarge: '23px' }
    root.style.setProperty('--a11y-font-size', fontMap[settings.fontSize] || '16px')
    if (settings.highContrast) {
      root.setAttribute('data-high-contrast', 'true')
    } else {
      root.removeAttribute('data-high-contrast')
    }
    if (settings.visuallyImpaired) {
      root.setAttribute('data-visually-impaired', 'true')
    } else {
      root.removeAttribute('data-visually-impaired')
    }
  }

  watch(() => ({ ...settings }), () => {
    saveSettings()
    applyGlobalStyles()
  }, { deep: true })

  const updateSetting = (key, value) => {
    settings[key] = value
  }

  const speak = (text, { interrupt = true, rate = null, pitch = null, volume = null } = {}) => {
    if (!settings.voiceEnabled) return
    const s = getSynth()
    if (!s) return
    if (interrupt) s.cancel()
    if (currentUtterance) {
      currentUtterance.onend = null
      currentUtterance.onerror = null
    }
    const utter = new SpeechSynthesisUtterance(text)
    const voice = findTurkishVoice()
    if (voice) utter.voice = voice
    utter.lang = voice?.lang || 'tr-TR'
    utter.rate = rate ?? settings.speechRate
    utter.pitch = pitch ?? settings.speechPitch
    utter.volume = volume ?? settings.speechVolume
    utter.onstart = () => { speaking.value = true }
    utter.onend = () => { speaking.value = false }
    utter.onerror = () => { speaking.value = false }
    currentUtterance = utter
    s.speak(utter)
  }

  const speakNavigation = (text, { interrupt = true } = {}) => {
    if (!settings.navigationVoice) return
    const s = getSynth()
    if (!s) return
    if (interrupt) s.cancel()
    if (currentUtterance) {
      currentUtterance.onend = null
      currentUtterance.onerror = null
    }
    const utter = new SpeechSynthesisUtterance(text)
    const voice = findTurkishVoice()
    if (voice) utter.voice = voice
    utter.lang = voice?.lang || 'tr-TR'
    utter.rate = settings.speechRate
    utter.pitch = settings.speechPitch
    utter.volume = settings.speechVolume
    utter.onstart = () => { speaking.value = true }
    utter.onend = () => { speaking.value = false }
    utter.onerror = () => { speaking.value = false }
    currentUtterance = utter
    s.speak(utter)
  }

  const stopSpeaking = () => {
    const s = getSynth()
    if (s) s.cancel()
    speaking.value = false
  }

  const announceRoute = (distanceKm, durationMin, isWheelchair, maxSlope) => {
    if (!settings.visuallyImpaired || !settings.voiceEnabled || !settings.announceRoute) return
    const slopeDesc =
      maxSlope < 2 ? 'düz ve erişilebilir'
        : maxSlope < 5 ? 'hafif eğimli'
          : maxSlope < 8 ? 'orta eğimli'
            : maxSlope < 12 ? 'dikkatli olunması gereken dik eğimli'
              : 'çok dik, tekerlekli sandalye ile zor'
    const wcText = isWheelchair ? 'Tekerlekli sandalye uyumlu yaya rotası. ' : ''
    speak(`${wcText}Rota bulundu. Mesafe: ${distanceKm} kilometre. Tahmini süre: ${durationMin} dakika. Rota genellikle ${slopeDesc}.`)
  }

  const announceLocation = (name, slope) => {
    if (!settings.visuallyImpaired || !settings.announceSlope) return
    const slopeText = (slope !== null && slope !== undefined)
      ? `Yüzde ${slope.toFixed(0)} eğim.`
      : ''
    speak(`${name}. ${slopeText}`)
  }

  const announceSearchResults = (count) => {
    if (!settings.visuallyImpaired) return
    speak(`${count} konum bulundu. Listede gezinmek için aşağı kaydırın.`)
  }

  const announceError = (msg) => {
    if (!settings.visuallyImpaired) return
    speak(msg)
  }

  const announceLoading = (msg) => {
    if (!settings.visuallyImpaired) return
    speak(msg, { interrupt: false })
  }

  const announceSlopeWarning = (slope) => {
    if (!settings.announceSlope) return
    if (!settings.voiceEnabled && !settings.navigationVoice) return
    if (slope >= 8) {
      const msg = `Uyarı! Rotada yüzde ${slope.toFixed(0)} dik eğim var. Dikkatli olun.`
      if (settings.visuallyImpaired && settings.voiceEnabled) {
        speak(msg)
      } else if (settings.navigationVoice) {
        speakNavigation(msg)
      }
    }
  }

  const announceNavigationStep = (instruction, distanceM) => {
    if (!settings.navigationVoice) return
    const distText = distanceM > 1000
      ? `${(distanceM / 1000).toFixed(1)} kilometre sonra`
      : distanceM > 50
        ? `${Math.round(distanceM)} metre sonra`
        : 'şimdi'
    const msg = `${distText}, ${instruction}`
    speakNavigation(msg)
  }

  const announceArrival = () => {
    if (!settings.navigationVoice) return
    speakNavigation('Hedefinize ulaştınız. Navigasyon tamamlandı.')
  }

  return {
    settings,
    ready,
    speaking,
    settingsOpen,
    init,
    updateSetting,
    speak,
    speakNavigation,
    stopSpeaking,
    announceRoute,
    announceLocation,
    announceSearchResults,
    announceError,
    announceLoading,
    announceSlopeWarning,
    announceNavigationStep,
    announceArrival
  }
}