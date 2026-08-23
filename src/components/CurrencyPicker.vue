<template>
  <transition name="sheet">
    <div v-if="open" class="sheet-overlay" @click.self="close">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <p class="sheet-title">Scegli valuta</p>
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input ref="searchInput" v-model="q" class="search-input" placeholder="Cerca valuta o codice..." />
        </div>
        <div class="cur-list">
          <button v-for="c in filtered" :key="c.code" type="button" class="cur-row"
            :class="{ sel: c.code === modelValue }" @click="pick(c.code)">
            <span class="cur-sym">{{ c.symbol }}</span>
            <span class="cur-info">
              <span class="cur-name">{{ c.name }}</span>
              <span class="cur-code">{{ c.code }}</span>
            </span>
            <span v-if="c.code === modelValue" class="cur-check">✓</span>
          </button>
          <div v-if="!filtered.length" class="cur-empty">Nessuna valuta trovata</div>
        </div>
        <button class="close-btn" @click="close">Chiudi</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { CURRENCIES } from '../lib/currencies.js'

const props = defineProps({
  open: Boolean,
  modelValue: String, // codice valuta selezionato
})
const emit = defineEmits(['update:modelValue', 'close'])

const q = ref('')
const searchInput = ref(null)

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return CURRENCIES
  return CURRENCIES.filter(c =>
    c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
  )
})

function pick(code) {
  emit('update:modelValue', code)
  close()
}
function close() {
  q.value = ''
  emit('close')
}

// Focus sul campo di ricerca all'apertura.
watch(() => props.open, (v) => {
  if (v) nextTick(() => searchInput.value?.focus())
})
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  background: var(--surface);
  border-radius: 24px 24px 0 0;
  border-top: 1px solid var(--border);
  padding: 1rem 1.25rem 1.5rem;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 80vh;
}
.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 100px;
  align-self: center;
}
.sheet-title {
  font-size: 1.05rem;
  font-weight: 700;
  text-align: center;
}
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon {
  position: absolute; left: 0.8rem; width: 16px; height: 16px; color: var(--text2);
}
.search-input {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: 'Figtree', sans-serif;
  font-size: 0.9rem;
  padding: 0.65rem 1rem 0.65rem 2.4rem;
  outline: none;
}
.search-input:focus { border-color: var(--accent); }
.cur-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.cur-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: var(--surface2);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  color: var(--text);
  text-align: left;
}
.cur-row.sel { border-color: var(--accent); background: rgba(198, 113, 57, 0.1); }
.cur-sym {
  width: 32px;
  font-family: 'DM Mono', monospace;
  font-size: 1rem;
  color: var(--text2);
  text-align: center;
  flex-shrink: 0;
}
.cur-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cur-name { font-size: 0.9rem; font-weight: 600; }
.cur-code { font-size: 0.72rem; color: var(--text2); letter-spacing: 0.04em; }
.cur-check { color: var(--accent); font-weight: 700; }
.cur-empty { padding: 1.5rem; text-align: center; color: var(--text2); font-size: 0.88rem; }
.close-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text2);
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  padding: 0.8rem;
  cursor: pointer;
}
.sheet-enter-active, .sheet-leave-active { transition: all 0.25s ease; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>
