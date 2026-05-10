<template>
  <div class="page">
    <div class="div-header">
      <h1 class="div-title">Conti con {{ nomeAltro }}</h1>
    </div>

    <div class="px">
      <!-- Saldo netto -->
      <div class="saldo-card card" :class="saldoCondiviso >= 0 ? 'card-green' : 'card-red'">
        <div class="saldo-icon">{{ saldoCondiviso >= 0 ? '🎉' : '😅' }}</div>
        <div v-if="saldoCondiviso > 0" class="saldo-text">
          <span class="saldo-nome">{{ nomeAltro }}</span>
          <span class="saldo-desc">ti deve</span>
          <span class="saldo-amount pos amount">{{ fmtFull(saldoCondiviso) }}</span>
        </div>
        <div v-else-if="saldoCondiviso < 0" class="saldo-text">
          <span class="saldo-desc">Devi a</span>
          <span class="saldo-nome">{{ nomeAltro }}</span>
          <span class="saldo-amount neg amount">{{ fmtFull(Math.abs(saldoCondiviso)) }}</span>
        </div>
        <div v-else class="saldo-text">
          <span class="saldo-desc">Siete in pari! 🤝</span>
        </div>

        <button v-if="saldoCondiviso !== 0 && unsettled.length" class="settle-btn" @click="pareggia">
          Segna tutto come saldato
        </button>
      </div>

      <!-- Lista spese non saldate -->
      <div v-if="unsettled.length">
        <p class="section-label">Da saldare ({{ unsettled.length }})</p>
        <div class="card tx-list">
          <div v-for="s in unsettled" :key="s.id" class="shared-row" @click="selected=s">
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
              <!-- Se ho pagato io: mostro quanto mi deve l'altro (+quotaAltro) -->
              <!-- Se ha pagato l'altro: mostro quanto devo io (-quotaMia) -->
              <span class="sr-quota" :class="s.paid_by === state.user?.id ? 'pos' : 'neg'">
                {{ s.paid_by === state.user?.id ? '+' : '-' }}{{ fmtFull(s.paid_by === state.user?.id ? quotaAltro(s) : quotaMia(s)) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista spese saldate -->
      <div v-if="settled.length">
        <p class="section-label">Saldati ({{ settled.length }})</p>
        <div class="card tx-list">
          <div v-for="s in settled.slice(0,10)" :key="s.id" class="shared-row settled">
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

    <!-- Bottom sheet dettaglio -->
    <transition name="sheet">
      <div v-if="selected" class="sheet-overlay" @click.self="selected=null">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <p class="sheet-desc">{{ selected.descrizione }}</p>
          <p class="sheet-amount amount" :class="selected.paid_by===state.user?.id?'pos':'neg'">
            {{ fmtFull(selected.importo_totale) }}
          </p>
          <div class="sheet-details">
            <div class="sheet-row"><span>Pagato da</span><span>{{ selected.paid_by===state.user?.id ? (state.profile?.name||'Tu') : nomeAltro }}</span></div>
            <div class="sheet-row"><span>Quota {{ state.profile?.name||'Tu' }}</span><span class="neg amount">{{ fmtFull(quotaMia(selected)) }}</span></div>
            <div class="sheet-row"><span>Quota {{ nomeAltro }}</span><span class="neg amount">{{ fmtFull(quotaAltro(selected)) }}</span></div>
            <div class="sheet-row"><span>Divisione</span><span>{{ splitLabel(selected) }}</span></div>
            <div class="sheet-row"><span>Data</span><span>{{ formatData(selected.created_at) }}</span></div>
          </div>
          <button v-if="!selected.settled" class="settle-single-btn" @click="pareggiaSingolo(selected)">
            ✓ Segna come saldato
          </button>
          <button class="close-btn" @click="selected=null">Chiudi</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { state, saldoCondiviso, loadSharedExpenses, settleExpense, settleAll, fmtFull } from '../lib/store.js'

const selected = ref(null)

const nomeAltro = computed(() => state.otherProfile?.name || 'Altro')

const unsettled = computed(() => state.sharedExpenses.filter(s => !s.settled))
const settled   = computed(() => state.sharedExpenses.filter(s => s.settled))

function quotaMia(s) {
  const isEu = state.profile?.name === 'Eugenio'
  return isEu ? Number(s.share_eu) : Number(s.share_ma)
}

function quotaAltro(s) {
  const isEu = state.profile?.name === 'Eugenio'
  return isEu ? Number(s.share_ma) : Number(s.share_eu)
}

function splitLabel(s) {
  if (s.split_type === 'equal') return '50/50'
  if (s.split_type === 'full') return 'Tutto a chi ha pagato'
  if (s.split_type === 'percent') {
    const isEu = state.profile?.name === 'Eugenio'
    const pct = Math.round((isEu ? s.share_eu : s.share_ma) / s.importo_totale * 100)
    return `${pct}% / ${100-pct}%`
  }
  return 'Importo fisso'
}

function formatData(d) {
  return new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'short', year:'2-digit' })
}

async function pareggia() {
  await settleAll()
}

async function pareggiaSingolo(s) {
  await settleExpense(s.id)
  selected.value = null
}

onMounted(async () => {
  await loadSharedExpenses()
})
</script>

<style scoped>
.div-header { background:var(--surface); border-bottom:1px solid var(--border); padding:1rem 1.25rem; }
.div-title { font-size:1.3rem; font-weight:700; }

.px { padding:1.25rem; display:flex; flex-direction:column; gap:1rem; }

.saldo-card { padding:1.5rem; display:flex; flex-direction:column; align-items:center; gap:0.75rem; text-align:center; }
.card-green { border-color:rgba(74,222,128,0.3); }
.card-red   { border-color:rgba(248,113,113,0.3); }
.saldo-icon { font-size:2rem; }
.saldo-text { display:flex; flex-direction:column; align-items:center; gap:4px; }
.saldo-nome { font-size:1.1rem; font-weight:700; }
.saldo-desc { font-size:0.85rem; color:var(--text2); }
.saldo-amount { font-size:2rem; font-weight:700; font-family:'DM Mono',monospace; }

.settle-btn { background:var(--accent); border:none; border-radius:12px; color:white; cursor:pointer; font-family:'Lexend',sans-serif; font-size:0.9rem; font-weight:600; padding:0.65rem 1.25rem; transition:all 0.2s; margin-top:0.25rem; }

.section-label { font-size:0.78rem; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:0.06em; padding:0 2px; }

.tx-list { overflow:hidden; }
.shared-row { display:flex; justify-content:space-between; align-items:flex-start; padding:0.9rem 1.1rem; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.15s; gap:1rem; }
.shared-row:last-child { border-bottom:none; }
.shared-row:active { background:var(--surface2); }
.shared-row.settled { opacity:0.5; cursor:default; }

.sr-left { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.sr-desc { font-size:0.9rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sr-meta { font-size:0.74rem; color:var(--text2); }
.sr-split { font-size:0.72rem; color:var(--accent); font-weight:500; margin-top:2px; }

.sr-right { display:flex; flex-direction:column; align-items:flex-end; gap:3px; flex-shrink:0; }
.sr-total { font-size:0.82rem; color:var(--text2); font-family:'DM Mono',monospace; }
.sr-quota { font-size:1rem; font-weight:700; font-family:'DM Mono',monospace; }
.settled-badge { font-size:0.72rem; color:var(--green); font-weight:600; }

.empty-state { display:flex; flex-direction:column; align-items:center; gap:0.5rem; padding:3rem; color:var(--text2); text-align:center; }
.empty-state span { font-size:2rem; }
.empty-sub { font-size:0.8rem; opacity:0.7; }

/* Sheet */
.sheet-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:200; display:flex; align-items:flex-end; justify-content:center; }
.sheet { background:var(--surface); border-radius:24px 24px 0 0; border-top:1px solid var(--border); padding:1rem 1.5rem 2rem; width:100%; max-width:480px; display:flex; flex-direction:column; align-items:center; gap:0.75rem; }
.sheet-handle { width:36px; height:4px; background:var(--border); border-radius:100px; margin-bottom:0.5rem; }
.sheet-desc { font-size:1.1rem; font-weight:600; }
.sheet-amount { font-size:2rem; font-weight:700; font-family:'DM Mono',monospace; }
.sheet-details { width:100%; background:var(--surface2); border-radius:14px; overflow:hidden; }
.sheet-row { display:flex; justify-content:space-between; padding:0.75rem 1rem; border-bottom:1px solid var(--border); font-size:0.88rem; }
.sheet-row:last-child { border-bottom:none; }
.sheet-row span:first-child { color:var(--text2); }
.settle-single-btn { width:100%; background:rgba(74,222,128,0.15); border:1px solid rgba(74,222,128,0.3); border-radius:14px; color:var(--green); font-family:'Lexend',sans-serif; font-size:0.95rem; font-weight:600; padding:0.8rem; cursor:pointer; }
.close-btn { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:14px; color:var(--text2); font-family:'Lexend',sans-serif; font-size:0.95rem; padding:0.8rem; cursor:pointer; }
.sheet-enter-active,.sheet-leave-active { transition:all 0.25s ease; }
.sheet-enter-from .sheet,.sheet-leave-to .sheet { transform:translateY(100%); }
.sheet-enter-from,.sheet-leave-to { opacity:0; }
</style>
