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
    transcriptomicsSymbolDict: {},
    proteomicsTableHeaders: [],
    proteomicsTableData: [],
    proteomicsData: null,
    proteomicsSymbolDict: {},
    usedSymbolCols: {"transcriptomics": null, "proteomics": null},
    overlay: false,
    graphData: null,
    fcs: null,
    pathwayLayouting: {"pathway_list": ["empty"], "pathway_node_dictionary": null},


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
    setTranscriptomicsSymbolDict(state,val){
      state.transcriptomicsSymbolDict = val
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
    setProteomicsSymbolDict(state,val){
      state.proteomicsSymbolDict = val
    },
    setUsedSymbolCols(state,val){
      state.usedSymbolCols = val
    },
    setOverlay(state,val){
      state.overlay=val
    },
    setGraphData(state,val){
      state.graphData=val
    },
    setFCS(state,val){
      state.fcs = val
    },
    setPathwayLayouting(state, val){
      state.pathwayLayouting = val
    }
  }
})
new Vue({
  vuetify,
  store: store,
  render: h => h(App)
}).$mount('#app')

