<template>
  <div class="page">
    <!-- Header -->
    <div class="home-header">
      <div class="header-top">
        <div>
          <p class="header-greeting">Ciao {{ userName }} 👋</p>
          <p class="header-sub">{{ today }}</p>
        </div>
        <div class="saldo-badge">
          <span class="saldo-label">Saldo</span>
          <span class="saldo-value">{{ fmt(currentMonth?.saldo_finale) }}</span>
        </div>
      </div>

      <!-- Selettore mese -->
      <div class="month-scroll">
        <button
          v-for="m in state.months"
          :key="m.id"
          class="month-chip"
          :class="{ active: state.currentMonthId === m.id }"
          @click="selectMonth(m.id)"
        >
          {{ m.label.split(' ')[0] }}
        </button>
      </div>
    </div>

    <!-- Mese corrente stats -->
    <div class="px">
      <div v-if="loading" class="skeleton-card"></div>
      <template v-else-if="currentMonth">

        <!-- Big card risparmi -->
        <div class="savings-card card">
          <div class="savings-row">
            <div class="savings-half">
              <span class="savings-label">Entrate</span>
              <span class="savings-amount pos">{{ fmt(currentMonth.entrate_effettive) }}</span>
              <span class="savings-prev">prev. {{ fmt(currentMonth.entrate_previste) }}</span>
            </div>
            <div class="savings-divider"></div>
            <div class="savings-half">
              <span class="savings-label">Uscite</span>
              <span class="savings-amount neg">{{ fmt(currentMonth.uscite_effettive) }}</span>
              <span class="savings-prev">prev. {{ fmt(currentMonth.uscite_previste) }}</span>
            </div>
          </div>
          <div class="savings-bar-wrap">
            <div class="savings-bar">
              <div class="savings-fill" :style="{ width: spendPercent + '%', background: spendPercent > 100 ? 'var(--red)' : 'var(--accent)' }"></div>
            </div>
            <span class="savings-pct">{{ spendPercent }}% del budget</span>
          </div>
          <div class="savings-bottom">
            <span>Risparmiati questo mese</span>
            <span class="amount" :class="currentMonth.risparmiati >= 0 ? 'pos' : 'neg'">
              {{ fmt(currentMonth.risparmiati) }}
            </span>
          </div>
        </div>

        <!-- Categorie top uscite -->
        <p class="section-label">Top categorie</p>
        <div class="cat-grid">
          <div v-for="[cat, val] in topCat" :key="cat" class="cat-item card">
            <span class="cat-emoji">{{ CAT_EMOJI[cat] || '📦' }}</span>
            <span class="cat-name">{{ cat }}</span>
            <span class="cat-val neg amount">{{ fmt(val) }}</span>
          </div>
        </div>

        <!-- Ultime transazioni -->
        <p class="section-label">Recenti</p>
        <div class="tx-list card">
          <div v-if="recentTx.length === 0" class="tx-empty">Nessuna transazione questo mese</div>
          <div
            v-for="tx in recentTx"
            :key="tx.id"
            class="tx-row"
          >
            <div class="tx-emoji">{{ CAT_EMOJI[tx.categoria] || '📦' }}</div>
            <div class="tx-info">
              <span class="tx-desc">{{ tx.descrizione }}</span>
              <span class="tx-meta">{{ tx.categoria }} · {{ formatData(tx.data) }}</span>
            </div>
            <span class="tx-amount amount" :class="tx.importo < 0 ? 'neg' : 'pos'">
              {{ fmtFull(tx.importo) }}
            </span>
          </div>
          <router-link to="/transazioni" class="tx-see-all">
            Vedi tutti →
          </router-link>
        </div>

      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { state, currentMonth, currentTransactions, loadMonths, loadTransactions, fmt, fmtFull, CAT_EMOJI } from '../lib/store.js'

const loading = ref(false)
const userName = computed(() => state.user?.email?.split('@')[0] || 'tu')
const today = computed(() => new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }))

const spendPercent = computed(() => {
  if (!currentMonth.value?.uscite_previste) return 0
  return Math.min(Math.round((currentMonth.value.uscite_effettive / currentMonth.value.uscite_previste) * 100), 999)
})

const topCat = computed(() => {
  const cats = {}
  currentTransactions.value
    .filter(t => t.importo < 0)
    .forEach(t => { cats[t.categoria] = (cats[t.categoria] || 0) + Math.abs(t.importo) })
  return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 4)
})

const recentTx = computed(() => currentTransactions.value.slice(0, 8))

function formatData(d) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

async function selectMonth(id) {
  state.currentMonthId = id
  if (!state.transactions.find(t => t.month_id === id)) {
    loading.value = true
    await loadTransactions(id)
    loading.value = false
  }
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
  if (state.currentMonthId) {
    loading.value = true
    await loadTransactions(state.currentMonthId)
    loading.value = false
  }
})
</script>

<style scoped>
.home-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1rem 1.25rem 0;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.header-greeting { font-size: 1.2rem; font-weight: 700; }
.header-sub { color: var(--text2); font-size: 0.8rem; margin-top: 2px; text-transform: capitalize; }

.saldo-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.5rem 0.9rem;
}
.saldo-label { font-size: 0.7rem; color: var(--text2); font-weight: 500; }
.saldo-value { font-size: 1.15rem; font-weight: 700; font-family: 'DM Mono', monospace; color: var(--green); }

.month-scroll {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.75rem;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.month-scroll::-webkit-scrollbar { display: none; }

.month-chip {
  flex-shrink: 0;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 500;
  padding: 0.35rem 0.9rem;
  transition: all 0.2s;
}
.month-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
  box-shadow: 0 2px 12px rgba(108,99,255,0.4);
}

.px { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

.skeleton-card {
  height: 160px;
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
  animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }

/* Savings card */
.savings-card { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; }

.savings-row { display: flex; gap: 0; }
.savings-half { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.savings-half:last-child { align-items: flex-end; }
.savings-divider { width: 1px; background: var(--border); margin: 0 1rem; }
.savings-label { font-size: 0.75rem; color: var(--text2); font-weight: 500; }
.savings-amount { font-size: 1.4rem; font-weight: 700; font-family: 'DM Mono', monospace; }
.savings-prev { font-size: 0.72rem; color: var(--text2); }

.savings-bar-wrap { display: flex; align-items: center; gap: 0.75rem; }
.savings-bar { flex: 1; height: 6px; background: var(--surface2); border-radius: 100px; overflow: hidden; }
.savings-fill { height: 100%; border-radius: 100px; transition: width 0.6s ease; }
.savings-pct { font-size: 0.72rem; color: var(--text2); white-space: nowrap; }

.savings-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text2);
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}

/* Cat grid */
.section-label { font-size: 0.78rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.06em; padding: 0 2px; }

.cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.cat-item { padding: 0.85rem; display: flex; flex-direction: column; gap: 3px; }
.cat-emoji { font-size: 1.4rem; }
.cat-name { font-size: 0.78rem; color: var(--text2); font-weight: 500; }
.cat-val { font-size: 1.05rem; font-weight: 700; }

/* Transactions */
.tx-list { overflow: hidden; }
.tx-empty { padding: 1.5rem; text-align: center; color: var(--text2); font-size: 0.9rem; }

.tx-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}
.tx-row:last-of-type { border-bottom: none; }
.tx-row:active { background: var(--surface2); }

.tx-emoji { font-size: 1.5rem; flex-shrink: 0; }
.tx-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tx-desc { font-size: 0.9rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-meta { font-size: 0.75rem; color: var(--text2); }
.tx-amount { font-size: 0.95rem; flex-shrink: 0; }

.tx-see-all {
  display: block;
  text-align: center;
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.9rem;
  text-decoration: none;
}
</style>
