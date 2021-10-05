import Vue from 'vue'
import Vuex from 'vuex'
import App from './App.vue'
import vuetify from './plugins/vuetify';

Vue.config.productionTip = false
Vue.use(Vuex)
export const store = new Vuex.Store({
  state:{
    sideBarExpand: true,
    transcriptomicsTableHeaders: [],
    transcriptomicsTableData: [],
    transcriptomicsData: null,
    proteomicsTableHeaders: [],
    proteomicsTableData: [],
    proteomicsData: null,
    graphData: null,
    fcs: null,


  },
  mutations:{
    setSideBarExpand(state, val){
      state.sideBarExpand = val
    },
    setTranscriptomicsTableHeaders(state, val){
      state.transcriptomicsTableHeaders = val
      console.log(state.transcriptomicsTableHeaders)
    },
    setTranscriptomicsTableData(state, val){
      state.transcriptomicsTableData = val
    },
    setTranscriptomicsData(state, val){
      state.transcriptomicsData = val
    },
    setProteomicsTableHeaders(state, val){
      state.proteomicsTableHeaders = val
    },
    setProteomicsTableData(state, val){
      state.proteomicsTableData = val
    },
    setProteomicsData(state, val){
      state.transcriptomicsData = val
    },
    setGraphData(state,val){
      state.graphData=val
    },
    setFCS(state,val){
      state.fcs = val
    }
  }
})
new Vue({
  vuetify,
  store: store,
  render: h => h(App)
}).$mount('#app')

