import { reactive, computed } from 'vue'
import { supabase } from './supabase.js'

export const state = reactive({
  user: null,
  profile: null,
  otherProfile: null,
  months: [],
  transactions: [],
  sharedExpenses: [],
  currentMonthId: null,
  loading: false,
})

export const currentMonth = computed(() =>
  state.months.find(m => m.id === state.currentMonthId) || state.months[state.months.length - 1]
)

export const currentTransactions = computed(() =>
  state.transactions
    .filter(t => t.month_id === state.currentMonthId)
    .sort((a, b) => new Date(b.data) - new Date(a.data))
)

// Saldo condiviso netto: positivo = l'altro ci deve, negativo = noi dobbiamo
export const saldoCondiviso = computed(() => {
  let totale = 0
  state.sharedExpenses
    .filter(s => !s.settled)
    .forEach(s => {
      const isEu = state.profile?.name === 'Eugenio'
      if (s.paid_by === state.user?.id) {
        // Ho pagato io → l'altro mi deve la sua quota
        totale += isEu ? Number(s.share_ma) : Number(s.share_eu)
      } else {
        // Ha pagato l'altro → io devo la mia quota
        totale -= isEu ? Number(s.share_eu) : Number(s.share_ma)
      }
    })
  return totale
})

export const CATEGORIE_USCITE = [
  'Alimenti','Animali domestici','Altro','Bollette','Casa',
  'Debiti','Regali','Ristoranti','Salute/spese mediche',
  'Spese personali','Svago','Trasporti','Vestiario','Viaggi'
]

export const CATEGORIE_ENTRATE = [
  'Busta paga','Bonus','Interessi','Risparmi','Altro'
]

export const CAT_COLORS = {
  'Alimenti':'#4ade80','Bollette':'#818cf8','Trasporti':'#fb923c',
  'Salute/spese mediche':'#f472b6','Svago':'#c084fc','Ristoranti':'#fdba74',
  'Regali':'#34d399','Vestiario':'#22d3ee','Casa':'#a3e635',
  'Viaggi':'#e879f9','Busta paga':'#4ade80','Interessi':'#60a5fa',
  'Bonus':'#facc15','Altro':'#94a3b8','Spese personali':'#64748b',
  'Animali domestici':'#fbbf24','Debiti':'#f87171','Risparmi':'#34d399',
}

export const CAT_EMOJI = {
  'Alimenti':'🛒','Bollette':'💡','Trasporti':'🚗',
  'Salute/spese mediche':'🏥','Svago':'🎮','Ristoranti':'🍽️',
  'Regali':'🎁','Vestiario':'👗','Casa':'🏠',
  'Viaggi':'✈️','Busta paga':'💼','Interessi':'📈',
  'Bonus':'🎯','Altro':'📦','Spese personali':'👤',
  'Animali domestici':'🐾','Debiti':'💸','Risparmi':'🏦',
}

export function fmt(v) {
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v||0)
}
export function fmtFull(v) {
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v||0)
}

// ——— AUTH ———

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  state.user = data.user
  await loadProfile()
}

export async function signOut() {
  await supabase.auth.signOut()
  Object.assign(state, { user:null, profile:null, otherProfile:null, months:[], transactions:[], sharedExpenses:[] })
}

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  state.user = session?.user || null
  if (state.user) await loadProfile()
  supabase.auth.onAuthStateChange(async (_, session) => {
    state.user = session?.user || null
    if (state.user) await loadProfile()
  })
}

async function loadProfile() {
  if (!state.user) return
  const { data } = await supabase.from('profiles').select('*')
  if (data?.length) {
    state.profile = data.find(p => p.id === state.user.id) || { id: state.user.id, name: state.user.email.split('@')[0] }
    state.otherProfile = data.find(p => p.id !== state.user.id) || null
  } else {
    // Fallback se profiles non ancora popolato
    state.profile = { id: state.user.id, name: state.user.email.split('@')[0] }
  }
}

// ——— MONTHS ———

export async function loadMonths() {
  const { data, error } = await supabase.from('months').select('*').order('id',{ascending:true})
  if (error) throw error
  state.months = data
  if (!state.currentMonthId && data.length) state.currentMonthId = data[data.length-1].id
}

export async function createNextMonth(label, entratePreviste, uscitePreviste) {
  const last = state.months[state.months.length-1]
  if (!last) return
  const [year, month] = last.id.split('-').map(Number)
  const nm = month===12?1:month+1
  const ny = month===12?year+1:year
  const newId = `${ny}-${String(nm).padStart(2,'0')}`
  const { data, error } = await supabase.from('months').insert({
    id: newId, label,
    saldo_iniziale: last.saldo_finale,
    saldo_finale: last.saldo_finale,
    risparmiati: 0,
    entrate_previste: entratePreviste,
    entrate_effettive: 0,
    uscite_previste: uscitePreviste,
    uscite_effettive: 0,
  }).select().single()
  if (error) throw error
  state.months.push(data)
  state.currentMonthId = newId
  return data
}

// ——— TRANSACTIONS ———

export async function loadTransactions(monthId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')        // rimossa join profiles che causava 400
    .eq('month_id', monthId)
    .order('data',{ascending:false})
  if (error) throw error
  state.transactions = [
    ...state.transactions.filter(t => t.month_id !== monthId),
    ...data
  ]
}

export async function addTransaction(tx) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      month_id: tx.month_id, data: tx.data,
      importo: tx.importo, descrizione: tx.descrizione,
      categoria: tx.categoria, created_by: state.user?.id,
    })
    .select().single()
  if (error) throw error
  state.transactions.unshift(data)
  await _updateMonthTotals(tx.month_id, tx.importo)
  return data
}

export async function deleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id)
  if (!tx) return
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
  state.transactions = state.transactions.filter(t => t.id !== id)
  await _updateMonthTotals(tx.month_id, -Number(tx.importo))
}

async function _updateMonthTotals(monthId, deltaImporto) {
  const m = state.months.find(x => x.id === monthId)
  if (!m) return
  if (deltaImporto < 0) {
    m.uscite_effettive = Number(m.uscite_effettive) + Math.abs(deltaImporto)
  } else {
    m.entrate_effettive = Number(m.entrate_effettive) + deltaImporto
  }
  m.risparmiati = Number(m.entrate_effettive) - Number(m.uscite_effettive)
  m.saldo_finale = Number(m.saldo_iniziale) + Number(m.risparmiati)
  await supabase.from('months').update({
    uscite_effettive: m.uscite_effettive,
    entrate_effettive: m.entrate_effettive,
    risparmiati: m.risparmiati,
    saldo_finale: m.saldo_finale,
  }).eq('id', monthId)
}

// ——— SHARED EXPENSES ———

export async function loadSharedExpenses() {
  const { data, error } = await supabase
    .from('shared_expenses')
    .select('*')
    .order('created_at',{ascending:false})
  if (error) throw error
  state.sharedExpenses = data
}

export async function addSharedExpense({ transaction_id, month_id, descrizione, importo_totale, split_type, share_eu, share_ma }) {
  const { data, error } = await supabase
    .from('shared_expenses')
    .insert({
      transaction_id, month_id, descrizione, importo_totale,
      paid_by: state.user?.id,
      split_type, share_eu, share_ma, settled: false,
    })
    .select().single()
  if (error) throw error
  state.sharedExpenses.unshift(data)
  return data
}

export async function settleExpense(id) {
  const { error } = await supabase
    .from('shared_expenses')
    .update({ settled: true, settled_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  const exp = state.sharedExpenses.find(e => e.id === id)
  if (exp) exp.settled = true
}

export async function settleAll() {
  const ids = state.sharedExpenses.filter(e => !e.settled).map(e => e.id)
  if (!ids.length) return
  const { error } = await supabase
    .from('shared_expenses')
    .update({ settled: true, settled_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw error
  state.sharedExpenses.forEach(e => { e.settled = true })
}
