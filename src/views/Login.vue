<template>
  <div class="login-page">
    <div class="login-glow"></div>
    <div class="login-box">
      <img src="/icons/icon-192.png" class="login-logo" alt="Budget" />
      <h1 class="login-title">Budget</h1>
      <p class="login-sub">Accedi al tuo spazio</p>

      <form class="login-form" @submit.prevent="submit">
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="tu@email.com" autocomplete="email" />
        </div>
        <div class="field">
          <label>Password</label>
          <div class="input-wrap">
            <input
              v-model="password"
              :type="showPw ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <button type="button" class="eye-btn" @click="showPw = !showPw" tabindex="-1">
              <!-- Occhio aperto -->
              <svg v-if="!showPw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <!-- Occhio sbarrato -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>
        <div v-if="error" class="login-error">{{ error }}</div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Accesso...' : 'Accedi' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signIn, loadMonths } from '../lib/store.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const showPw = ref(false)
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await signIn(email.value, password.value)
    await loadMonths()
    router.push('/')
  } catch (e) {
    error.value = 'Email o password errati.'
  } finally {
    loading.value = false
  }
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
  background: radial-gradient(circle, rgba(245,166,35,0.18) 0%, transparent 70%);
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
  font-family: 'Lexend', sans-serif;
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

.login-error {
  background: rgba(255,95,87,0.1);
  border: 1px solid rgba(255,95,87,0.3);
  border-radius: 10px;
  color: var(--red);
  font-size: 0.85rem;
  padding: 0.6rem 0.9rem;
}

.login-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #0e0e0e;
  border: none;
  border-radius: 14px;
  font-family: 'Lexend', sans-serif;
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
</style>
