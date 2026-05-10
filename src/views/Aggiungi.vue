<template>
  <div class="page">
    <div class="add-header">
      <h1 class="add-title">{{ editMode ? 'Modifica movimento' : 'Nuovo movimento' }}</h1>
    </div>

    <div class="px">
      <div class="type-toggle">
        <button :class="['type-btn', tipo==='uscita'&&'active-out']" @click="tipo='uscita'">📤 Uscita</button>
        <button :class="['type-btn', tipo==='entrata'&&'active-in']" @click="tipo='entrata'">📥 Entrata</button>
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

      <!-- Toggle dividi -->
      <button v-if="tipo==='uscita' && !editMode" class="split-toggle" :class="{ active: dividi }" @click="dividi=!dividi">
        🤝 {{ dividi ? 'Spesa condivisa ✓' : 'Dividi con ' + nomeAltro }}
      </button>

      <!-- 4 opzioni esplicite -->
      <div v-if="dividi && tipo==='uscita' && !editMode" class="split-panel card">
        <p class="split-title">Chi ha pagato e come dividere?</p>
        <div class="split-options">

          <button :class="['split-opt', splitMode==='io_meta' && 'active']" @click="setSplitMode('io_meta')">
            <div class="so-top">
              <span class="so-payer">{{ nomeIo }} paga</span>
              <span class="so-badge">50/50</span>
            </div>
            <div class="so-sub">Ciascuno deve metà</div>
            <div class="so-amounts" v-if="importoNum > 0">
              <span>{{ nomeIo }} {{ fmtFull(-importoNum/2) }}</span>
              <span>{{ nomeAltro }} {{ fmtFull(-importoNum/2) }}</span>
            </div>
          </button>

          <button :class="['split-opt', splitMode==='altro_meta' && 'active']" @click="setSplitMode('altro_meta')">
            <div class="so-top">
              <span class="so-payer">{{ nomeAltro }} paga</span>
              <span class="so-badge">50/50</span>
            </div>
            <div class="so-sub">Ciascuno deve metà</div>
            <div class="so-amounts" v-if="importoNum > 0">
              <span>{{ nomeIo }} {{ fmtFull(-importoNum/2) }}</span>
              <span>{{ nomeAltro }} {{ fmtFull(-importoNum/2) }}</span>
            </div>
          </button>

          <button :class="['split-opt', splitMode==='io_tutto' && 'active']" @click="setSplitMode('io_tutto')">
            <div class="so-top">
              <span class="so-payer">{{ nomeIo }} paga</span>
              <span class="so-badge so-badge-red">{{ nomeAltro }} deve tutto</span>
            </div>
            <div class="so-sub">{{ nomeAltro }} rimborsa {{ nomeIo }}</div>
            <div class="so-amounts" v-if="importoNum > 0">
              <span class="pos">{{ nomeIo }} +{{ fmtFull(importoNum) }}</span>
              <span class="neg">{{ nomeAltro }} {{ fmtFull(-importoNum) }}</span>
            </div>
          </button>

          <button :class="['split-opt', splitMode==='altro_tutto' && 'active']" @click="setSplitMode('altro_tutto')">
            <div class="so-top">
              <span class="so-payer">{{ nomeAltro }} paga</span>
              <span class="so-badge so-badge-red">{{ nomeIo }} deve tutto</span>
            </div>
            <div class="so-sub">{{ nomeIo }} rimborsa {{ nomeAltro }}</div>
            <div class="so-amounts" v-if="importoNum > 0">
              <span class="neg">{{ nomeIo }} {{ fmtFull(-importoNum) }}</span>
              <span class="pos">{{ nomeAltro }} +{{ fmtFull(importoNum) }}</span>
            </div>
          </button>

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
const splitMode = ref('io_meta') // eu_meta | ma_meta | eu_tutto | ma_tutto
const errore = ref('')
const saving = ref(false)
const toastVisible = ref(false)
const editMode = ref(false)
const editId = ref(null)

const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫']

const importoNum = computed(() => parseFloat(importoRaw.value) || 0)
const importoDisplay = computed(() => !importoRaw.value || importoRaw.value === '0' ? '0' : importoRaw.value)

// Chi sono io e chi è l'altro — funziona per entrambi gli utenti
const nomeIo    = computed(() => state.profile?.name || 'Io')
const nomeAltro = computed(() => state.otherProfile?.name || 'Altro')
const idIo      = computed(() => state.user?.id)
const idAltro   = computed(() => state.otherProfile?.id)

function setSplitMode(mode) { splitMode.value = mode }

function keyPress(k) {
  if (k === '⌫') { importoRaw.value = importoRaw.value.length <= 1 ? '0' : importoRaw.value.slice(0,-1); return }
  if (k === '.' && importoRaw.value.includes('.')) return
  if (importoRaw.value === '0' && k !== '.') { importoRaw.value = k; return }
  const dec = importoRaw.value.split('.')[1]
  if (dec && dec.length >= 2) return
  importoRaw.value += k
}

function annulla() { router.back() }

function normalizzaData(d) { return d ? String(d).split('T')[0] : new Date().toISOString().split('T')[0] }
function normalizzaImporto(v) { return String(Math.round(Math.abs(parseFloat(v)) * 100) / 100) }

// Calcola share_eu, share_ma e paid_by in base alla modalità scelta
// io_meta  = ho pagato io, dividiamo a metà
// altro_meta = ha pagato l'altro, dividiamo a metà
// io_tutto = ho pagato io, l'altro deve tutto
// altro_tutto = ha pagato l'altro, io devo tutto
function calcolaShares() {
  const tot  = importoNum.value
  const half = Math.round(tot / 2 * 100) / 100
  const half2 = Math.round((tot - half) * 100) / 100
  const isEu = state.profile?.name === 'Eugenio'

  // share_eu e share_ma sono sempre relativi a Eugenio/Margherita
  // indipendentemente da chi è loggato
  switch (splitMode.value) {
    case 'io_meta':
      return {
        share_eu: isEu ? half : half2,
        share_ma: isEu ? half2 : half,
        paid_by: idIo.value
      }
    case 'altro_meta':
      return {
        share_eu: isEu ? half : half2,
        share_ma: isEu ? half2 : half,
        paid_by: idAltro.value
      }
    case 'io_tutto':
      // L'altro deve tutto a me
      return {
        share_eu: isEu ? 0 : tot,
        share_ma: isEu ? tot : 0,
        paid_by: idIo.value
      }
    case 'altro_tutto':
      // Io devo tutto all'altro
      return {
        share_eu: isEu ? tot : 0,
        share_ma: isEu ? 0 : tot,
        paid_by: idAltro.value
      }
    default:
      return { share_eu: isEu ? half : half2, share_ma: isEu ? half2 : half, paid_by: idIo.value }
  }
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
        data: data.value, importo: importoFinal,
        descrizione: descrizione.value.trim(),
        categoria: categoria.value, month_id: meseId.value,
      })
    } else {
      const tx = await addTransaction({
        month_id: meseId.value, data: data.value,
        importo: importoFinal, descrizione: descrizione.value.trim(), categoria: categoria.value,
      })
      if (dividi.value) {
        const { share_eu, share_ma, paid_by } = calcolaShares()
        await addSharedExpense({
          transaction_id: tx.id, month_id: meseId.value,
          descrizione: descrizione.value.trim(), importo_totale: importo,
          split_type: splitMode.value, share_eu, share_ma, paid_by,
        })
      }
    }

    toastVisible.value = true
    setTimeout(() => { toastVisible.value = false; if (editMode.value) router.back() }, 1200)

    if (!editMode.value) {
      importoRaw.value = '0'; descrizione.value = ''
      categoria.value = ''; dividi.value = false; splitMode.value = 'eu_meta'
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
    let tx = state.transactions.find(t => t.id === txId)
    if (tx) {
      editMode.value = true; editId.value = tx.id
      tipo.value = Number(tx.importo) < 0 ? 'uscita' : 'entrata'
      importoRaw.value = normalizzaImporto(tx.importo)
      descrizione.value = tx.descrizione
      data.value = normalizzaData(tx.data)
      categoria.value = tx.categoria; meseId.value = tx.month_id
    }
  }
})
</script>

<style scoped>
.add-header { background:var(--surface); border-bottom:1px solid var(--border); padding:1rem 1.25rem; }
.add-title { font-size:1.3rem; font-weight:700; }
.px { padding:1.25rem; display:flex; flex-direction:column; gap:1rem; }

.type-toggle { display:flex; gap:0.5rem; }
.type-btn { flex:1; background:var(--surface); border:1px solid var(--border); border-radius:14px; color:var(--text2); cursor:pointer; font-family:'Lexend',sans-serif; font-size:0.95rem; font-weight:600; padding:0.7rem; transition:all 0.2s; }
.active-out { background:rgba(255,95,87,0.12); border-color:var(--red); color:var(--red); }
.active-in  { background:rgba(48,209,88,0.12); border-color:var(--green); color:var(--green); }

.amount-display { display:flex; align-items:baseline; justify-content:center; gap:0.25rem; padding:0.5rem; }
.amount-display.neg { color:var(--red); }
.amount-display.pos { color:var(--green); }
.amount-symbol { font-size:2rem; font-weight:300; }
.amount-val { font-size:3.5rem; font-weight:700; font-family:'DM Mono',monospace; line-height:1; }
.amount-eur { font-size:1.5rem; font-weight:500; }

.keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; }
.key { background:var(--surface); border:1px solid var(--border); border-radius:14px; color:var(--text); cursor:pointer; font-family:'Lexend',sans-serif; font-size:1.3rem; font-weight:500; padding:1rem; transition:all 0.1s; user-select:none; }
.key:active { background:var(--surface2); transform:scale(0.95); }

.form-card { overflow:hidden; }
.form-field { display:flex; align-items:center; gap:0.85rem; padding:0.9rem 1.1rem; }
.field-icon { font-size:1.1rem; flex-shrink:0; }
.field-input { flex:1; background:transparent; border:none; color:var(--text); font-family:'Lexend',sans-serif; font-size:0.95rem; outline:none; width:100%; }
.field-select { cursor:pointer; }
.field-select option, .field-select optgroup { background:var(--surface); color:var(--text); }
.field-divider { height:1px; background:var(--border); margin:0 1.1rem; }

.split-toggle { background:var(--surface2); border:1px dashed var(--border); border-radius:14px; color:var(--text2); cursor:pointer; font-family:'Lexend',sans-serif; font-size:0.95rem; font-weight:500; padding:0.85rem; transition:all 0.2s; text-align:center; }
.split-toggle.active { border-color:var(--accent); color:var(--accent); background:rgba(245,166,35,0.08); }

/* Split panel con 4 opzioni */
.split-panel { padding:1.1rem; display:flex; flex-direction:column; gap:0.85rem; }
.split-title { font-size:0.72rem; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:0.08em; }

.split-options { display:flex; flex-direction:column; gap:0.5rem; }

.split-opt {
  background:var(--surface2);
  border:1px solid var(--border);
  border-radius:14px;
  color:var(--text);
  cursor:pointer;
  font-family:'Lexend',sans-serif;
  padding:0.85rem 1rem;
  text-align:left;
  transition:all 0.2s;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.split-opt.active {
  background:rgba(245,166,35,0.1);
  border-color:var(--accent);
}
.split-opt:active { transform:scale(0.99); }

.so-top { display:flex; align-items:center; gap:0.5rem; }
.so-payer { font-size:0.9rem; font-weight:600; }
.so-badge {
  font-size:0.7rem; font-weight:600; padding:2px 8px;
  border-radius:100px; background:rgba(245,166,35,0.2); color:var(--accent);
}
.so-badge-red { background:rgba(255,95,87,0.15); color:var(--red); }
.so-sub { font-size:0.78rem; color:var(--text2); }
.so-amounts { display:flex; gap:1rem; font-size:0.78rem; font-family:'DM Mono',monospace; margin-top:2px; }
.pos { color:var(--green); }
.neg { color:var(--red); }

.error-msg { background:rgba(255,95,87,0.1); border:1px solid rgba(255,95,87,0.3); border-radius:12px; color:var(--red); font-size:0.85rem; padding:0.7rem 1rem; }

.submit-btn { background:linear-gradient(135deg,var(--accent),var(--accent2)); border:none; border-radius:16px; box-shadow:0 4px 20px rgba(245,166,35,0.3); color:#0e0e0e; cursor:pointer; font-family:'Lexend',sans-serif; font-size:1.05rem; font-weight:700; padding:1rem; transition:all 0.2s; }
.submit-btn:active:not(:disabled) { transform:scale(0.98); }
.submit-btn:disabled { opacity:0.6; cursor:not-allowed; }
.cancel-btn { background:transparent; border:1px solid var(--border); border-radius:16px; color:var(--text2); cursor:pointer; font-family:'Lexend',sans-serif; font-size:0.95rem; padding:0.85rem; }

.toast { position:fixed; bottom:calc(var(--nav-h) + 1rem); left:50%; transform:translateX(-50%); background:var(--surface); border:1px solid var(--border); border-radius:100px; box-shadow:0 8px 32px rgba(0,0,0,0.4); color:var(--green); font-size:0.9rem; font-weight:600; padding:0.7rem 1.5rem; white-space:nowrap; z-index:300; }
.toast-enter-active,.toast-leave-active { transition:all 0.3s ease; }
.toast-enter-from,.toast-leave-to { opacity:0; transform:translateX(-50%) translateY(12px); }
</style>