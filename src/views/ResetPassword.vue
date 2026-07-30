<template>
  <div class="login-page">
    <div class="login-glow"></div>
    <div class="login-box">
      <img src="/icons/icon-192.png" class="login-logo" alt="Budget" />
      <h1 class="login-title">Nuova password</h1>
      <p class="login-sub">Scegli una password per il tuo account</p>

      <form v-if="!done" class="login-form" @submit.prevent="submit">
        <div class="field">
          <label>Nuova password</label>
          <div class="input-wrap">
            <input
              v-model="password"
              :type="showPw ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="new-password"
            />
            <button type="button" class="eye-btn" @click="showPw = !showPw" tabindex="-1">
              <svg v-if="!showPw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="error" class="login-error">{{ error }}</div>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '...' : 'Salva password' }}
        </button>
      </form>

      <div v-else class="login-notice">
        Password aggiornata. Reindirizzamento in corso…
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { updatePassword, authFlow } from '../lib/store.js'

const router = useRouter()
const password = ref('')
const showPw = ref(false)
const error = ref('')
const loading = ref(false)
const done = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = 'La password deve avere almeno 6 caratteri.'
    return
  }
  loading.value = true
  try {
    await updatePassword(password.value)
    authFlow.recovery = false
    done.value = true
    setTimeout(() => router.push('/'), 1200)
  } catch (e) {
    error.value = 'Il link è scaduto o non valido. Richiedi un nuovo reset.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Riusa lo stile di Login: qui ripetiamo solo l'essenziale. */
.login-page { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 2rem; position: relative; overflow: hidden; background: var(--bg); }
.login-glow { position: absolute; width: 320px; height: 320px; background: radial-gradient(circle, rgba(245,166,35,0.18) 0%, transparent 70%); top: 15%; left: 50%; transform: translateX(-50%); pointer-events: none; }
.login-box { width: 100%; max-width: 360px; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
.login-logo { width: 72px; height: 72px; border-radius: 18px; margin-bottom: 0.25rem; }
.login-title { font-size: 2rem; font-weight: 700; letter-spacing: -0.03em; }
.login-sub { color: var(--text2); font-size: 0.88rem; margin-bottom: 1.5rem; text-align: center; }
.login-form { width: 100%; background: var(--surface); border-radius: 24px; border: 1px solid var(--border); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.78rem; font-weight: 600; color: var(--text2); letter-spacing: 0.04em; text-transform: uppercase; }
.input-wrap { position: relative; display: flex; align-items: center; }
.input-wrap input { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; color: var(--text); font-family: 'Lexend', sans-serif; font-size: 0.95rem; padding: 0.75rem 2.8rem 0.75rem 1rem; outline: none; transition: border-color 0.2s; width: 100%; }
.input-wrap input:focus { border-color: var(--accent); }
.eye-btn { position: absolute; right: 0.75rem; background: none; border: none; color: var(--text2); cursor: pointer; padding: 4px; display: flex; align-items: center; }
.eye-btn svg { width: 18px; height: 18px; }
.login-error { background: rgba(255,95,87,0.1); border: 1px solid rgba(255,95,87,0.3); border-radius: 10px; color: var(--red); font-size: 0.85rem; padding: 0.6rem 0.9rem; }
.login-btn { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #0e0e0e; border: none; border-radius: 14px; font-family: 'Lexend', sans-serif; font-size: 1rem; font-weight: 700; padding: 0.9rem; cursor: pointer; box-shadow: 0 4px 20px var(--accent-glow); }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.login-notice { width: 100%; background: rgba(48,209,88,0.1); border: 1px solid rgba(48,209,88,0.3); border-radius: 12px; color: var(--green); font-size: 0.9rem; padding: 1rem; text-align: center; }
</style>
