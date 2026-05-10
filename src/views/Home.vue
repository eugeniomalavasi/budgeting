<template>
  <div class="page">
    <div class="home-header">
      <div class="header-top">
        <div>
          <p class="header-greeting">Ciao {{ userName }} 🦊</p>
          <p class="header-sub">{{ today }}</p>
        </div>
        <div class="saldo-badge">
          <span class="saldo-label">Saldo</span>
          <span class="saldo-value">{{ fmt(currentMonth?.saldo_finale) }}</span>
        </div>
      </div>

      <div class="month-scroll">
        <button
          v-for="m in state.months" :key="m.id"
          class="month-chip"
          :class="{ active: state.currentMonthId === m.id }"
          @click="selectMonth(m.id)"
        >{{ m.label.split(' ')[0] }}</button>
      </div>
    </div>

    <div class="px">
      <div v-if="loading" class="skeleton-card"></div>
      <template v-else-if="currentMonth">

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
              <div class="savings-fill" :style="{ width: spendPercent + '%', background: spendPercent > 100 ? 'var(--red)' : 'linear-gradient(90deg, var(--accent), var(--accent2))' }"></div>
            </div>
            <span class="savings-pct">{{ spendPercent }}%</span>
          </div>
          <div class="savings-bottom">
            <span>Risparmiati</span>
            <span class="amount" :class="currentMonth.risparmiati >= 0 ? 'pos' : 'neg'">{{ fmt(currentMonth.risparmiati) }}</span>
          </div>
        </div>

        <p class="section-label">Top categorie</p>
        <div class="cat-grid">
          <div v-for="[cat, val] in topCat" :key="cat" class="cat-item card">
            <span class="cat-emoji">{{ CAT_EMOJI[cat] || '📦' }}</span>
            <span class="cat-name">{{ cat }}</span>
            <span class="cat-val neg amount">{{ fmt(val) }}</span>
          </div>
        </div>

        <p class="section-label">Recenti</p>
        <div class="tx-list card">
          <div v-if="recentTx.length === 0" class="tx-empty">Nessuna transazione questo mese</div>
          <div v-for="tx in recentTx" :key="tx.id" class="tx-row" @click="openSheet(tx)">
            <div class="tx-icon-wrap">
              <span class="tx-emoji">{{ CAT_EMOJI[tx.categoria] || '📦' }}</span>
            </div>
            <div class="tx-info">
              <span class="tx-desc">{{ tx.descrizione }}</span>
              <span class="tx-meta">{{ tx.categoria }} · {{ formatData(tx.data) }}</span>
            </div>
            <span class="tx-amount amount" :class="tx.importo < 0 ? 'neg' : 'pos'">{{ fmtFull(tx.importo) }}</span>
          </div>
          <router-link to="/transazioni" class="tx-see-all">Vedi tutti →</router-link>
        </div>

      </template>
    </div>

    <transition name="sheet">
      <div v-if="selected" class="sheet-overlay" @click.self="selected=null">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-emoji">{{ CAT_EMOJI[selected.categoria]||'📦' }}</div>
          <p class="sheet-desc">{{ selected.descrizione }}</p>
          <p class="sheet-amount amount" :class="selected.importo<0?'neg':'pos'">{{ fmtFull(selected.importo) }}</p>
          <div class="sheet-details">
            <div class="sheet-row"><span>Categoria</span><span>{{ selected.categoria }}</span></div>
            <div class="sheet-row"><span>Data</span><span>{{ formatData(selected.data) }}</span></div>
            <div class="sheet-row"><span>Mese</span><span>{{ state.months.find(m=>m.id===selected.month_id)?.label }}</span></div>
          </div>
          <button class="edit-btn" @click="modifica(selected)">✏️ Modifica</button>
          <button class="close-btn" @click="selected=null">Chiudi</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { state, currentMonth, currentTransactions, loadMonths, loadTransactions, fmt, fmtFull, CAT_EMOJI } from '../lib/store.js'

const router = useRouter()
const loading = ref(false)
const selected = ref(null)

// Mostra solo il nome dal profilo, non l'email completa
const userName = computed(() => state.profile?.name || state.user?.email?.split('@')[0] || 'tu')
const today = computed(() => new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' }))

const spendPercent = computed(() => {
  if (!currentMonth.value?.uscite_previste) return 0
  return Math.min(Math.round((currentMonth.value.uscite_effettive / currentMonth.value.uscite_previste) * 100), 999)
})

const topCat = computed(() => {
  const cats = {}
  currentTransactions.value.filter(t => t.importo < 0)
    .forEach(t => { cats[t.categoria] = (cats[t.categoria]||0) + Math.abs(t.importo) })
  return Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,4)
})

const recentTx = computed(() => currentTransactions.value.slice(0,8))

function formatData(d) {
  return new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'short' })
}

function openSheet(tx) { selected.value = tx }
function modifica(tx) { selected.value = null; router.push({ path:'/aggiungi', query:{ edit: tx.id } }) }

async function caricaMese(id) {
  if (!id) return
  loading.value = true
  await loadTransactions(id)
  loading.value = false
}

async function selectMonth(id) {
  state.currentMonthId = id
  await caricaMese(id)
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
  if (state.currentMonthId) await caricaMese(state.currentMonthId)
})

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && state.user && state.currentMonthId) {
      await loadTransactions(state.currentMonthId)
    }
  })
}

watch(() => state.currentMonthId, async (newId) => {
  if (newId && !currentTransactions.value.length) await caricaMese(newId)
})
</script>

<style scoped>
.home-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1.1rem 1.25rem 0;
}

.header-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; }
.header-greeting { font-size:1.25rem; font-weight:700; letter-spacing:-0.02em; }
.header-sub { color:var(--text2); font-size:0.78rem; margin-top:3px; text-transform:capitalize; }

.saldo-badge {
  display:flex; flex-direction:column; align-items:flex-end;
  background: linear-gradient(135deg, rgba(245,166,35,0.12), rgba(255,124,42,0.08));
  border: 1px solid rgba(245,166,35,0.25);
  border-radius:14px; padding:0.5rem 0.9rem; flex-shrink:0;
}
.saldo-label { font-size:0.68rem; color:var(--accent); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
.saldo-value { font-size:1.2rem; font-weight:700; font-family:'DM Mono',monospace; color:var(--green); }

.month-scroll { display:flex; gap:0.4rem; overflow-x:auto; padding-bottom:0.85rem; scrollbar-width:none; }
.month-scroll::-webkit-scrollbar { display:none; }

.month-chip {
  flex-shrink:0; background:transparent; border:1px solid var(--border);
  border-radius:100px; color:var(--text2); cursor:pointer;
  font-family:'Lexend',sans-serif; font-size:0.8rem; font-weight:500;
  padding:0.3rem 0.85rem; transition:all 0.2s;
}
.month-chip.active {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border-color:transparent; color:#0e0e0e; font-weight:600;
  box-shadow:0 2px 12px var(--accent-glow);
}

.px { padding:1.25rem; display:flex; flex-direction:column; gap:1rem; }

.skeleton-card { height:160px; background:var(--surface); border-radius:20px; border:1px solid var(--border); animation:pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }

.savings-card { padding:1.25rem; display:flex; flex-direction:column; gap:0.85rem; }
.savings-row { display:flex; }
.savings-half { flex:1; display:flex; flex-direction:column; gap:3px; }
.savings-half:last-child { align-items:flex-end; }
.savings-divider { width:1px; background:var(--border); margin:0 1rem; }
.savings-label { font-size:0.72rem; color:var(--text2); font-weight:500; text-transform:uppercase; letter-spacing:0.04em; }
.savings-amount { font-size:1.4rem; font-weight:700; font-family:'DM Mono',monospace; }
.savings-prev { font-size:0.7rem; color:var(--text2); }

.savings-bar-wrap { display:flex; align-items:center; gap:0.75rem; }
.savings-bar { flex:1; height:5px; background:var(--surface2); border-radius:100px; overflow:hidden; }
.savings-fill { height:100%; border-radius:100px; transition:width 0.6s ease; }
.savings-pct { font-size:0.7rem; color:var(--text2); white-space:nowrap; }

.savings-bottom {
  display:flex; justify-content:space-between; align-items:center;
  font-size:0.83rem; color:var(--text2);
  padding-top:0.6rem; border-top:1px solid var(--border);
}

.section-label { font-size:0.72rem; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:0.08em; padding:0 2px; }

.cat-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; }
.cat-item { padding:0.9rem; display:flex; flex-direction:column; gap:4px; }
.cat-emoji { font-size:1.3rem; }
.cat-name { font-size:0.75rem; color:var(--text2); font-weight:500; }
.cat-val { font-size:1rem; font-weight:700; }

.tx-list { overflow:hidden; }
.tx-empty { padding:1.5rem; text-align:center; color:var(--text2); font-size:0.88rem; }

.tx-row {
  display:flex; align-items:center; gap:0.9rem;
  padding:0.85rem 1.1rem; border-bottom:1px solid var(--border);
  cursor:pointer; transition:background 0.15s;
}
.tx-row:last-of-type { border-bottom:none; }
.tx-row:active { background:var(--surface2); }

.tx-icon-wrap {
  width:38px; height:38px; border-radius:12px;
  background:var(--surface2); display:flex; align-items:center;
  justify-content:center; flex-shrink:0;
}
.tx-emoji { font-size:1.2rem; }
.tx-info { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
.tx-desc { font-size:0.88rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tx-meta { font-size:0.72rem; color:var(--text2); }
.tx-amount { font-size:0.92rem; flex-shrink:0; }

.tx-see-all {
  display:block; text-align:center; color:var(--accent);
  font-size:0.82rem; font-weight:600; padding:0.9rem; text-decoration:none;
}

/* Sheet */
.sheet-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(6px); z-index:200; display:flex; align-items:flex-end; justify-content:center; }
.sheet { background:var(--surface); border-radius:24px 24px 0 0; border-top:1px solid var(--border); padding:1rem 1.5rem 2rem; width:100%; max-width:480px; display:flex; flex-direction:column; align-items:center; gap:0.75rem; }
.sheet-handle { width:36px; height:4px; background:var(--border); border-radius:100px; margin-bottom:0.25rem; }
.sheet-emoji { font-size:2.5rem; }
.sheet-desc { font-size:1.1rem; font-weight:600; }
.sheet-amount { font-size:2rem; font-weight:700; font-family:'DM Mono',monospace; }
.sheet-details { width:100%; background:var(--surface2); border-radius:14px; overflow:hidden; }
.sheet-row { display:flex; justify-content:space-between; padding:0.75rem 1rem; border-bottom:1px solid var(--border); font-size:0.88rem; }
.sheet-row:last-child { border-bottom:none; }
.sheet-row span:first-child { color:var(--text2); }
.edit-btn { width:100%; background:rgba(245,166,35,0.12); border:1px solid rgba(245,166,35,0.3); border-radius:14px; color:var(--accent); font-family:'Lexend',sans-serif; font-size:0.95rem; font-weight:600; padding:0.8rem; cursor:pointer; }
.close-btn { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:14px; color:var(--text2); font-family:'Lexend',sans-serif; font-size:0.95rem; padding:0.8rem; cursor:pointer; }
.sheet-enter-active,.sheet-leave-active { transition:all 0.25s ease; }
.sheet-enter-from .sheet,.sheet-leave-to .sheet { transform:translateY(100%); }
.sheet-enter-from,.sheet-leave-to { opacity:0; }
</style>
