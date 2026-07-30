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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
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
@import url('https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

:root {
  /* Organic — tema chiaro caldo */
  --bg: #f5ead8;
  --surface: #ebddc5;
  --surface2: #f9f4ed;
  --border: rgba(32, 30, 29, 0.14);
  --text: #201e1d;
  --text2: #82796a;
  --accent: #c67139;
  --accent2: #d67f48;
  --accent-glow: rgba(198, 113, 57, 0.30);
  --red: #b04a2c;
  --green: #5f6f45;
  --font-body: 'Figtree', system-ui, sans-serif;
  --font-display: 'Caprasimo', Georgia, serif;
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
  font-family: var(--font-body);
  height: 100%;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}

/* Headings usano il font display Caprasimo dell'Organic design system */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: -0.01em;
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
  background: var(--accent);
  color: var(--bg);
  font-weight: 700;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 4px 14px var(--accent-glow);
  border: 2px solid var(--bg);
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
  background: color-mix(in srgb, var(--surface) 88%, #fff);
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
  width: 60px;
  height: 60px;
  background: var(--accent);
  border-radius: 50%;
  flex: 0 0 60px;
  color: var(--bg) !important;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 45%, transparent);
  padding: 0;
  gap: 0;
  margin-top: -32px;
  align-self: center;
}

.nav-add-svg {
  width: 26px;
  height: 26px;
}

/* ——— PAGE ——— */
.page {
  min-height: 100dvh;
  padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px);
}

.card {
  background: var(--surface);
  border-radius: 24px;
  border: 1px solid transparent;
  box-shadow: 0 1px 2px rgba(46, 43, 37, 0.10);
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