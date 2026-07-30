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
              <button type="button" class="icon-trigger" @click="togglePicker('edit')">
                <IconPreview :iconKey="editIcon" :color="editColor" :emoji="c.emoji" :name="c.name" />
              </button>
              <input class="name-inp" v-model="editName" />
              <button class="mini-btn ok" @click="salvaEdit(c)">✓</button>
              <button class="mini-btn" @click="chiudiEdit">✕</button>
            </template>
            <template v-else>
              <CatIcon :categoria="c.name" />
              <span class="cat-name">{{ c.name }}</span>
              <button class="mini-btn" @click="apriEdit(c)" aria-label="Modifica">✏️</button>
              <button class="mini-btn danger" @click="rimuovi(c)" aria-label="Elimina">🗑</button>
            </template>
          </div>

          <!-- Picker in modifica -->
          <div v-if="pickerFor === 'edit' && editId && itemKind(editId) === grp.kind" class="picker-panel">
            <IconGrid :selected="editIcon" @pick="pickEdit" />
          </div>

          <!-- Aggiungi -->
          <div class="cat-row add-row">
            <button type="button" class="icon-trigger" @click="togglePicker(grp.kind)">
              <IconPreview :iconKey="forms[grp.kind].icon" :color="forms[grp.kind].color" name="" />
            </button>
            <input class="name-inp" v-model="forms[grp.kind].name" placeholder="Nuova categoria" @keyup.enter="aggiungi(grp.kind)" />
            <button class="mini-btn ok" :disabled="!forms[grp.kind].name.trim()" @click="aggiungi(grp.kind)">+</button>
          </div>

          <!-- Picker in aggiunta -->
          <div v-if="pickerFor === grp.kind" class="picker-panel">
            <IconGrid :selected="forms[grp.kind].icon" @pick="k => pickAdd(grp.kind, k)" />
          </div>
        </div>
      </template>

      <p v-if="msg" class="msg">{{ msg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import {
  state, categorieUscite, categorieEntrate,
  addCategory, updateCategory, deleteCategory,
} from '../lib/store.js'
import { ICON_SET, ICON_MAP } from '../lib/icons.js'
import CatIcon from '../components/CatIcon.vue'

const router = useRouter()
const msg = ref('')

const editId = ref(null)
const editName = ref('')
const editIcon = ref(null)
const editColor = ref('#94a3b8')

// Quale picker è aperto: 'uscita' | 'entrata' | 'edit' | null
const pickerFor = ref(null)

const forms = reactive({
  uscita: { name: '', icon: null, color: '#94a3b8' },
  entrata: { name: '', icon: null, color: '#94a3b8' },
})

const groups = computed(() => [
  { kind: 'uscita', label: 'Uscite', items: categorieUscite.value },
  { kind: 'entrata', label: 'Entrate', items: categorieEntrate.value },
])

function itemKind(id) {
  return state.categories.find(c => c.id === id)?.kind
}

function togglePicker(which) {
  pickerFor.value = pickerFor.value === which ? null : which
}

function pickAdd(kind, key) {
  forms[kind].icon = key
  forms[kind].color = ICON_MAP[key]?.color || '#94a3b8'
  pickerFor.value = null
}

function pickEdit(key) {
  editIcon.value = key
  editColor.value = ICON_MAP[key]?.color || editColor.value
  pickerFor.value = null
}

function apriEdit(c) {
  editId.value = c.id
  editName.value = c.name
  editIcon.value = c.icon || null
  editColor.value = c.color || '#94a3b8'
  pickerFor.value = null
}

function chiudiEdit() {
  editId.value = null
  pickerFor.value = null
}

async function salvaEdit(c) {
  if (!editName.value.trim()) return
  try {
    await updateCategory(c.id, {
      name: editName.value.trim(),
      icon: editIcon.value,
      color: editColor.value,
    })
    chiudiEdit()
  } catch (e) { msg.value = 'Errore nel salvataggio.' }
}

async function aggiungi(kind) {
  const f = forms[kind]
  const name = f.name.trim()
  if (!name) return
  try {
    await addCategory({ name, kind, icon: f.icon, color: f.color })
    f.name = ''
    f.icon = null
    f.color = '#94a3b8'
    pickerFor.value = null
  } catch (e) { msg.value = 'Errore nell\'aggiunta.' }
}

async function rimuovi(c) {
  if (!confirm(`Eliminare la categoria "${c.name}"? Potrà essere recuperata dal database; i movimenti già registrati la mantengono come testo.`)) return
  try {
    await deleteCategory(c.id)
  } catch (e) { msg.value = 'Errore nell\'eliminazione.' }
}

// —— Componenti inline: anteprima icona + griglia di scelta ——
const IconPreview = {
  props: { iconKey: String, color: String, emoji: String, name: String },
  setup(p) {
    return () => {
      const ic = ICON_MAP[p.iconKey]
      if (ic) {
        return h('span', { class: 'ip-wrap', style: { background: (p.color || '#94a3b8') + '22', color: p.color || '#94a3b8' } }, [
          h('svg', { viewBox: ic.v, fill: 'none', class: 'ip-svg' }, [
            ...(ic.s || []).map(d => h('path', { d, stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
            ...(ic.f || []).map(d => h('path', { d, fill: 'currentColor' })),
          ]),
        ])
      }
      // fallback: emoji della categoria (se legacy) o segnaposto
      return h('span', { class: 'ip-wrap ip-empty' }, p.emoji || '🎨')
    }
  },
}

const IconGrid = {
  props: { selected: String },
  emits: ['pick'],
  setup(p, { emit }) {
    return () => h('div', { class: 'icon-grid' }, ICON_SET.map(ic =>
      h('button', {
        type: 'button',
        class: ['icon-cell', { sel: p.selected === ic.key }],
        title: ic.label,
        onClick: () => emit('pick', ic.key),
      }, [
        h('span', { class: 'ic-badge', style: { background: ic.color + '22', color: ic.color } }, [
          h('svg', { viewBox: ic.v, fill: 'none', class: 'ic-svg' }, [
            ...(ic.s || []).map(d => h('path', { d, stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
            ...(ic.f || []).map(d => h('path', { d, fill: 'currentColor' })),
          ]),
        ]),
      ])
    ))
  },
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
.cat-name { flex: 1; font-size: 0.92rem; font-weight: 500; }
.name-inp {
  flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); font-family: 'Figtree', sans-serif; font-size: 0.9rem; padding: 0.45rem 0.6rem; outline: none;
}
.name-inp:focus { border-color: var(--accent); }
.add-row { background: var(--surface2); }

.icon-trigger {
  background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0;
}
:deep(.ip-wrap) {
  width: 38px; height: 38px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
}
:deep(.ip-svg) { width: 20px; height: 20px; }
:deep(.ip-empty) { background: var(--surface); border: 1px dashed var(--border); }

.picker-panel { padding: 0.75rem 0.9rem; background: var(--surface2); border-bottom: 1px solid var(--border); }
:deep(.icon-grid) {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem;
}
:deep(.icon-cell) {
  background: none; border: 1px solid transparent; border-radius: 12px;
  padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
:deep(.icon-cell.sel) { border-color: var(--accent); background: rgba(198, 113, 57,0.08); }
:deep(.ic-badge) {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
:deep(.ic-svg) { width: 20px; height: 20px; }

.mini-btn {
  background: none; border: none; cursor: pointer; font-size: 1rem;
  padding: 4px 6px; color: var(--text2); border-radius: 8px;
}
.mini-btn.ok { color: var(--accent); font-weight: 700; font-size: 1.2rem; }
.mini-btn.ok:disabled { opacity: 0.4; cursor: not-allowed; }
.mini-btn.danger { color: var(--red); }
.msg { font-size: 0.82rem; color: var(--red); }
</style>
