<template>
  <div class="page">
    <div class="tx-header">
      <h1 class="tx-title">Movimenti</h1>

      <!-- Ricerca -->
      <div class="search-wrap">
        <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input v-model="search" class="search-input" placeholder="Cerca in tutti i movimenti..." @input="onSearch" />
        <button v-if="search" class="search-clear" @click="search = ''; scopoTutti = false">✕</button>
      </div>

      <!-- Toggle mese / tutti -->
      <div class="scope-row">
        <button :class="['scope-btn', !scopoTutti && 'active']" @click="setScopoMese">
          {{ meseLabel }}
        </button>
        <button :class="['scope-btn', scopoTutti && 'active']" @click="setScopoTutti">
          Tutti i mesi
        </button>
      </div>

      <!-- Filtri tipo + categoria -->
      <div class="filter-row">
        <button v-for="f in filtri" :key="f.val" class="filter-chip" :class="{ active: filtroTipo === f.val }"
          @click="filtroTipo = f.val">{{ f.label }}</button>
        <select v-model="filtroCategoria" class="filter-select">
          <option value="">Tutte le categorie</option>
          <option v-for="c in categorie" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <div class="px">
      <div v-if="loading" class="skeleton-list">
        <div v-for="i in 6" :key="i" class="skeleton-row"></div>
      </div>
      <template v-else>
        <div class="summary-row">
          <span class="summary-count">{{ transazioniFiltrate.length }} movimenti</span>
          <span class="amount" :class="totale >= 0 ? 'pos' : 'neg'">{{ fmtFull(totale) }}</span>
        </div>

        <div class="tx-list card" v-if="transazioniFiltrate.length">
          <template v-for="(gruppo, mese) in transazioniGruppate" :key="mese">
            <!-- Header mese (solo in vista tutti) -->
            <div v-if="scopoTutti || search" class="mese-header">{{ mese }}</div>
            <div v-for="tx in gruppo" :key="tx.id" class="tx-row" @click="selected = tx">
              <CatIcon :categoria="tx.categoria" />
              <div class="tx-info">
                <span class="tx-desc">{{ tx.descrizione }}</span>
                <span class="tx-meta">{{ tx.categoria }} · {{ formatData(tx.data) }}</span>
              </div>
              <span class="tx-amount amount" :class="tx.importo < 0 ? 'neg' : 'pos'">{{ fmtFull(tx.importo) }}</span>
            </div>
          </template>
        </div>

        <div v-else class="empty-state">
          <span>🔍</span>
          <p>Nessun movimento trovato</p>
        </div>
      </template>
    </div>

    <!-- Bottom sheet -->
    <transition name="sheet">
      <div v-if="selected" class="sheet-overlay" @click.self="selected = null">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <CatIcon :categoria="selected.categoria" style="width:56px;height:56px;border-radius:16px" />
          <p class="sheet-desc">{{ selected.descrizione }}</p>
          <p class="sheet-amount amount" :class="selected.importo < 0 ? 'neg' : 'pos'">{{ fmtFull(selected.importo) }}</p>
          <div class="sheet-details">
            <div class="sheet-row"><span>Categoria</span><span>{{ selected.categoria }}</span></div>
            <div class="sheet-row"><span>Data</span><span>{{ formatData(selected.data) }}</span></div>
            <div class="sheet-row"><span>Mese</span><span>{{state.months.find(m => m.id === selected.month_id)?.label
                }}</span>
            </div>
          </div>
          <button class="edit-btn" @click="modifica(selected)">✏️ Modifica</button>
          <button v-if="selected.created_by === state.user?.id" class="delete-btn" @click="elimina(selected)">🗑
            Elimina</button>
          <button class="close-btn" @click="selected = null">Chiudi</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import CatIcon from '../components/CatIcon.vue'
import {
  state, loadMonths, loadTransactions,
  deleteTransaction, fmtFull, CATEGORIE_USCITE, CATEGORIE_ENTRATE
} from '../lib/store.js'

const router = useRouter()
const loading = ref(false)
const search = ref('')
const filtroTipo = ref('')
const filtroCategoria = ref('')
const selected = ref(null)
const scopoTutti = ref(false) // false = solo mese corrente, true = tutti

const filtri = [
  { val: '', label: 'Tutti' },
  { val: 'uscita', label: 'Uscite' },
  { val: 'entrata', label: 'Entrate' },
]

const categorie = computed(() => [...CATEGORIE_USCITE, ...CATEGORIE_ENTRATE].sort())

const meseLabel = computed(() => {
  const m = state.months.find(m => m.id === state.currentMonthId)
  return m?.label?.split(' ')[0] || 'Mese corrente'
})

// Tutte le transazioni caricate (tutti i mesi)
const tutteLeTransazioni = computed(() =>
  [...state.transactions].sort((a, b) => new Date(b.data) - new Date(a.data))
)

// Sorgente dati in base allo scopo
const txMeseCorrente = computed(() => state.transactions.filter(t => t.month_id === state.currentMonthId).sort((a, b) => new Date(b.data) - new Date(a.data)))
const sorgente = computed(() => scopoTutti.value || search.value ? tutteLeTransazioni.value : txMeseCorrente.value)

const transazioniFiltrate = computed(() => {
  let list = sorgente.value
  if (search.value) list = list.filter(t =>
    t.descrizione.toLowerCase().includes(search.value.toLowerCase()) ||
    t.categoria.toLowerCase().includes(search.value.toLowerCase())
  )
  if (filtroTipo.value === 'uscita') list = list.filter(t => t.importo < 0)
  if (filtroTipo.value === 'entrata') list = list.filter(t => t.importo >= 0)
  if (filtroCategoria.value) list = list.filter(t => t.categoria === filtroCategoria.value)
  return list
})

// Raggruppa per mese quando si è in vista "tutti"
const transazioniGruppate = computed(() => {
  const list = transazioniFiltrate.value
  if (!scopoTutti.value && !search.value) {
    // Vista mese: nessun raggruppamento
    return { '': list }
  }
  // Vista tutti: raggruppa per label mese
  const gruppi = {}
  list.forEach(tx => {
    const mese = state.months.find(m => m.id === tx.month_id)?.label || tx.month_id
    if (!gruppi[mese]) gruppi[mese] = []
    gruppi[mese].push(tx)
  })
  return gruppi
})

const totale = computed(() => transazioniFiltrate.value.reduce((s, t) => s + Number(t.importo), 0))

function formatData(d) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' })
}

async function setScopoTutti() {
  scopoTutti.value = true
  // Carica tutti i mesi non ancora caricati
  loading.value = true
  for (const m of state.months) {
    if (!state.transactions.find(t => t.month_id === m.id)) {
      await loadTransactions(m.id)
    }
  }
  loading.value = false
}

function setScopoMese() {
  scopoTutti.value = false
  search.value = ''
}

// Se l'utente scrive nella search, carica automaticamente tutti i mesi
async function onSearch() {
  if (search.value && !scopoTutti.value) {
    loading.value = true
    for (const m of state.months) {
      if (!state.transactions.find(t => t.month_id === m.id)) {
        await loadTransactions(m.id)
      }
    }
    loading.value = false
  }
}

function modifica(tx) {
  selected.value = null
  router.push({ path: '/aggiungi', query: { edit: tx.id } })
}

async function elimina(tx) {
  if (!confirm('Eliminare questa transazione?')) return
  await deleteTransaction(tx.id)
  selected.value = null
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
  if (state.currentMonthId && !state.transactions.find(t => t.month_id === state.currentMonthId)) {
    loading.value = true
    await loadTransactions(state.currentMonthId)
    loading.value = false
  }
})
</script>

<style scoped>
.tx-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1rem 1.25rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.tx-title {
  font-size: 1.3rem;
  font-weight: 700;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon-svg {
  position: absolute;
  left: 0.8rem;
  width: 16px;
  height: 16px;
  color: var(--text2);
}

.search-input {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: 'Lexend', sans-serif;
  font-size: 0.9rem;
  padding: 0.65rem 2.2rem 0.65rem 2.4rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-clear {
  position: absolute;
  right: 0.7rem;
  background: none;
  border: none;
  color: var(--text2);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px;
}

/* Toggle scopo */
.scope-row {
  display: flex;
  gap: 0.4rem;
}

.scope-btn {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.35rem 0.85rem;
  transition: all 0.2s;
}

.scope-btn.active {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border-color: transparent;
  color: #0e0e0e;
  font-weight: 700;
}

.filter-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  align-items: center;
}

.filter-chip {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  font-size: 0.78rem;
  padding: 0.28rem 0.75rem;
  transition: all 0.2s;
}

.filter-chip.active {
  background: var(--surface2);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.filter-select {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--text2);
  font-family: 'Lexend', sans-serif;
  font-size: 0.78rem;
  padding: 0.28rem 0.75rem;
  outline: none;
  max-width: 160px;
}

.px {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-count {
  font-size: 0.8rem;
  color: var(--text2);
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skeleton-row {
  height: 66px;
  background: var(--surface);
  border-radius: 12px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1
  }

  50% {
    opacity: 0.4
  }
}

.tx-list {
  overflow: hidden;
}

/* Header mese nella vista tutti */
.mese-header {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.65rem 1.1rem 0.3rem;
  background: rgba(245, 166, 35, 0.05);
  border-bottom: 1px solid var(--border);
}

.mese-header:first-child {
  border-top: none;
}

.tx-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
}

.tx-row:last-child {
  border-bottom: none;
}

.tx-row:active {
  background: var(--surface2);
}

.tx-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tx-desc {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-meta {
  font-size: 0.74rem;
  color: var(--text2);
}

.tx-amount {
  font-size: 0.95rem;
  flex-shrink: 0;
  font-family: 'DM Mono', monospace;
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--text2);
}

.empty-state span {
  font-size: 2rem;
}

/* Sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet {
  background: var(--surface);
  border-radius: 24px 24px 0 0;
  border-top: 1px solid var(--border);
  padding: 1rem 1.5rem 2rem;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 100px;
  margin-bottom: 0.25rem;
}

.sheet-desc {
  font-size: 1.1rem;
  font-weight: 600;
}

.sheet-amount {
  font-size: 2rem;
  font-weight: 700;
  font-family: 'DM Mono', monospace;
}

.sheet-details {
  width: 100%;
  background: var(--surface2);
  border-radius: 14px;
  overflow: hidden;
}

.sheet-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.88rem;
}

.sheet-row:last-child {
  border-bottom: none;
}

.sheet-row span:first-child {
  color: var(--text2);
}

.edit-btn {
  width: 100%;
  background: rgba(245, 166, 35, 0.1);
  border: 1px solid rgba(245, 166, 35, 0.3);
  border-radius: 14px;
  color: var(--accent);
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.8rem;
  cursor: pointer;
}

.delete-btn {
  width: 100%;
  background: rgba(255, 95, 87, 0.1);
  border: 1px solid rgba(255, 95, 87, 0.3);
  border-radius: 14px;
  color: var(--red);
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.8rem;
  cursor: pointer;
}

.close-btn {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text2);
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  padding: 0.8rem;
  cursor: pointer;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.25s ease;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
</style>