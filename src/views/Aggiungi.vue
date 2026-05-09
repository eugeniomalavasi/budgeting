<template>
  <div class="page">
    <div class="add-header">
      <h1 class="add-title">{{ editMode ? 'Modifica movimento' : 'Nuovo movimento' }}</h1>
    </div>

    <div class="px">
      <div class="type-toggle">
        <button :class="['type-btn', tipo==='uscita' && 'active-out']" @click="tipo='uscita'">📤 Uscita</button>
        <button :class="['type-btn', tipo==='entrata' && 'active-in']" @click="tipo='entrata'">📥 Entrata</button>
      </div>

      <div class="amount-display" :class="tipo==='uscita'?'neg':'pos'">
        <span class="amount-symbol">{{ tipo==='uscita'?'−':'+' }}</span>
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
            <option disabled value="">Mese...</option>
            <option v-for="m in state.months" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <button v-if="tipo==='uscita' && !editMode" class="split-toggle" :class="{ active: dividi }" @click="dividi=!dividi">
        🤝 {{ dividi ? 'Dividi con ' + nomeAltro + ' ✓' : 'Dividi con ' + nomeAltro }}
      </button>

      <div v-if="dividi && tipo==='uscita' && !editMode" class="split-panel card">
        <p class="split-title">Come dividere?</p>
        <div class="split-modes">
          <button :class="['split-mode-btn', splitType==='equal' && 'active']" @click="setSplit('equal')">
            <span class="sm-icon">⚖️</span>
            <span class="sm-label">50/50</span>
            <span class="sm-sub">{{ fmtFull(importoNum/2) }} ciascuno</span>
          </button>
          <button :class="['split-mode-btn', splitType==='mine' && 'active']" @click="setSplit('mine')">
            <span class="sm-icon">👤</span>
            <span class="sm-label">Tutto a me</span>
            <span class="sm-sub">{{ nomeAltro }} non paga</span>
          </button>
          <button :class="['split-mode-btn', splitType==='theirs' && 'active']" @click="setSplit('theirs')">
            <span class="sm-icon">👥</span>
            <span class="sm-label">Tutto a {{ nomeAltro }}</span>
            <span class="sm-sub">Tu non paghi</span>
          </button>
        </div>
        <div class="split-preview">
          <div class="split-person">
            <span class="sp-name">{{ state.profile?.name || 'Tu' }}</span>
            <span class="sp-amount neg amount">{{ fmtFull(shareIo) }}</span>
          </div>
          <div class="split-person">
            <span class="sp-name">{{ nomeAltro }}</span>
            <span class="sp-amount neg amount">{{ fmtFull(shareAltro) }}</span>
          </div>
        </div>
      </div>

      <div v-if="errore" class="error-msg">⚠️ {{ errore }}</div>

      <button class="submit-btn" @click="salva" :disabled="saving">
        {{ saving ? 'Salvataggio...' : editMode ? 'Aggiorna' : 'Salva' }}
      </button>
      <button v-if="editMode" class="cancel-btn" @click="annulla">Annulla</button>
    </div>

    <transition name="toast">
      <div v-if="toastVisible" class="toast">✅ {{ editMode ? 'Aggiornato!' : 'Movimento aggiunto!' }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { state, addTransaction, updateTransaction, addSharedExpense,
         loadMonths, loadSharedExpenses, CATEGORIE_USCITE, CATEGORIE_ENTRATE, CAT_EMOJI, fmtFull } from '../lib/store.js'

const route = useRoute()
const router = useRouter()

const tipo = ref('uscita')
const importoRaw = ref('0')
const descrizione = ref('')
const data = ref(new Date().toISOString().split('T')[0])
const categoria = ref('')
const meseId = ref(state.currentMonthId || '')
const dividi = ref(false)
const splitType = ref('equal')
const shareIo = ref(0)
const shareAltro = ref(0)
const errore = ref('')
const saving = ref(false)
const toastVisible = ref(false)
const editMode = ref(false)
const editId = ref(null)

const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫']
const importoNum = computed(() => parseFloat(importoRaw.value) || 0)
const nomeAltro = computed(() => state.otherProfile?.name || 'Altro')
const importoDisplay = computed(() => !importoRaw.value || importoRaw.value === '0' ? '0' : importoRaw.value)

function setSplit(mode) { splitType.value = mode; calcShares() }

function calcShares() {
  const tot = importoNum.value
  if (splitType.value === 'equal') {
    shareIo.value = Math.round(tot / 2 * 100) / 100
    shareAltro.value = Math.round((tot - shareIo.value) * 100) / 100
  } else if (splitType.value === 'mine') {
    shareIo.value = tot; shareAltro.value = 0
  } else {
    shareIo.value = 0; shareAltro.value = tot
  }
}

function keyPress(k) {
  if (k === '⌫') {
    importoRaw.value = importoRaw.value.length <= 1 ? '0' : importoRaw.value.slice(0, -1)
    calcShares(); return
  }
  if (k === '.' && importoRaw.value.includes('.')) return
  if (importoRaw.value === '0' && k !== '.') { importoRaw.value = k; calcShares(); return }
  const decimali = importoRaw.value.split('.')[1]
  if (decimali && decimali.length >= 2) return
  importoRaw.value += k
  calcShares()
}

function annulla() { router.back() }

// Fix: normalizza data da Supabase (può arrivare come "2026-04-01" o "2026-04-01T00:00:00")
function normalizzaData(d) {
  if (!d) return new Date().toISOString().split('T')[0]
  return String(d).split('T')[0]
}

// Fix: normalizza importo evitando floating point sporco (49.000000001)
function normalizzaImporto(v) {
  return String(Math.round(Math.abs(parseFloat(v)) * 100) / 100)
}

async function salva() {
  errore.value = ''
  const importo = importoNum.value
  if (!importo || importo <= 0) { errore.value = 'Importo non valido.'; return }
  if (!descrizione.value.trim()) { errore.value = 'Inserisci una descrizione.'; return }
  if (!categoria.value) { errore.value = 'Seleziona una categoria.'; return }
  if (!meseId.value) { errore.value = 'Seleziona il mese.'; return }

  saving.value = true
  try {
    const importoFinal = tipo.value === 'uscita' ? -importo : importo

    if (editMode.value) {
      await updateTransaction(editId.value, {
        data: data.value,
        importo: importoFinal,
        descrizione: descrizione.value.trim(),
        categoria: categoria.value,
        month_id: meseId.value,
      })
    } else {
      const tx = await addTransaction({
        month_id: meseId.value,
        data: data.value,
        importo: importoFinal,
        descrizione: descrizione.value.trim(),
        categoria: categoria.value,
      })
      if (dividi.value) {
        calcShares()
        const isEu = state.profile?.name === 'Eugenio'
        await addSharedExpense({
          transaction_id: tx.id,
          month_id: meseId.value,
          descrizione: descrizione.value.trim(),
          importo_totale: importo,
          split_type: splitType.value,
          share_eu: isEu ? shareIo.value : shareAltro.value,
          share_ma: isEu ? shareAltro.value : shareIo.value,
        })
      }
    }

    toastVisible.value = true
    setTimeout(() => {
      toastVisible.value = false
      if (editMode.value) router.back()
    }, 1200)

    if (!editMode.value) {
      importoRaw.value = '0'; descrizione.value = ''
      categoria.value = ''; dividi.value = false; splitType.value = 'equal'
    }
  } catch (e) {
    errore.value = 'Errore: ' + e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!state.months.length) await loadMonths()
  if (!meseId.value && state.months.length) meseId.value = state.months[state.months.length-1].id
  if (!state.sharedExpenses.length) await loadSharedExpenses()

  const txId = route.query.edit
  if (txId) {
    // Cerca prima nelle transazioni già caricate
    let tx = state.transactions.find(t => t.id === txId)
    // Se non trovata (navigazione diretta), carica dal mese corrente
    if (!tx && state.currentMonthId) {
      const { loadTransactions } = await import('../lib/store.js')
      await loadTransactions(state.currentMonthId)
      tx = state.transactions.find(t => t.id === txId)
    }
    if (tx) {
      editMode.value = true
      editId.value = tx.id
      tipo.value = Number(tx.importo) < 0 ? 'uscita' : 'entrata'
      importoRaw.value = normalizzaImporto(tx.importo)  // Fix floating point
      descrizione.value = tx.descrizione
      data.value = normalizzaData(tx.data)               // Fix formato data
      categoria.value = tx.categoria
      meseId.value = tx.month_id
      calcShares()
    }
  }
})
</script>

<style scoped>
.add-header { background:var(--surface); border-bottom:1px solid var(--border); padding:1rem 1.25rem; }
.add-title { font-size:1.3rem; font-weight:700; }
.px { padding:1.25rem; display:flex; flex-direction:column; gap:1rem; }
.type-toggle { display:flex; gap:0.5rem; }
.type-btn { flex:1; background:var(--surface); border:1px solid var(--border); border-radius:14px; color:var(--text2); cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:600; padding:0.7rem; transition:all 0.2s; }
.active-out { background:rgba(248,113,113,0.15); border-color:var(--red); color:var(--red); }
.active-in  { background:rgba(74,222,128,0.15); border-color:var(--green); color:var(--green); }
.amount-display { display:flex; align-items:baseline; justify-content:center; gap:0.25rem; padding:0.5rem; }
.amount-display.neg { color:var(--red); }
.amount-display.pos { color:var(--green); }
.amount-symbol { font-size:2rem; font-weight:300; }
.amount-val { font-size:3.5rem; font-weight:700; font-family:'DM Mono',monospace; line-height:1; }
.amount-eur { font-size:1.5rem; font-weight:500; }
.keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; }
.key { background:var(--surface); border:1px solid var(--border); border-radius:14px; color:var(--text); cursor:pointer; font-family:'DM Sans',sans-serif; font-size:1.3rem; font-weight:500; padding:1rem; transition:all 0.1s; user-select:none; }
.key:active { background:var(--surface2); transform:scale(0.95); }
.form-card { overflow:hidden; }
.form-field { display:flex; align-items:center; gap:0.85rem; padding:0.9rem 1.1rem; }
.field-icon { font-size:1.1rem; flex-shrink:0; }
.field-input { flex:1; background:transparent; border:none; color:var(--text); font-family:'DM Sans',sans-serif; font-size:0.95rem; outline:none; width:100%; }
.field-select { cursor:pointer; }
.field-select option { background:var(--surface); color:var(--text); }
.field-divider { height:1px; background:var(--border); margin:0 1.1rem; }
.split-toggle { background:var(--surface2); border:1px dashed var(--border); border-radius:14px; color:var(--text2); cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:500; padding:0.85rem; transition:all 0.2s; text-align:center; }
.split-toggle.active { border-color:var(--accent); color:var(--accent); background:rgba(108,99,255,0.1); }
.split-panel { padding:1.1rem; display:flex; flex-direction:column; gap:0.9rem; }
.split-title { font-size:0.78rem; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:0.05em; }
.split-modes { display:flex; gap:0.5rem; }
.split-mode-btn { flex:1; background:var(--surface2); border:1px solid var(--border); border-radius:14px; color:var(--text2); cursor:pointer; font-family:'DM Sans',sans-serif; padding:0.75rem 0.4rem; transition:all 0.2s; display:flex; flex-direction:column; align-items:center; gap:3px; }
.split-mode-btn.active { background:rgba(108,99,255,0.2); border-color:var(--accent); color:var(--accent); }
.sm-icon { font-size:1.2rem; }
.sm-label { font-size:0.8rem; font-weight:700; }
.sm-sub { font-size:0.65rem; color:var(--text2); text-align:center; line-height:1.2; }
.split-preview { display:flex; flex-direction:column; gap:0.5rem; }
.split-person { display:flex; justify-content:space-between; align-items:center; padding:0.65rem 0.85rem; background:var(--surface2); border-radius:12px; }
.sp-name { font-size:0.9rem; font-weight:500; }
.sp-amount { font-size:0.95rem; }
.error-msg { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3); border-radius:12px; color:var(--red); font-size:0.85rem; padding:0.7rem 1rem; }
.submit-btn { background:var(--accent); border:none; border-radius:16px; box-shadow:0 4px 20px rgba(108,99,255,0.4); color:white; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:1.05rem; font-weight:700; padding:1rem; transition:all 0.2s; }
.submit-btn:active:not(:disabled) { transform:scale(0.98); }
.submit-btn:disabled { opacity:0.6; cursor:not-allowed; }
.cancel-btn { background:transparent; border:1px solid var(--border); border-radius:16px; color:var(--text2); cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.95rem; padding:0.85rem; }
.toast { position:fixed; bottom:calc(var(--nav-h) + 1rem); left:50%; transform:translateX(-50%); background:var(--surface); border:1px solid var(--border); border-radius:100px; box-shadow:0 8px 32px rgba(0,0,0,0.4); color:var(--green); font-size:0.9rem; font-weight:600; padding:0.7rem 1.5rem; white-space:nowrap; z-index:300; }
.toast-enter-active,.toast-leave-active { transition:all 0.3s ease; }
.toast-enter-from,.toast-leave-to { opacity:0; transform:translateX(-50%) translateY(12px); }
</style>
