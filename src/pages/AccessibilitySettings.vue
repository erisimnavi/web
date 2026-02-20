<template>
  <Teleport to="body">
    <div v-if="open" class="a11y-backdrop" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-label="Erişilebilirlik Ayarları">
      <div class="a11y-panel" :class="theme">
        <div class="a11y-header">
          <div class="a11y-title">
            <i class="fa-solid fa-universal-access"></i>
            <span>Erişilebilirlik Ayarları</span>
          </div>
          <button class="a11y-close" @click="$emit('close')" aria-label="Kapat">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="a11y-body">
          <div class="a11y-section">
            <div class="a11y-section-title">Görme Engelli Modu</div>
            <div class="a11y-toggle-row" :class="{ active: settings.visuallyImpaired }">
              <div class="a11y-toggle-info">
                <i class="fa-solid fa-eye-slash"></i>
                <div>
                  <div class="a11y-toggle-label">Görme Engelli Modu</div>
                  <div class="a11y-toggle-desc">Butonları büyütür, sesli okuma aktif olur, rotalar konuşarak anlatılır</div>
                </div>
              </div>
              <div
                class="a11y-switch"
                :class="{ on: settings.visuallyImpaired }"
                @click="set('visuallyImpaired', !settings.visuallyImpaired)"
                role="switch"
                :aria-checked="settings.visuallyImpaired"
                tabindex="0"
                @keydown.enter="set('visuallyImpaired', !settings.visuallyImpaired)"
                @keydown.space.prevent="set('visuallyImpaired', !settings.visuallyImpaired)"
              >
                <div class="a11y-switch-knob"></div>
              </div>
            </div>
          </div>

          <div class="a11y-section">
            <div class="a11y-section-title">Yazı Boyutu</div>
            <div class="a11y-font-row">
              <button class="a11y-font-btn" :class="{ active: settings.fontSize === 'normal' }" @click="set('fontSize', 'normal')" style="font-size:15px;">A</button>
              <button class="a11y-font-btn" :class="{ active: settings.fontSize === 'large' }" @click="set('fontSize', 'large')" style="font-size:19px;">A</button>
              <button class="a11y-font-btn" :class="{ active: settings.fontSize === 'xlarge' }" @click="set('fontSize', 'xlarge')" style="font-size:23px;">A</button>
              <span class="a11y-font-label">{{ fontLabels[settings.fontSize] }}</span>
            </div>
          </div>

          <div class="a11y-section">
            <div class="a11y-section-title">Görsel</div>
            <label class="a11y-check-row">
              <input type="checkbox" :checked="settings.highContrast" @change="set('highContrast', $event.target.checked)" />
              <i class="fa-solid fa-circle-half-stroke"></i>
              <span>Yüksek Kontrast Modu</span>
            </label>
          </div>

          <div class="a11y-section" :class="{ disabled: !settings.visuallyImpaired }">
            <div class="a11y-section-title">Sesli Okuma</div>
            <label class="a11y-check-row">
              <input type="checkbox" :checked="settings.voiceEnabled" @change="set('voiceEnabled', $event.target.checked)" :disabled="!settings.visuallyImpaired" />
              <i class="fa-solid fa-volume-high"></i>
              <span>Sesli Okumayı Etkinleştir</span>
            </label>
            <label class="a11y-check-row">
              <input type="checkbox" :checked="settings.announceRoute" @change="set('announceRoute', $event.target.checked)" :disabled="!settings.visuallyImpaired" />
              <i class="fa-solid fa-route"></i>
              <span>Rotayı sesli anlat</span>
            </label>
            <label class="a11y-check-row">
              <input type="checkbox" :checked="settings.announceSlope" @change="set('announceSlope', $event.target.checked)" :disabled="!settings.visuallyImpaired" />
              <i class="fa-solid fa-chart-line"></i>
              <span>Eğim uyarılarını sesli söyle</span>
            </label>

            <div class="a11y-slider-group">
              <label class="a11y-slider-label">
                <i class="fa-solid fa-gauge"></i>
                Konuşma Hızı: {{ Number(settings.speechRate).toFixed(1) }}x
              </label>
              <input type="range" min="0.5" max="2" step="0.1"
                :value="settings.speechRate"
                @input="set('speechRate', parseFloat($event.target.value))"
                :disabled="!settings.visuallyImpaired || !settings.voiceEnabled"
                class="a11y-slider" />
            </div>

            <div class="a11y-slider-group">
              <label class="a11y-slider-label">
                <i class="fa-solid fa-music"></i>
                Ses Tonu: {{ Number(settings.speechPitch).toFixed(1) }}
              </label>
              <input type="range" min="0" max="2" step="0.1"
                :value="settings.speechPitch"
                @input="set('speechPitch', parseFloat($event.target.value))"
                :disabled="!settings.visuallyImpaired || !settings.voiceEnabled"
                class="a11y-slider" />
            </div>

            <div class="a11y-slider-group">
              <label class="a11y-slider-label">
                <i class="fa-solid fa-volume-low"></i>
                Ses Seviyesi: {{ Math.round(settings.speechVolume * 100) }}%
              </label>
              <input type="range" min="0" max="1" step="0.05"
                :value="settings.speechVolume"
                @input="set('speechVolume', parseFloat($event.target.value))"
                :disabled="!settings.visuallyImpaired || !settings.voiceEnabled"
                class="a11y-slider" />
            </div>

            <button class="a11y-test-btn" @click="testVoice" :disabled="!settings.visuallyImpaired || !settings.voiceEnabled">
              <i class="fa-solid fa-play"></i>
              Sesi Test Et
            </button>
          </div>

          <div class="a11y-info-box" v-if="settings.visuallyImpaired">
            <i class="fa-solid fa-circle-info"></i>
            <span>Görme engelli modu etkin. Butonlar büyütüldü, rotalar ve bilgiler sesli okunacak. Ayarlarınız güvenli şekilde kaydedildi.</span>
          </div>
        </div>

        <div class="a11y-footer">
          <button class="a11y-reset-btn" @click="resetSettings">
            <i class="fa-solid fa-rotate-left"></i>
            Varsayılana Dön
          </button>
          <button class="a11y-save-btn" @click="$emit('close')">
            <i class="fa-solid fa-check"></i>
            Kaydet &amp; Kapat
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  },
  settings: {
    type: Object,
    required: true
  },
  theme: {
    type: String,
    default: 'light'
  },
  speak: {
    type: Function,
    default: null
  },
  stopSpeaking: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['close', 'update:settings', 'test-voice', 'reset-settings'])

const fontLabels = { normal: 'Normal', large: 'Büyük', xlarge: 'Çok Büyük' }

const set = (key, value) => {
  emit('update:settings', key, value)
}

const testVoice = () => {
  emit('test-voice')
}

const resetSettings = () => {
  emit('reset-settings')
}
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

.a11y-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.a11y-panel {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,0.4);
  border: 1px solid rgba(0,0,0,0.1);
  font-family: 'DM Sans', sans-serif;
}

.a11y-panel.dark {
  background: #0e1a10;
  border-color: rgba(255,255,255,0.08);
  color: #e2f0e5;
}

.a11y-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.a11y-panel.dark .a11y-header { border-color: rgba(255,255,255,0.08); }

.a11y-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 700;
  color: #0f1a10;
}

.a11y-panel.dark .a11y-title { color: #e2f0e5; }
.a11y-title i { color: #16a667; font-size: 18px; }

.a11y-close {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0,0,0,0.06);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #666;
  transition: all 0.2s;
}

.a11y-close:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
.a11y-panel.dark .a11y-close { background: rgba(255,255,255,0.07); color: #aaa; }

.a11y-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.a11y-section { display: flex; flex-direction: column; gap: 12px; }
.a11y-section.disabled { opacity: 0.5; pointer-events: none; }

.a11y-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #888;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(0,0,0,0.07);
}

.a11y-panel.dark .a11y-section-title {
  color: rgba(226,240,229,0.4);
  border-color: rgba(255,255,255,0.07);
}

.a11y-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(0,0,0,0.02);
  transition: all 0.2s;
  cursor: pointer;
}

.a11y-toggle-row.active {
  border-color: rgba(22,166,103,0.4);
  background: rgba(22,166,103,0.06);
}

.a11y-panel.dark .a11y-toggle-row {
  border-color: rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
}

.a11y-toggle-info { display: flex; align-items: flex-start; gap: 12px; flex: 1; }
.a11y-toggle-info > i { color: #16a667; font-size: 18px; margin-top: 2px; flex-shrink: 0; }

.a11y-toggle-label { font-size: 14px; font-weight: 600; color: #0f1a10; margin-bottom: 3px; }
.a11y-panel.dark .a11y-toggle-label { color: #e2f0e5; }
.a11y-toggle-desc { font-size: 12px; color: #888; line-height: 1.45; }

.a11y-switch {
  width: 48px;
  height: 26px;
  border-radius: 13px;
  background: #ddd;
  position: relative;
  cursor: pointer;
  transition: background 0.25s;
  flex-shrink: 0;
  outline: none;
}

.a11y-switch:focus-visible { box-shadow: 0 0 0 3px rgba(22,166,103,0.4); }
.a11y-switch.on { background: #16a667; }

.a11y-switch-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.25s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

.a11y-switch.on .a11y-switch-knob { transform: translateX(22px); }

.a11y-font-row { display: flex; align-items: center; gap: 8px; }

.a11y-font-btn {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 2px solid rgba(0,0,0,0.1);
  background: rgba(0,0,0,0.03);
  cursor: pointer;
  font-weight: 700;
  color: #555;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Sans', sans-serif;
}

.a11y-font-btn.active { border-color: #16a667; background: rgba(22,166,103,0.1); color: #16a667; }

.a11y-panel.dark .a11y-font-btn {
  border-color: rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: #aaa;
}

.a11y-font-label { font-size: 13px; color: #888; margin-left: 4px; font-weight: 500; }

.a11y-check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  padding: 4px 0;
}

.a11y-panel.dark .a11y-check-row { color: #ccc; }

.a11y-check-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #16a667;
  cursor: pointer;
  flex-shrink: 0;
}

.a11y-check-row i { color: #16a667; font-size: 14px; width: 16px; text-align: center; }

.a11y-slider-group { display: flex; flex-direction: column; gap: 6px; }

.a11y-slider-label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
  display: flex;
  align-items: center;
  gap: 7px;
}

.a11y-panel.dark .a11y-slider-label { color: #aaa; }
.a11y-slider-label i { color: #16a667; font-size: 13px; }

.a11y-slider { width: 100%; accent-color: #16a667; cursor: pointer; height: 4px; }
.a11y-slider:disabled { opacity: 0.4; cursor: not-allowed; }

.a11y-test-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid rgba(22,166,103,0.3);
  background: rgba(22,166,103,0.08);
  color: #16a667;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
  align-self: flex-start;
}

.a11y-test-btn:hover:not(:disabled) { background: rgba(22,166,103,0.18); }
.a11y-test-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.a11y-info-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(22,166,103,0.08);
  border: 1px solid rgba(22,166,103,0.25);
  font-size: 12px;
  color: #16a667;
  line-height: 1.55;
}

.a11y-info-box i { flex-shrink: 0; margin-top: 1px; }

.a11y-footer {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.a11y-panel.dark .a11y-footer { border-color: rgba(255,255,255,0.08); }

.a11y-reset-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.1);
  background: transparent;
  color: #888;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
}

.a11y-reset-btn:hover {
  background: rgba(239,68,68,0.07);
  border-color: rgba(239,68,68,0.3);
  color: #ef4444;
}

.a11y-save-btn {
  flex: 2;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: #16a667;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
}

.a11y-save-btn:hover { opacity: 0.88; }
</style>