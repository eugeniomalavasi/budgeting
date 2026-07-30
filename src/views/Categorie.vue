<template>
  <div class="page cat-page">
    <div class="cat-header">
      <button class="back-btn" @click="router.back()" aria-label="Indietro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <h1 class="cat-title">Categorie</h1>
    </div>

    <div class="px">
      <template v-for="grp in groups" :key="grp.kind">
        <p class="section-label">{{ grp.label }}</p>
        <div class="card list">
          <div v-for="c in grp.items" :key="c.id" class="cat-row">
            <template v-if="editId === c.id">
              <input class="emoji-inp" v-model="editEmoji" maxlength="2" />
              <input class="name-inp" v-model="editName" />
              <button class="mini-btn ok" @click="salvaEdit(c)">✓</button>
              <button class="mini-btn" @click="editId = null">✕</button>
            </template>
            <template v-else>
              <span class="cat-emoji" :style="{ background: (c.color || '#94a3b8') + '22' }">{{ c.emoji }}</span>
              <span class="cat-name">{{ c.name }}</span>
              <button class="mini-btn" @click="apriEdit(c)" aria-label="Modifica">✏️</button>
              <button class="mini-btn danger" @click="rimuovi(c)" aria-label="Elimina">🗑</button>
            </template>
          </div>

          <!-- Aggiungi -->
          <div class="cat-row add-row">
            <input class="emoji-inp" v-model="forms[grp.kind].emoji" maxlength="2" placeholder="🙂" />
            <input class="name-inp" v-model="forms[grp.kind].name" placeholder="Nuova categoria" @keyup.enter="aggiungi(grp.kind)" />
            <button class="mini-btn ok" :disabled="!forms[grp.kind].name.trim()" @click="aggiungi(grp.kind)">+</button>
          </div>
        </div>
      </template>

      <p v-if="msg" class="msg">{{ msg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  state, categorieUscite, categorieEntrate,
  addCategory, updateCategory, deleteCategory,
} from '../lib/store.js'

const router = useRouter()
const msg = ref('')

const editId = ref(null)
const editName = ref('')
const editEmoji = ref('')

const forms = reactive({
  uscita: { name: '', emoji: '' },
  entrata: { name: '', emoji: '' },
})

const groups = computed(() => [
  { kind: 'uscita', label: 'Uscite', items: categorieUscite.value },
  { kind: 'entrata', label: 'Entrate', items: categorieEntrate.value },
])

function apriEdit(c) {
  editId.value = c.id
  editName.value = c.name
  editEmoji.value = c.emoji || ''
}

async function salvaEdit(c) {
  if (!editName.value.trim()) return
  try {
    await updateCategory(c.id, { name: editName.value.trim(), emoji: editEmoji.value || '📦' })
    editId.value = null
  } catch (e) { msg.value = 'Errore nel salvataggio.' }
}

async function aggiungi(kind) {
  const f = forms[kind]
  const name = f.name.trim()
  if (!name) return
  try {
    await addCategory({ name, kind, emoji: f.emoji || '📦', color: '#94a3b8' })
    f.name = ''
    f.emoji = ''
  } catch (e) { msg.value = 'Errore nell\'aggiunta.' }
}

async function rimuovi(c) {
  if (!confirm(`Eliminare la categoria "${c.name}"? I movimenti già registrati la mantengono come testo.`)) return
  try {
    await deleteCategory(c.id)
  } catch (e) { msg.value = 'Errore nell\'eliminazione.' }
}
</script>

<style scoped>
.cat-page { padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px); }
.cat-header { display: flex; align-items: center; gap: 0.5rem; padding: 1.25rem 1.25rem 0.75rem; }
.back-btn {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  color: var(--text); cursor: pointer;
}
.back-btn svg { width: 20px; height: 20px; }
.cat-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
.px { padding: 0 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
.section-label { font-size: 0.72rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.75rem; }
.list { overflow: hidden; }
.cat-row {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.6rem 0.9rem; border-bottom: 1px solid var(--border);
}
.cat-row:last-child { border-bottom: none; }
.cat-emoji {
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
}
.cat-name { flex: 1; font-size: 0.92rem; font-weight: 500; }
.emoji-inp {
  width: 44px; text-align: center; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: 1rem; padding: 0.4rem; outline: none;
}
.name-inp {
  flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); font-family: 'Lexend', sans-serif; font-size: 0.9rem; padding: 0.45rem 0.6rem; outline: none;
}
.name-inp:focus, .emoji-inp:focus { border-color: var(--accent); }
.add-row { background: var(--surface2); }
.mini-btn {
  background: none; border: none; cursor: pointer; font-size: 1rem;
  padding: 4px 6px; color: var(--text2); border-radius: 8px;
}
.mini-btn.ok { color: var(--accent); font-weight: 700; font-size: 1.2rem; }
.mini-btn.ok:disabled { opacity: 0.4; cursor: not-allowed; }
.mini-btn.danger { color: var(--red); }
.msg { font-size: 0.82rem; color: var(--red); }
</style>
