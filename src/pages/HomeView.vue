<template>
  <div class="app" :class="[theme, { 'vi-mode': accessibility.settings.visuallyImpaired, 'high-contrast': accessibility.settings.highContrast }]">
    <button class="menu-toggle-fixed" :class="{ open: menuOpen }" @click="menuOpen = !menuOpen" :aria-label="menuOpen ? 'Menüyü kapat' : 'Menüyü aç'">
      <i class="fa-solid fa-table-columns"></i>
    </button>

    <button class="a11y-fab" @click="accessibility.settingsOpen.value = true" aria-label="Erişilebilirlik ayarları">
      <i class="fa-solid fa-universal-access"></i>
      <span v-if="accessibility.settings.visuallyImpaired" class="a11y-fab-dot"></span>
    </button>

    <aside class="sidebar" :class="{ open: menuOpen }" role="navigation" aria-label="Ana menü">
      <div class="logo">
        <i class="fa-solid fa-wheelchair"></i>
        <span>ErişimNavi</span>
      </div>

      <nav class="nav">
        <a href="/" class="nav-item active" @click="menuOpen = false" aria-current="page">
          <i class="fa-solid fa-house"></i>
          <span class="nav-text">Anasayfa</span>
        </a>
        <a href="/map" class="nav-item" @click="menuOpen = false">
          <i class="fa-solid fa-map-location-dot"></i>
          <span class="nav-text">Harita &amp; Rota</span>
        </a>

        <div class="nav-divider"></div>

        <button class="nav-item theme-toggle" @click="toggleTheme" :aria-label="theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç'">
          <i :class="theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'"></i>
          <span class="nav-text">{{ theme === 'light' ? 'Koyu Tema' : 'Açık Tema' }}</span>
        </button>

        <button class="nav-item" @click="accessibility.settingsOpen.value = true" aria-label="Erişilebilirlik ayarları">
          <i class="fa-solid fa-universal-access"></i>
          <span class="nav-text">Erişilebilirlik</span>
        </button>
      </nav>
    </aside>

    <div class="overlay" :class="{ visible: menuOpen }" @click="closeOverlay"></div>

    <main class="main" role="main">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>

      <div class="hero-content">
        <div class="badge">
          <i class="fa-solid fa-map"></i>
          Tekerlekli Sandalye Dostu Rota Planlayıcı
        </div>

        <h1 class="hero-title">Erişim<span class="accent">Navi</span></h1>
        <p class="hero-sub">Eğim, yüzey ve engelleri analiz ederek en uygun rotayı bulun.</p>

        <div class="search-container" role="search">
          <div class="search-row">
            <div class="search-box">
              <i class="fa-solid fa-location-dot search-icon"></i>
              <input
                type="text"
                class="search-input"
                placeholder="Başlangıç noktası..."
                v-model="startQuery"
                aria-label="Başlangıç noktası"
                @focus="speakLabel('Başlangıç noktası alanı')"
              />
            </div>

            <button class="swap-btn" @click="swapLocations" title="Konumları değiştir" aria-label="Başlangıç ve varış noktalarını değiştir">
              <i class="fa-solid fa-arrows-up-down"></i>
            </button>

            <div class="search-box">
              <i class="fa-solid fa-flag-checkered search-icon"></i>
              <input
                type="text"
                class="search-input"
                placeholder="Varış noktası..."
                v-model="endQuery"
                @keyup.enter="goToMap"
                aria-label="Varış noktası"
                @focus="speakLabel('Varış noktası alanı')"
              />
            </div>
          </div>

          <button class="search-btn" @click="goToMap" aria-label="Erişilebilir rota bul">
            <i class="fa-solid fa-wheelchair"></i>
            <span>Erişilebilir Rota Bul</span>
          </button>

          <p class="search-hint">veya <span class="key">Enter</span> tuşuna bas</p>
        </div>

        <div class="pills-row">
          <div class="pill"><i class="fa-solid fa-road"></i><span>Eğim Analizi</span></div>
          <div class="pill"><i class="fa-solid fa-person-walking"></i><span>Yaya Dostu</span></div>
          <div class="pill"><i class="fa-solid fa-wheelchair-move"></i><span>Tekerlekli Sandalye</span></div>
        </div>
      </div>
    </main>

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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccessibility } from '../api/useAccessibility.js'
import AccessibilitySettings from './AccessibilitySettings.vue'

const router = useRouter()
const menuOpen = ref(false)
const startQuery = ref('')
const endQuery = ref('')
const theme = ref('light')

const accessibility = useAccessibility()

const handleSettingsUpdate = (key, value) => {
  accessibility.updateSetting(key, value)
}

const handleTestVoice = () => {
  accessibility.speak('Merhaba! Bu ErişimNavi sesli okuma testidir. Tekerlekli sandalye dostu rotanız hazırlanıyor.')
}

const handleResetSettings = () => {
  accessibility.stopSpeaking()
  accessibility.updateSetting('visuallyImpaired', false)
  accessibility.updateSetting('fontSize', 'normal')
  accessibility.updateSetting('highContrast', false)
  accessibility.updateSetting('voiceEnabled', true)
  accessibility.updateSetting('speechRate', 1.0)
  accessibility.updateSetting('speechPitch', 1.0)
  accessibility.updateSetting('speechVolume', 1.0)
  accessibility.updateSetting('announceRoute', true)
  accessibility.updateSetting('announceSlope', true)
}

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('en-theme', theme.value)
}

const swapLocations = () => {
  const tmp = startQuery.value
  startQuery.value = endQuery.value
  endQuery.value = tmp
  if (accessibility.settings.visuallyImpaired) {
    accessibility.speak('Konumlar değiştirildi')
  }
}

const goToMap = () => {
  const params = new URLSearchParams()
  if (startQuery.value.trim()) params.set('from', startQuery.value.trim())
  if (endQuery.value.trim()) params.set('to', endQuery.value.trim())
  if (accessibility.settings.visuallyImpaired) {
    accessibility.speak('Rota aranıyor, lütfen bekleyin...')
  }
  router.push(`/map?${params.toString()}`)
}

const closeOverlay = () => {
  menuOpen.value = false
}

const speakLabel = (label) => {
  if (accessibility.settings.visuallyImpaired) {
    accessibility.speak(label, { interrupt: true })
  }
}

onMounted(async () => {
  const savedTheme = localStorage.getItem('en-theme')
  if (savedTheme) theme.value = savedTheme
  await accessibility.init()
  if (accessibility.settings.visuallyImpaired) {
    setTimeout(() => {
      accessibility.speak('ErişimNavi uygulamasına hoş geldiniz. Başlangıç ve varış noktalarını girin, ardından Erişilebilir Rota Bul düğmesine basın.')
    }, 600)
  }
})
</script>

<style>
html, body, #app {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  background: transparent !important;
}

[data-high-contrast] .app.light {
  --bg: #fff !important;
  --text: #000 !important;
  --muted: #333 !important;
  --border: rgba(0,0,0,0.4) !important;
  --input-bg: #fff !important;
  --accent: #006633 !important;
}

[data-high-contrast] .app.dark {
  --bg: #000 !important;
  --text: #fff !important;
  --muted: #ccc !important;
  --border: rgba(255,255,255,0.5) !important;
  --input-bg: #111 !important;
  --accent: #00ff88 !important;
}
</style>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

* { margin: 0; padding: 0; box-sizing: border-box; }

.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  font-family: 'DM Sans', sans-serif;
  overflow: hidden;
  position: fixed;
  inset: 0;
  transition: background 0.35s ease, color 0.35s ease;
}

.app.light {
  --bg:          #eef5ee;
  --sidebar-bg:  rgba(255,255,255,0.9);
  --border:      rgba(0,0,0,0.09);
  --text:        #0f1a10;
  --muted:       rgba(15,26,16,0.45);
  --accent:      #16a667;
  --accent-dim:  rgba(22,166,103,0.11);
  --accent-glow: rgba(22,166,103,0.22);
  --input-bg:    rgba(255,255,255,0.7);
  --btn-text:    #ffffff;
  background: #eef5ee;
  color: #0f1a10;
}

.app.dark {
  --bg:          #07100a;
  --sidebar-bg:  rgba(5,10,7,0.97);
  --border:      rgba(255,255,255,0.08);
  --text:        #e2f0e5;
  --muted:       rgba(226,240,229,0.44);
  --accent:      #2dd4a0;
  --accent-dim:  rgba(45,212,160,0.11);
  --accent-glow: rgba(45,212,160,0.22);
  --input-bg:    rgba(255,255,255,0.05);
  --btn-text:    #07100a;
  background: #07100a;
  color: #e2f0e5;
}

.vi-mode .search-btn,
.vi-mode .swap-btn,
.vi-mode .nav-item { min-height: 52px; font-size: 16px !important; }

.vi-mode .search-input { font-size: 17px !important; }
.vi-mode .search-box { padding: 18px 22px !important; }
.vi-mode .nav-item { padding: 15px 14px !important; font-size: 16px !important; }
.vi-mode .pill { padding: 11px 18px !important; font-size: 15px !important; }

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
.menu-toggle-fixed.open { left: 252px; border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
.menu-toggle-fixed:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 998;
}
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
.sidebar.open { left: 0; width: 248px; padding: 28px 0; opacity: 1; overflow: visible; }

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 22px;
  margin-bottom: 28px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease 0.18s;
  font-family: 'DM Serif Display', serif;
  font-size: 20px;
  color: var(--text);
}
.logo i { color: var(--accent); font-size: 16px; }
.sidebar.open .logo { opacity: 1; }

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
  position: relative;
  overflow: visible;
  flex: 1;
}

.nav-divider {
  height: 1px;
  background: var(--border);
  margin: 8px 4px;
  opacity: 0;
  transition: opacity 0.3s ease 0.18s;
}
.sidebar.open .nav-divider { opacity: 1; }

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
  opacity: 0;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-family: 'DM Sans', sans-serif;
  border-left: 2px solid transparent;
}
.sidebar.open .nav-item { opacity: 1; transition: all 0.22s ease 0.18s; }
.nav-item:hover { background: var(--accent-dim); color: var(--accent); border-left-color: var(--accent); }
.nav-item.active { background: var(--accent-dim); color: var(--accent); border-left-color: var(--accent); }
.nav-item i { font-size: 15px; width: 17px; text-align: center; flex-shrink: 0; }

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  width: 100%;
  padding: 0 24px;
}

.blob { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(90px); }
.blob-1 { width: 700px; height: 700px; top: -200px; right: -120px; background: radial-gradient(circle, var(--accent-dim) 0%, transparent 68%); }
.blob-2 { width: 500px; height: 500px; bottom: -130px; left: -80px; background: radial-gradient(circle, var(--accent-dim) 0%, transparent 68%); }

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  width: 100%;
  max-width: 680px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  padding: 7px 18px;
  border-radius: 100px;
  opacity: 0.9;
}

.hero-title {
  font-family: 'DM Serif Display', serif;
  font-size: clamp(60px, 11vw, 110px);
  font-weight: 400;
  color: var(--text);
  line-height: 1;
  text-align: center;
  letter-spacing: -2px;
}
.accent { color: var(--accent); }

.hero-sub {
  color: var(--muted);
  font-size: clamp(14px, 1.8vw, 17px);
  text-align: center;
  line-height: 1.65;
  max-width: 440px;
}

.search-container { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; margin-top: 4px; }
.search-row { width: 100%; display: flex; flex-direction: column; gap: 8px; }

.search-box {
  width: 100%;
  display: flex;
  align-items: center;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 15px 20px;
  transition: all 0.25s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.search-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }

.search-icon { color: var(--muted); font-size: 15px; margin-right: 12px; flex-shrink: 0; }
.search-input { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 15px; font-family: 'DM Sans', sans-serif; }
.search-input::placeholder { color: var(--muted); }

.swap-btn {
  align-self: center;
  width: 38px; height: 38px;
  border-radius: 10px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}
.swap-btn:hover { background: var(--accent-dim); color: var(--accent); border-color: var(--accent); }
.vi-mode .swap-btn { width: 52px; height: 52px; font-size: 18px; }

.search-btn {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%;
  padding: 16px 28px;
  background: var(--accent);
  border: none;
  border-radius: 14px;
  color: var(--btn-text);
  font-size: 15px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  transition: all 0.25s ease;
}
.search-btn:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 8px 28px var(--accent-glow); }
.search-btn:active { transform: translateY(0); box-shadow: none; opacity: 1; }
.vi-mode .search-btn { padding: 20px 28px; font-size: 17px; }

.search-hint { color: var(--muted); font-size: 13px; display: flex; align-items: center; gap: 6px; }
.key { background: var(--input-bg); padding: 2px 8px; border-radius: 6px; font-size: 12px; border: 1px solid var(--border); color: var(--text); }

.pills-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 4px; }
.pill {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--muted);
  font-size: 13px; font-weight: 500;
  backdrop-filter: blur(8px);
}
.pill i { color: var(--accent); font-size: 13px; }

@media (max-width: 768px) {
  .menu-toggle-fixed { top: 16px; left: 16px; }
  .menu-toggle-fixed.open { left: 16px; }
  .sidebar.open { width: 82%; max-width: 290px; }
  .search-box { padding: 13px 16px; }
  .search-btn { padding: 14px 20px; }
  .pill { font-size: 12px; padding: 7px 12px; }
  .a11y-fab { bottom: 20px; right: 20px; }
}

@media (max-width: 480px) {
  .menu-toggle-fixed { top: 14px; left: 14px; }
  .badge { font-size: 12px; padding: 5px 12px; }
  .search-box { padding: 12px 14px; border-radius: 12px; }
  .search-btn { padding: 13px 16px; font-size: 14px; border-radius: 12px; }
  .sidebar.open { width: 88%; }
}

@media (max-width: 768px) and (orientation: landscape) {
  .hero-title { font-size: 48px; }
  .pills-row { display: none; }
  .hero-content { gap: 12px; }
}

@media (hover: none) and (pointer: coarse) {
  .menu-toggle-fixed, .nav-item, .search-btn, .swap-btn, .a11y-fab { -webkit-tap-highlight-color: transparent; }
  .nav-item:active { background: var(--accent-dim); color: var(--accent); }
  .menu-toggle-fixed:active { background: var(--accent-dim); }
  .search-btn:active { transform: scale(0.98); }
}
</style>