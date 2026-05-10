<template>
  <div class="page">
    <div class="stats-header">
      <h1 class="stats-title">Statistiche</h1>
    </div>

    <div class="px">
      <!-- KPI grid -->
      <div class="kpi-grid">
        <div class="kpi card">
          <span class="kpi-label">Saldo attuale</span>
          <span class="kpi-val pos">{{ fmt(lastMonth?.saldo_finale) }}</span>
        </div>
        <div class="kpi card">
          <span class="kpi-label">Risparmiati totali</span>
          <span class="kpi-val" :class="totRisparmiati>=0?'pos':'neg'">{{ fmt(totRisparmiati) }}</span>
        </div>
        <div class="kpi card">
          <span class="kpi-label">Entrate totali</span>
          <span class="kpi-val pos">{{ fmt(entrateTotali) }}</span>
        </div>
        <div class="kpi card">
          <span class="kpi-label">Spese totali</span>
          <span class="kpi-val neg">{{ fmt(speseTotali) }}</span>
        </div>
        <div class="kpi card">
          <span class="kpi-label">Entrate {{ anno }}</span>
          <span class="kpi-val pos">{{ fmt(entrateAnno) }}</span>
        </div>
        <div class="kpi card">
          <span class="kpi-label">Spese {{ anno }}</span>
          <span class="kpi-val neg">{{ fmt(speseAnno) }}</span>
        </div>
        <div class="kpi card">
          <span class="kpi-label">Risparmiati {{ anno }}</span>
          <span class="kpi-val" :class="risparmiatiAnno>=0?'pos':'neg'">{{ fmt(risparmiatiAnno) }}</span>
        </div>
      </div>

      <!-- Grafico saldo -->
      <div class="chart-card card">
        <p class="chart-title">Saldo nel tempo</p>
        <Line :data="saldoData" :options="lineOpts" />
      </div>

      <!-- Grafico entrate/uscite mensili con toggle -->
      <div class="chart-card card">
        <div class="chart-header">
          <p class="chart-title">Entrate vs Uscite</p>
          <div class="chart-tabs">
            <button :class="['chart-tab', vistaEU==='bar' && 'active']" @click="vistaEU='bar'">Barre</button>
            <button :class="['chart-tab', vistaEU==='table' && 'active']" @click="vistaEU='table'">Tabella</button>
          </div>
        </div>

        <Bar v-if="vistaEU==='bar'" :data="entrateUsciteData" :options="barOpts" />

        <div v-else class="month-table">
          <div class="mt-header">
            <span>Mese</span>
            <span>Entrate</span>
            <span>Uscite</span>
            <span>Saldo</span>
          </div>
          <div
            v-for="m in months"
            :key="m.id"
            class="mt-row"
            :class="{ expanded: expandedMonth===m.id }"
            @click="toggleMonth(m.id)"
          >
            <div class="mt-main">
              <span class="mt-label">{{ m.label.split(' ')[0] }}</span>
              <span class="mt-val pos">{{ fmt(m.entrate_effettive) }}</span>
              <span class="mt-val neg">{{ fmt(m.uscite_effettive) }}</span>
              <span class="mt-val" :class="m.risparmiati>=0?'pos':'neg'">{{ fmt(m.risparmiati) }}</span>
            </div>

            <!-- Dettaglio categorie mese -->
            <div v-if="expandedMonth===m.id" class="mt-detail">
              <div class="mt-detail-section">
                <p class="mt-detail-title">📥 Entrate</p>
                <div v-for="[cat, val] in getCatEntrate(m.id)" :key="cat" class="mt-detail-row">
                  <span>{{ CAT_EMOJI[cat]||'📦' }} {{ cat }}</span>
                  <span class="pos amount">{{ fmt(val) }}</span>
                </div>
              </div>
              <div class="mt-detail-section">
                <p class="mt-detail-title">📤 Uscite</p>
                <div v-for="[cat, val] in getCatUscite(m.id)" :key="cat" class="mt-detail-row">
                  <span>{{ CAT_EMOJI[cat]||'📦' }} {{ cat }}</span>
                  <span class="neg amount">{{ fmt(val) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Torta categorie -->
      <div class="chart-card card">
        <p class="chart-title">Uscite per categoria (tutto il periodo)</p>
        <div class="doughnut-wrap">
          <Doughnut :data="catData" :options="doughnutOpts" />
        </div>
      </div>

      <!-- Tabella categorie ranking -->
      <div class="card cat-table">
        <div v-for="[cat, val] in topCatAll" :key="cat" class="cat-row">
          <span class="cat-dot" :style="{ background: CAT_COLORS[cat]||'#94a3b8' }"></span>
          <span class="cat-emoji">{{ CAT_EMOJI[cat]||'📦' }}</span>
          <span class="cat-name">{{ cat }}</span>
          <span class="cat-bar-wrap">
            <div class="cat-bar" :style="{ width: (val/topCatAll[0][1]*100)+'%', background: CAT_COLORS[cat]||'#94a3b8' }"></div>
          </span>
          <span class="cat-amount neg amount">{{ fmt(val) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { state, loadMonths, loadTransactions, fmt, CAT_COLORS, CAT_EMOJI } from '../lib/store.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler)

const anno = new Date().getFullYear()
const vistaEU = ref('bar')
const expandedMonth = ref(null)

const months = computed(() => state.months)
const lastMonth = computed(() => months.value[months.value.length - 1])

// KPI totali
const totRisparmiati  = computed(() => months.value.reduce((s,m) => s + Number(m.risparmiati), 0))
const entrateTotali   = computed(() => months.value.reduce((s,m) => s + Number(m.entrate_effettive), 0))
const speseTotali     = computed(() => months.value.reduce((s,m) => s + Number(m.uscite_effettive), 0))

// KPI anno corrente
const mesiAnno        = computed(() => months.value.filter(m => m.id.startsWith(String(anno))))
const entrateAnno     = computed(() => mesiAnno.value.reduce((s,m) => s + Number(m.entrate_effettive), 0))
const speseAnno       = computed(() => mesiAnno.value.reduce((s,m) => s + Number(m.uscite_effettive), 0))
const risparmiatiAnno = computed(() => mesiAnno.value.reduce((s,m) => s + Number(m.risparmiati), 0))

// Categorie per mese (da transazioni caricate)
function getCatUscite(monthId) {
  const cats = {}
  state.transactions.filter(t => t.month_id === monthId && t.importo < 0)
    .forEach(t => { cats[t.categoria] = (cats[t.categoria]||0) + Math.abs(Number(t.importo)) })
  return Object.entries(cats).sort((a,b) => b[1]-a[1])
}

function getCatEntrate(monthId) {
  const cats = {}
  state.transactions.filter(t => t.month_id === monthId && t.importo > 0)
    .forEach(t => { cats[t.categoria] = (cats[t.categoria]||0) + Number(t.importo) })
  return Object.entries(cats).sort((a,b) => b[1]-a[1])
}

function toggleMonth(id) {
  if (expandedMonth.value === id) {
    expandedMonth.value = null
  } else {
    expandedMonth.value = id
    // Carica transazioni se non già caricate
    if (!state.transactions.find(t => t.month_id === id)) {
      loadTransactions(id)
    }
  }
}

// Grafici
const labels = computed(() => months.value.map(m => m.label.split(' ')[0]))

const saldoData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Saldo',
    data: months.value.map(m => m.saldo_finale),
    borderColor: 'var(--accent)',
    backgroundColor: 'rgba(245,166,35,0.1)',
    fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: 'var(--accent)',
  }]
}))

const entrateUsciteData = computed(() => ({
  labels: labels.value,
  datasets: [
    { label:'Entrate', data:months.value.map(m=>m.entrate_effettive), backgroundColor:'rgba(74,222,128,0.8)', borderRadius:6 },
    { label:'Uscite',  data:months.value.map(m=>m.uscite_effettive),  backgroundColor:'rgba(248,113,113,0.8)', borderRadius:6 },
  ]
}))

const topCatAll = computed(() => {
  const cats = {}
  state.transactions.filter(t => t.importo < 0)
    .forEach(t => { cats[t.categoria] = (cats[t.categoria]||0) + Math.abs(Number(t.importo)) })
  return Object.entries(cats).sort((a,b) => b[1]-a[1])
})

const catData = computed(() => ({
  labels: topCatAll.value.map(([k]) => k),
  datasets: [{
    data: topCatAll.value.map(([,v]) => v),
    backgroundColor: topCatAll.value.map(([k]) => CAT_COLORS[k]||'#94a3b8'),
    borderWidth: 2, borderColor: '#1a1d27',
  }]
}))

const baseOpts = {
  responsive: true,
  plugins: {
    legend: { labels: { color:'#8891b0', font:{ family:'Lexend', size:11 } } },
    tooltip: { callbacks: { label: ctx => ` €${Number(ctx.raw).toLocaleString('it-IT')}` } }
  },
  scales: {
    x: { ticks:{ color:'#8891b0', font:{size:10} }, grid:{ color:'rgba(255,255,255,0.05)' } },
    y: { ticks:{ color:'#8891b0', callback: v=>'€'+Number(v).toLocaleString('it-IT'), font:{size:10} }, grid:{ color:'rgba(255,255,255,0.05)' } }
  }
}
const lineOpts = { ...baseOpts, plugins: { ...baseOpts.plugins, legend:{ display:false } } }
const barOpts = { ...baseOpts }
const doughnutOpts = {
  responsive: true,
  plugins: {
    legend: { position:'bottom', labels:{ color:'#8891b0', font:{ family:'Lexend', size:11 }, padding:12, boxWidth:12 } },
    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: €${Number(ctx.raw).toLocaleString('it-IT')}` } }
  }
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
  // Carica tutte le transazioni per statistiche categoria
  for (const m of state.months) {
    if (!state.transactions.find(t => t.month_id === m.id)) {
      await loadTransactions(m.id)
    }
  }
})
</script>

<style scoped>
.stats-header { background:var(--surface); border-bottom:1px solid var(--border); padding:1rem 1.25rem; }
.stats-title { font-size:1.3rem; font-weight:700; }
.px { padding:1.25rem; display:flex; flex-direction:column; gap:1rem; }

/* KPI */
.kpi-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
.kpi { padding:1rem; display:flex; flex-direction:column; gap:4px; }
.kpi-label { font-size:0.72rem; color:var(--text2); font-weight:500; line-height:1.3; }
.kpi-val { font-size:1.25rem; font-weight:700; font-family:'DM Mono',monospace; }

/* Chart card */
.chart-card { padding:1.1rem; }
.chart-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem; }
.chart-title { font-size:0.78rem; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:0.05em; }
.chart-tabs { display:flex; gap:4px; }
.chart-tab { background:transparent; border:1px solid var(--border); border-radius:8px; color:var(--text2); cursor:pointer; font-family:'Lexend',sans-serif; font-size:0.75rem; padding:0.25rem 0.6rem; transition:all 0.2s; }
.chart-tab.active { background:var(--accent); border-color:var(--accent); color:white; }

/* Month table */
.month-table { display:flex; flex-direction:column; gap:2px; }

.mt-header {
  display:grid; grid-template-columns:1fr 1fr 1fr 1fr;
  padding:0.4rem 0.6rem;
  font-size:0.7rem; color:var(--text2); font-weight:600;
  text-transform:uppercase; letter-spacing:0.04em;
}

.mt-row {
  background:var(--surface2);
  border-radius:12px;
  overflow:hidden;
  cursor:pointer;
  transition:background 0.15s;
}
.mt-row:active { background:rgba(245,166,35,0.08); }
.mt-row.expanded { background:rgba(245,166,35,0.08); border:1px solid rgba(245,166,35,0.12); }

.mt-main {
  display:grid; grid-template-columns:1fr 1fr 1fr 1fr;
  padding:0.7rem 0.6rem;
  align-items:center;
}

.mt-label { font-size:0.85rem; font-weight:600; }
.mt-val { font-size:0.82rem; font-weight:600; font-family:'DM Mono',monospace; text-align:right; }

/* Dettaglio mese */
.mt-detail {
  border-top:1px solid var(--border);
  padding:0.85rem;
  display:flex;
  flex-direction:column;
  gap:0.85rem;
}

.mt-detail-section { display:flex; flex-direction:column; gap:0.4rem; }
.mt-detail-title { font-size:0.75rem; font-weight:600; color:var(--text2); margin-bottom:0.25rem; }
.mt-detail-row {
  display:flex; justify-content:space-between; align-items:center;
  font-size:0.82rem; padding:0.3rem 0;
  border-bottom:1px solid rgba(255,255,255,0.04);
}
.mt-detail-row:last-child { border-bottom:none; }

/* Doughnut */
.doughnut-wrap { max-width:260px; margin:0 auto; }

/* Categoria ranking */
.cat-table { overflow:hidden; }
.cat-row { display:flex; align-items:center; gap:0.6rem; padding:0.75rem 1rem; border-bottom:1px solid var(--border); }
.cat-row:last-child { border-bottom:none; }
.cat-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.cat-emoji { font-size:1rem; flex-shrink:0; }
.cat-name { font-size:0.85rem; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cat-bar-wrap { width:60px; height:4px; background:rgba(255,255,255,0.08); border-radius:100px; overflow:hidden; flex-shrink:0; }
.cat-bar { height:100%; border-radius:100px; }
.cat-amount { font-size:0.85rem; flex-shrink:0; }
</style>
