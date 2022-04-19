import {createApp} from 'vue'
import App from './App.vue'
import MainPage from './components/MainPage.vue'
import SideBar from './components/Sidebar.vue'
import { Quasar } from 'quasar'
import '@quasar/extras/roboto-font/roboto-font.css'
import '@quasar/extras/material-icons/material-icons.css'

import 'quasar/src/css/index.sass'
import { createPinia } from 'pinia'
const pinia = createPinia()

const app = createApp({
    ...App
})

app.use(Quasar, {
    plugins: {}, // import Quasar plugins and add here
  })
app.use(pinia)

app
    .component('MainPage', MainPage)
    .component('SideBar', SideBar)

app.mount('#app')