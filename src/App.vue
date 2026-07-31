<template>
  <div class="shell">
    <div class="scroll-area">
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
    </div>

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
  /* ══ Organic — tema chiaro caldo. Token allineati 1:1 al design system ══ */
  --bg: #f5ead8;
  --surface: #ebddc5;
  --surface2: #f9f4ed;
  --border: color-mix(in srgb, #201e1d 16%, transparent);
  --text: #201e1d;
  --text2: #82796a;
  --accent: #c67139;
  --accent2: #d67f48;
  --accent-glow: color-mix(in srgb, #c67139 30%, transparent);

  /* Rampe tonali Organic (OKLCH) — usate da icone, badge e sfumature */
  --neutral-100: #f9f4ed;
  --neutral-200: #eee7db;
  --neutral-300: #dcd3c4;
  --neutral-400: #c0b6a5;
  --neutral-500: #a19786;
  --neutral-600: #82796a;
  --neutral-700: #645c50;
  --neutral-800: #474238;
  --neutral-900: #2e2b25;

  --accent-100: #fff2eb;
  --accent-200: #ffe1d0;
  --accent-300: #ffc6a5;
  --accent-400: #f6a06b;
  --accent-500: #d67f48;
  --accent-600: #b2622d;
  --accent-700: #8c491a;
  --accent-800: #643312;
  --accent-900: #402310;

  --accent2-100: #f0fae1;
  --accent2-200: #e1eecc;
  --accent2-300: #ccdbb2;
  --accent2-400: #aebf92;
  --accent2-500: #8fa073;
  --accent2-600: #728157;
  --accent2-700: #56633f;
  --accent2-800: #3d472b;
  --accent2-900: #272e1b;

  /* Importi: negativo = terracotta 700, positivo = sage 700 (come nel design) */
  --red: #8c491a;
  --green: #56633f;

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
  height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: var(--bg);
}

/* Unico contenitore che scrolla: la bottom-nav resta fuori dallo scroll,
   sempre ancorata in basso (niente drift con la toolbar del browser mobile). */
.scroll-area {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
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
  flex: 0 0 auto;
  width: 100%;
  /* La barra alta --nav-h + l'intera area gesture (safe-area) riempita con lo
     stesso colore: niente più fascia vuota bicolore sotto al menu. */
  height: calc(var(--nav-h) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: color-mix(in srgb, var(--surface) 88%, #fff);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
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
  min-height: 100%;
  padding-bottom: 20px;
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