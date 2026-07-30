import { reactive, computed } from 'vue'
import { supabase } from './supabase.js'

export const state = reactive({
  user: null,
  profile: null,
  otherProfile: null,   // deprecato: "l'altro" quando il gruppo ha esattamente 2 membri
  members: [],          // membri del gruppo attivo: [{ id, name }]
  groups: [],           // gruppi dell'utente: [{ household_id, name, role }]
  activeGroupId: null,  // = profiles.household_id (gruppo attualmente visualizzato)
  invitations: [],      // inviti pendenti indirizzati a me: [{ id, household_id, group_name }]
  sentInvitations: [],  // inviti pendenti inviati per il gruppo attivo
  months: [],
  transactions: [],
  sharedExpenses: [],   // ogni spesa ha .shares = [{ user_id, amount }]
  currentMonthId: null,
  loading: false,
})

// Quota di un membro in una spesa (0 se non partecipa).
export function shareOf(expense, userId) {
  const s = expense?.shares?.find(x => x.user_id === userId)
  return s ? Number(s.amount) : 0
}

// Nome di un membro dato il suo id.
export function memberName(userId) {
  if (userId === state.user?.id) return state.profile?.name || 'Tu'
  return state.members.find(m => m.id === userId)?.name || '—'
}

export const currentMonth = computed(() =>
  state.months.find(m => m.id === state.currentMonthId) || state.months[state.months.length - 1]
)

export const currentTransactions = computed(() =>
  state.transactions
    .filter(t => t.month_id === state.currentMonthId)
    .sort((a, b) => new Date(b.data) - new Date(a.data))
)

// Saldo netto dell'utente corrente verso il gruppo.
// Positivo = gli altri mi devono; Negativo = io devo agli altri.
export const saldoCondiviso = computed(() => {
  const me = state.user?.id
  let totale = 0
  state.sharedExpenses.filter(s => !s.settled).forEach(s => {
    const myShare = shareOf(s, me)
    if (s.paid_by === me) {
      // Ho anticipato tutto: gli altri mi devono la loro quota (totale − mia quota)
      totale += Number(s.importo_totale) - myShare
    } else {
      // Ha pagato un altro: io devo la mia quota
      totale -= myShare
    }
  })
  return totale
})

// Saldo netto di OGNI membro del gruppo (per la vista Dividi a N persone).
// net[userId] > 0 → il gruppo gli deve; < 0 → lui deve al gruppo.
export const memberBalances = computed(() => {
  const net = {}
  state.members.forEach(m => { net[m.id] = 0 })
  state.sharedExpenses.filter(s => !s.settled).forEach(s => {
    if (net[s.paid_by] === undefined) net[s.paid_by] = 0
    net[s.paid_by] += Number(s.importo_totale)  // il pagatore ha anticipato il totale
    ;(s.shares || []).forEach(sh => {
      if (net[sh.user_id] === undefined) net[sh.user_id] = 0
      net[sh.user_id] -= Number(sh.amount)       // ognuno deve la sua quota
    })
  })
  return net
})

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
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0)
}
export function fmtFull(v) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v || 0)
}

// ——— AUTH ———
// URL a cui Supabase rimanda dopo conferma email / reset / OAuth.
// Con hash-router il redirect va all'origin; il ?code=... viene
// intercettato da detectSessionInUrl (vedi supabase.js).
function redirectUrl() {
  return window.location.origin + window.location.pathname
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  state.user = data.user
  await loadProfile()
}

// Registrazione. Se la conferma email è attiva (lo sarà), la sessione
// NON parte subito: l'utente riceve la mail e conferma. Restituiamo un
// flag così la UI mostra "controlla la tua email".
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl(),
      data: { name: name || email.split('@')[0] },
    },
  })
  if (error) throw error
  // needsConfirm = true quando non c'è ancora una sessione attiva
  const needsConfirm = !data.session
  if (data.session) {
    state.user = data.user
    await loadProfile()
  }
  return { needsConfirm }
}

// Invia la mail di reset password. Il link riporta all'app con il flag
// di recovery; onAuthStateChange emette 'PASSWORD_RECOVERY'.
export async function resetPassword(email) {
  // Rimandiamo alla root: al ritorno Supabase emette l'evento
  // PASSWORD_RECOVERY e il router guard dirotta su /reset (vedi main.js).
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl(),
  })
  if (error) throw error
}

// Imposta la nuova password (chiamata dalla schermata di recovery,
// quando esiste già una sessione temporanea di recupero).
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  })
  if (error) throw error
}

// Aggiorna il nome visualizzato dell'utente (tabella profiles).
export async function updateProfileName(name) {
  if (!state.user) return
  const { data, error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', state.user.id)
    .select()
  if (error) throw error
  if (data?.[0]) state.profile = data[0]
}

export async function signOut() {
  await supabase.auth.signOut()
  Object.assign(state, {
    user: null, profile: null, otherProfile: null,
    members: [], groups: [], activeGroupId: null,
    invitations: [], sentInvitations: [],
    months: [], transactions: [], sharedExpenses: [],
  })
}

// ——— GRUPPI ———
// Tutti i gruppi di cui l'utente fa parte.
export async function loadGroups() {
  if (!state.user) return
  const { data, error } = await supabase
    .from('group_members')
    .select('household_id, role, households(name)')
    .eq('user_id', state.user.id)
  if (error) throw error
  state.groups = (data || []).map(g => ({
    household_id: g.household_id,
    role: g.role,
    name: g.households?.name || 'Gruppo',
  }))
}

// ——— INVITI ———
// Inviti pendenti indirizzati alla mia email.
export async function loadInvitations() {
  if (!state.user?.email) return
  const { data, error } = await supabase
    .from('group_invitations')
    .select('id, household_id, status, households(name)')
    .eq('status', 'pending')
    .ilike('email', state.user.email)
  if (error) throw error
  state.invitations = (data || []).map(i => ({
    id: i.id,
    household_id: i.household_id,
    group_name: i.households?.name || 'Gruppo',
  }))
}

// Inviti pendenti inviati per il gruppo attivo (vista di chi invita).
export async function loadSentInvitations() {
  if (!state.activeGroupId) { state.sentInvitations = []; return }
  const { data, error } = await supabase
    .from('group_invitations')
    .select('id, email, status')
    .eq('household_id', state.activeGroupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  state.sentInvitations = data || []
}

// Invita una persona (per email) nel gruppo attivo.
export async function createInvitation(email) {
  if (!state.user || !state.activeGroupId) return
  const clean = String(email).trim().toLowerCase()
  if (!clean) throw new Error('Email mancante')
  const { error } = await supabase.from('group_invitations').insert({
    household_id: state.activeGroupId,
    email: clean,
    invited_by: state.user.id,
  })
  if (error) throw error
  await loadSentInvitations()
}

// Annulla un invito che hai mandato.
export async function cancelInvitation(id) {
  const { error } = await supabase.from('group_invitations').delete().eq('id', id)
  if (error) throw error
  state.sentInvitations = state.sentInvitations.filter(i => i.id !== id)
}

// Accetta o rifiuta un invito ricevuto (RPC sicura).
export async function respondInvitation(id, accept) {
  const { data: householdId, error } = await supabase
    .rpc('respond_invitation', { p_invite: id, p_accept: accept })
  if (error) throw error
  state.invitations = state.invitations.filter(i => i.id !== id)
  await loadGroups()
  if (accept && householdId) await switchGroup(householdId)
}

// Cambia il gruppo attivo (aggiorna profiles.household_id) e ricarica tutto.
export async function switchGroup(householdId) {
  if (!state.user || householdId === state.activeGroupId) return
  const { error } = await supabase
    .from('profiles').update({ household_id: householdId }).eq('id', state.user.id)
  if (error) throw error
  state.activeGroupId = householdId
  state.currentMonthId = null
  await loadProfile()
  await loadMonths()
  if (state.currentMonthId) await loadTransactions(state.currentMonthId)
  await loadSharedExpenses()
}

// Crea un nuovo gruppo via RPC atomica (household + membership + attivazione),
// poi ricarica i dati del nuovo gruppo attivo.
export async function createGroup(name) {
  if (!state.user) return
  const { data: householdId, error } = await supabase.rpc('create_group', { p_name: name || '' })
  if (error) throw error
  state.activeGroupId = householdId
  state.currentMonthId = null
  await loadProfile()
  await loadMonths()
  if (state.currentMonthId) await loadTransactions(state.currentMonthId)
  await loadSharedExpenses()
  return householdId
}

// true durante il flusso di recupero password: la UI deve mandare
// l'utente alla schermata "imposta nuova password".
export const authFlow = reactive({ recovery: false })

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  state.user = session?.user || null
  if (state.user) await loadProfile()
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') authFlow.recovery = true
    state.user = session?.user || null
    if (state.user) await loadProfile()
    else Object.assign(state, { profile: null, otherProfile: null })
  })
}

async function loadProfile() {
  if (!state.user) return
  // Le RLS restituiscono solo i profili del gruppo attivo → sono i membri.
  const { data } = await supabase.from('profiles').select('*')
  const mine = data?.find(p => p.id === state.user.id)
  if (mine) {
    state.profile = mine
  } else {
    // Nessun profilo (es. signup via Google o trigger non attivo):
    // crealo al volo col nome dai metadata o dall'email.
    const name = state.user.user_metadata?.name || state.user.email.split('@')[0]
    const { data: created } = await supabase
      .from('profiles').upsert({ id: state.user.id, name }).select()
    state.profile = created?.[0] || { id: state.user.id, name }
  }
  state.activeGroupId = state.profile?.household_id || null
  // Membri del gruppo attivo (include me stesso)
  state.members = (data || []).map(p => ({ id: p.id, name: p.name }))
  // Compat 2 persone: "l'altro" ha senso solo se il gruppo è una coppia
  const others = (data || []).filter(p => p.id !== state.user.id)
  state.otherProfile = others.length === 1 ? others[0] : null
  await loadGroups()
  await loadInvitations()
}

// ——— MONTHS ———
const MESI_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

export async function loadMonths() {
  const { data, error } = await supabase.from('months').select('*').order('id', { ascending: true })
  if (error) throw error
  state.months = data

  // Calcola l'ID del mese REALE di oggi (es. "2026-06")
  const now = new Date()
  const todayId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Household nuovo/vuoto (es. dopo la registrazione): crea il primo mese
  // così l'app ha da subito qualcosa da mostrare.
  if (!data.length) {
    const label = `${MESI_IT[now.getMonth()]} ${now.getFullYear()}`
    const { data: created, error: e2 } = await supabase.from('months').insert({
      id: todayId, label,
      saldo_iniziale: 0, saldo_finale: 0, risparmiati: 0,
      entrate_previste: 0, entrate_effettive: 0,
      uscite_previste: 0, uscite_effettive: 0,
    }).select()
    if (e2) throw e2
    state.months = created
    state.currentMonthId = todayId
    return
  }

  const exists = data.find(m => m.id === todayId)
  if (exists) {
    // Il mese corrente è già nel DB → selezionalo
    state.currentMonthId = todayId
  } else if (data[data.length - 1].id < todayId) {
    // Siamo avanti rispetto all'ultimo mese nel DB → crea tutti i mesi mancanti
    await _createMonthsUpTo(todayId)
  } else {
    // Caso improbabile: il DB ha mesi futuri → usa l'ultimo disponibile
    if (!state.currentMonthId) state.currentMonthId = data[data.length - 1].id
  }
}

// Crea in sequenza tutti i mesi mancanti fino a targetId (incluso)
async function _createMonthsUpTo(targetId) {
  while (state.months[state.months.length - 1].id < targetId) {
    const last = state.months[state.months.length - 1]
    const [year, month] = last.id.split('-').map(Number)
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    const newId = `${ny}-${String(nm).padStart(2, '0')}`
    const label = `${MESI_IT[nm - 1]} ${ny}`
    const { data, error } = await supabase.from('months').insert({
      id: newId, label,
      saldo_iniziale: last.saldo_finale,
      saldo_finale: last.saldo_finale,
      risparmiati: 0,
      // Eredita i budget previsti dall'ultimo mese
      entrate_previste: last.entrate_previste,
      entrate_effettive: 0,
      uscite_previste: last.uscite_previste,
      uscite_effettive: 0,
    }).select()
    if (error) throw error
    state.months.push(data[0])
  }
  state.currentMonthId = targetId
}

export async function createNextMonth(label, entratePreviste, uscitePreviste) {
  const last = state.months[state.months.length - 1]
  if (!last) return
  const [year, month] = last.id.split('-').map(Number)
  const nm = month === 12 ? 1 : month + 1
  const ny = month === 12 ? year + 1 : year
  const newId = `${ny}-${String(nm).padStart(2, '0')}`
  const { data, error } = await supabase.from('months').insert({
    id: newId, label,
    saldo_iniziale: last.saldo_finale,
    saldo_finale: last.saldo_finale,
    risparmiati: 0,
    entrate_previste: entratePreviste,
    entrate_effettive: 0,
    uscite_previste: uscitePreviste,
    uscite_effettive: 0,
  }).select()
  if (error) throw error
  const newMonth = data[0]
  state.months.push(newMonth)
  state.currentMonthId = newId
  return newMonth
}

// ——— TRANSACTIONS ———
export async function loadTransactions(monthId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('month_id', monthId)
    .order('data', { ascending: false })
  if (error) throw error
  state.transactions = [
    ...state.transactions.filter(t => t.month_id !== monthId),
    ...data
  ]
}

export async function addTransaction(tx) {
  // Usa .select() senza .single() per evitare PGRST116 con RLS
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
  if (error) throw error
  const newTx = data[0]
  state.transactions.unshift(newTx)
  await _updateMonthTotals(tx.month_id)
  return newTx
}

export async function updateTransaction(id, updates) {
  const old = state.transactions.find(t => t.id === id)
  if (!old) return
  const { data, error } = await supabase
    .from('transactions')
    .update({
      data: updates.data,
      importo: updates.importo,
      descrizione: updates.descrizione,
      categoria: updates.categoria,
      month_id: updates.month_id,
    })
    .eq('id', id)
    .select()
  if (error) throw error
  const updated = data[0]
  await _updateMonthTotals(old.month_id)
  await _updateMonthTotals(updates.month_id)
  const idx = state.transactions.findIndex(t => t.id === id)
  if (idx !== -1) state.transactions[idx] = { ...old, ...updated }
}

export async function deleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id)
  if (!tx) return
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
  state.transactions = state.transactions.filter(t => t.id !== id)
  await _updateMonthTotals(tx.month_id)
}

async function _updateMonthTotals(monthId) {
  const m = state.months.find(x => x.id === monthId)
  if (!m) return
  // Ricalcola sempre dai dati reali in memoria
  const txMese = state.transactions.filter(t => t.month_id === monthId)
  m.entrate_effettive = txMese.filter(t => Number(t.importo) > 0).reduce((s, t) => s + Number(t.importo), 0)
  m.uscite_effettive = txMese.filter(t => Number(t.importo) < 0).reduce((s, t) => s + Math.abs(Number(t.importo)), 0)
  m.risparmiati = m.entrate_effettive - m.uscite_effettive
  m.saldo_finale = Number(m.saldo_iniziale) + m.risparmiati
  await supabase.from('months').update({
    entrate_effettive: Math.round(m.entrate_effettive * 100) / 100,
    uscite_effettive: Math.round(m.uscite_effettive * 100) / 100,
    risparmiati: Math.round(m.risparmiati * 100) / 100,
    saldo_finale: Math.round(m.saldo_finale * 100) / 100,
  }).eq('id', monthId)
}

// ——— SHARED EXPENSES ———
// Ogni spesa porta con sé le quote per-membro in `shares`.
export async function loadSharedExpenses() {
  const { data, error } = await supabase
    .from('shared_expenses')
    .select('*, shares:shared_expense_shares(user_id, amount)')
    .order('created_at', { ascending: false })
  if (error) throw error
  state.sharedExpenses = (data || []).map(e => ({ ...e, shares: e.shares || [] }))
}

// shares: [{ user_id, amount }] — una riga per membro partecipante.
export async function addSharedExpense({ transaction_id, month_id, descrizione, importo_totale, split_type, shares, paid_by }) {
  const { data, error } = await supabase
    .from('shared_expenses')
    .insert({
      transaction_id, month_id, descrizione, importo_totale,
      paid_by: paid_by || state.user?.id, split_type: split_type || 'custom', settled: false,
    })
    .select()
  if (error) throw error
  const expense = data[0]
  const rows = (shares || [])
    .filter(s => s.user_id && Number(s.amount) > 0)
    .map(s => ({ expense_id: expense.id, user_id: s.user_id, amount: Number(s.amount) }))
  if (rows.length) {
    const { error: e2 } = await supabase.from('shared_expense_shares').insert(rows)
    if (e2) throw e2
  }
  expense.shares = rows.map(r => ({ user_id: r.user_id, amount: r.amount }))
  state.sharedExpenses.unshift(expense)
  return expense
}

export async function settleExpense(id) {
  const { error } = await supabase
    .from('shared_expenses').update({ settled: true, settled_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  const exp = state.sharedExpenses.find(e => e.id === id)
  if (exp) exp.settled = true
}

export async function settleAll() {
  const ids = state.sharedExpenses.filter(e => !e.settled).map(e => e.id)
  if (!ids.length) return
  const { error } = await supabase
    .from('shared_expenses').update({ settled: true, settled_at: new Date().toISOString() }).in('id', ids)
  if (error) throw error
  state.sharedExpenses.forEach(e => { e.settled = true })
}

// Aggiorna una spesa e, se passate, rimpiazza le quote per-membro.
export async function updateSharedExpense(id, { split_type, shares, importo_totale, paid_by }) {
  const updates = {}
  if (importo_totale !== undefined) updates.importo_totale = importo_totale
  if (split_type !== undefined) updates.split_type = split_type
  if (paid_by !== undefined) updates.paid_by = paid_by
  if (Object.keys(updates).length) {
    const { error } = await supabase.from('shared_expenses').update(updates).eq('id', id)
    if (error) throw error
  }
  if (shares) {
    await supabase.from('shared_expense_shares').delete().eq('expense_id', id)
    const rows = shares
      .filter(s => s.user_id && Number(s.amount) > 0)
      .map(s => ({ expense_id: id, user_id: s.user_id, amount: Number(s.amount) }))
    if (rows.length) {
      const { error: e2 } = await supabase.from('shared_expense_shares').insert(rows)
      if (e2) throw e2
    }
  }
  const exp = state.sharedExpenses.find(e => e.id === id)
  if (exp) {
    Object.assign(exp, updates)
    if (shares) exp.shares = shares
      .filter(s => s.user_id && Number(s.amount) > 0)
      .map(s => ({ user_id: s.user_id, amount: Number(s.amount) }))
  }
}

export async function deleteSharedExpense(transactionId) {
  const exp = state.sharedExpenses.find(e => e.transaction_id === transactionId)
  if (!exp) return
  const { error } = await supabase.from('shared_expenses').delete().eq('id', exp.id)
  if (error) throw error
  state.sharedExpenses = state.sharedExpenses.filter(e => e.id !== exp.id)
}