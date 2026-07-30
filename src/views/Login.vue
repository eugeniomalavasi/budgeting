<template>
  <div class="login-page">
    <div class="login-glow"></div>
    <div class="login-box">
      <img src="/icons/icon-192.png" class="login-logo" alt="Budget" />
      <h1 class="login-title">Budget</h1>
      <p class="login-sub">{{ subtitle }}</p>

      <!-- Messaggio "controlla la mail" dopo signup / reset -->
      <div v-if="notice" class="login-notice">{{ notice }}</div>

      <form v-if="mode !== 'sent'" class="login-form" @submit.prevent="submit">
        <div v-if="mode === 'signup'" class="field">
          <label>Nome</label>
          <input v-model="name" type="text" placeholder="Come ti chiami" autocomplete="name" />
        </div>

        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="tu@email.com" autocomplete="email" />
        </div>

        <div v-if="mode !== 'forgot'" class="field">
          <label>Password</label>
          <div class="input-wrap">
            <input
              v-model="password"
              :type="showPw ? 'text' : 'password'"
              placeholder="••••••••"
              :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
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
          <button
            v-if="mode === 'login'"
            type="button"
            class="link-btn forgot"
            @click="switchMode('forgot')"
          >Password dimenticata?</button>
        </div>

        <div v-if="error" class="login-error">{{ error }}</div>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '...' : primaryLabel }}
        </button>

        <div v-if="mode !== 'forgot'" class="divider"><span>oppure</span></div>

        <button
          v-if="mode !== 'forgot'"
          type="button"
          class="google-btn"
          :disabled="loading"
          @click="google"
        >
          <svg viewBox="0 0 48 48" width="18" height="18">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continua con Google
        </button>
      </form>

      <!-- Piede: cambio modalità -->
      <div class="login-foot">
        <template v-if="mode === 'login'">
          Non hai un account?
          <button class="link-btn" @click="switchMode('signup')">Registrati</button>
        </template>
        <template v-else>
          <button class="link-btn" @click="switchMode('login')">← Torna al login</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { signIn, signUp, resetPassword, signInWithGoogle, loadMonths } from '../lib/store.js'

const router = useRouter()
const mode = ref('login')      // 'login' | 'signup' | 'forgot' | 'sent'
const name = ref('')
const email = ref('')
const password = ref('')
const showPw = ref(false)
const error = ref('')
const notice = ref('')
const loading = ref(false)

const subtitle = computed(() => ({
  login: 'Accedi al tuo spazio',
  signup: 'Crea il tuo spazio',
  forgot: 'Recupera l\'accesso',
  sent: 'Fatto',
}[mode.value]))

const primaryLabel = computed(() => ({
  login: 'Accedi',
  signup: 'Registrati',
  forgot: 'Invia link di reset',
}[mode.value]))

function switchMode(m) {
  mode.value = m
  error.value = ''
  notice.value = ''
}

async function submit() {
  error.value = ''
  notice.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await signIn(email.value, password.value)
      await loadMonths()
      router.push('/')
    } else if (mode.value === 'signup') {
      const { needsConfirm } = await signUp(email.value, password.value, name.value)
      if (needsConfirm) {
        notice.value = 'Ti abbiamo inviato una mail di conferma. Aprila per attivare l\'account.'
        mode.value = 'sent'
      } else {
        await loadMonths()
        router.push('/')
      }
    } else if (mode.value === 'forgot') {
      await resetPassword(email.value)
      notice.value = 'Se l\'email esiste, riceverai un link per reimpostare la password.'
      mode.value = 'sent'
    }
  } catch (e) {
    error.value = messageFor(e)
  } finally {
    loading.value = false
  }
}

async function google() {
  error.value = ''
  loading.value = true
  try {
    await signInWithGoogle()   // redirect via browser
  } catch (e) {
    error.value = messageFor(e)
    loading.value = false
  }
}

function messageFor(e) {
  const m = (e?.message || '').toLowerCase()
  if (m.includes('invalid login')) return 'Email o password errati.'
  if (m.includes('already registered')) return 'Email già registrata. Prova ad accedere.'
  if (m.includes('password')) return 'La password deve avere almeno 6 caratteri.'
  if (m.includes('email')) return 'Controlla l\'indirizzo email.'
  return 'Qualcosa è andato storto. Riprova.'
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  background: var(--bg);
}

.login-glow {
  position: absolute;
  width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(198, 113, 57,0.18) 0%, transparent 70%);
  top: 15%; left: 50%; transform: translateX(-50%);
  pointer-events: none;
}

.login-box {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.login-logo {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  margin-bottom: 0.25rem;
}

.login-title { font-size: 2rem; font-weight: 700; letter-spacing: -0.03em; }
.login-sub { color: var(--text2); font-size: 0.88rem; margin-bottom: 1.5rem; }

.login-notice {
  width: 100%;
  background: rgba(122, 138, 94,0.1);
  border: 1px solid rgba(122, 138, 94,0.3);
  border-radius: 12px;
  color: var(--green);
  font-size: 0.85rem;
  line-height: 1.4;
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
  text-align: center;
}

.login-form {
  width: 100%;
  background: var(--surface);
  border-radius: 24px;
  border: 1px solid var(--border);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.78rem; font-weight: 600; color: var(--text2); letter-spacing: 0.04em; text-transform: uppercase; }

.field input, .input-wrap input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  padding: 0.75rem 1rem;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
}
.field input:focus, .input-wrap input:focus { border-color: var(--accent); }

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-wrap input { padding-right: 2.8rem; }

.eye-btn {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--text2);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}
.eye-btn:hover { color: var(--text); }
.eye-btn svg { width: 18px; height: 18px; }

.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-family: 'Figtree', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.link-btn.forgot { align-self: flex-end; margin-top: 2px; font-size: 0.8rem; }

.login-error {
  background: rgba(176, 74, 44,0.1);
  border: 1px solid rgba(176, 74, 44,0.3);
  border-radius: 10px;
  color: var(--red);
  font-size: 0.85rem;
  padding: 0.6rem 0.9rem;
}

.login-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #f5ead8;
  border: none;
  border-radius: 14px;
  font-family: 'Figtree', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 20px var(--accent-glow);
  letter-spacing: 0.02em;
}
.login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 28px var(--accent-glow); }
.login-btn:active { transform: scale(0.98); }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text2);
  font-size: 0.75rem;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text);
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.google-btn:hover:not(:disabled) { border-color: var(--text2); }
.google-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.login-foot {
  margin-top: 1.25rem;
  color: var(--text2);
  font-size: 0.85rem;
}
</style>
