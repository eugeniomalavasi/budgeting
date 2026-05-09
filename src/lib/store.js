import { reactive, computed } from 'vue'
import { supabase } from './supabase.js'

export const state = reactive({
  user: null,
  months: [],
  transactions: [],
  currentMonthId: null,
  loading: false,
  error: null,
})

// Mese corrente selezionato
export const currentMonth = computed(() =>
  state.months.find(m => m.id === state.currentMonthId) || state.months[state.months.length - 1]
)

// Transazioni del mese corrente
export const currentTransactions = computed(() =>
  state.transactions
    .filter(t => t.month_id === state.currentMonthId)
    .sort((a, b) => new Date(b.data) - new Date(a.data))
)

export const CATEGORIE_USCITE = [
  'Alimenti', 'Animali domestici', 'Altro', 'Bollette', 'Casa',
  'Debiti', 'Regali', 'Ristoranti', 'Salute/spese mediche',
  'Spese personali', 'Svago', 'Trasporti', 'Vestiario', 'Viaggi'
]

export const CATEGORIE_ENTRATE = [
  'Busta paga', 'Bonus', 'Interessi', 'Risparmi', 'Altro'
]

export const CAT_COLORS = {
  'Alimenti': '#4ade80', 'Bollette': '#818cf8', 'Trasporti': '#fb923c',
  'Salute/spese mediche': '#f472b6', 'Svago': '#c084fc', 'Ristoranti': '#fdba74',
  'Regali': '#34d399', 'Vestiario': '#22d3ee', 'Casa': '#a3e635',
  'Viaggi': '#e879f9', 'Busta paga': '#4ade80', 'Interessi': '#60a5fa',
  'Bonus': '#facc15', 'Altro': '#94a3b8', 'Spese personali': '#64748b',
  'Animali domestici': '#fbbf24', 'Debiti': '#f87171', 'Risparmi': '#34d399',
}

export const CAT_EMOJI = {
  'Alimenti': '🛒', 'Bollette': '💡', 'Trasporti': '🚗',
  'Salute/spese mediche': '🏥', 'Svago': '🎮', 'Ristoranti': '🍽️',
  'Regali': '🎁', 'Vestiario': '👗', 'Casa': '🏠',
  'Viaggi': '✈️', 'Busta paga': '💼', 'Interessi': '📈',
  'Bonus': '🎯', 'Altro': '📦', 'Spese personali': '👤',
  'Animali domestici': '🐾', 'Debiti': '💸', 'Risparmi': '🏦',
}

export function fmt(v) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(v || 0)
}

export function fmtFull(v) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR'
  }).format(v || 0)
}

// ——— AUTH ———

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  state.user = data.user
}

export async function signOut() {
  await supabase.auth.signOut()
  state.user = null
  state.months = []
  state.transactions = []
}

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  state.user = session?.user || null
  supabase.auth.onAuthStateChange((_, session) => {
    state.user = session?.user || null
  })
}

// ——— DATA ———

export async function loadMonths() {
  const { data, error } = await supabase
    .from('months')
    .select('*')
    .order('id', { ascending: true })
  if (error) throw error
  state.months = data
  if (!state.currentMonthId && data.length) {
    state.currentMonthId = data[data.length - 1].id
  }
}

export async function loadTransactions(monthId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, profiles:created_by(name)')
    .eq('month_id', monthId)
    .order('data', { ascending: false })
  if (error) throw error
  // Aggiorna solo le transazioni del mese richiesto
  state.transactions = [
    ...state.transactions.filter(t => t.month_id !== monthId),
    ...data
  ]
}

export async function addTransaction(tx) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      month_id: tx.month_id,
      data: tx.data,
      importo: tx.importo,
      descrizione: tx.descrizione,
      categoria: tx.categoria,
      created_by: state.user?.id,
    })
    .select()
    .single()
  if (error) throw error

  state.transactions.unshift(data)

  // Aggiorna i totali del mese
  const mese = state.months.find(m => m.id === tx.month_id)
  if (mese) {
    if (tx.importo < 0) {
      mese.uscite_effettive = (mese.uscite_effettive || 0) + Math.abs(tx.importo)
    } else {
      mese.entrate_effettive = (mese.entrate_effettive || 0) + tx.importo
    }
    mese.risparmiati = mese.entrate_effettive - mese.uscite_effettive
    mese.saldo_finale = mese.saldo_iniziale + mese.risparmiati
    await supabase.from('months').update({
      uscite_effettive: mese.uscite_effettive,
      entrate_effettive: mese.entrate_effettive,
      risparmiati: mese.risparmiati,
      saldo_finale: mese.saldo_finale,
    }).eq('id', tx.month_id)
  }

  return data
}

export async function deleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id)
  if (!tx) return

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error

  state.transactions = state.transactions.filter(t => t.id !== id)

  // Aggiorna totali mese
  const mese = state.months.find(m => m.id === tx.month_id)
  if (mese) {
    if (tx.importo < 0) {
      mese.uscite_effettive = (mese.uscite_effettive || 0) - Math.abs(tx.importo)
    } else {
      mese.entrate_effettive = (mese.entrate_effettive || 0) - tx.importo
    }
    mese.risparmiati = mese.entrate_effettive - mese.uscite_effettive
    mese.saldo_finale = mese.saldo_iniziale + mese.risparmiati
    await supabase.from('months').update({
      uscite_effettive: mese.uscite_effettive,
      entrate_effettive: mese.entrate_effettive,
      risparmiati: mese.risparmiati,
      saldo_finale: mese.saldo_finale,
    }).eq('id', tx.month_id)
  }
}

export async function addMonth(id, label, saldo_iniziale, entrate_previste, uscite_previste) {
  const { data, error } = await supabase.from('months').insert({
    id, label, saldo_iniziale,
    saldo_finale: saldo_iniziale,
    risparmiati: 0,
    entrate_previste,
    entrate_effettive: 0,
    uscite_previste,
    uscite_effettive: 0,
  }).select().single()
  if (error) throw error
  state.months.push(data)
  state.currentMonthId = id
  return data
}
