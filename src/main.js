import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Transazioni from './views/Transazioni.vue'
import Aggiungi from './views/Aggiungi.vue'
import Stats from './views/Stats.vue'
import Login from './views/Login.vue'
import ResetPassword from './views/ResetPassword.vue'
import Profilo from './views/Profilo.vue'
import Categorie from './views/Categorie.vue'
import Dividi from './views/Dividi.vue'
import Ricorrenti from './views/Ricorrenti.vue'
import RicorrenteForm from './views/RicorrenteForm.vue'
import { state, authFlow, initAuth, loadMonths, loadTransactions, loadSharedExpenses } from './lib/store.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/reset', component: ResetPassword },
    { path: '/', component: Home, meta: { auth: true } },
    { path: '/transazioni', component: Transazioni, meta: { auth: true } },
    { path: '/aggiungi', component: Aggiungi, meta: { auth: true } },
    { path: '/dividi', component: Dividi, meta: { auth: true } },
    { path: '/stats', component: Stats, meta: { auth: true } },
    { path: '/profilo', component: Profilo, meta: { auth: true } },
    { path: '/categorie', component: Categorie, meta: { auth: true } },
    { path: '/ricorrenti', component: Ricorrenti, meta: { auth: true } },
    { path: '/ricorrenti/:id', component: RicorrenteForm, meta: { auth: true } },
  ]
})

router.beforeEach(async (to) => {
  // Flusso di recupero password: Supabase ha creato una sessione temporanea,
  // ma l'utente deve prima impostare la nuova password.
  if (authFlow.recovery && to.path !== '/reset') return '/reset'
  if (to.meta.auth && !state.user) return '/login'
})

// Forza reload dati freschi ad ogni navigazione
router.afterEach(async (to) => {
  if (!state.user) return
  // Ricarica sempre mesi e transazioni del mese corrente
  if (to.meta.auth) {
    await loadMonths()
    if (state.currentMonthId) {
      await loadTransactions(state.currentMonthId)
    }
  }
  // Ricarica shared expenses solo sulla pagina dividi
  if (to.path === '/dividi') {
    await loadSharedExpenses()
  }
})

initAuth().then(() => {
  createApp(App).use(router).mount('#app')
})
