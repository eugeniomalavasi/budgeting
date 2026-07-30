<template>
  <div class="page">
    <div class="div-header">
      <h1 class="div-title">{{ headerTitle }}</h1>
    </div>

    <div class="px">
      <div class="saldo-card card" :class="saldoCondiviso >= 0 ? 'card-green' : 'card-red'">
        <div class="saldo-icon">{{ Math.abs(saldoCondiviso) < 0.01 ? '🤝' : (saldoCondiviso > 0 ? '🎉' : '😅') }}</div>
        <div v-if="saldoCondiviso > 0.01" class="saldo-text">
          <span class="saldo-desc">{{ coupleMode ? nomeAltro + ' ti deve' : 'Ti devono in totale' }}</span>
          <span class="saldo-amount pos amount">{{ fmtFull(saldoCondiviso) }}</span>
        </div>
        <div v-else-if="saldoCondiviso < -0.01" class="saldo-text">
          <span class="saldo-desc">{{ coupleMode ? 'Devi a ' + nomeAltro : 'Devi in totale' }}</span>
          <span class="saldo-amount neg amount">{{ fmtFull(Math.abs(saldoCondiviso)) }}</span>
        </div>
        <div v-else class="saldo-text">
          <span class="saldo-desc">Sei in pari 🤝</span>
        </div>
        <button v-if="Math.abs(saldoCondiviso) > 0.01 && unsettled.length" class="settle-btn" @click="pareggia">
          Segna tutto come saldato
        </button>
      </div>

      <!-- Saldi per membro (solo se il gruppo ha più di 2 persone) -->
      <div v-if="!coupleMode && state.members.length > 1">
        <p class="section-label">Saldi del gruppo</p>
        <div class="card tx-list">
          <div v-for="m in state.members" :key="m.id" class="balance-row">
            <span class="balance-name">{{ nameOf(m) }}</span>
            <span class="balance-amount amount" :class="balanceClass(m.id)">
              {{ balanceLabel(m.id) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="unsettled.length">
        <p class="section-label">Da saldare ({{ unsettled.length }})</p>
        <div class="card tx-list">
          <div v-for="s in unsettled" :key="s.id" class="shared-row" @click="apriSheet(s)">
            <div class="sr-left">
              <span class="sr-desc">{{ s.descrizione }}</span>
              <span class="sr-meta">
                {{ formatData(s.created_at) }} ·
                {{ s.paid_by === state.user?.id ? 'Hai pagato tu' : 'Ha pagato ' + memberName(s.paid_by) }}
              </span>
              <span class="sr-split">{{ splitLabel(s) }}</span>
            </div>
            <div class="sr-right">
              <span class="sr-total">{{ fmtFull(s.importo_totale) }}</span>
              <span class="sr-quota" :class="quotaRiga(s) >= 0 ? 'pos' : 'neg'">
                {{ quotaRiga(s) >= 0 ? '+' : '−' }}{{ fmtFull(Math.abs(quotaRiga(s))) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="settled.length">
        <p class="section-label">Saldati ({{ settled.length }})</p>
        <div class="card tx-list">
          <div v-for="s in settled.slice(0, 10)" :key="s.id" class="shared-row settled">
            <div class="sr-left">
              <span class="sr-desc">{{ s.descrizione }}</span>
              <span class="sr-meta">{{ formatData(s.created_at) }}</span>
            </div>
            <div class="sr-right">
              <span class="sr-total">{{ fmtFull(s.importo_totale) }}</span>
              <span class="settled-badge">✓ Saldato</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!unsettled.length && !settled.length" class="empty-state">
        <span>🤝</span>
        <p>Nessuna spesa condivisa</p>
        <p class="empty-sub">Aggiungi un movimento e attiva "Dividi"</p>
      </div>
    </div>

    <!-- Bottom sheet -->
    <transition name="sheet">
      <div v-if="selected" class="sheet-overlay" @click.self="selected = null">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <p class="sheet-desc">{{ selected.descrizione }}</p>
          <p class="sheet-amount amount">{{ fmtFull(selected.importo_totale) }}</p>

          <div class="sheet-details">
            <div class="sheet-row"><span>Pagato da</span><span>{{ memberName(selected.paid_by) }}</span></div>
            <div class="sheet-row" v-for="sh in (selected.shares || [])" :key="sh.user_id">
              <span>Quota {{ memberName(sh.user_id) }}</span>
              <span class="neg amount">{{ fmtFull(sh.amount) }}</span>
            </div>
            <div class="sheet-row"><span>Data</span><span>{{ formatData(selected.created_at) }}</span></div>
          </div>

          <button class="edit-mov-btn" @click="modificaMovimento(selected)">✏️ Modifica movimento e suddivisione</button>
          <button v-if="!selected.settled" class="settle-single-btn" @click="pareggiaSingolo(selected)">
            ✓ Segna come saldato
          </button>
          <button class="delete-btn" @click="eliminaMovimento(selected)">🗑 Elimina movimento</button>
          <button class="close-btn" @click="selected = null">Chiudi</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  state, saldoCondiviso, memberBalances, shareOf, memberName,
  loadSharedExpenses, settleExpense, settleAll,
  deleteSharedExpense, deleteTransaction, fmtFull
} from '../lib/store.js'

const router = useRouter()
const selected = ref(null)

const coupleMode = computed(() => state.members.length === 2)
const nomeAltro = computed(() => state.otherProfile?.name || 'l\'altro')
const headerTitle = computed(() =>
  coupleMode.value ? `Conti con ${nomeAltro.value}` : 'Conti del gruppo'
)
const unsettled = computed(() => state.sharedExpenses.filter(s => !s.settled))
const settled = computed(() => state.sharedExpenses.filter(s => s.settled))

function nameOf(m) { return m.id === state.user?.id ? 'Tu' : m.name }

// Quota "di riga" dal punto di vista dell'utente: positivo = mi spetta, negativo = devo.
function quotaRiga(s) {
  const me = state.user?.id
  const myShare = shareOf(s, me)
  return s.paid_by === me ? (Number(s.importo_totale) - myShare) : -myShare
}

// Saldo netto di un membro (memberBalances): >0 in credito, <0 in debito.
function balanceLabel(userId) {
  const net = memberBalances.value[userId] || 0
  if (Math.abs(net) < 0.01) return 'in pari'
  return (net > 0 ? '+' : '−') + fmtFull(Math.abs(net))
}
function balanceClass(userId) {
  const net = memberBalances.value[userId] || 0
  if (Math.abs(net) < 0.01) return ''
  return net > 0 ? 'pos' : 'neg'
}

function splitLabel(s) {
  const n = s.shares?.length || 0
  if (s.split_type === 'equal') return n > 1 ? `Parti uguali · ${n}` : 'Uno paga tutto'
  if (s.split_type === 'custom') return 'Quote personalizzate'
  return n ? `${n} quote` : 'Suddivisa'
}

function formatData(d) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' })
}

function apriSheet(s) { selected.value = s }

function modificaMovimento(s) {
  selected.value = null
  router.push({ path: '/aggiungi', query: { edit: s.transaction_id } })
}

async function eliminaMovimento(s) {
  if (!confirm(`Eliminare "${s.descrizione}"?`)) return
  try {
    await deleteSharedExpense(s.transaction_id)
    await deleteTransaction(s.transaction_id)
    selected.value = null
  } catch (e) {
    alert('Errore eliminazione: ' + e.message)
  }
}

async function pareggia() { await settleAll() }
async function pareggiaSingolo(s) { await settleExpense(s.id); selected.value = null }
onMounted(async () => { await loadSharedExpenses() })
</script>

<style scoped>
.div-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1rem 1.25rem;
}

.div-title {
  font-size: 1.3rem;
  font-weight: 700;
}

.px {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.saldo-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.card-green {
  border-color: rgba(48, 209, 88, 0.3);
}

.card-red {
  border-color: rgba(255, 95, 87, 0.3);
}

.saldo-icon {
  font-size: 2rem;
}

.saldo-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.saldo-nome {
  font-size: 1.1rem;
  font-weight: 700;
}

.saldo-desc {
  font-size: 0.85rem;
  color: var(--text2);
}

.saldo-amount {
  font-size: 2rem;
  font-weight: 700;
  font-family: 'DM Mono', monospace;
}

.settle-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border: none;
  border-radius: 12px;
  color: #0e0e0e;
  font-family: 'Lexend', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.65rem 1.25rem;
  cursor: pointer;
}

.section-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0 2px;
}

.tx-list {
  overflow: hidden;
}

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1.1rem;
  border-bottom: 1px solid var(--border);
}
.balance-row:last-child { border-bottom: none; }
.balance-name { font-size: 0.9rem; font-weight: 500; }
.balance-amount { font-size: 0.95rem; font-weight: 700; font-family: 'DM Mono', monospace; color: var(--text2); }

.shared-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
  gap: 1rem;
}

.shared-row:last-child {
  border-bottom: none;
}

.shared-row:active {
  background: var(--surface2);
}

.shared-row.settled {
  opacity: 0.5;
  cursor: default;
}

.sr-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.sr-desc {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sr-meta {
  font-size: 0.74rem;
  color: var(--text2);
}

.sr-split {
  font-size: 0.72rem;
  color: var(--accent);
  font-weight: 600;
  margin-top: 2px;
}

.sr-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}

.sr-total {
  font-size: 0.82rem;
  color: var(--text2);
  font-family: 'DM Mono', monospace;
}

.sr-quota {
  font-size: 1rem;
  font-weight: 700;
  font-family: 'DM Mono', monospace;
}

.settled-badge {
  font-size: 0.72rem;
  color: var(--green);
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--text2);
  text-align: center;
}

.empty-state span {
  font-size: 2rem;
}

.empty-sub {
  font-size: 0.8rem;
  opacity: 0.7;
}

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
  max-height: 90dvh;
  overflow-y: auto;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 100px;
  margin-bottom: 0.25rem;
  flex-shrink: 0;
}

.sheet-desc {
  font-size: 1.1rem;
  font-weight: 600;
}

.sheet-amount {
  font-size: 1.8rem;
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

.edit-split-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.edit-split-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.split-options {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.split-opt {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  padding: 0.7rem 0.9rem;
  text-align: left;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.split-opt.active {
  background: rgba(245, 166, 35, 0.1);
  border-color: var(--accent);
}

.so-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.so-payer {
  font-size: 0.88rem;
  font-weight: 600;
}

.so-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 100px;
  background: rgba(245, 166, 35, 0.2);
  color: var(--accent);
}

.so-badge-red {
  background: rgba(255, 95, 87, 0.15);
  color: var(--red);
}

.so-amounts {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  font-family: 'DM Mono', monospace;
}

.pos {
  color: var(--green);
}

.neg {
  color: var(--red);
}

.edit-mov-btn {
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

.save-split-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border: none;
  border-radius: 14px;
  color: #0e0e0e;
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 0.85rem;
  cursor: pointer;
}

.save-split-btn:disabled {
  opacity: 0.6;
}

.settle-single-btn {
  width: 100%;
  background: rgba(48, 209, 88, 0.12);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: 14px;
  color: var(--green);
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