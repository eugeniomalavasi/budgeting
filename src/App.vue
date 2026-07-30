<template>
  <div class="shell">
    <div class="topbar" v-if="state.user && !isAuthPage">
      <router-link
        v-if="route.path !== '/profilo'"
        to="/profilo"
        class="avatar-btn"
        aria-label="Profilo"
      >{{ initial }}<span v-if="state.invitations.length" class="avatar-dot"></span></router-link>
    </div>

    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <nav class="bottom-nav" v-if="state.user && !isAuthPage">
      <router-link to="/" class="nav-item">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
        <span class="nav-label">Home</span>
      </router-link>
      <router-link to="/transazioni" class="nav-item">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 9h10M7 13h6" />
        </svg>
        <span class="nav-label">Movimenti</span>
      </router-link>
      <!-- Link "vero" (non router-link): forza un refresh completo della pagina
           prima di aprire /aggiungi, così resetta cache/lock/stato in memoria
           che a volte bloccavano il salvataggio del movimento. -->
      <a href="/#/aggiungi" class="nav-item nav-add" @click.prevent="apriAggiungi">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
          class="nav-add-svg">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </a>
      <router-link to="/dividi" class="nav-item">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="7" r="3" />
          <circle cx="15" cy="7" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6" />
        </svg>
        <span class="nav-label">Dividi</span>
      </router-link>
      <router-link to="/stats" class="nav-item">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 20h18M7 20V10M12 20V4M17 20v-7" />
        </svg>
        <span class="nav-label">Grafici</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { state } from './lib/store.js'

const route = useRoute()
const isAuthPage = computed(() => route.path === '/login' || route.path === '/reset')
const initial = computed(() =>
  (state.profile?.name || state.user?.email || '?').trim().charAt(0).toUpperCase()
)

// Refresh forzato prima di aprire "Aggiungi".
// Il router è in hash mode (createWebHashHistory), quindi la rotta sta dopo
// il "#": l'URL corretto è "/#/aggiungi". Impostiamo l'hash e poi forziamo un
// reload vero del documento, così ripartiamo da pagina pulita (niente cache/
// lock/stato in memoria che a volte bloccavano il salvataggio).
function apriAggiungi() {
  const target = window.location.origin + '/#/aggiungi'
  if (window.location.href !== target) {
    window.location.href = target
  }
  window.location.reload()
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

:root {
  --bg: #0e0e0e;
  --surface: #181818;
  --surface2: #222222;
  --border: rgba(255, 255, 255, 0.08);
  --text: #f5f0e8;
  --text2: #8a8070;
  --accent: #f5a623;
  --accent2: #ff7c2a;
  --accent-glow: rgba(245, 166, 35, 0.25);
  --red: #ff5f57;
  --green: #30d158;
  --nav-h: 72px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

html,
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Lexend', sans-serif;
  height: 100%;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100%;
}

.shell {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
  position: relative;
  background: var(--bg);
}

/* ——— TOPBAR: avatar profilo ancorato in cima alla pagina.
   position:absolute → scorre via col contenuto (non resta fisso). ——— */
.topbar {
  position: absolute;
  top: 0;
  right: 0;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 14px 0 0;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;   /* la barra non blocca i click; solo l'avatar è cliccabile */
  z-index: 200;
}
.avatar-btn {
  pointer-events: auto;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #0e0e0e;
  font-weight: 700;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
}
.avatar-btn { position: relative; }
.avatar-btn:active { transform: scale(0.94); }
.avatar-dot {
  position: absolute;
  top: -2px; right: -2px;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--red);
  border: 2px solid var(--bg);
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
  background: rgba(24, 24, 24, 0.95);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: var(--safe-bottom);
  z-index: 100;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  color: var(--text2);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  transition: color 0.2s;
  flex: 1;
}

.nav-svg {
  width: 22px;
  height: 22px;
  display: block;
}

.nav-item.router-link-active {
  color: var(--accent);
}

.nav-item:active {
  opacity: 0.6;
}

.nav-label {
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.nav-add {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border-radius: 50%;
  flex: 0 0 52px;
  color: #0e0e0e !important;
  box-shadow: 0 4px 20px var(--accent-glow);
  padding: 0;
  gap: 0;
}

.nav-add-svg {
  width: 22px;
  height: 22px;
}

/* ——— PAGE ——— */
.page {
  min-height: 100dvh;
  padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px);
}

.card {
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
}

.amount {
  font-family: 'DM Mono', monospace;
  font-weight: 500;
}

.amount.neg {
  color: var(--red);
}

.amount.pos {
  color: var(--green);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}
</style>