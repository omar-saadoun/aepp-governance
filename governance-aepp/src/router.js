import Router from 'vue-router'
import Home from './views/Home.vue'
import Create from './views/Create.vue'
import Poll from "./views/Poll.vue";
import Account from "./views/Account.vue";

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {title: 'Democracia líquida'}
  }, {
    path: '/create',
    name: 'create',
    component: Create,
    meta: {title: 'Crear'}
  }, {
    path: '/account/:account',
    name: 'account',
    component: Account,
    meta: {title: 'Cuenta'}
  }, {
    path: '/poll/:id',
    name: 'poll',
    component: Poll,
    meta: {title: 'Consulta'}
  }
]

const router = new Router({mode: 'hash', routes: routes})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} - Partido Digital`
  next()
})

export default router;
