<template>
  <div class="page">
    <div class="rec-header">
      <button class="back-btn" @click="router.push('/profilo')" aria-label="Indietro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1 class="rec-title">Spese ricorrenti</h1>
    </div>

    <div class="px">
      <!-- Notifica ultima rata / terminate -->
      <div v-if="alerts.length" class="alert-card">
        <span class="alert-emoji">🔔</span>
        <div class="alert-body">
          <p class="alert-title">{{ alerts.length === 1 ? 'Una spesa ricorrente sta per finire' : `${alerts.length} spese ricorrenti stanno per finire` }}</p>
          <p class="alert-sub">
            <template v-for="(a, i) in alerts" :key="a.id">
              <b>{{ a.descrizione }}</b> ({{ remaining(a) === 0 ? 'terminata' : 'ultima rata' }}){{ i < alerts.length - 1 ? ', ' : '' }}
            </template>
          </p>
        </div>
      </div>

      <p class="rec-hint">Ogni mese, nel giorno scelto, viene creato automaticamente il movimento — anche se non apri l'app.</p>

      <!-- Lista regole -->
      <div v-if="state.recurringRules.length" class="rec-list">
        <button v-for="r in state.recurringRules" :key="r.id" class="rec-row card" @click="router.push(`/ricorrenti/${r.id}`)">
          <div class="rec-ico"><CatIcon :categoria="r.categoria" /></div>
          <div class="rec-main">
            <p class="rec-desc">{{ r.descrizione }}</p>
            <p class="rec-meta">
              Il {{ r.day_of_month }} di ogni mese · {{ durataLabel(r) }}
              <span v-if="r.is_split"> · 🤝 divisa</span>
            </p>
          </div>
          <div class="rec-right">
            <span class="rec-amount" :class="r.tipo === 'uscita' ? 'neg' : 'pos'">
              {{ r.tipo === 'uscita' ? '−' : '+' }}{{ fmtFull(r.importo_originale, r.valuta_originale) }}
            </span>
            <span v-if="remaining(r) !== null" class="rec-badge" :class="{ warn: remaining(r) <= 1 }">
              {{ r.generated_count }}/{{ r.total_installments }}
            </span>
            <span v-else class="rec-badge">∞</span>
          </div>
        </button>
      </div>
      <div v-else class="rec-empty">
        <p class="rec-empty-emoji">🔁</p>
        <p>Nessuna spesa ricorrente.</p>
        <p class="rec-empty-sub">Aggiungi rate, abbonamenti o entrate fisse che si ripetono ogni mese.</p>
      </div>

      <button class="rec-add" @click="router.push('/ricorrenti/nuovo')">+ Nuova spesa ricorrente</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { state, loadRecurringRules, remainingInstallments, recurringAlerts, fmtFull } from '../lib/store.js'
import CatIcon from '../components/CatIcon.vue'

const router = useRouter()
const alerts = recurringAlerts
const remaining = remainingInstallments

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
function monthLabel(id) {
  if (!id) return ''
  const [y, m] = id.split('-')
  return `${MESI[Number(m) - 1]} ${y}`
}
function durataLabel(r) {
  if (r.total_installments != null) return `${r.total_installments} rate`
  if (r.end_month) return `fino a ${monthLabel(r.end_month)}`
  return 'per sempre'
}

onMounted(loadRecurringRules)
</script>

<style scoped>
.rec-header { display: flex; align-items: center; gap: 0.5rem; padding: 1.25rem 1.25rem 0.75rem; }
.back-btn {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  color: var(--text); cursor: pointer;
}
.back-btn svg { width: 20px; height: 20px; }
.rec-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }

.px { padding: 0 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

.alert-card {
  display: flex; gap: 0.75rem; align-items: flex-start;
  background: rgba(198, 113, 57, 0.1); border: 1px solid rgba(198, 113, 57, 0.35);
  border-radius: 16px; padding: 0.9rem 1rem;
}
.alert-emoji { font-size: 1.3rem; line-height: 1.2; }
.alert-title { font-size: 0.92rem; font-weight: 700; color: var(--accent); }
.alert-sub { font-size: 0.82rem; color: var(--text2); margin-top: 2px; line-height: 1.4; }

.rec-hint { font-size: 0.78rem; color: var(--text2); line-height: 1.4; }

.rec-list { display: flex; flex-direction: column; gap: 0.6rem; }
.rec-row {
  display: flex; align-items: center; gap: 0.85rem; padding: 0.9rem 1rem;
  cursor: pointer; text-align: left; border: 1px solid transparent; width: 100%;
}
.rec-row:active { transform: scale(0.99); }
.rec-ico { flex: 0 0 auto; }
.rec-main { flex: 1; min-width: 0; }
.rec-desc { font-size: 0.95rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-meta { font-size: 0.75rem; color: var(--text2); margin-top: 2px; }
.rec-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: 0 0 auto; }
.rec-amount { font-family: 'DM Mono', monospace; font-weight: 600; font-size: 0.95rem; }
.rec-amount.neg { color: var(--red); }
.rec-amount.pos { color: var(--green); }
.rec-badge {
  font-size: 0.68rem; font-weight: 700; color: var(--text2);
  background: var(--surface2); border-radius: 100px; padding: 2px 8px;
}
.rec-badge.warn { background: rgba(198, 113, 57, 0.18); color: var(--accent); }

.rec-empty { text-align: center; color: var(--text2); padding: 2rem 1rem; }
.rec-empty-emoji { font-size: 2.5rem; margin-bottom: 0.5rem; }
.rec-empty-sub { font-size: 0.8rem; margin-top: 0.35rem; }

.rec-add {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border: none; border-radius: 16px; box-shadow: 0 4px 20px rgba(198, 113, 57, 0.3);
  color: #f5ead8; cursor: pointer; font-family: 'Figtree', sans-serif;
  font-size: 1rem; font-weight: 700; padding: 1rem; margin-top: 0.25rem;
}
.rec-add:active { transform: scale(0.98); }
</style>
