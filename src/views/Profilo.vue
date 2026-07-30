<template>
  <div class="page profile-page">
    <div class="profile-header">
      <button class="back-btn" @click="router.back()" aria-label="Indietro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1 class="profile-title">Profilo</h1>
    </div>

    <div class="px">
      <!-- Card identità -->
      <div class="card id-card">
        <div class="avatar-lg">{{ initial }}</div>
        <div class="id-info">
          <p class="id-name">{{ state.profile?.name || '—' }}</p>
          <p class="id-email">{{ state.user?.email }}</p>
        </div>
      </div>

      <!-- Richieste ricevute -->
      <div v-if="state.invitations.length" class="card sect invite-incoming">
        <label class="sect-label">Richieste di partecipazione</label>
        <div v-for="inv in state.invitations" :key="inv.id" class="invite-row">
          <span class="invite-text">Invito al gruppo <b>{{ inv.group_name }}</b></span>
          <div class="invite-actions">
            <button class="btn-accept" @click="rispondi(inv.id, true)">Accetta</button>
            <button class="btn-decline" @click="rispondi(inv.id, false)">Rifiuta</button>
          </div>
        </div>
      </div>

      <!-- Gruppi -->
      <div class="card sect">
        <label class="sect-label">I tuoi gruppi</label>
        <div class="groups-list">
          <button
            v-for="g in state.groups"
            :key="g.household_id"
            class="group-row"
            :class="{ active: g.household_id === state.activeGroupId }"
            @click="scegliGruppo(g.household_id)"
          >
            <span class="group-name">{{ g.name }}</span>
            <span v-if="g.household_id === state.activeGroupId" class="group-badge">Attivo</span>
            <span v-else class="group-switch">Passa →</span>
          </button>
        </div>
        <div class="row-inline">
          <input v-model="newGroupName" type="text" class="inp" placeholder="Nome nuovo gruppo" />
          <button class="btn-sm" :disabled="creatingGroup || !newGroupName.trim()" @click="creaGruppo">
            {{ creatingGroup ? '...' : 'Crea' }}
          </button>
        </div>
        <button
          v-if="canDeleteActive"
          class="btn-danger"
          :disabled="deletingGroup"
          @click="eliminaGruppo"
        >
          {{ deletingGroup ? '...' : `Elimina gruppo “${activeGroupName}”` }}
        </button>
        <p v-if="groupMsg" class="msg ok">{{ groupMsg }}</p>
        <p v-if="groupErr" class="msg err">{{ groupErr }}</p>
      </div>

      <!-- Invita nel gruppo attivo -->
      <div class="card sect">
        <label class="sect-label">Invita nel gruppo attivo</label>
        <div class="row-inline">
          <input v-model="inviteEmail" type="email" class="inp" placeholder="email@persona.com" autocomplete="off" />
          <button class="btn-sm" :disabled="inviting || !inviteEmail.trim()" @click="invita">
            {{ inviting ? '...' : 'Invita' }}
          </button>
        </div>
        <div v-if="state.sentInvitations.length" class="sent-list">
          <div v-for="s in state.sentInvitations" :key="s.id" class="sent-row">
            <span class="sent-email">{{ s.email }}</span>
            <span class="sent-status">in attesa</span>
            <button class="sent-cancel" @click="annullaInvito(s.id)" aria-label="Annulla">✕</button>
          </div>
        </div>
        <p v-if="invitingMsg" class="msg ok">{{ invitingMsg }}</p>
        <p class="hint">La persona deve avere un account con questa email; vedrà la richiesta nel suo profilo.</p>
      </div>

      <!-- Categorie -->
      <router-link to="/categorie" class="card sect nav-link">
        <span class="nav-link-text">🏷️ Gestisci categorie</span>
        <span class="nav-link-arrow">›</span>
      </router-link>

      <!-- Nome -->
      <div class="card sect">
        <label class="sect-label">Nome visualizzato</label>
        <div class="row-inline">
          <input v-model="name" type="text" class="inp" placeholder="Il tuo nome" />
          <button class="btn-sm" :disabled="savingName || name.trim() === state.profile?.name || !name.trim()" @click="saveName">
            {{ savingName ? '...' : 'Salva' }}
          </button>
        </div>
        <p v-if="nameMsg" class="msg ok">{{ nameMsg }}</p>
      </div>

      <!-- Cambio password -->
      <div class="card sect">
        <label class="sect-label">Cambia password</label>
        <div class="input-wrap">
          <input v-model="pw1" :type="showPw ? 'text' : 'password'" class="inp" placeholder="Nuova password" autocomplete="new-password" />
          <button type="button" class="eye-btn" @click="showPw = !showPw" tabindex="-1">
            <svg v-if="!showPw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
        <input v-model="pw2" :type="showPw ? 'text' : 'password'" class="inp" placeholder="Conferma password" autocomplete="new-password" style="margin-top:8px" />
        <button class="btn-full" :disabled="savingPw" @click="changePw">
          {{ savingPw ? '...' : 'Aggiorna password' }}
        </button>
        <p v-if="pwErr" class="msg err">{{ pwErr }}</p>
        <p v-if="pwMsg" class="msg ok">{{ pwMsg }}</p>
      </div>

      <!-- Logout -->
      <button class="btn-logout" @click="logout">Disconnetti</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  state, updateProfileName, updatePassword, signOut, switchGroup, createGroup, deleteGroup,
  loadSentInvitations, createInvitation, cancelInvitation, respondInvitation,
} from '../lib/store.js'

const router = useRouter()

const name = ref(state.profile?.name || '')

// Gruppi
const newGroupName = ref('')
const creatingGroup = ref(false)
const groupMsg = ref('')
const groupErr = ref('')
const deletingGroup = ref(false)

const activeGroup = computed(() =>
  state.groups.find(g => g.household_id === state.activeGroupId)
)
const activeGroupName = computed(() => activeGroup.value?.name || 'gruppo')
// Solo l'owner può eliminare, e mai l'ultimo gruppo rimasto.
const canDeleteActive = computed(() =>
  activeGroup.value?.role === 'owner' && state.groups.length > 1
)

async function eliminaGruppo() {
  groupErr.value = ''
  groupMsg.value = ''
  const nome = activeGroupName.value
  const ok = confirm(
    `⚠️ Eliminare il gruppo “${nome}”?\n\n` +
    `Tutti i suoi dati — movimenti, spese condivise, categorie e mesi — verranno rimossi dall'app per TUTTI i membri.\n\n` +
    `I dati non vengono cancellati definitivamente e restano recuperabili dal database, ma il gruppo sparirà dall'app.\n\n` +
    `Vuoi procedere?`
  )
  if (!ok) return
  deletingGroup.value = true
  try {
    await deleteGroup(state.activeGroupId)
    name.value = state.profile?.name || ''
    groupMsg.value = `Gruppo “${nome}” eliminato.`
    setTimeout(() => (groupMsg.value = ''), 3000)
  } catch (e) {
    groupErr.value = e?.message || 'Errore nell\'eliminazione del gruppo.'
  } finally {
    deletingGroup.value = false
  }
}

// Inviti
const inviteEmail = ref('')
const invitingMsg = ref('')
const inviting = ref(false)

async function invita() {
  invitingMsg.value = ''
  const email = inviteEmail.value.trim()
  if (!email) return
  inviting.value = true
  try {
    await createInvitation(email)
    inviteEmail.value = ''
    invitingMsg.value = 'Invito creato. La persona lo vedrà nel suo profilo.'
    setTimeout(() => (invitingMsg.value = ''), 3000)
  } catch (e) {
    invitingMsg.value = 'Errore nell\'invito.'
  } finally {
    inviting.value = false
  }
}

async function annullaInvito(id) {
  try { await cancelInvitation(id) } catch (e) { /* noop */ }
}

async function rispondi(id, accept) {
  try {
    await respondInvitation(id, accept)
    name.value = state.profile?.name || ''
  } catch (e) { /* noop */ }
}

onMounted(() => { loadSentInvitations() })

async function scegliGruppo(householdId) {
  if (householdId === state.activeGroupId) return
  groupMsg.value = ''
  try {
    await switchGroup(householdId)
    name.value = state.profile?.name || ''
    groupMsg.value = 'Gruppo attivo cambiato.'
    setTimeout(() => (groupMsg.value = ''), 2000)
  } catch (e) {
    groupMsg.value = ''
  }
}

async function creaGruppo() {
  groupMsg.value = ''
  creatingGroup.value = true
  try {
    await createGroup(newGroupName.value.trim())
    newGroupName.value = ''
    name.value = state.profile?.name || ''
    groupMsg.value = 'Gruppo creato e attivato.'
    setTimeout(() => (groupMsg.value = ''), 2000)
  } catch (e) {
    groupMsg.value = ''
  } finally {
    creatingGroup.value = false
  }
}
const savingName = ref(false)
const nameMsg = ref('')

const pw1 = ref('')
const pw2 = ref('')
const showPw = ref(false)
const savingPw = ref(false)
const pwErr = ref('')
const pwMsg = ref('')

const initial = computed(() =>
  (state.profile?.name || state.user?.email || '?').trim().charAt(0).toUpperCase()
)

async function saveName() {
  nameMsg.value = ''
  savingName.value = true
  try {
    await updateProfileName(name.value.trim())
    nameMsg.value = 'Nome aggiornato'
    setTimeout(() => (nameMsg.value = ''), 2500)
  } catch (e) {
    nameMsg.value = ''
  } finally {
    savingName.value = false
  }
}

async function changePw() {
  pwErr.value = ''
  pwMsg.value = ''
  if (pw1.value.length < 6) { pwErr.value = 'Minimo 6 caratteri.'; return }
  if (pw1.value !== pw2.value) { pwErr.value = 'Le password non coincidono.'; return }
  savingPw.value = true
  try {
    await updatePassword(pw1.value)
    pw1.value = ''
    pw2.value = ''
    pwMsg.value = 'Password aggiornata.'
    setTimeout(() => (pwMsg.value = ''), 2500)
  } catch (e) {
    pwErr.value = 'Errore nell\'aggiornamento. Riprova.'
  } finally {
    savingPw.value = false
  }
}

async function logout() {
  await signOut()
  router.push('/login')
}
</script>

<style scoped>
.profile-page { padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px); }

.profile-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1.25rem 0.75rem;
}
.back-btn {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text); cursor: pointer;
}
.back-btn svg { width: 20px; height: 20px; }
.profile-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }

.px { padding: 0 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

.id-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; }
.avatar-lg {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #f5ead8; font-weight: 700; font-size: 1.5rem;
  display: flex; align-items: center; justify-content: center; flex: 0 0 56px;
}
.id-name { font-size: 1.1rem; font-weight: 600; }
.id-email { color: var(--text2); font-size: 0.85rem; margin-top: 2px; }

.sect { padding: 1.25rem; display: flex; flex-direction: column; gap: 10px; }
.sect-label { font-size: 0.78rem; font-weight: 600; color: var(--text2); letter-spacing: 0.04em; text-transform: uppercase; }

.inp {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
  color: var(--text); font-family: 'Figtree', sans-serif; font-size: 0.95rem;
  padding: 0.75rem 1rem; outline: none; width: 100%; transition: border-color 0.2s;
}
.inp:focus { border-color: var(--accent); }

.row-inline { display: flex; gap: 8px; }
.row-inline .inp { flex: 1; }

.input-wrap { position: relative; display: flex; align-items: center; }
.input-wrap .inp { padding-right: 2.8rem; }
.eye-btn {
  position: absolute; right: 0.75rem; background: none; border: none;
  color: var(--text2); cursor: pointer; padding: 4px; display: flex; align-items: center;
}
.eye-btn svg { width: 18px; height: 18px; }

.btn-sm {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
  color: var(--text); font-family: 'Figtree', sans-serif; font-weight: 600; font-size: 0.9rem;
  padding: 0 1rem; cursor: pointer; white-space: nowrap;
}
.btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-full {
  margin-top: 4px;
  background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #f5ead8;
  border: none; border-radius: 12px; font-family: 'Figtree', sans-serif;
  font-weight: 700; font-size: 0.95rem; padding: 0.8rem; cursor: pointer;
}
.btn-full:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-danger {
  margin-top: 2px;
  background: rgba(176, 74, 44,0.1); border: 1px solid rgba(176, 74, 44,0.3);
  border-radius: 12px; color: var(--red); font-family: 'Figtree', sans-serif;
  font-weight: 600; font-size: 0.88rem; padding: 0.7rem; cursor: pointer;
}
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-logout {
  margin-top: 0.5rem;
  background: rgba(176, 74, 44,0.1); border: 1px solid rgba(176, 74, 44,0.3);
  border-radius: 14px; color: var(--red); font-family: 'Figtree', sans-serif;
  font-weight: 600; font-size: 0.95rem; padding: 0.9rem; cursor: pointer;
}
.btn-logout:active { transform: scale(0.98); }

.groups-list { display: flex; flex-direction: column; gap: 0.4rem; }
.group-row {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
  padding: 0.7rem 0.9rem; cursor: pointer;
  font-family: 'Figtree', sans-serif; color: var(--text);
}
.group-row.active { border-color: var(--accent); background: rgba(198, 113, 57,0.08); }
.group-name { font-size: 0.9rem; font-weight: 600; }
.group-badge { font-size: 0.7rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
.group-switch { font-size: 0.8rem; color: var(--text2); }

.invite-incoming { border-color: rgba(198, 113, 57,0.4); }
.invite-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.75rem; flex-wrap: wrap;
}
.invite-text { font-size: 0.9rem; }
.invite-actions { display: flex; gap: 0.4rem; }
.btn-accept {
  background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #f5ead8;
  border: none; border-radius: 10px; font-family: 'Figtree', sans-serif; font-weight: 700;
  font-size: 0.85rem; padding: 0.45rem 0.9rem; cursor: pointer;
}
.btn-decline {
  background: transparent; color: var(--text2);
  border: 1px solid var(--border); border-radius: 10px;
  font-family: 'Figtree', sans-serif; font-weight: 600; font-size: 0.85rem;
  padding: 0.45rem 0.9rem; cursor: pointer;
}

.sent-list { display: flex; flex-direction: column; gap: 0.35rem; }
.sent-row {
  display: flex; align-items: center; gap: 0.5rem;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 10px; padding: 0.5rem 0.75rem;
}
.sent-email { flex: 1; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sent-status { font-size: 0.72rem; color: var(--text2); }
.sent-cancel {
  background: none; border: none; color: var(--text2); cursor: pointer;
  font-size: 0.9rem; padding: 2px 4px;
}
.hint { font-size: 0.75rem; color: var(--text2); line-height: 1.35; }

.nav-link {
  display: flex; flex-direction: row; align-items: center; justify-content: space-between;
  text-decoration: none; color: var(--text); cursor: pointer;
}
.nav-link-text { font-size: 0.95rem; font-weight: 600; }
.nav-link-arrow { font-size: 1.4rem; color: var(--text2); }

.msg { font-size: 0.82rem; }
.msg.ok { color: var(--green); }
.msg.err { color: var(--red); }
</style>
