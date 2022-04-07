import {createApp} from 'vue'
import App from './App.vue'
import createStore from './store'
import {createVuetify} from 'vuetify'

const store = createStore()
const app = createApp({
    ...App
})

const vuetify = createVuetify()

app.use(vuetify)
app.use(store)

app.mount('#app')
