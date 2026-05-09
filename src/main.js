import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Transazioni from './views/Transazioni.vue'
import Aggiungi from './views/Aggiungi.vue'
import Stats from './views/Stats.vue'
import Login from './views/Login.vue'
import Dividi from './views/Dividi.vue'
import { state, initAuth } from './lib/store.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: Home, meta: { auth: true } },
    { path: '/transazioni', component: Transazioni, meta: { auth: true } },
    { path: '/aggiungi', component: Aggiungi, meta: { auth: true } },
    { path: '/dividi', component: Dividi, meta: { auth: true } },
    { path: '/stats', component: Stats, meta: { auth: true } },
  ]
})

router.beforeEach((to) => {
  if (to.meta.auth && !state.user) return '/login'
})

initAuth().then(() => {
  createApp(App).use(router).mount('#app')
})
