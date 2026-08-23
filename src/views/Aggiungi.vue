<template>
  <div class="page">
    <div class="add-header">
      <h1 class="add-title">{{ editMode ? 'Modifica movimento' : 'Nuovo movimento' }}</h1>
    </div>

    <div class="px">
      <!-- Tipo movimento (segmented pill) -->
      <div class="type-toggle">
        <button type="button" :class="['type-btn', tipo === 'uscita' && 'active-out']" @click="tipo = 'uscita'">Uscita</button>
        <button type="button" :class="['type-btn', tipo === 'entrata' && 'active-in']" @click="tipo = 'entrata'">Entrata</button>
      </div>

      <!-- Importo: tastiera di sistema -->
      <div class="amount-hero">
        <label class="amount-line" :class="tipo === 'uscita' ? 'neg' : 'pos'">
          <span class="amount-sign">{{ tipo === 'uscita' ? '−' : '+' }}</span>
          <input v-model="importoRaw" @input="onImporto" class="amount-input" type="text"
            inputmode="decimal" placeholder="0" />
          <button type="button" class="amount-cur" @click="pickerOpen = true">{{ valutaInputSymbol }}</button>
        </label>
        <p v-if="valutaInput !== householdCurrency" class="amount-conv">
          <template v-if="importoConvertito !== null">≈ {{ fmtFull(importoConvertito, householdCurrency) }}</template>
          <template v-else>⚠️ Cambio {{ valutaInput }} non disponibile</template>
        </p>
        <p v-else class="amount-hint">Tocca {{ valutaInputSymbol }} per cambiare valuta</p>
      </div>

      <CurrencyPicker v-model="valutaInput" :open="pickerOpen" @close="pickerOpen = false" />

      <!-- Descrizione -->
      <div class="desc-field">
        <svg class="desc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
        <input v-model="descrizione" class="desc-input" placeholder="Descrizione..." maxlength="80" />
      </div>

      <!-- Categoria: chip a scorrimento -->
      <p class="field-label">Categoria</p>
      <div class="cat-chips">
        <button v-for="c in chipCategorie" :key="c.id" type="button" class="cat-chip"
          :class="{ sel: categoria === c.name }" @click="categoria = c.name">
          <CatIcon :categoria="c.name" />
          <span class="cat-chip-name">{{ c.name }}</span>
        </button>
        <div v-if="!chipCategorie.length" class="cat-empty">Nessuna categoria</div>
      </div>

      <!-- Data + Mese -->
      <div class="dm-row">
        <label class="dm-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <input v-model="data" type="date" class="dm-input" />
        </label>
        <label class="dm-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <select v-model="meseId" class="dm-input dm-select">
            <option disabled value="">Mese</option>
            <option v-for="m in [...state.months].reverse()" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </label>
      </div>

      <!-- Toggle dividi (solo se il gruppo ha almeno 2 membri) -->
      <button v-if="tipo === 'uscita' && state.members.length >= 2" class="split-toggle" :class="{ active: dividi }" @click="dividi = !dividi">
        🤝 {{ dividi ? 'Spesa condivisa ✓' : 'Dividi spesa' }}
      </button>

      <div v-if="dividi && tipo === 'uscita' && state.members.length >= 2" class="split-panel card">
        <!-- Chi ha pagato -->
        <div class="payer-field">
          <svg class="payer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <div class="payer-body">
            <span class="payer-label">Ha pagato</span>
            <span class="payer-name">{{ payerName }}</span>
          </div>
          <select v-model="payer" class="payer-select">
            <option v-for="m in state.members" :key="m.id" :value="m.id">{{ nameOf(m) }}</option>
          </select>
          <svg class="payer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
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
            Somma quote: {{ fmtFull(customSum, householdCurrency) }} / {{ fmtFull(importoSplit, householdCurrency) }}
          </div>
        </div>
      </div>

      <div v-if="errore" class="error-msg">⚠️ {{ errore }}</div>

      <button class="submit-btn" @click="salva" :disabled="saving">
        {{ saving ? 'Salvataggio...' : editMode ? 'Aggiorna' : 'Salva movimento' }}
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
  loadMonths, loadSharedExpenses, loadCategories, categorieUscite, categorieEntrate, fmtFull, convert
} from '../lib/store.js'
import { currencySymbol } from '../lib/currencies.js'
import CatIcon from '../components/CatIcon.vue'
import CurrencyPicker from '../components/CurrencyPicker.vue'

const LAST_CURRENCY_KEY = 'lastCurrency'

const route = useRoute()
const router = useRouter()

const tipo = ref('uscita')
const importoRaw = ref('')
const descrizione = ref('')
const data = ref(new Date().toISOString().split('T')[0])
const categoria = ref('')
const meseId = ref(state.currentMonthId || '')
// Valuta di input: ultima usata (ricordata) o valuta di famiglia.
const householdCurrency = computed(() => state.householdCurrency || 'EUR')
const valutaInput = ref(localStorage.getItem(LAST_CURRENCY_KEY) || householdCurrency.value)
const pickerOpen = ref(false)
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

const importoNum = computed(() => parseFloat(importoRaw.value) || 0)

const valutaInputSymbol = computed(() => currencySymbol(valutaInput.value))
// Tasso valutaInput → valuta household (quante unità household per 1 unità input).
const tassoCorrente = computed(() => convert(1, valutaInput.value, householdCurrency.value))
// Anteprima importo convertito nella valuta di famiglia (null se cambio mancante).
const importoConvertito = computed(() => {
  if (valutaInput.value === householdCurrency.value) return importoNum.value
  const t = tassoCorrente.value
  return t === null ? null : importoNum.value * t
})

// Categorie mostrate come chip: dipendono dal tipo di movimento selezionato.
const chipCategorie = computed(() =>
  tipo.value === 'uscita' ? categorieUscite.value : categorieEntrate.value
)

// Importo digitato con la tastiera di sistema: accetta cifre e un separatore
// decimale (virgola o punto), max 2 decimali.
function onImporto(e) {
  let v = String(e.target.value).replace(',', '.').replace(/[^0-9.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  const [intPart, decPart] = v.split('.')
  if (decPart !== undefined) v = intPart + '.' + decPart.slice(0, 2)
  importoRaw.value = v
}

function nameOf(m) { return m.id === state.user?.id ? 'Tu' : m.name }

// Nome del pagatore selezionato, per il riepilogo "a colpo d'occhio".
const payerName = computed(() => {
  const m = state.members.find(x => x.id === payer.value)
  return m ? nameOf(m) : '—'
})

// Default: pago io, tutti partecipano.
function initSplitDefaults() {
  payer.value = state.user?.id || state.members[0]?.id || null
  state.members.forEach(m => { participants[m.id] = true })
}

// Le quote della spesa condivisa sono nella valuta di famiglia (importo convertito).
const importoSplit = computed(() => importoConvertito.value || 0)

// Quote in "parti uguali" tra i partecipanti selezionati (resto sul primo).
const equalShares = computed(() => {
  const tot = importoSplit.value
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
const customValid = computed(() => Math.abs(customSum.value - importoSplit.value) < 0.01)

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
  if (importoConvertito.value === null) {
    errore.value = `Cambio ${valutaInput.value} non disponibile. Riprova più tardi o scegli un'altra valuta.`; return
  }

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
  const isForeign = valutaInput.value !== householdCurrency.value
  // importo canonico salvato = convertito nella valuta di famiglia (2 decimali).
  const importo = Math.round((importoConvertito.value || 0) * 100) / 100
  const importoFinal = tipo.value === 'uscita' ? -importo : importo
  // Campi "originale": valorizzati solo se la valuta digitata è diversa da quella di famiglia.
  const meta = {
    valuta: householdCurrency.value,
    importo_originale: isForeign ? importoNum.value : null,
    valuta_originale: isForeign ? valutaInput.value : null,
    tasso_usato: isForeign ? tassoCorrente.value : null,
  }

  if (editMode.value) {
    await updateTransaction(editId.value, {
      data: data.value, importo: importoFinal,
      descrizione: descrizione.value.trim(),
      categoria: categoria.value, month_id: meseId.value,
      ...meta,
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
      ...meta,
    })
    if (dividi.value && state.members.length >= 2) {
      await addSharedExpense({
        transaction_id: tx.id, month_id: meseId.value,
        descrizione: descrizione.value.trim(), importo_totale: importo,
        split_type: splitEqual.value ? 'equal' : 'custom', shares: buildShares(), paid_by: payer.value,
      })
    }
  }

  // Ricorda la valuta di input per i prossimi inserimenti.
  localStorage.setItem(LAST_CURRENCY_KEY, valutaInput.value)

  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false; if (editMode.value) router.back() }, 1200)

  if (!editMode.value) {
    importoRaw.value = ''; descrizione.value = ''
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
      // Se il movimento fu inserito in valuta estera, ripristina valuta e importo digitati;
      // altrimenti mostra l'importo canonico nella valuta del movimento.
      if (tx.valuta_originale) {
        valutaInput.value = tx.valuta_originale
        importoRaw.value = normalizzaImporto(tx.importo_originale ?? tx.importo)
      } else {
        valutaInput.value = tx.valuta || householdCurrency.value
        importoRaw.value = normalizzaImporto(tx.importo)
      }
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

/* Segmented pill Uscita / Entrata */
.type-toggle {
  display: flex;
  gap: 0.4rem;
  background: var(--surface);
  border-radius: 999px;
  padding: 4px;
}

.type-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 999px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.6rem;
  transition: all 0.2s;
}

.active-out {
  background: var(--red);
  color: var(--bg);
}

.active-in {
  background: var(--green);
  color: var(--bg);
}

/* Importo hero con tastiera di sistema */
.amount-hero {
  padding: 0.75rem 0 0.25rem;
  text-align: center;
}

.amount-line {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  border-bottom: 2px solid var(--accent);
  padding: 0 0.5rem 0.4rem;
  cursor: text;
}

.amount-line.neg { color: var(--red); }
.amount-line.pos { color: var(--green); }

.amount-sign {
  font-family: 'DM Mono', monospace;
  font-size: 2rem;
  font-weight: 500;
}

.amount-input {
  width: 4.5ch;
  min-width: 2ch;
  max-width: 7ch;
  field-sizing: content;
  background: transparent;
  border: none;
  outline: none;
  text-align: center;
  color: var(--text);
  caret-color: var(--accent);
  font-family: 'DM Mono', monospace;
  font-weight: 700;
  font-size: 3.25rem;
  line-height: 1;
  padding: 0;
}

.amount-input::placeholder { color: var(--text2); opacity: 0.5; }

.amount-cur {
  align-self: center;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 10px var(--accent-glow);
  color: #f5ead8;
  cursor: pointer;
  font-family: 'DM Mono', monospace;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1;
  min-width: 2.6rem;
  padding: 0.5rem 0.7rem;
  transition: transform 0.15s;
}
.amount-cur:active { transform: scale(0.94); }

.amount-hint {
  font-size: 0.78rem;
  color: var(--text2);
  margin-top: 0.65rem;
}

/* Descrizione */
.desc-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--surface);
  border-radius: 999px;
  padding: 0.85rem 1.15rem;
}

.desc-icon {
  width: 20px;
  height: 20px;
  color: var(--text2);
  flex-shrink: 0;
}

.desc-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
  width: 100%;
}

.desc-input::placeholder { color: var(--text2); font-weight: 400; }

/* Categoria: label + chip a scorrimento */
.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0 2px;
}

.cat-chips {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
  margin: 0 -1.25rem;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.cat-chips::-webkit-scrollbar { display: none; }

.cat-chip {
  flex: none;
  width: 74px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.8rem 0.4rem;
  border-radius: 20px;
  background: var(--surface);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-chip.sel {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.cat-chip-name {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text2);
  text-align: center;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.cat-chip.sel .cat-chip-name { color: var(--accent); }

.cat-empty {
  font-size: 0.85rem;
  color: var(--text2);
  padding: 0.5rem;
}

/* Data + Mese come pill affiancate */
.dm-row {
  display: flex;
  gap: 0.6rem;
}

.dm-pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  background: var(--surface);
  border-radius: 999px;
  padding: 0.7rem 1rem;
  cursor: pointer;
  min-width: 0;
}

.dm-pill svg {
  width: 19px;
  height: 19px;
  color: var(--text2);
  flex-shrink: 0;
}

.dm-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: 'Figtree', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
}

.dm-select { cursor: pointer; appearance: none; -webkit-appearance: none; }
.dm-select option { background: var(--surface); color: var(--text); }

.split-toggle {
  background: var(--surface2);
  border: 1px dashed var(--border);
  border-radius: 14px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.85rem;
  transition: all 0.2s;
  text-align: center;
}

.split-toggle.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(198, 113, 57, 0.08);
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
  font-family: 'Figtree', sans-serif;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  outline: none;
  cursor: pointer;
}
.split-select option { background: var(--surface); color: var(--text); }

/* Campo "Ha pagato" evidenziato: nome del pagatore leggibile a colpo d'occhio */
.payer-field {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  background: rgba(198, 113, 57, 0.1);
  border: 1px solid rgba(198, 113, 57, 0.3);
  border-radius: 12px;
  padding: 0.65rem 0.85rem;
}
.payer-icon {
  width: 22px;
  height: 22px;
  color: var(--accent);
  flex-shrink: 0;
}
.payer-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.payer-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.payer-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--accent);
}
.payer-chevron {
  width: 18px;
  height: 18px;
  color: var(--accent);
  flex-shrink: 0;
}
/* Il select copre l'intero campo ma resta invisibile: apre il menu nativo al tap */
.payer-select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  border: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
.payer-select option { background: var(--surface); color: var(--text); }

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
  font-family: 'Figtree', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}
.sm-btn.active { background: var(--accent); color: #f5ead8; }

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
  font-family: 'Figtree', sans-serif;
  padding: 0.85rem 1rem;
  text-align: left;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.split-opt.active {
  background: rgba(198, 113, 57, 0.1);
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
  background: rgba(198, 113, 57, 0.2);
  color: var(--accent);
}

.so-badge-red {
  background: rgba(176, 74, 44, 0.15);
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
  background: rgba(176, 74, 44, 0.1);
  border: 1px solid rgba(176, 74, 44, 0.3);
  border-radius: 12px;
  color: var(--red);
  font-size: 0.85rem;
  padding: 0.7rem 1rem;
}

.submit-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(198, 113, 57, 0.3);
  color: #f5ead8;
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
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
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  padding: 0.85rem;
}

.delete-btn {
  background: rgba(176, 74, 44, 0.1);
  border: 1px solid rgba(176, 74, 44, 0.3);
  border-radius: 16px;
  color: var(--red);
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
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