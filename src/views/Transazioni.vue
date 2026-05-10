<template>
  <div class="page">
    <div class="tx-header">
      <h1 class="tx-title">Movimenti</h1>
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input v-model="search" class="search-input" placeholder="Cerca..." />
      </div>
      <div class="filter-row">
        <button v-for="f in filtri" :key="f.val" class="filter-chip" :class="{ active: filtroTipo===f.val }" @click="filtroTipo=f.val">{{ f.label }}</button>
        <select v-model="filtroCategoria" class="filter-select">
          <option value="">Tutte</option>
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
          <span class="amount" :class="totale>=0?'pos':'neg'">{{ fmtFull(totale) }}</span>
        </div>
        <div class="tx-list card" v-if="transazioniFiltrate.length">
          <div v-for="tx in transazioniFiltrate" :key="tx.id" class="tx-row" @click="selected=tx">
            <CatIcon :categoria="tx.categoria" />
            <div class="tx-info">
              <span class="tx-desc">{{ tx.descrizione }}</span>
              <span class="tx-meta">{{ tx.categoria }} · {{ formatData(tx.data) }}</span>
            </div>
            <span class="tx-amount amount" :class="tx.importo<0?'neg':'pos'">{{ fmtFull(tx.importo) }}</span>
          </div>
        </div>
        <div v-else class="empty-state"><span>😶</span><p>Nessun movimento trovato</p></div>
      </template>
    </div>

    <!-- Bottom sheet -->
    <transition name="sheet">
      <div v-if="selected" class="sheet-overlay" @click.self="selected=null">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <CatIcon :categoria="selected.categoria" style="width:56px;height:56px;border-radius:16px" />
          <p class="sheet-desc">{{ selected.descrizione }}</p>
          <p class="sheet-amount amount" :class="selected.importo<0?'neg':'pos'">{{ fmtFull(selected.importo) }}</p>
          <div class="sheet-details">
            <div class="sheet-row"><span>Categoria</span><span>{{ selected.categoria }}</span></div>
            <div class="sheet-row"><span>Data</span><span>{{ formatData(selected.data) }}</span></div>
            <div class="sheet-row"><span>Mese</span><span>{{ state.months.find(m=>m.id===selected.month_id)?.label }}</span></div>
          </div>
          <button class="edit-btn" @click="modifica(selected)">✏️ Modifica</button>
          <button v-if="selected.created_by===state.user?.id" class="delete-btn" @click="elimina(selected)">🗑 Elimina</button>
          <button class="close-btn" @click="selected=null">Chiudi</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CatIcon from '../components/CatIcon.vue'
import { state, currentTransactions, loadMonths, loadTransactions, deleteTransaction, fmtFull, CAT_EMOJI, CATEGORIE_USCITE, CATEGORIE_ENTRATE } from '../lib/store.js'

const router = useRouter()
const loading = ref(false)
const search = ref('')
const filtroTipo = ref('')
const filtroCategoria = ref('')
const selected = ref(null)

const filtri = [
  { val:'', label:'Tutti' },
  { val:'uscita', label:'Uscite' },
  { val:'entrata', label:'Entrate' },
]

const categorie = computed(() => [...CATEGORIE_USCITE, ...CATEGORIE_ENTRATE].sort())

const transazioniFiltrate = computed(() => {
  let list = currentTransactions.value
  if (search.value) list = list.filter(t => t.descrizione.toLowerCase().includes(search.value.toLowerCase()))
  if (filtroTipo.value === 'uscita') list = list.filter(t => t.importo < 0)
  if (filtroTipo.value === 'entrata') list = list.filter(t => t.importo >= 0)
  if (filtroCategoria.value) list = list.filter(t => t.categoria === filtroCategoria.value)
  return list
})

const totale = computed(() => transazioniFiltrate.value.reduce((s,t) => s + Number(t.importo), 0))

function formatData(d) {
  return new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'short', year:'2-digit' })
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
  if (state.currentMonthId && !currentTransactions.value.length) {
    loading.value = true
    await loadTransactions(state.currentMonthId)
    loading.value = false
  }
})
</script>

<style scoped>
.tx-header { background:var(--surface); border-bottom:1px solid var(--border); padding:1rem 1.25rem 0.75rem; display:flex; flex-direction:column; gap:0.75rem; }
.tx-title { font-size:1.3rem; font-weight:700; }
.search-wrap { position:relative; }
.search-icon { position:absolute; left:0.85rem; top:50%; transform:translateY(-50%); font-size:0.9rem; }
.search-input { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:12px; color:var(--text); font-family:'Lexend',sans-serif; font-size:0.9rem; padding:0.6rem 0.85rem 0.6rem 2.4rem; outline:none; }
.search-input:focus { border-color:var(--accent); }
.filter-row { display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center; }
.filter-chip { background:transparent; border:1px solid var(--border); border-radius:100px; color:var(--text2); cursor:pointer; font-family:'Lexend',sans-serif; font-size:0.8rem; padding:0.3rem 0.8rem; transition:all 0.2s; }
.filter-chip.active { background:var(--accent); border-color:var(--accent); color:white; }
.filter-select { background:var(--surface2); border:1px solid var(--border); border-radius:100px; color:var(--text2); font-family:'Lexend',sans-serif; font-size:0.8rem; padding:0.3rem 0.8rem; outline:none; }
.px { padding:1rem 1.25rem; display:flex; flex-direction:column; gap:0.85rem; }
.summary-row { display:flex; justify-content:space-between; align-items:center; padding:0 2px; }
.summary-count { font-size:0.8rem; color:var(--text2); }
.skeleton-list { display:flex; flex-direction:column; gap:2px; }
.skeleton-row { height:68px; background:var(--surface); border-radius:12px; animation:pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
.tx-list { overflow:hidden; }
.tx-row { display:flex; align-items:center; gap:0.85rem; padding:0.9rem 1.1rem; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.15s; }
.tx-row:last-child { border-bottom:none; }
.tx-row:active { background:var(--surface2); }
.tx-emoji { font-size:1.5rem; flex-shrink:0; }
.tx-info { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
.tx-desc { font-size:0.9rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tx-meta { font-size:0.74rem; color:var(--text2); }
.tx-amount { font-size:0.95rem; flex-shrink:0; }
.empty-state { display:flex; flex-direction:column; align-items:center; gap:0.5rem; padding:3rem; color:var(--text2); }
.empty-state span { font-size:2rem; }

/* Sheet */
.sheet-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:200; display:flex; align-items:flex-end; justify-content:center; }
.sheet { background:var(--surface); border-radius:24px 24px 0 0; border-top:1px solid var(--border); padding:1rem 1.5rem 2rem; width:100%; max-width:480px; display:flex; flex-direction:column; align-items:center; gap:0.75rem; }
.sheet-handle { width:36px; height:4px; background:var(--border); border-radius:100px; margin-bottom:0.5rem; }
.sheet-emoji { font-size:2.5rem; }
.sheet-desc { font-size:1.1rem; font-weight:600; }
.sheet-amount { font-size:2rem; font-weight:700; font-family:'DM Mono',monospace; }
.sheet-details { width:100%; background:var(--surface2); border-radius:14px; overflow:hidden; }
.sheet-row { display:flex; justify-content:space-between; padding:0.75rem 1rem; border-bottom:1px solid var(--border); font-size:0.88rem; }
.sheet-row:last-child { border-bottom:none; }
.sheet-row span:first-child { color:var(--text2); }
.edit-btn { width:100%; background:rgba(245,166,35,0.1); border:1px solid rgba(108,99,255,0.3); border-radius:14px; color:var(--accent); font-family:'Lexend',sans-serif; font-size:0.95rem; font-weight:600; padding:0.8rem; cursor:pointer; }
.delete-btn { width:100%; background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3); border-radius:14px; color:var(--red); font-family:'Lexend',sans-serif; font-size:0.95rem; font-weight:600; padding:0.8rem; cursor:pointer; }
.close-btn { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:14px; color:var(--text2); font-family:'Lexend',sans-serif; font-size:0.95rem; padding:0.8rem; cursor:pointer; }
.sheet-enter-active,.sheet-leave-active { transition:all 0.25s ease; }
.sheet-enter-from .sheet,.sheet-leave-to .sheet { transform:translateY(100%); }
.sheet-enter-from,.sheet-leave-to { opacity:0; }
</style>
