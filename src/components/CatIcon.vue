<template>
  <span class="cat-icon-wrap" :style="{ background: tone.bg }">
    <!-- 1) Icona SVG scelta dall'utente (set selezionabile) -->
    <svg v-if="picked" :viewBox="picked.v" fill="none" xmlns="http://www.w3.org/2000/svg" class="cat-svg" :style="{ color: tone.fg }">
      <path v-for="(d, i) in (picked.s || [])" :key="'s'+i" :d="d" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <path v-for="(d, i) in (picked.f || [])" :key="'f'+i" :d="d" fill="currentColor" />
    </svg>
    <!-- 2) Icona legacy associata al nome categoria -->
    <svg v-else-if="!custom" :viewBox="icon.v" fill="none" xmlns="http://www.w3.org/2000/svg" class="cat-svg" :style="{ color: tone.fg }">
      <path v-for="(p, i) in icon.paths" :key="i"
        :d="p.d"
        :fill="p.fill ? 'currentColor' : 'none'"
        :stroke="p.stroke ? 'currentColor' : 'none'"
        :stroke-width="p.sw ? 2.4 : 0"
        :stroke-linecap="p.slc || 'round'"
        :stroke-linejoin="p.slj || 'round'"
      />
    </svg>
    <!-- 3) Fallback emoji -->
    <span v-else class="cat-emoji" :style="{ color: tone.fg }">{{ emoji }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { catEmoji, catIconKey } from '../lib/store.js'
import { ICON_MAP } from '../lib/icons.js'

const props = defineProps({ categoria: String, size: { default: 36 } })

// ─── Palette Organic: tre coppie tono/sfondo caldo (sage, terracotta, neutro) ───
// Le icone non usano più i colori "al neon" salvati per categoria: tutto viene
// ricondotto ai toni del design system, così l'app resta coerente e calda.
const TONES = {
  sage:       { bg: 'var(--accent2-100)', fg: 'var(--accent2-700)' },
  sageDeep:   { bg: 'var(--accent2-200)', fg: 'var(--accent2-800)' },
  terracotta: { bg: 'var(--accent-100)',  fg: 'var(--accent-700)' },
  neutral:    { bg: 'var(--neutral-200)', fg: 'var(--neutral-700)' },
}
const TONE_CYCLE = ['sage', 'terracotta', 'neutral', 'sageDeep']

// Toni curati per le categorie note (rispecchiano il mockup del design).
const CAT_TONE = {
  'Alimenti': 'sage', 'Ristoranti': 'terracotta', 'Casa': 'neutral',
  'Trasporti': 'sage', 'Bollette': 'terracotta', 'Svago': 'sageDeep',
  'Salute/spese mediche': 'terracotta', 'Regali': 'sage', 'Vestiario': 'neutral',
  'Viaggi': 'sageDeep', 'Busta paga': 'sage', 'Interessi': 'sage',
  'Bonus': 'terracotta', 'Altro': 'neutral', 'Spese personali': 'neutral',
  'Animali domestici': 'terracotta', 'Debiti': 'terracotta', 'Risparmi': 'sage',
}

// Hash stabile del nome → tono (per le categorie personalizzate).
function hashTone(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TONE_CYCLE[h % TONE_CYCLE.length]
}

const tone = computed(() => TONES[CAT_TONE[props.categoria] || hashTone(props.categoria)])

// Icona SVG esplicitamente scelta per la categoria (Fase 5).
const picked = computed(() => ICON_MAP[catIconKey(props.categoria)] || null)

const ICONS = {
  'Alimenti': { v: '0 0 24 24', paths: [
    { d: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z', stroke: 1 },
    { d: 'M3 6h18', stroke: 1 }, { d: 'M16 10a4 4 0 01-8 0', stroke: 1 } ] },
  'Bollette': { v: '0 0 24 24', paths: [ { d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', fill: 1 } ] },
  'Trasporti': { v: '0 0 24 24', paths: [
    { d: 'M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-3', stroke: 1 },
    { d: 'M7 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z', fill: 1 } ] },
  'Salute/spese mediche': { v: '0 0 24 24', paths: [
    { d: 'M12 21.7C5.8 17.4 2 13 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.3.8 4.5 2.1C13.2 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 4.5-3.8 8.9-10 13.2z', fill: 1 } ] },
  'Svago': { v: '0 0 24 24', paths: [
    { d: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', stroke: 1 },
    { d: 'M12 12v4m0-9v1', stroke: 1 } ] },
  'Ristoranti': { v: '0 0 24 24', paths: [
    { d: 'M18 8h1a4 4 0 010 8h-1', stroke: 1 },
    { d: 'M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z', stroke: 1 },
    { d: 'M6 1v3m4-3v3m4-3v3', stroke: 1 } ] },
  'Regali': { v: '0 0 24 24', paths: [
    { d: 'M20 12v10H4V12', stroke: 1 }, { d: 'M22 7H2v5h20V7z', stroke: 1 },
    { d: 'M12 22V7', stroke: 1 },
    { d: 'M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z', stroke: 1 } ] },
  'Vestiario': { v: '0 0 24 24', paths: [
    { d: 'M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10a2 2 0 002 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z', stroke: 1 } ] },
  'Casa': { v: '0 0 24 24', paths: [
    { d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', stroke: 1 },
    { d: 'M9 22V12h6v10', stroke: 1 } ] },
  'Viaggi': { v: '0 0 24 24', paths: [
    { d: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z', fill: 1 } ] },
  'Busta paga': { v: '0 0 24 24', paths: [
    { d: 'M21 8V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2v-1', stroke: 1 },
    { d: 'M13 12h8m-3-3l3 3-3 3', stroke: 1 } ] },
  'Interessi': { v: '0 0 24 24', paths: [
    { d: 'M23 6l-9.5 9.5-5-5L1 18', stroke: 1 }, { d: 'M17 6h6v6', stroke: 1 } ] },
  'Bonus': { v: '0 0 24 24', paths: [
    { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', fill: 1 } ] },
  'Altro': { v: '0 0 24 24', paths: [
    { d: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', stroke: 1 } ] },
  'Spese personali': { v: '0 0 24 24', paths: [
    { d: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', stroke: 1 },
    { d: 'M12 11a4 4 0 100-8 4 4 0 000 8z', stroke: 1 } ] },
  'Animali domestici': { v: '0 0 24 24', paths: [
    { d: 'M11 4.5C11 5.88 9.88 7 8.5 7S6 5.88 6 4.5 7.12 2 8.5 2 11 3.12 11 4.5zm7 0C18 5.88 16.88 7 15.5 7S13 5.88 13 4.5 14.12 2 15.5 2 18 3.12 18 4.5zM6 11c0 1.38-1.12 2.5-2.5 2.5S1 12.38 1 11s1.12-2.5 2.5-2.5S6 9.62 6 11zm17 0c0 1.38-1.12 2.5-2.5 2.5S18 12.38 18 11s1.12-2.5 2.5-2.5S23 9.62 23 11z', fill: 1 },
    { d: 'M12 14c-4 0-7 2.5-7 5.5V21h14v-1.5c0-3-3-5.5-7-5.5z', fill: 1 } ] },
  'Debiti': { v: '0 0 24 24', paths: [ { d: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', stroke: 1 } ] },
  'Risparmi': { v: '0 0 24 24', paths: [
    { d: 'M17 8C8 10 5.9 16.17 3.82 19.34A1 1 0 004.65 21C8 20 12.46 19 17 18v3l4-4-4-4v3c-3 .5-6 1-8.5 1.5C10 12 13.5 9 17 8z', fill: 1 } ] },
}

const custom = computed(() => !ICONS[props.categoria])
const icon = computed(() => ICONS[props.categoria] || ICONS['Altro'])
const emoji = computed(() => catEmoji(props.categoria))
</script>

<style scoped>
.cat-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cat-svg {
  width: 20px;
  height: 20px;
}
.cat-emoji {
  font-size: 18px;
  line-height: 1;
}
</style>
