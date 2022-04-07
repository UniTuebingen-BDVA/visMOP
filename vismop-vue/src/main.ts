import {createApp} from 'vue'
import App from './App.vue'
import createStore from './store'
import { createVuetify } from 'vuetify'
import { loadFonts } from './plugins/webfontloader'
loadFonts()
const store = createStore()
const app = createApp({
    ...App
})

const vuetify = createVuetify()

app.use(vuetify)
app.use(store)

app.mount('#app')
