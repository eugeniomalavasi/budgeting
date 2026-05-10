<template>
  <div class="page">
    <div class="div-header">
      <h1 class="div-title">Conti con {{ nomeAltro }}</h1>
    </div>

    <div class="px">
      <div class="saldo-card card" :class="saldoCondiviso >= 0 ? 'card-green' : 'card-red'">
        <div class="saldo-icon">{{ saldoCondiviso >= 0 ? '🎉' : '😅' }}</div>
        <div v-if="saldoCondiviso > 0.01" class="saldo-text">
          <span class="saldo-nome">{{ nomeAltro }}</span>
          <span class="saldo-desc">ti deve</span>
          <span class="saldo-amount pos amount">{{ fmtFull(saldoCondiviso) }}</span>
        </div>
        <div v-else-if="saldoCondiviso < -0.01" class="saldo-text">
          <span class="saldo-desc">Devi a</span>
          <span class="saldo-nome">{{ nomeAltro }}</span>
          <span class="saldo-amount neg amount">{{ fmtFull(Math.abs(saldoCondiviso)) }}</span>
        </div>
        <div v-else class="saldo-text">
          <span class="saldo-desc">Siete in pari 🤝</span>
        </div>
        <button v-if="Math.abs(saldoCondiviso) > 0.01 && unsettled.length" class="settle-btn" @click="pareggia">
          Segna tutto come saldato
        </button>
      </div>

      <div v-if="unsettled.length">
        <p class="section-label">Da saldare ({{ unsettled.length }})</p>
        <div class="card tx-list">
          <div v-for="s in unsettled" :key="s.id" class="shared-row" @click="apriSheet(s)">
            <div class="sr-left">
              <span class="sr-desc">{{ s.descrizione }}</span>
              <span class="sr-meta">
                {{ formatData(s.created_at) }} ·
                {{ s.paid_by === state.user?.id ? 'Hai pagato tu' : 'Ha pagato ' + nomeAltro }}
              </span>
              <span class="sr-split">{{ splitLabel(s) }}</span>
            </div>
            <div class="sr-right">
              <span class="sr-total">{{ fmtFull(s.importo_totale) }}</span>
              <span class="sr-quota" :class="s.paid_by === state.user?.id ? 'pos' : 'neg'">
                {{ s.paid_by === state.user?.id ? '+' : '−' }}{{ fmtFull(s.paid_by === state.user?.id ? quotaAltro(s) :
                quotaMia(s)) }}
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
          <p class="sheet-amount amount" :class="selected.paid_by === state.user?.id ? 'pos' : 'neg'">
            {{ fmtFull(selected.importo_totale) }}
          </p>

          <div class="sheet-details">
            <div class="sheet-row"><span>Pagato da</span><span>{{
              selected.paid_by === state.user?.id ? (state.profile?.name || 'Tu') : nomeAltro }}</span></div>
            <div class="sheet-row"><span>Quota {{ state.profile?.name }}</span><span class="neg amount">{{
              fmtFull(quotaMia(selected)) }}</span></div>
            <div class="sheet-row"><span>Quota {{ nomeAltro }}</span><span class="neg amount">{{
              fmtFull(quotaAltro(selected)) }}</span></div>
            <div class="sheet-row"><span>Data</span><span>{{ formatData(selected.created_at) }}</span></div>
          </div>

          <!-- Modifica suddivisione: 4 opzioni esplicite -->
          <div class="edit-split-section">
            <p class="edit-split-title">Modifica suddivisione</p>
            <div class="split-options">
              <button :class="['split-opt', editSplitMode === 'eu_meta' && 'active']" @click="setEditSplitMode('eu_meta')">
                <div class="so-top"><span class="so-payer">Eugenio paga</span><span class="so-badge">50/50</span></div>
                <div class="so-amounts" v-if="selected?.importo_totale">
                  <span>Eu {{ fmtFull(-selected.importo_totale / 2) }}</span>
                  <span>{{ nomeAltro }} {{ fmtFull(-selected.importo_totale / 2) }}</span>
                </div>
              </button>
              <button :class="['split-opt', editSplitMode === 'ma_meta' && 'active']" @click="setEditSplitMode('ma_meta')">
                <div class="so-top"><span class="so-payer">{{ nomeAltro }} paga</span><span
                    class="so-badge">50/50</span></div>
                <div class="so-amounts" v-if="selected?.importo_totale">
                  <span>Eu {{ fmtFull(-selected.importo_totale / 2) }}</span>
                  <span>{{ nomeAltro }} {{ fmtFull(-selected.importo_totale / 2) }}</span>
                </div>
              </button>
              <button :class="['split-opt', editSplitMode === 'eu_tutto' && 'active']"
                @click="setEditSplitMode('eu_tutto')">
                <div class="so-top"><span class="so-payer">Eugenio paga</span><span class="so-badge so-badge-red">{{
                    nomeAltro }} deve tutto</span></div>
                <div class="so-amounts" v-if="selected?.importo_totale">
                  <span class="pos">Eu +{{ fmtFull(selected.importo_totale) }}</span>
                  <span class="neg">{{ nomeAltro }} {{ fmtFull(-selected.importo_totale) }}</span>
                </div>
              </button>
              <button :class="['split-opt', editSplitMode === 'ma_tutto' && 'active']"
                @click="setEditSplitMode('ma_tutto')">
                <div class="so-top"><span class="so-payer">{{ nomeAltro }} paga</span><span
                    class="so-badge so-badge-red">Eugenio deve tutto</span></div>
                <div class="so-amounts" v-if="selected?.importo_totale">
                  <span class="neg">Eu {{ fmtFull(-selected.importo_totale) }}</span>
                  <span class="pos">{{ nomeAltro }} +{{ fmtFull(selected.importo_totale) }}</span>
                </div>
              </button>
            </div>
          </div>

          <button class="save-split-btn" @click="salvaSuddivisione" :disabled="savingSplit">
            {{ savingSplit ? 'Salvataggio...' : '💾 Salva suddivisione' }}
          </button>
          <button v-if="!selected.settled" class="settle-single-btn" @click="pareggiaSingolo(selected)">
            ✓ Segna come saldato
          </button>
          <button class="close-btn" @click="selected = null">Chiudi</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  state, saldoCondiviso, loadSharedExpenses, settleExpense, settleAll,
  updateSharedExpense, fmtFull
} from '../lib/store.js'

const selected = ref(null)
const editSplitMode = ref('eu_meta')
const savingSplit = ref(false)

const nomeAltro = computed(() => state.otherProfile?.name || 'Margherita')
const unsettled = computed(() => state.sharedExpenses.filter(s => !s.settled))
const settled = computed(() => state.sharedExpenses.filter(s => s.settled))

// Trova sempre i profili per nome, indipendentemente da chi è loggato
const idEu = computed(() => [state.profile, state.otherProfile].filter(Boolean).find(p => p.name === 'Eugenio')?.id)
const idMa = computed(() => [state.profile, state.otherProfile].filter(Boolean).find(p => p.name === 'Margherita')?.id)
const nomeIo = computed(() => state.profile?.name || 'Io')

function quotaMia(s) {
  return state.profile?.name === 'Eugenio' ? Number(s.share_eu) : Number(s.share_ma)
}
function quotaAltro(s) {
  return state.profile?.name === 'Eugenio' ? Number(s.share_ma) : Number(s.share_eu)
}

function splitLabel(s) {
  if (s.split_type === 'eu_meta' || s.split_type === 'ma_meta' || s.split_type === 'equal') return '50/50'
  if (s.split_type === 'eu_tutto') return `Eugenio ha pagato · ${nomeAltro.value} deve tutto`
  if (s.split_type === 'ma_tutto') return `${nomeAltro.value} ha pagato · Eugenio deve tutto`
  return s.split_type || 'Importo fisso'
}

function formatData(d) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' })
}

function getModeFromExpense(s) {
  const isEuPayer = s.paid_by === idEu.value
  const maDoveTutto = Number(s.share_ma) >= Number(s.importo_totale) * 0.99
  const euDoveTutto = Number(s.share_eu) >= Number(s.importo_totale) * 0.99
  // Traduce i valori DB (eu_meta/ma_meta/eu_tutto/ma_tutto) nelle 4 opzioni dal punto di vista di chi guarda
  if (isEuPayer && maDoveTutto) return 'eu_tutto'
  if (!isEuPayer && euDoveTutto) return 'ma_tutto'
  return isEuPayer ? 'eu_meta' : 'ma_meta'
}

function apriSheet(s) {
  selected.value = s
  editSplitMode.value = getModeFromExpense(s)
}

function setEditSplitMode(mode) { editSplitMode.value = mode }

function calcolaSharesEdit() {
  const tot = selected.value?.importo_totale || 0
  const half = Math.round(tot / 2 * 100) / 100
  const half2 = Math.round((tot - half) * 100) / 100
  switch (editSplitMode.value) {
    case 'eu_meta': return { share_eu: half, share_ma: half2, paid_by: idEu.value }
    case 'ma_meta': return { share_eu: half, share_ma: half2, paid_by: idMa.value }
    case 'eu_tutto': return { share_eu: 0, share_ma: tot, paid_by: idEu.value }
    case 'ma_tutto': return { share_eu: tot, share_ma: 0, paid_by: idMa.value }
    default: return { share_eu: half, share_ma: half2, paid_by: idEu.value }
  }
}

async function salvaSuddivisione() {
  if (!selected.value) return
  savingSplit.value = true
  try {
    const { share_eu, share_ma, paid_by } = calcolaSharesEdit()
    await updateSharedExpense(selected.value.id, {
      split_type: editSplitMode.value, share_eu, share_ma,
      importo_totale: selected.value.importo_totale, paid_by,
    })
    selected.value = { ...selected.value, split_type: editSplitMode.value, share_eu, share_ma, paid_by }
  } finally { savingSplit.value = false }
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