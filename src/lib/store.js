import { reactive, computed } from 'vue'
import { supabase } from './supabase.js'
import { currencyDecimals } from './currencies.js'

export const state = reactive({
  user: null,
  profile: null,
  householdCurrency: 'EUR', // valuta predefinita del gruppo attivo (households.currency)
  exchangeRates: {},        // { code: rate } su base EUR (unità di code per 1 EUR)
  ratesUpdatedAt: null,
  otherProfile: null,   // deprecato: "l'altro" quando il gruppo ha esattamente 2 membri
  members: [],          // membri del gruppo attivo: [{ id, name }]
  groups: [],           // gruppi dell'utente: [{ household_id, name, role }]
  activeGroupId: null,  // = profiles.household_id (gruppo attualmente visualizzato)
  invitations: [],      // inviti pendenti indirizzati a me: [{ id, household_id, group_name }]
  sentInvitations: [],  // inviti pendenti inviati per il gruppo attivo
  groupBalances: [],    // saldo dell'utente in ogni gruppo: [{ household_id, name, balance }]
  categories: [],       // categorie del gruppo attivo: [{ id, name, kind, emoji, color, sort }]
  months: [],
  transactions: [],
  sharedExpenses: [],   // ogni spesa ha .shares = [{ user_id, amount }]
  recurringRules: [],   // regole spese ricorrenti; ognuna ha .shares = [{ user_id, weight }]
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

// Ordina per data (giorno) e, a parità, per istante di inserimento (created_at):
// così l'ultimo movimento inserito compare sempre per primo.
export function sortByRecent(a, b) {
  return (new Date(b.data) - new Date(a.data)) ||
    (new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

export const currentTransactions = computed(() =>
  state.transactions
    .filter(t => t.month_id === state.currentMonthId)
    .sort(sortByRecent)
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

// Palette categorie: toni caldi/terrosi derivati dalle rampe Organic
// (terracotta + sage + neutri). Distinguibili ma coerenti col design system,
// usati per i grafici e i pallini nelle statistiche.
export const CAT_COLORS = {
  'Alimenti': '#8fa073', 'Bollette': '#c67139', 'Trasporti': '#b2622d',
  'Salute/spese mediche': '#a15a4a', 'Svago': '#728157', 'Ristoranti': '#d67f48',
  'Regali': '#56633f', 'Vestiario': '#82796a', 'Casa': '#645c50',
  'Viaggi': '#3d472b', 'Busta paga': '#aebf92', 'Interessi': '#8c491a',
  'Bonus': '#f6a06b', 'Altro': '#a19786', 'Spese personali': '#c0b6a5',
  'Animali domestici': '#cf9b5e', 'Debiti': '#643312', 'Risparmi': '#ccdbb2',
}

export const CAT_EMOJI = {
  'Alimenti': '🛒', 'Bollette': '💡', 'Trasporti': '🚗',
  'Salute/spese mediche': '🏥', 'Svago': '🎮', 'Ristoranti': '🍽️',
  'Regali': '🎁', 'Vestiario': '👗', 'Casa': '🏠',
  'Viaggi': '✈️', 'Busta paga': '💼', 'Interessi': '📈',
  'Bonus': '🎯', 'Altro': '📦', 'Spese personali': '👤',
  'Animali domestici': '🐾', 'Debiti': '💸', 'Risparmi': '🏦',
}

// ——— CATEGORIE DINAMICHE ———
// Liste per la UI (dal gruppo attivo), ordinate.
export const categorieUscite = computed(() =>
  state.categories.filter(c => c.kind === 'uscita').sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
)
export const categorieEntrate = computed(() =>
  state.categories.filter(c => c.kind === 'entrata').sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
)
// Emoji/colore di una categoria per nome (fallback ai default statici).
export function catEmoji(name) {
  return state.categories.find(c => c.name === name)?.emoji || CAT_EMOJI[name] || '📦'
}
export function catColor(name) {
  return state.categories.find(c => c.name === name)?.color || CAT_COLORS[name] || '#94a3b8'
}
// Chiave dell'icona SVG scelta per una categoria (null → fallback per nome/emoji).
export function catIconKey(name) {
  return state.categories.find(c => c.name === name)?.icon || null
}

// Valuta di riferimento per la formattazione quando non specificata: quella di famiglia.
function defaultCurrency() {
  return state.householdCurrency || 'EUR'
}

// fmt: importo "arrotondato" (senza decimali per valute con decimali, come prima per EUR).
export function fmt(v, currency) {
  const code = currency || defaultCurrency()
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: code, maximumFractionDigits: 0,
  }).format(v || 0)
}
// fmtFull: importo con i decimali propri della valuta (0 per JPY/UZS/…).
export function fmtFull(v, currency) {
  const code = currency || defaultCurrency()
  const dec = currencyDecimals(code)
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: code,
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  }).format(v || 0)
}

// ——— CAMBI VALUTA ———
// Carica i tassi (base EUR) dalla tabella exchange_rates in state.exchangeRates.
export async function loadExchangeRates() {
  const { data, error } = await supabase
    .from('exchange_rates').select('code, rate, updated_at').eq('base', 'EUR')
  if (error) { console.warn('Cambi non caricati:', error.message); return }
  const map = {}
  let latest = null
  ;(data || []).forEach(r => {
    map[r.code] = Number(r.rate)
    if (!latest || new Date(r.updated_at) > new Date(latest)) latest = r.updated_at
  })
  map.EUR = 1
  state.exchangeRates = map
  state.ratesUpdatedAt = latest
}

// Converte `amount` da valuta `from` a valuta `to` usando EUR come pivot.
// Ritorna null se manca un tasso necessario (la UI blocca il salvataggio).
export function convert(amount, from, to) {
  if (from === to) return amount
  const rates = state.exchangeRates
  const rFrom = from === 'EUR' ? 1 : rates[from]
  const rTo = to === 'EUR' ? 1 : rates[to]
  if (!rFrom || !rTo) return null
  return amount * (rTo / rFrom)
}

// Somma una lista di transazioni raggruppando per valuta: { EUR: n, USD: m }.
// Ogni movimento contribuisce nella propria `valuta` (default EUR per i vecchi dati).
export function sumByCurrency(list) {
  const out = {}
  ;(list || []).forEach(t => {
    const code = t.valuta || 'EUR'
    out[code] = (out[code] || 0) + Number(t.importo || 0)
  })
  return out
}

// Aggiorna la valuta predefinita del gruppo attivo (households.currency).
export async function updateHouseholdCurrency(code) {
  if (!state.activeGroupId) return
  const { error } = await supabase
    .from('households').update({ currency: code }).eq('id', state.activeGroupId)
  if (error) throw error
  state.householdCurrency = code
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
    groupBalances: [], categories: [],
    months: [], transactions: [], sharedExpenses: [], recurringRules: [],
  })
}

// ——— GRUPPI ———
// Tutti i gruppi di cui l'utente fa parte.
export async function loadGroups() {
  if (!state.user) return
  const { data, error } = await supabase
    .from('group_members')
    .select('household_id, role, households(name, deleted_at)')
    .eq('user_id', state.user.id)
  if (error) throw error
  state.groups = (data || [])
    .filter(g => !g.households?.deleted_at)   // nascondi i gruppi eliminati
    .map(g => ({
      household_id: g.household_id,
      role: g.role,
      name: g.households?.name || 'Gruppo',
    }))
}

// ——— SALDI PER GRUPPO (Home) ———
export async function loadGroupBalances() {
  if (!state.user) return
  const { data, error } = await supabase.rpc('my_group_balances')
  if (error) throw error
  state.groupBalances = (data || []).map(g => ({
    household_id: g.household_id, name: g.name, balance: Number(g.balance) || 0,
  }))
}

// ——— CATEGORIE ———
export async function loadCategories() {
  const { data, error } = await supabase
    .from('categories').select('*').is('deleted_at', null).order('sort', { ascending: true })
  if (error) throw error
  state.categories = data || []
}

export async function addCategory({ name, kind, emoji, color, icon }) {
  const { data, error } = await supabase.from('categories').insert({
    household_id: state.activeGroupId, name: name.trim(), kind,
    emoji: emoji || '📦', color: color || '#94a3b8', icon: icon || null, sort: 50,
  }).select()
  if (error) throw error
  state.categories.push(data[0])
  return data[0]
}

export async function updateCategory(id, updates) {
  const oldName = state.categories.find(c => c.id === id)?.name
  const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select()
  if (error) throw error
  const idx = state.categories.findIndex(c => c.id === id)
  if (idx !== -1 && data?.[0]) state.categories[idx] = data[0]

  // Se il nome è cambiato, propaga il nuovo nome ai movimenti già registrati:
  // i movimenti memorizzano la categoria come testo, quindi senza questo passaggio
  // il filtro/raggruppamento per categoria "perderebbe" quei movimenti.
  const newName = updates.name
  if (newName && oldName && newName !== oldName) {
    const { error: e2 } = await supabase
      .from('transactions').update({ categoria: newName })
      .eq('household_id', state.activeGroupId).eq('categoria', oldName)
    if (e2) throw e2
    state.transactions.forEach(t => { if (t.categoria === oldName) t.categoria = newName })
  }
}

// Riordina le categorie di un gruppo (uscita/entrata) secondo l'ordine degli id
// passati, aggiornando il campo `sort` in modo ottimistico e persistendolo.
export async function reorderCategories(orderedIds) {
  // Aggiornamento ottimistico locale.
  orderedIds.forEach((id, i) => {
    const c = state.categories.find(c => c.id === id)
    if (c) c.sort = i
  })
  // Persisti ogni nuovo indice (upsert dei soli sort).
  const updates = orderedIds.map((id, i) =>
    supabase.from('categories').update({ sort: i }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const err = results.find(r => r.error)?.error
  if (err) throw err
}

export async function deleteCategory(id) {
  // Soft delete: la categoria resta nel DB (recuperabile) ma sparisce dall'app.
  const { error } = await supabase
    .from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  state.categories = state.categories.filter(c => c.id !== id)
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

// Elimina (soft delete) un gruppo: solo l'owner, e mai l'ultimo gruppo.
// I dati non vengono cancellati dal DB, solo nascosti (recuperabili).
export async function deleteGroup(householdId) {
  const { error } = await supabase.rpc('delete_group', { p_household: householdId })
  if (error) throw error
  const wasActive = householdId === state.activeGroupId
  await loadGroups()
  if (wasActive) {
    const next = state.groups[0]
    if (next) {
      state.activeGroupId = null   // forza switchGroup a ricaricare
      await switchGroup(next.household_id)
    }
  }
  await loadGroupBalances()
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
  // Valuta predefinita del gruppo attivo
  if (state.activeGroupId) {
    const { data: hh } = await supabase
      .from('households').select('currency').eq('id', state.activeGroupId).maybeSingle()
    state.householdCurrency = hh?.currency || 'EUR'
  }
  await loadGroups()
  await loadInvitations()
  await loadCategories()
  await loadExchangeRates()
  await loadGroupBalances()
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
    .is('deleted_at', null)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
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
      valuta: tx.valuta || state.householdCurrency || 'EUR',
      importo_originale: tx.importo_originale ?? null,
      valuta_originale: tx.valuta_originale ?? null,
      tasso_usato: tx.tasso_usato ?? null,
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
      valuta: updates.valuta,
      importo_originale: updates.importo_originale ?? null,
      valuta_originale: updates.valuta_originale ?? null,
      tasso_usato: updates.tasso_usato ?? null,
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
  // Soft delete: nasconde il movimento ma lo mantiene nel DB (recuperabile).
  const { error } = await supabase
    .from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  state.transactions = state.transactions.filter(t => t.id !== id)
  // Se il movimento ha una spesa condivisa collegata, eliminala anche dalla Divisione.
  const exp = state.sharedExpenses.find(e => e.transaction_id === id)
  if (exp) await deleteSharedExpense(id)
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
    .is('deleted_at', null)
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
  // Soft delete: la spesa condivisa resta nel DB (recuperabile) ma sparisce dall'app.
  const { error } = await supabase
    .from('shared_expenses').update({ deleted_at: new Date().toISOString() }).eq('id', exp.id)
  if (error) throw error
  state.sharedExpenses = state.sharedExpenses.filter(e => e.id !== exp.id)
}

// ——— SPESE RICORRENTI ———
// Regole che generano automaticamente un movimento ogni mese (lato server, via
// cron). Ogni regola porta con sé le quote-template in `shares` = [{ user_id, weight }].
export async function loadRecurringRules() {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*, shares:recurring_rule_shares(user_id, weight)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  state.recurringRules = (data || []).map(r => ({ ...r, shares: r.shares || [] }))
}

// shares: [{ user_id, weight }] (solo se is_split). Ritorna la regola creata.
export async function addRecurringRule(rule, shares) {
  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({
      created_by: state.user?.id,
      tipo: rule.tipo,
      descrizione: rule.descrizione,
      categoria: rule.categoria,
      importo_originale: rule.importo_originale,
      valuta_originale: rule.valuta_originale,
      day_of_month: rule.day_of_month,
      start_month: rule.start_month,
      total_installments: rule.total_installments ?? null,
      end_month: rule.end_month ?? null,
      is_split: !!rule.is_split,
      split_type: rule.split_type || 'equal',
      paid_by: rule.paid_by ?? null,
    })
    .select()
  if (error) throw error
  const created = data[0]
  const rows = (shares || [])
    .filter(s => s.user_id && Number(s.weight) > 0)
    .map(s => ({ rule_id: created.id, user_id: s.user_id, weight: Number(s.weight) }))
  if (rows.length) {
    const { error: e2 } = await supabase.from('recurring_rule_shares').insert(rows)
    if (e2) throw e2
  }
  created.shares = rows.map(r => ({ user_id: r.user_id, weight: r.weight }))
  state.recurringRules.unshift(created)
  return created
}

// Aggiorna una regola e, se passate, rimpiazza le quote-template.
export async function updateRecurringRule(id, updates, shares) {
  const fields = {}
  ;['tipo', 'descrizione', 'categoria', 'importo_originale', 'valuta_originale',
    'day_of_month', 'start_month', 'total_installments', 'end_month',
    'is_split', 'split_type', 'paid_by', 'active'].forEach(k => {
      if (updates[k] !== undefined) fields[k] = updates[k]
    })
  if (Object.keys(fields).length) {
    const { error } = await supabase.from('recurring_rules').update(fields).eq('id', id)
    if (error) throw error
  }
  if (shares) {
    await supabase.from('recurring_rule_shares').delete().eq('rule_id', id)
    const rows = shares
      .filter(s => s.user_id && Number(s.weight) > 0)
      .map(s => ({ rule_id: id, user_id: s.user_id, weight: Number(s.weight) }))
    if (rows.length) {
      const { error: e2 } = await supabase.from('recurring_rule_shares').insert(rows)
      if (e2) throw e2
    }
  }
  const rule = state.recurringRules.find(r => r.id === id)
  if (rule) {
    Object.assign(rule, fields)
    if (shares) rule.shares = shares
      .filter(s => s.user_id && Number(s.weight) > 0)
      .map(s => ({ user_id: s.user_id, weight: Number(s.weight) }))
  }
}

// Soft delete: la regola smette di generare movimenti futuri; quelli già
// generati nei mesi passati restano invariati.
export async function deleteRecurringRule(id) {
  const { error } = await supabase
    .from('recurring_rules').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  state.recurringRules = state.recurringRules.filter(r => r.id !== id)
}

// Rate rimanenti di una regola (null = illimitata / basata su data di fine).
export function remainingInstallments(rule) {
  if (rule.total_installments == null) return null
  return Math.max(0, rule.total_installments - (rule.generated_count || 0))
}

// Regole "in scadenza": all'ultima rata o già terminate (per il badge/notifica).
export const recurringAlerts = computed(() =>
  state.recurringRules.filter(r => {
    const rem = remainingInstallments(r)
    return rem !== null && rem <= 1
  })
)