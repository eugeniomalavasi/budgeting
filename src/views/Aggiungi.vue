<template>
  <div class="page">
    <div class="add-header">
      <h1 class="add-title">Nuovo movimento</h1>
    </div>

    <div class="px">
      <!-- Toggle tipo -->
      <div class="type-toggle">
        <button :class="['type-btn', tipo === 'uscita' && 'active-out']" @click="tipo='uscita'">
          📤 Uscita
        </button>
        <button :class="['type-btn', tipo === 'entrata' && 'active-in']" @click="tipo='entrata'">
          📥 Entrata
        </button>
      </div>

      <!-- Amount display -->
      <div class="amount-display" :class="tipo === 'uscita' ? 'neg' : 'pos'">
        <span class="amount-symbol">{{ tipo === 'uscita' ? '−' : '+' }}</span>
        <span class="amount-val">{{ importoDisplay }}</span>
        <span class="amount-eur">€</span>
      </div>

      <!-- Keypad numerico -->
      <div class="keypad">
        <button v-for="k in keys" :key="k" class="key" @click="keyPress(k)">{{ k }}</button>
      </div>

      <!-- Form campi -->
      <div class="form-card card">
        <div class="form-field">
          <span class="field-icon">✏️</span>
          <input
            v-model="descrizione"
            class="field-input"
            placeholder="Descrizione..."
            maxlength="80"
          />
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
            <option disabled value="">Seleziona categoria...</option>
            <optgroup label="— Uscite —">
              <option v-for="c in CATEGORIE_USCITE" :key="c" :value="c">{{ CAT_EMOJI[c] }} {{ c }}</option>
            </optgroup>
            <optgroup label="— Entrate —">
              <option v-for="c in CATEGORIE_ENTRATE" :key="c" :value="c">{{ CAT_EMOJI[c] }} {{ c }}</option>
            </optgroup>
          </select>
        </div>
        <div class="field-divider"></div>
        <div class="form-field">
          <span class="field-icon">🗓</span>
          <select v-model="meseId" class="field-input field-select">
            <option disabled value="">Seleziona mese...</option>
            <option v-for="m in state.months" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <div v-if="errore" class="error-msg">⚠️ {{ errore }}</div>

      <button class="submit-btn" @click="salva" :disabled="saving">
        {{ saving ? 'Salvataggio...' : 'Salva' }}
      </button>
    </div>

    <!-- Toast successo -->
    <transition name="toast">
      <div v-if="toastVisible" class="toast">✅ Movimento aggiunto!</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { state, addTransaction, loadMonths, CATEGORIE_USCITE, CATEGORIE_ENTRATE, CAT_EMOJI } from '../lib/store.js'

const tipo = ref('uscita')
const importoRaw = ref('0')
const descrizione = ref('')
const data = ref(new Date().toISOString().split('T')[0])
const categoria = ref('')
const meseId = ref(state.currentMonthId || '')
const errore = ref('')
const saving = ref(false)
const toastVisible = ref(false)

const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫']

const importoDisplay = computed(() => {
  if (importoRaw.value === '0' || importoRaw.value === '') return '0'
  return importoRaw.value
})

function keyPress(k) {
  if (k === '⌫') {
    if (importoRaw.value.length <= 1) { importoRaw.value = '0'; return }
    importoRaw.value = importoRaw.value.slice(0, -1)
    return
  }
  if (k === '.' && importoRaw.value.includes('.')) return
  if (importoRaw.value === '0' && k !== '.') { importoRaw.value = k; return }
  if (importoRaw.value.includes('.')) {
    const decimali = importoRaw.value.split('.')[1]
    if (decimali.length >= 2) return
  }
  importoRaw.value += k
}

async function salva() {
  errore.value = ''
  const importo = parseFloat(importoRaw.value)
  if (!importo || importo <= 0) { errore.value = 'Importo non valido.'; return }
  if (!descrizione.value.trim()) { errore.value = 'Inserisci una descrizione.'; return }
  if (!categoria.value) { errore.value = 'Seleziona una categoria.'; return }
  if (!meseId.value) { errore.value = 'Seleziona il mese.'; return }

  saving.value = true
  try {
    await addTransaction({
      month_id: meseId.value,
      data: data.value,
      importo: tipo.value === 'uscita' ? -importo : importo,
      descrizione: descrizione.value.trim(),
      categoria: categoria.value,
    })
    // Reset
    importoRaw.value = '0'
    descrizione.value = ''
    categoria.value = ''
    toastVisible.value = true
    setTimeout(() => { toastVisible.value = false }, 2500)
  } catch (e) {
    errore.value = 'Errore nel salvataggio: ' + e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
  if (!meseId.value && state.months.length) {
    meseId.value = state.months[state.months.length - 1].id
  }
})
</script>

<style scoped>
.add-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1rem 1.25rem;
}
.add-title { font-size: 1.3rem; font-weight: 700; }

.px { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

/* Toggle */
.type-toggle { display: flex; gap: 0.5rem; }
.type-btn {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text2);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.7rem;
  transition: all 0.2s;
}
.active-out { background: rgba(248,113,113,0.15); border-color: var(--red); color: var(--red); }
.active-in  { background: rgba(74,222,128,0.15); border-color: var(--green); color: var(--green); }

/* Amount display */
.amount-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem;
}
.amount-display.neg { color: var(--red); }
.amount-display.pos { color: var(--green); }
.amount-symbol { font-size: 2rem; font-weight: 300; }
.amount-val { font-size: 3.5rem; font-weight: 700; font-family: 'DM Mono', monospace; line-height: 1; }
.amount-eur { font-size: 1.5rem; font-weight: 500; }

/* Keypad */
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
  font-family: 'DM Sans', sans-serif;
  font-size: 1.3rem;
  font-weight: 500;
  padding: 1rem;
  transition: all 0.1s;
}
.key:active { background: var(--surface2); transform: scale(0.95); }

/* Form card */
.form-card { overflow: hidden; }
.form-field { display: flex; align-items: center; gap: 0.85rem; padding: 0.9rem 1.1rem; }
.field-icon { font-size: 1.1rem; flex-shrink: 0; }
.field-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.95rem;
  outline: none;
  width: 100%;
}
.field-select { cursor: pointer; }
.field-select option { background: var(--surface); color: var(--text); }
.field-divider { height: 1px; background: var(--border); margin: 0 1.1rem; }

.error-msg {
  background: rgba(248,113,113,0.1);
  border: 1px solid rgba(248,113,113,0.3);
  border-radius: 12px;
  color: var(--red);
  font-size: 0.85rem;
  padding: 0.7rem 1rem;
}

.submit-btn {
  background: var(--accent);
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(108,99,255,0.4);
  color: white;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  padding: 1rem;
  transition: all 0.2s;
}
.submit-btn:active:not(:disabled) { transform: scale(0.98); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Toast */
.toast {
  position: fixed;
  bottom: calc(var(--nav-h) + 1rem);
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  color: var(--green);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.7rem 1.5rem;
  white-space: nowrap;
  z-index: 300;
}
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
