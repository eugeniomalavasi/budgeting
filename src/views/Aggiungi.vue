<template>
  <div class="page">
    <div class="add-header">
      <h1 class="add-title">{{ editMode ? 'Modifica movimento' : 'Nuovo movimento' }}</h1>
    </div>

    <div class="px">
      <div class="type-toggle">
        <button :class="['type-btn', tipo === 'uscita' && 'active-out']" @click="tipo = 'uscita'">📤 Uscita</button>
        <button :class="['type-btn', tipo === 'entrata' && 'active-in']" @click="tipo = 'entrata'">📥 Entrata</button>
      </div>

      <div class="amount-display" :class="tipo === 'uscita' ? 'neg' : 'pos'">
        <span class="amount-symbol">{{ tipo === 'uscita' ? '−' : '+' }}</span>
        <span class="amount-val">{{ importoDisplay }}</span>
        <span class="amount-eur">€</span>
      </div>

      <div class="keypad">
        <button v-for="k in keys" :key="k" class="key" @click="keyPress(k)">{{ k }}</button>
      </div>

      <div class="form-card card">
        <div class="form-field">
          <span class="field-icon">✏️</span>
          <input v-model="descrizione" class="field-input" placeholder="Descrizione..." maxlength="80" />
        </div>
        <div class="field-divider"></div>
        <div class="form-field">
          <span class="field-icon">📅</span>
          <input v-model="data" class="field-input" type="date" />
        </div>
        <div class="field-divider"></div>
        <div class="form-field">
          <span class="field-icon">📁</span>
          <select v-model="categoria" class="field-input field-select">
            <option disabled value="">Categoria...</option>
            <optgroup label="— Uscite —">
              <option v-for="c in categorieUscite" :key="c.id" :value="c.name">{{ c.emoji }} {{ c.name }}</option>
            </optgroup>
            <optgroup label="— Entrate —">
              <option v-for="c in categorieEntrate" :key="c.id" :value="c.name">{{ c.emoji }} {{ c.name }}</option>
            </optgroup>
          </select>
        </div>
        <div class="field-divider"></div>
        <div class="form-field">
          <span class="field-icon">🗓</span>
          <select v-model="meseId" class="field-input field-select">
            <option disabled value="">Mese...</option>
            <option v-for="m in [...state.months].reverse()" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <!-- Toggle dividi (solo se il gruppo ha almeno 2 membri) -->
      <button v-if="tipo === 'uscita' && state.members.length >= 2" class="split-toggle" :class="{ active: dividi }" @click="dividi = !dividi">
        🤝 {{ dividi ? 'Spesa condivisa ✓' : 'Dividi spesa' }}
      </button>

      <div v-if="dividi && tipo === 'uscita' && state.members.length >= 2" class="split-panel card">
        <!-- Chi ha pagato -->
        <div class="split-row">
          <span class="split-label">Ha pagato</span>
          <select v-model="payer" class="split-select">
            <option v-for="m in state.members" :key="m.id" :value="m.id">{{ nameOf(m) }}</option>
          </select>
        </div>

        <!-- Modalità di divisione -->
        <div class="split-mode">
          <button type="button" :class="['sm-btn', splitEqual && 'active']" @click="splitEqual = true">Parti uguali</button>
          <button type="button" :class="['sm-btn', !splitEqual && 'active']" @click="splitEqual = false">Quote custom</button>
        </div>

        <!-- Parti uguali: seleziona chi partecipa -->
        <div v-if="splitEqual" class="members-list">
          <label v-for="m in state.members" :key="m.id" class="member-row">
            <input type="checkbox" v-model="participants[m.id]" />
            <span class="member-name">{{ nameOf(m) }}</span>
            <span class="member-amount">{{ fmtFull(equalShares[m.id] || 0) }}</span>
          </label>
        </div>

        <!-- Quote custom: importo per membro -->
        <div v-else class="members-list">
          <div v-for="m in state.members" :key="m.id" class="member-row">
            <span class="member-name">{{ nameOf(m) }}</span>
            <input class="member-input" type="number" inputmode="decimal" min="0" step="0.01"
              v-model="customAmounts[m.id]" placeholder="0" />
          </div>
          <div class="custom-sum" :class="{ bad: !customValid }">
            Somma quote: {{ fmtFull(customSum) }} / {{ fmtFull(importoNum) }}
          </div>
        </div>
      </div>

      <div v-if="errore" class="error-msg">⚠️ {{ errore }}</div>

      <button class="submit-btn" @click="salva" :disabled="saving">
        {{ saving ? 'Salvataggio...' : editMode ? 'Aggiorna' : 'Salva' }}
      </button>
      <button v-if="editMode" class="cancel-btn" @click="annulla">Annulla</button>
      <button v-if="editMode" class="delete-btn" @click="elimina">🗑 Elimina movimento</button>
    </div>

    <transition name="toast">
      <div v-if="toastVisible" class="toast">✅ {{ editMode ? 'Aggiornato!' : 'Movimento aggiunto!' }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  state, addTransaction, updateTransaction, deleteTransaction, addSharedExpense, updateSharedExpense, deleteSharedExpense,
  loadMonths, loadSharedExpenses, loadCategories, categorieUscite, categorieEntrate, fmtFull
} from '../lib/store.js'

const route = useRoute()
const router = useRouter()

const tipo = ref('uscita')
const importoRaw = ref('0')
const descrizione = ref('')
const data = ref(new Date().toISOString().split('T')[0])
const categoria = ref('')
const meseId = ref(state.currentMonthId || '')
const dividi = ref(false)
const payer = ref(null)           // id del membro che ha pagato
const splitEqual = ref(true)      // true = parti uguali, false = quote custom
const participants = reactive({}) // { [memberId]: boolean }
const customAmounts = reactive({})// { [memberId]: string }
const errore = ref('')
const saving = ref(false)
const toastVisible = ref(false)
const editMode = ref(false)
const editId = ref(null)
const editSharedId = ref(null) // ID shared expense esistente in modifica

// Quando cambia la data, aggiorna automaticamente il mese corrispondente
watch(data, (newData) => {
  if (!newData) return
  const monthId = newData.substring(0, 7) // "2026-05-27" → "2026-05"
  if (state.months.find(m => m.id === monthId)) meseId.value = monthId
})

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

const importoNum = computed(() => parseFloat(importoRaw.value) || 0)
const importoDisplay = computed(() => !importoRaw.value || importoRaw.value === '0' ? '0' : importoRaw.value)

function nameOf(m) { return m.id === state.user?.id ? 'Tu' : m.name }

// Default: pago io, tutti partecipano.
function initSplitDefaults() {
  payer.value = state.user?.id || state.members[0]?.id || null
  state.members.forEach(m => { participants[m.id] = true })
}

// Quote in "parti uguali" tra i partecipanti selezionati (resto sul primo).
const equalShares = computed(() => {
  const tot = importoNum.value
  const ids = state.members.filter(m => participants[m.id]).map(m => m.id)
  const out = {}
  if (!ids.length) return out
  const each = Math.floor((tot / ids.length) * 100) / 100
  ids.forEach(id => { out[id] = each })
  const rem = Math.round((tot - each * ids.length) * 100) / 100
  if (rem !== 0) out[ids[0]] = Math.round((out[ids[0]] + rem) * 100) / 100
  return out
})

const customSum = computed(() =>
  state.members.reduce((s, m) => s + (Number(customAmounts[m.id]) || 0), 0)
)
const customValid = computed(() => Math.abs(customSum.value - importoNum.value) < 0.01)

// Array [{ user_id, amount }] da salvare.
function buildShares() {
  if (splitEqual.value) {
    return Object.entries(equalShares.value).map(([user_id, amount]) => ({ user_id, amount }))
  }
  return state.members
    .map(m => ({ user_id: m.id, amount: Number(customAmounts[m.id]) || 0 }))
    .filter(s => s.amount > 0)
}

// Se il gruppo cambia o si attiva "dividi", inizializza i default una volta.
watch(dividi, (on) => { if (on && !payer.value) initSplitDefaults() })

function keyPress(k) {
  if (k === '⌫') { importoRaw.value = importoRaw.value.length <= 1 ? '0' : importoRaw.value.slice(0, -1); return }
  if (k === '.' && importoRaw.value.includes('.')) return
  if (importoRaw.value === '0' && k !== '.') { importoRaw.value = k; return }
  const dec = importoRaw.value.split('.')[1]
  if (dec && dec.length >= 2) return
  importoRaw.value += k
}

async function elimina() {
  if (!editId.value) return
  if (!confirm(`Eliminare "${descrizione.value}"?`)) return
  try {
    if (editSharedId.value) await deleteSharedExpense(editId.value)
    await deleteTransaction(editId.value)
    router.back()
  } catch (e) {
    errore.value = 'Errore eliminazione: ' + e.message
  }
}

function annulla() { router.back() }

function normalizzaData(d) { return d ? String(d).split('T')[0] : new Date().toISOString().split('T')[0] }
function normalizzaImporto(v) { return String(Math.round(Math.abs(parseFloat(v)) * 100) / 100) }

// Rete di sicurezza: se una richiesta a Supabase resta "appesa" (es. problemi
// di rete), dopo 15s sblocchiamo comunque il pulsante invece di lasciarlo
// bloccato finché l'utente non forza un refresh della pagina.
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Richiesta scaduta, riprova.')), ms))
  ])
}

async function salva() {
  errore.value = ''
  const importo = importoNum.value
  if (!importo || importo <= 0) { errore.value = 'Importo non valido.'; return }
  if (!descrizione.value.trim()) { errore.value = 'Inserisci una descrizione.'; return }
  if (!categoria.value) { errore.value = 'Seleziona una categoria.'; return }
  if (!meseId.value) { errore.value = 'Seleziona il mese.'; return }

  if (dividi.value && tipo.value === 'uscita' && state.members.length >= 2) {
    if (buildShares().length === 0) { errore.value = 'Seleziona almeno un partecipante.'; return }
    if (!splitEqual.value && !customValid.value) { errore.value = 'Le quote non sommano al totale.'; return }
  }

  saving.value = true
  try {
    await withTimeout(salvaInterno())
  } catch (e) {
    errore.value = 'Errore: ' + e.message
  } finally {
    saving.value = false
  }
}

async function salvaInterno() {
  const importo = importoNum.value
  const importoFinal = tipo.value === 'uscita' ? -importo : importo

  if (editMode.value) {
    await updateTransaction(editId.value, {
      data: data.value, importo: importoFinal,
      descrizione: descrizione.value.trim(),
      categoria: categoria.value, month_id: meseId.value,
    })
    // Aggiorna o crea shared expense
    if (dividi.value && tipo.value === 'uscita' && state.members.length >= 2) {
      const shares = buildShares()
      const split_type = splitEqual.value ? 'equal' : 'custom'
      if (editSharedId.value) {
        await updateSharedExpense(editSharedId.value, {
          split_type, shares, importo_totale: importo, paid_by: payer.value,
        })
      } else {
        await addSharedExpense({
          transaction_id: editId.value, month_id: meseId.value,
          descrizione: descrizione.value.trim(), importo_totale: importo,
          split_type, shares, paid_by: payer.value,
        })
      }
    } else if (!dividi.value && editSharedId.value) {
      // Rimuovi shared expense se l'utente ha tolto la spunta
      await deleteSharedExpense(editId.value)
      editSharedId.value = null
    }
  } else {
    const tx = await addTransaction({
      month_id: meseId.value, data: data.value,
      importo: importoFinal, descrizione: descrizione.value.trim(), categoria: categoria.value,
    })
    if (dividi.value && state.members.length >= 2) {
      await addSharedExpense({
        transaction_id: tx.id, month_id: meseId.value,
        descrizione: descrizione.value.trim(), importo_totale: importo,
        split_type: splitEqual.value ? 'equal' : 'custom', shares: buildShares(), paid_by: payer.value,
      })
    }
  }

  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false; if (editMode.value) router.back() }, 1200)

  if (!editMode.value) {
    importoRaw.value = '0'; descrizione.value = ''
    categoria.value = ''; dividi.value = false
    splitEqual.value = true
    state.members.forEach(m => { customAmounts[m.id] = '' })
    initSplitDefaults()
  }
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
  if (!meseId.value && state.months.length) meseId.value = state.months[state.months.length - 1].id
  if (!state.sharedExpenses.length) await loadSharedExpenses()
  if (!state.categories.length) await loadCategories()
  initSplitDefaults()

  const txId = route.query.edit
  if (txId) {
    let tx = state.transactions.find(t => t.id === txId)
    if (tx) {
      editMode.value = true; editId.value = tx.id
      tipo.value = Number(tx.importo) < 0 ? 'uscita' : 'entrata'
      importoRaw.value = normalizzaImporto(tx.importo)
      descrizione.value = tx.descrizione
      data.value = normalizzaData(tx.data)
      categoria.value = tx.categoria; meseId.value = tx.month_id

      // Ricostruisci pagatore, partecipanti e modalità dalla shared expense
      const shared = state.sharedExpenses.find(s => s.transaction_id === tx.id)
      if (shared) {
        dividi.value = true
        payer.value = shared.paid_by
        const shares = shared.shares || []
        state.members.forEach(m => { participants[m.id] = false; customAmounts[m.id] = '' })
        shares.forEach(s => { participants[s.user_id] = true })
        // "Parti uguali" se tutte le quote dei partecipanti sono ~uguali
        const amounts = shares.map(s => Number(s.amount))
        const allEqual = amounts.length > 0 && amounts.every(a => Math.abs(a - amounts[0]) < 0.02)
        splitEqual.value = allEqual
        if (!allEqual) shares.forEach(s => { customAmounts[s.user_id] = String(s.amount) })
        editSharedId.value = shared.id
      }
    }
  }
})
</script>

<style scoped>
.add-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1rem 1.25rem;
}

.add-title {
  font-size: 1.3rem;
  font-weight: 700;
}

.px {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.type-toggle {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.7rem;
  transition: all 0.2s;
}

.active-out {
  background: rgba(255, 95, 87, 0.12);
  border-color: var(--red);
  color: var(--red);
}

.active-in {
  background: rgba(48, 209, 88, 0.12);
  border-color: var(--green);
  color: var(--green);
}

.amount-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem;
}

.amount-display.neg {
  color: var(--red);
}

.amount-display.pos {
  color: var(--green);
}

.amount-symbol {
  font-size: 2rem;
  font-weight: 300;
}

.amount-val {
  font-size: 3.5rem;
  font-weight: 700;
  font-family: 'DM Mono', monospace;
  line-height: 1;
}

.amount-eur {
  font-size: 1.5rem;
  font-weight: 500;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.key {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  font-size: 1.3rem;
  font-weight: 500;
  padding: 1rem;
  transition: all 0.1s;
  user-select: none;
}

.key:active {
  background: var(--surface2);
  transform: scale(0.95);
}

.form-card {
  overflow: hidden;
}

.form-field {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.1rem;
}

.field-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.field-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  outline: none;
  width: 100%;
}

.field-select {
  cursor: pointer;
}

.field-select option,
.field-select optgroup {
  background: var(--surface);
  color: var(--text);
}

.field-divider {
  height: 1px;
  background: var(--border);
  margin: 0 1.1rem;
}

.split-toggle {
  background: var(--surface2);
  border: 1px dashed var(--border);
  border-radius: 14px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.85rem;
  transition: all 0.2s;
  text-align: center;
}

.split-toggle.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(245, 166, 35, 0.08);
}

/* Split panel N-persone */
.split-panel {
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.split-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.split-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text2);
}
.split-select {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-family: 'Lexend', sans-serif;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  outline: none;
  cursor: pointer;
}
.split-select option { background: var(--surface); color: var(--text); }

.split-mode {
  display: flex;
  gap: 0.4rem;
  background: var(--surface2);
  border-radius: 12px;
  padding: 4px;
}
.sm-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 9px;
  color: var(--text2);
  font-family: 'Lexend', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}
.sm-btn.active { background: var(--accent); color: #0e0e0e; }

.members-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.member-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.6rem 0.85rem;
  cursor: pointer;
}
.member-row input[type="checkbox"] {
  width: 18px; height: 18px;
  accent-color: var(--accent);
  flex-shrink: 0;
}
.member-name { flex: 1; font-size: 0.9rem; font-weight: 500; }
.member-amount {
  font-family: 'DM Mono', monospace;
  font-size: 0.85rem;
  color: var(--text2);
}
.member-input {
  width: 90px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: 'DM Mono', monospace;
  font-size: 0.9rem;
  padding: 0.4rem 0.6rem;
  outline: none;
  text-align: right;
}
.member-input:focus { border-color: var(--accent); }
.custom-sum {
  font-size: 0.8rem;
  color: var(--text2);
  text-align: right;
  padding-top: 2px;
}
.custom-sum.bad { color: var(--red); }

/* Split panel con 4 opzioni (legacy, non più usato) */
.split-panel-legacy {
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.split-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.split-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.split-opt {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  padding: 0.85rem 1rem;
  text-align: left;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.split-opt.active {
  background: rgba(245, 166, 35, 0.1);
  border-color: var(--accent);
}

.split-opt:active {
  transform: scale(0.99);
}

.so-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.so-payer {
  font-size: 0.9rem;
  font-weight: 600;
}

.so-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
  background: rgba(245, 166, 35, 0.2);
  color: var(--accent);
}

.so-badge-red {
  background: rgba(255, 95, 87, 0.15);
  color: var(--red);
}

.so-sub {
  font-size: 0.78rem;
  color: var(--text2);
}

.so-amounts {
  display: flex;
  gap: 1rem;
  font-size: 0.78rem;
  font-family: 'DM Mono', monospace;
  margin-top: 2px;
}

.pos {
  color: var(--green);
}

.neg {
  color: var(--red);
}

.error-msg {
  background: rgba(255, 95, 87, 0.1);
  border: 1px solid rgba(255, 95, 87, 0.3);
  border-radius: 12px;
  color: var(--red);
  font-size: 0.85rem;
  padding: 0.7rem 1rem;
}

.submit-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(245, 166, 35, 0.3);
  color: #0e0e0e;
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  padding: 1rem;
  transition: all 0.2s;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 16px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  padding: 0.85rem;
}

.delete-btn {
  background: rgba(255, 95, 87, 0.1);
  border: 1px solid rgba(255, 95, 87, 0.3);
  border-radius: 16px;
  color: var(--red);
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.85rem;
}

.toast {
  position: fixed;
  bottom: calc(var(--nav-h) + 1rem);
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  color: var(--green);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.7rem 1.5rem;
  white-space: nowrap;
  z-index: 300;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>