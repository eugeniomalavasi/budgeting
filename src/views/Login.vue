<template>
  <div class="login-page">
    <div class="login-glow"></div>
    <div class="login-box">
      <div class="login-logo">💰</div>
      <h1 class="login-title">Budget</h1>
      <p class="login-sub">Accedi al tuo spazio</p>

      <form class="login-form" @submit.prevent="submit">
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="tu@email.com" autocomplete="email" />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" />
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
}

.login-glow {
  position: absolute;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(108,99,255,0.3) 0%, transparent 70%);
  top: 20%; left: 50%; transform: translateX(-50%);
  pointer-events: none;
}

.login-box {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.login-logo { font-size: 3rem; }
.login-title { font-size: 2rem; font-weight: 700; }
.login-sub { color: var(--text2); font-size: 0.9rem; margin-bottom: 1.5rem; }

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
.field label { font-size: 0.8rem; font-weight: 600; color: var(--text2); }
.field input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;
  padding: 0.75rem 1rem;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus { border-color: var(--accent); }

.login-error {
  background: rgba(248,113,113,0.1);
  border: 1px solid rgba(248,113,113,0.3);
  border-radius: 10px;
  color: var(--red);
  font-size: 0.85rem;
  padding: 0.6rem 0.9rem;
}

.login-btn {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 14px;
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(108,99,255,0.4);
}
.login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(108,99,255,0.5); }
.login-btn:active { transform: scale(0.98); }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
