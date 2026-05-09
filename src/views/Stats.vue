<template>
  <div class="page">
    <div class="stats-header">
      <h1 class="stats-title">Statistiche</h1>
    </div>

    <div class="px">
      <!-- KPI annuali -->
      <div class="kpi-row">
        <div class="kpi card">
          <span class="kpi-label">Saldo attuale</span>
          <span class="kpi-val pos">{{ fmt(lastMonth?.saldo_finale) }}</span>
        </div>
        <div class="kpi card">
          <span class="kpi-label">Risparmiati (anno)</span>
          <span class="kpi-val" :class="totRisparmiati >= 0 ? 'pos' : 'neg'">{{ fmt(totRisparmiati) }}</span>
        </div>
      </div>

      <!-- Grafico saldo -->
      <div class="chart-card card">
        <p class="chart-title">Saldo nel tempo</p>
        <Line :data="saldoData" :options="lineOpts" />
      </div>

      <!-- Grafico entrate/uscite -->
      <div class="chart-card card">
        <p class="chart-title">Entrate vs Uscite</p>
        <Bar :data="entrateUsciteData" :options="barOpts" />
      </div>

      <!-- Torta categorie -->
      <div class="chart-card card">
        <p class="chart-title">Uscite per categoria (anno)</p>
        <div class="doughnut-wrap">
          <Doughnut :data="catData" :options="doughnutOpts" />
        </div>
      </div>

      <!-- Tabella categorie -->
      <div class="card cat-table">
        <div v-for="[cat, val] in topCatAll" :key="cat" class="cat-row">
          <span class="cat-dot" :style="{ background: CAT_COLORS[cat] || '#94a3b8' }"></span>
          <span class="cat-emoji">{{ CAT_EMOJI[cat] || '📦' }}</span>
          <span class="cat-name">{{ cat }}</span>
          <span class="cat-bar-wrap">
            <div class="cat-bar" :style="{ width: (val / topCatAll[0][1] * 100) + '%', background: CAT_COLORS[cat] || '#94a3b8' }"></div>
          </span>
          <span class="cat-amount neg amount">{{ fmt(val) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { state, loadMonths, fmt, CAT_COLORS, CAT_EMOJI } from '../lib/store.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler)

const months = computed(() => state.months)
const lastMonth = computed(() => months.value[months.value.length - 1])
const totRisparmiati = computed(() => months.value.reduce((s, m) => s + Number(m.risparmiati), 0))

const labels = computed(() => months.value.map(m => m.label.split(' ')[0]))

const saldoData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Saldo',
    data: months.value.map(m => m.saldo_finale),
    borderColor: '#6c63ff',
    backgroundColor: 'rgba(108,99,255,0.15)',
    fill: true,
    tension: 0.4,
    pointRadius: 4,
    pointBackgroundColor: '#6c63ff',
  }]
}))

const entrateUsciteData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Entrate',
      data: months.value.map(m => m.entrate_effettive),
      backgroundColor: 'rgba(74,222,128,0.8)',
      borderRadius: 6,
    },
    {
      label: 'Uscite',
      data: months.value.map(m => m.uscite_effettive),
      backgroundColor: 'rgba(248,113,113,0.8)',
      borderRadius: 6,
    }
  ]
}))

// Somma categorie su tutti i mesi (calcolata dalle transazioni disponibili)
const topCatAll = computed(() => {
  const cats = {}
  state.transactions.filter(t => t.importo < 0).forEach(t => {
    cats[t.categoria] = (cats[t.categoria] || 0) + Math.abs(Number(t.importo))
  })
  return Object.entries(cats).sort((a, b) => b[1] - a[1])
})

const catData = computed(() => ({
  labels: topCatAll.value.map(([k]) => k),
  datasets: [{
    data: topCatAll.value.map(([, v]) => v),
    backgroundColor: topCatAll.value.map(([k]) => CAT_COLORS[k] || '#94a3b8'),
    borderWidth: 2,
    borderColor: '#1a1d27',
  }]
}))

const chartOpts = {
  responsive: true,
  plugins: {
    legend: { labels: { color: '#8891b0', font: { family: 'DM Sans', size: 11 } } },
    tooltip: { callbacks: { label: ctx => ` €${Number(ctx.raw).toLocaleString('it-IT')}` } }
  },
  scales: {
    x: { ticks: { color: '#8891b0', font: { family: 'DM Sans', size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#8891b0', callback: v => '€' + Number(v).toLocaleString('it-IT'), font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
  }
}

const lineOpts = { ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }
const barOpts = { ...chartOpts }
const doughnutOpts = {
  responsive: true,
  plugins: {
    legend: { position: 'bottom', labels: { color: '#8891b0', font: { family: 'DM Sans', size: 11 }, padding: 12, boxWidth: 12 } },
    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: €${Number(ctx.raw).toLocaleString('it-IT')}` } }
  }
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
})
</script>

<style scoped>
.stats-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1rem 1.25rem;
}
.stats-title { font-size: 1.3rem; font-weight: 700; }

.px { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

.kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.kpi { padding: 1rem; display: flex; flex-direction: column; gap: 4px; }
.kpi-label { font-size: 0.75rem; color: var(--text2); font-weight: 500; }
.kpi-val { font-size: 1.3rem; font-weight: 700; font-family: 'DM Mono', monospace; }

.chart-card { padding: 1.1rem; }
.chart-title { font-size: 0.8rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.85rem; }

.doughnut-wrap { max-width: 260px; margin: 0 auto; }

.cat-table { overflow: hidden; }
.cat-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}
.cat-row:last-child { border-bottom: none; }
.cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cat-emoji { font-size: 1rem; flex-shrink: 0; }
.cat-name { font-size: 0.85rem; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-bar-wrap { width: 60px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; flex-shrink: 0; }
.cat-bar { height: 100%; border-radius: 100px; }
.cat-amount { font-size: 0.85rem; flex-shrink: 0; }
</style>
