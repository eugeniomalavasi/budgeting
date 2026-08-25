<template>
  <div class="page">
    <div class="add-header">
      <button class="back-btn" @click="router.push('/ricorrenti')" aria-label="Indietro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <h1 class="add-title">{{ editMode ? 'Modifica ricorrente' : 'Nuova ricorrente' }}</h1>
    </div>

    <div class="px">
      <!-- Tipo -->
      <div class="type-toggle">
        <button type="button" :class="['type-btn', tipo === 'uscita' && 'active-out']" @click="tipo = 'uscita'">Uscita</button>
        <button type="button" :class="['type-btn', tipo === 'entrata' && 'active-in']" @click="tipo = 'entrata'">Entrata</button>
      </div>

      <!-- Importo -->
      <div class="amount-hero">
        <label class="amount-line" :class="tipo === 'uscita' ? 'neg' : 'pos'">
          <span class="amount-sign">{{ tipo === 'uscita' ? '−' : '+' }}</span>
          <input v-model="importoRaw" @input="onImporto" class="amount-input" type="text" inputmode="decimal" placeholder="0" />
          <button type="button" class="amount-cur" @click="pickerOpen = true">{{ valutaInputSymbol }}</button>
        </label>
        <p v-if="valutaInput !== householdCurrency" class="amount-conv">
          <template v-if="importoConvertito !== null">≈ {{ fmtFull(importoConvertito, householdCurrency) }} al mese</template>
          <template v-else>⚠️ Cambio {{ valutaInput }} non disponibile</template>
        </p>
        <p v-else class="amount-hint">Tocca {{ valutaInputSymbol }} per cambiare valuta</p>
      </div>

      <CurrencyPicker v-model="valutaInput" :open="pickerOpen" @close="pickerOpen = false" />

      <!-- Descrizione -->
      <div class="desc-field">
        <svg class="desc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
        <input v-model="descrizione" class="desc-input" placeholder="Es. Rata auto, Netflix, Stipendio..." maxlength="80" />
      </div>

      <!-- Categoria -->
      <p class="field-label">Categoria</p>
      <div class="cat-chips">
        <button v-for="c in chipCategorie" :key="c.id" type="button" class="cat-chip" :class="{ sel: categoria === c.name }" @click="categoria = c.name">
          <CatIcon :categoria="c.name" />
          <span class="cat-chip-name">{{ c.name }}</span>
        </button>
        <div v-if="!chipCategorie.length" class="cat-empty">Nessuna categoria</div>
      </div>

      <!-- Giorno del mese -->
      <p class="field-label">Giorno del mese</p>
      <div class="day-row">
        <select v-model.number="dayOfMonth" class="inp-select">
          <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
        </select>
        <span class="day-hint">Nei mesi più corti viene usato l'ultimo giorno disponibile.</span>
      </div>

      <!-- Durata -->
      <p class="field-label">Durata</p>
      <div class="dur-modes">
        <button type="button" :class="['dur-btn', durMode === 'count' && 'active']" @click="durMode = 'count'">Per N mesi</button>
        <button type="button" :class="['dur-btn', durMode === 'until' && 'active']" @click="durMode = 'until'">Fino a</button>
        <button type="button" :class="['dur-btn', durMode === 'forever' && 'active']" @click="durMode = 'forever'">Per sempre</button>
      </div>
      <div v-if="durMode === 'count'" class="dur-detail">
        <input v-model.number="installments" type="number" min="1" max="600" class="inp" placeholder="Numero di mesi (es. 36)" />
      </div>
      <div v-else-if="durMode === 'until'" class="dur-detail">
        <input v-model="endMonth" type="month" class="inp" :min="startMonth" />
      </div>

      <!-- Mese di inizio -->
      <p class="field-label">Primo mese</p>
      <input v-model="startMonth" type="month" class="inp" />
      <p class="next-hint">Primo addebito previsto: <b>{{ nextGenerationLabel }}</b></p>

      <!-- Divisione (solo uscite, gruppo ≥ 2) -->
      <button v-if="tipo === 'uscita' && state.members.length >= 2" class="split-toggle" :class="{ active: dividi }" @click="dividi = !dividi">
        🤝 {{ dividi ? 'Spesa condivisa ✓' : 'Dividi spesa' }}
      </button>

      <div v-if="dividi && tipo === 'uscita' && state.members.length >= 2" class="split-panel card">
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

        <div class="split-mode">
          <button type="button" :class="['sm-btn', splitEqual && 'active']" @click="splitEqual = true">Parti uguali</button>
          <button type="button" :class="['sm-btn', !splitEqual && 'active']" @click="splitEqual = false">Quote custom</button>
        </div>

        <div v-if="splitEqual" class="members-list">
          <label v-for="m in state.members" :key="m.id" class="member-row">
            <input type="checkbox" v-model="participants[m.id]" />
            <span class="member-name">{{ nameOf(m) }}</span>
            <span class="member-amount">{{ fmtFull(equalShares[m.id] || 0, householdCurrency) }}</span>
          </label>
        </div>
        <div v-else class="members-list">
          <div v-for="m in state.members" :key="m.id" class="member-row">
            <span class="member-name">{{ nameOf(m) }}</span>
            <input class="member-input" type="number" inputmode="decimal" min="0" step="0.01" v-model="customAmounts[m.id]" placeholder="0" />
          </div>
          <div class="custom-sum" :class="{ bad: !customValid }">
            Somma quote: {{ customSum.toFixed(2) }} / {{ importoNum.toFixed(2) }} {{ valutaInput }}
          </div>
        </div>
      </div>

      <div v-if="errore" class="error-msg">⚠️ {{ errore }}</div>

      <button class="submit-btn" @click="salva" :disabled="saving">
        {{ saving ? 'Salvataggio...' : editMode ? 'Aggiorna regola' : 'Salva spesa ricorrente' }}
      </button>
      <button v-if="editMode" class="cancel-btn" @click="router.push('/ricorrenti')">Annulla</button>
      <button v-if="editMode" class="delete-btn" @click="elimina">🗑 Elimina regola</button>
    </div>

    <transition name="toast">
      <div v-if="toastVisible" class="toast">✅ {{ editMode ? 'Aggiornata!' : 'Ricorrente salvata!' }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  state, loadMonths, loadCategories, categorieUscite, categorieEntrate,
  loadRecurringRules, addRecurringRule, updateRecurringRule, deleteRecurringRule,
  fmtFull, convert,
} from '../lib/store.js'
import { currencySymbol } from '../lib/currencies.js'
import CatIcon from '../components/CatIcon.vue'
import CurrencyPicker from '../components/CurrencyPicker.vue'

const LAST_CURRENCY_KEY = 'lastCurrency'
const route = useRoute()
const router = useRouter()

const nowId = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

const tipo = ref('uscita')
const importoRaw = ref('')
const descrizione = ref('')
const categoria = ref('')
const dayOfMonth = ref(1)
const durMode = ref('forever')     // 'count' | 'until' | 'forever'
const installments = ref(12)
const endMonth = ref('')
const startMonth = ref(nowId())
const householdCurrency = computed(() => state.householdCurrency || 'EUR')
const valutaInput = ref(localStorage.getItem(LAST_CURRENCY_KEY) || householdCurrency.value)
const pickerOpen = ref(false)
const dividi = ref(false)
const payer = ref(null)
const splitEqual = ref(true)
const participants = reactive({})
const customAmounts = reactive({})
const errore = ref('')
const saving = ref(false)
const toastVisible = ref(false)
const editMode = ref(false)
const editId = ref(null)

const importoNum = computed(() => parseFloat(importoRaw.value) || 0)
const valutaInputSymbol = computed(() => currencySymbol(valutaInput.value))
const tassoCorrente = computed(() => convert(1, valutaInput.value, householdCurrency.value))
const importoConvertito = computed(() => {
  if (valutaInput.value === householdCurrency.value) return importoNum.value
  const t = tassoCorrente.value
  return t === null ? null : importoNum.value * t
})
const chipCategorie = computed(() => tipo.value === 'uscita' ? categorieUscite.value : categorieEntrate.value)

function onImporto(e) {
  let v = String(e.target.value).replace(',', '.').replace(/[^0-9.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  const [intPart, decPart] = v.split('.')
  if (decPart !== undefined) v = intPart + '.' + decPart.slice(0, 2)
  importoRaw.value = v
}

function nameOf(m) { return m.id === state.user?.id ? 'Tu' : m.name }
const payerName = computed(() => {
  const m = state.members.find(x => x.id === payer.value)
  return m ? nameOf(m) : '—'
})

function initSplitDefaults() {
  payer.value = state.user?.id || state.members[0]?.id || null
  state.members.forEach(m => { participants[m.id] = true })
}

// Quote "parti uguali" (nella valuta di input, solo per anteprima).
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
const customSum = computed(() => state.members.reduce((s, m) => s + (Number(customAmounts[m.id]) || 0), 0))
const customValid = computed(() => Math.abs(customSum.value - importoNum.value) < 0.01)

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
function daysInMonth(id) {
  const [y, m] = id.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
function addMonth(id) {
  let [y, m] = id.split('-').map(Number)
  m += 1; if (m > 12) { m = 1; y += 1 }
  return `${y}-${String(m).padStart(2, '0')}`
}
// Primo mese in cui l'addebito verrà effettivamente generato.
const nextGenerationLabel = computed(() => {
  let month = startMonth.value || nowId()
  const today = nowId()
  if (month < today) month = today
  // Se è il mese corrente e il giorno è già passato, si parte dal mese dopo.
  if (month === today) {
    const eff = Math.min(dayOfMonth.value, daysInMonth(month))
    if (new Date().getDate() > eff) month = addMonth(month)
  }
  const eff = Math.min(dayOfMonth.value, daysInMonth(month))
  const [y, m] = month.split('-').map(Number)
  return `${eff} ${MESI[m - 1]} ${y}`
})

watch(dividi, (on) => { if (on && !payer.value) initSplitDefaults() })

function buildShares() {
  if (splitEqual.value) {
    return state.members.filter(m => participants[m.id]).map(m => ({ user_id: m.id, weight: 1 }))
  }
  return state.members
    .map(m => ({ user_id: m.id, weight: Number(customAmounts[m.id]) || 0 }))
    .filter(s => s.weight > 0)
}

async function salva() {
  errore.value = ''
  if (!importoNum.value || importoNum.value <= 0) { errore.value = 'Importo non valido.'; return }
  if (!descrizione.value.trim()) { errore.value = 'Inserisci una descrizione.'; return }
  if (!categoria.value) { errore.value = 'Seleziona una categoria.'; return }
  if (!startMonth.value) { errore.value = 'Scegli il primo mese.'; return }
  if (durMode.value === 'count' && (!installments.value || installments.value < 1)) { errore.value = 'Numero di mesi non valido.'; return }
  if (durMode.value === 'until') {
    if (!endMonth.value) { errore.value = 'Scegli il mese di fine.'; return }
    if (endMonth.value < startMonth.value) { errore.value = 'Il mese di fine è prima dell\'inizio.'; return }
  }

  const isSplit = dividi.value && tipo.value === 'uscita' && state.members.length >= 2
  const shares = isSplit ? buildShares() : []
  if (isSplit) {
    if (!shares.length) { errore.value = 'Seleziona almeno un partecipante.'; return }
    if (!splitEqual.value && !customValid.value) { errore.value = 'Le quote non sommano al totale.'; return }
  }

  const rule = {
    tipo: tipo.value,
    descrizione: descrizione.value.trim(),
    categoria: categoria.value,
    importo_originale: importoNum.value,
    valuta_originale: valutaInput.value,
    day_of_month: dayOfMonth.value,
    start_month: startMonth.value,
    total_installments: durMode.value === 'count' ? installments.value : null,
    end_month: durMode.value === 'until' ? endMonth.value : null,
    is_split: isSplit,
    split_type: splitEqual.value ? 'equal' : 'custom',
    paid_by: isSplit ? payer.value : null,
  }

  saving.value = true
  try {
    if (editMode.value) await updateRecurringRule(editId.value, rule, isSplit ? shares : [])
    else await addRecurringRule(rule, shares)
    localStorage.setItem(LAST_CURRENCY_KEY, valutaInput.value)
    toastVisible.value = true
    setTimeout(() => { toastVisible.value = false; router.push('/ricorrenti') }, 1000)
  } catch (e) {
    errore.value = 'Errore: ' + (e?.message || e)
  } finally {
    saving.value = false
  }
}

async function elimina() {
  if (!editId.value) return
  if (!confirm(`Eliminare la regola "${descrizione.value}"? Non verranno più creati movimenti futuri. Quelli già registrati restano.`)) return
  try {
    await deleteRecurringRule(editId.value)
    router.push('/ricorrenti')
  } catch (e) {
    errore.value = 'Errore eliminazione: ' + (e?.message || e)
  }
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
  if (!state.categories.length) await loadCategories()
  if (!state.recurringRules.length) await loadRecurringRules()
  initSplitDefaults()

  const id = route.params.id
  if (id && id !== 'nuovo') {
    const r = state.recurringRules.find(x => x.id === id)
    if (r) {
      editMode.value = true; editId.value = r.id
      tipo.value = r.tipo
      importoRaw.value = String(r.importo_originale)
      valutaInput.value = r.valuta_originale
      descrizione.value = r.descrizione
      categoria.value = r.categoria
      dayOfMonth.value = r.day_of_month
      startMonth.value = r.start_month
      if (r.total_installments != null) { durMode.value = 'count'; installments.value = r.total_installments }
      else if (r.end_month) { durMode.value = 'until'; endMonth.value = r.end_month }
      else durMode.value = 'forever'
      if (r.is_split) {
        dividi.value = true
        payer.value = r.paid_by
        splitEqual.value = r.split_type === 'equal'
        state.members.forEach(m => { participants[m.id] = false; customAmounts[m.id] = '' })
        ;(r.shares || []).forEach(s => {
          participants[s.user_id] = true
          if (r.split_type === 'custom') customAmounts[s.user_id] = String(s.weight)
        })
      }
    }
  }
})
</script>

<style scoped>
.add-header { display: flex; align-items: center; gap: 0.5rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
.back-btn {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  color: var(--text); cursor: pointer;
}
.back-btn svg { width: 20px; height: 20px; }
.add-title { font-size: 1.3rem; font-weight: 700; }

.px { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

.type-toggle { display: flex; gap: 0.4rem; background: var(--surface); border-radius: 999px; padding: 4px; }
.type-btn {
  flex: 1; background: transparent; border: none; border-radius: 999px; color: var(--text2);
  cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 0.95rem; font-weight: 600; padding: 0.6rem; transition: all 0.2s;
}
.active-out { background: var(--red); color: var(--bg); }
.active-in { background: var(--green); color: var(--bg); }

.amount-hero { padding: 0.75rem 0 0.25rem; text-align: center; }
.amount-line { display: inline-flex; align-items: baseline; gap: 0.35rem; border-bottom: 2px solid var(--accent); padding: 0 0.5rem 0.4rem; cursor: text; }
.amount-line.neg { color: var(--red); }
.amount-line.pos { color: var(--green); }
.amount-sign { font-family: 'DM Mono', monospace; font-size: 2rem; font-weight: 500; }
.amount-input {
  width: 4.5ch; min-width: 2ch; max-width: 7ch; field-sizing: content; background: transparent;
  border: none; outline: none; text-align: center; color: var(--text); caret-color: var(--accent);
  font-family: 'DM Mono', monospace; font-weight: 700; font-size: 3.25rem; line-height: 1; padding: 0;
}
.amount-input::placeholder { color: var(--text2); opacity: 0.5; }
.amount-cur {
  align-self: center; background: linear-gradient(135deg, var(--accent), var(--accent2)); border: none;
  border-radius: 12px; box-shadow: 0 2px 10px var(--accent-glow); color: #f5ead8; cursor: pointer;
  font-family: 'DM Mono', monospace; font-size: 1.15rem; font-weight: 600; line-height: 1;
  min-width: 2.6rem; padding: 0.5rem 0.7rem; transition: transform 0.15s;
}
.amount-cur:active { transform: scale(0.94); }
.amount-hint, .amount-conv { font-size: 0.78rem; color: var(--text2); margin-top: 0.65rem; }

.desc-field { display: flex; align-items: center; gap: 0.75rem; background: var(--surface); border-radius: 999px; padding: 0.85rem 1.15rem; }
.desc-icon { width: 20px; height: 20px; color: var(--text2); flex-shrink: 0; }
.desc-input { flex: 1; background: transparent; border: none; color: var(--text); font-family: 'Figtree', sans-serif; font-size: 0.95rem; font-weight: 600; outline: none; width: 100%; }
.desc-input::placeholder { color: var(--text2); font-weight: 400; }

.field-label { font-size: 0.72rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.06em; padding: 0 2px; }

.cat-chips { display: flex; gap: 0.6rem; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; margin: 0 -1.25rem; padding-left: 1.25rem; padding-right: 1.25rem; }
.cat-chips::-webkit-scrollbar { display: none; }
.cat-chip { flex: none; width: 74px; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.8rem 0.4rem; border-radius: 20px; background: var(--surface); border: 2px solid transparent; cursor: pointer; transition: all 0.15s; }
.cat-chip.sel { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }
.cat-chip-name { font-size: 0.72rem; font-weight: 600; color: var(--text2); text-align: center; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.cat-chip.sel .cat-chip-name { color: var(--accent); }
.cat-empty { font-size: 0.85rem; color: var(--text2); padding: 0.5rem; }

.inp {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; color: var(--text);
  font-family: 'Figtree', sans-serif; font-size: 0.95rem; padding: 0.75rem 1rem; outline: none; width: 100%;
}
.inp:focus { border-color: var(--accent); }
.inp-select {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; color: var(--text);
  font-family: 'Figtree', sans-serif; font-size: 0.95rem; padding: 0.75rem 1rem; outline: none; min-width: 90px;
}
.day-row { display: flex; align-items: center; gap: 0.75rem; }
.day-hint { font-size: 0.75rem; color: var(--text2); flex: 1; line-height: 1.35; }

.dur-modes { display: flex; gap: 0.4rem; background: var(--surface2); border-radius: 12px; padding: 4px; }
.dur-btn { flex: 1; background: transparent; border: none; border-radius: 9px; color: var(--text2); font-family: 'Figtree', sans-serif; font-size: 0.82rem; font-weight: 600; padding: 0.55rem 0.3rem; cursor: pointer; transition: all 0.15s; }
.dur-btn.active { background: var(--accent); color: #f5ead8; }
.dur-detail { margin-top: -0.35rem; }

.next-hint { font-size: 0.78rem; color: var(--text2); }

.split-toggle { background: var(--surface2); border: 1px dashed var(--border); border-radius: 14px; color: var(--text2); cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 0.95rem; font-weight: 500; padding: 0.85rem; transition: all 0.2s; text-align: center; }
.split-toggle.active { border-color: var(--accent); color: var(--accent); background: rgba(198, 113, 57, 0.08); }

.split-panel { padding: 1.1rem; display: flex; flex-direction: column; gap: 0.85rem; }
.payer-field { position: relative; display: flex; align-items: center; gap: 0.7rem; background: rgba(198, 113, 57, 0.1); border: 1px solid rgba(198, 113, 57, 0.3); border-radius: 12px; padding: 0.65rem 0.85rem; }
.payer-icon { width: 22px; height: 22px; color: var(--accent); flex-shrink: 0; }
.payer-body { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.payer-label { font-size: 0.72rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.05em; }
.payer-name { font-size: 1rem; font-weight: 700; color: var(--accent); }
.payer-chevron { width: 18px; height: 18px; color: var(--accent); flex-shrink: 0; }
.payer-select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: none; cursor: pointer; appearance: none; -webkit-appearance: none; }
.payer-select option { background: var(--surface); color: var(--text); }
.split-mode { display: flex; gap: 0.4rem; background: var(--surface2); border-radius: 12px; padding: 4px; }
.sm-btn { flex: 1; background: transparent; border: none; border-radius: 9px; color: var(--text2); font-family: 'Figtree', sans-serif; font-size: 0.85rem; font-weight: 600; padding: 0.5rem; cursor: pointer; transition: all 0.15s; }
.sm-btn.active { background: var(--accent); color: #f5ead8; }
.members-list { display: flex; flex-direction: column; gap: 0.4rem; }
.member-row { display: flex; align-items: center; gap: 0.6rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 0.6rem 0.85rem; cursor: pointer; }
.member-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent); flex-shrink: 0; }
.member-name { flex: 1; font-size: 0.9rem; font-weight: 500; }
.member-amount { font-family: 'DM Mono', monospace; font-size: 0.85rem; color: var(--text2); }
.member-input { width: 90px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'DM Mono', monospace; font-size: 0.9rem; padding: 0.4rem 0.6rem; outline: none; text-align: right; }
.member-input:focus { border-color: var(--accent); }
.custom-sum { font-size: 0.8rem; color: var(--text2); text-align: right; padding-top: 2px; }
.custom-sum.bad { color: var(--red); }

.error-msg { background: rgba(176, 74, 44, 0.1); border: 1px solid rgba(176, 74, 44, 0.3); border-radius: 12px; color: var(--red); font-size: 0.85rem; padding: 0.7rem 1rem; }

.submit-btn { background: linear-gradient(135deg, var(--accent), var(--accent2)); border: none; border-radius: 16px; box-shadow: 0 4px 20px rgba(198, 113, 57, 0.3); color: #f5ead8; cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 1.05rem; font-weight: 700; padding: 1rem; transition: all 0.2s; }
.submit-btn:active:not(:disabled) { transform: scale(0.98); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.cancel-btn { background: transparent; border: 1px solid var(--border); border-radius: 16px; color: var(--text2); cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 0.95rem; padding: 0.85rem; }
.delete-btn { background: rgba(176, 74, 44, 0.1); border: 1px solid rgba(176, 74, 44, 0.3); border-radius: 16px; color: var(--red); cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 0.95rem; font-weight: 600; padding: 0.85rem; }

.toast { position: fixed; bottom: calc(var(--nav-h) + 1rem); left: 50%; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--border); border-radius: 100px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); color: var(--green); font-size: 0.9rem; font-weight: 600; padding: 0.7rem 1.5rem; white-space: nowrap; z-index: 300; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
