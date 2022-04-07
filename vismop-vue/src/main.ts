import {createApp} from 'vue'
import App from './App.vue'
import MainPage from './components/MainPage.vue'
import SideBar from './components/Sidebar.vue'
import createStore from './store'
import { Quasar } from 'quasar'
import '@quasar/extras/roboto-font/roboto-font.css'
import '@quasar/extras/material-icons/material-icons.css'

import 'quasar/src/css/index.sass'

const store = createStore()
const app = createApp({
    ...App
})

app.use(Quasar, {
    plugins: {}, // import Quasar plugins and add here
  })
app.use(store)

app
    .component('MainPage', MainPage)
    .component('SideBar', SideBar)

app.mount('#app')