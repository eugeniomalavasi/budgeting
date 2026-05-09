<template>
  <div class="shell">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <nav class="bottom-nav" v-if="state.user && !isLogin">
      <router-link to="/" class="nav-item">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Home</span>
      </router-link>
      <router-link to="/transazioni" class="nav-item">
        <span class="nav-icon">📋</span>
        <span class="nav-label">Movimenti</span>
      </router-link>
      <router-link to="/aggiungi" class="nav-item nav-add">
        <span class="nav-icon-add">+</span>
      </router-link>
      <router-link to="/stats" class="nav-item">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Grafici</span>
      </router-link>
      <button class="nav-item" @click="logout">
        <span class="nav-icon">👤</span>
        <span class="nav-label">Esci</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { state, signOut } from './lib/store.js'

const route = useRoute()
const router = useRouter()
const isLogin = computed(() => route.path === '/login')

async function logout() {
  await signOut()
  router.push('/login')
}
</script>

<style>
:root {
  --bg: #0f1117;
  --surface: #1a1d27;
  --surface2: #22263a;
  --border: rgba(255,255,255,0.07);
  --text: #f0f2ff;
  --text2: #8891b0;
  --accent: #6c63ff;
  --accent2: #4ade80;
  --red: #f87171;
  --green: #4ade80;
  --nav-h: 72px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  height: 100%;
  overscroll-behavior: none;
}

#app { height: 100%; }

.shell {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
  position: relative;
  background: var(--bg);
}

/* ——— BOTTOM NAV ——— */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: calc(var(--nav-h) + var(--safe-bottom));
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: var(--safe-bottom);
  backdrop-filter: blur(20px);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--text2);
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 12px;
  transition: all 0.2s;
  flex: 1;
}

.nav-item.router-link-active { color: var(--accent); }
.nav-item:active { transform: scale(0.93); }

.nav-icon { font-size: 1.3rem; line-height: 1; }
.nav-label { font-size: 0.68rem; font-weight: 500; letter-spacing: 0.02em; }

.nav-add {
  width: 52px;
  height: 52px;
  background: var(--accent);
  border-radius: 50%;
  flex: 0 0 auto;
  color: white;
  box-shadow: 0 4px 20px rgba(108,99,255,0.5);
  flex-direction: row;
}

.nav-icon-add { font-size: 1.8rem; font-weight: 300; line-height: 1; }

/* ——— PAGE LAYOUT ——— */
.page {
  min-height: 100dvh;
  padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px);
}

/* ——— SHARED COMPONENTS ——— */
.card {
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
}

.amount {
  font-family: 'DM Mono', monospace;
  font-weight: 500;
}

.amount.neg { color: var(--red); }
.amount.pos { color: var(--green); }

/* ——— TRANSITIONS ——— */
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ——— SCROLLBAR ——— */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
</style>
