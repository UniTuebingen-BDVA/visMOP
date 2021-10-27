import Vue from 'vue'
import Vuex from 'vuex'
import _ from 'lodash'

Vue.use(Vuex)
interface State {
  sideBarExpand: boolean
  overviewData: unknown,
  transcriptomicsTableHeaders: unknown,
  transcriptomicsTableData: unknown,
  transcriptomicsData: unknown,
  transcriptomicsSymbolDict: { [key: string]: string },
  transcriptomicsKeggIDDict: { [key: string]: string },
  proteomicsTableHeaders: unknown,
  proteomicsTableData: unknown,
  clickedNodes: { id: string, name: string }[],
  proteomicsData: unknown,
  proteomicsSymbolDict: { [key: string]: string },
  usedSymbolCols: unknown,
  overlay: unknown,
  graphData: unknown,
  fcs: unknown,
  pathwayLayouting: unknown
}
export default new Vuex.Store({
  state: {
    sideBarExpand: true,
    overviewData: null,
    transcriptomicsTableHeaders: [],
    transcriptomicsTableData: [],
    transcriptomicsData: null,
    transcriptomicsSymbolDict: {},
    transcriptomicsKeggIDDict: {},
    proteomicsTableHeaders: [],
    proteomicsTableData: [],
    clickedNodes: [],
    proteomicsData: null,
    proteomicsSymbolDict: {},
    usedSymbolCols: { transcriptomics: null, proteomics: null },
    overlay: false,
    graphData: null,
    fcs: null,
    pathwayLayouting: {
      pathway_list: ['empty'],
      pathway_node_dictionary: null
    }
  } as State,
  mutations: {
    APPEND_CLICKEDNODE (state, val) {
      state.clickedNodes.push(val)
    },
    REMOVE_CLICKEDNODE (state, val) {
      state.clickedNodes.splice(val, 1)
    },
    SET_SIDEBAREXPAND (state, val) {
      state.sideBarExpand = val
    },
    SET_OVERVIEWDATA (state, val) {
      state.overviewData = val
    },
    SET_TRANSCRIPTOMICSTABLEHEADERS (state, val) {
      state.transcriptomicsTableHeaders = val
    },
    SET_TRANSCRIPTOMICSTABLEDATA (state, val) {
      state.transcriptomicsTableData = val
    },
    SET_TRANSCRIPTOMICSDATA (state, val) {
      state.transcriptomicsData = val
    },
    SET_TRANSCRIPTOMICSSYMBOLDICT (state, val) {
      state.transcriptomicsSymbolDict = val
    },
    SET_TRANSCRIPTOMICSKEGGIDDICT (state, val) {
      state.transcriptomicsKeggIDDict = val
    },
    SET_PROTEOMICSTABLEHEADER (state, val) {
      state.proteomicsTableHeaders = val
    },
    SET_PROTEOMICSTABLEDATA (state, val) {
      state.proteomicsTableData = val
    },
    SET_PROTEOMICSDATA (state, val) {
      state.transcriptomicsData = val
    },
    SET_PROTEOMICSSYMBOLDICT (state, val) {
      state.proteomicsSymbolDict = val
    },
    SET_USEDSYMBOLS (state, val) {
      state.usedSymbolCols = val
    },
    SET_OVERLAY (state, val) {
      state.overlay = val
    },
    SET_GRAPHDATA (state, val) {
      state.graphData = val
    },
    SET_FCS (state, val) {
      state.fcs = val
    },
    SET_PATHWAYLAYOUTING (state, val) {
      state.pathwayLayouting = val
    }
  },
  actions: {
    addClickedNode ({ commit, state }, val) {
      const enteredKeys = state.clickedNodes.map(row => { return row.id })
      if (!enteredKeys.includes(val)) {
        const tableEntry = { id: val, name: state.transcriptomicsKeggIDDict[val], delete: val }
        commit('APPEND_CLICKEDNODE', tableEntry)
      }
    },
    removeClickedNode ({ commit, state }, val) {
      console.log('removedNode', val)

      const indexNode = state.clickedNodes.map(row => { return row.id }).indexOf(val)
      console.log('removedNode', indexNode)
      if (indexNode > -1) {
        commit('REMOVE_CLICKEDNODE', indexNode)
      }
    },
    setSideBarExpand ({ commit }, val) {
      commit('SET_SIDEBAREXPAND', val)
    },
    setOverviewData ({ commit }, val) {
      commit('SET_OVERVIEWDATA', val)
    },
    setTranscriptomicsTableHeaders ({ commit }, val) {
      commit('SET_TRANSCRIPTOMICSTABLEHEADERS', val)
    },
    setTranscriptomicsTableData ({ commit }, val) {
      commit('SET_TRANSCRIPTOMICSTABLEDATA', val)
    },
    setTranscriptomicsData ({ commit }, val) {
      commit('SET_TRANSCRIPTOMICSDATA', val)
    },
    setTranscriptomicsSymbolDict ({ commit }, val) {
      commit('SET_TRANSCRIPTOMICSSYMBOLDICT', val)
      commit('SET_TRANSCRIPTOMICSKEGGIDDICT', _.invert(val))
    },
    setProteomicsTableHeaders ({ commit }, val) {
      commit('SET_PROTEOMICSTABLEHEADER', val)
    },
    setProteomicsTableData ({ commit }, val) {
      commit('SET_PROTEOMICSTABLEDATA', val)
    },
    setProteomicsData ({ commit }, val) {
      commit('SET_PROTEOMICSDATA', val)
    },
    setProteomicsSymbolDict ({ commit }, val) {
      commit('SET_PROTEOMICSSYMBOLDICT', val)
    },
    setUsedSymbolCols ({ commit }, val) {
      commit('SET_USEDSYMBOLS', val)
    },
    setOverlay ({ commit }, val) {
      commit('SET_OVERLAY', val)
    },
    setGraphData ({ commit }, val) {
      commit('SET_GRAPHDATA', val)
    },
    setFCS ({ commit }, val) {
      commit('SET_FCS', val)
    },
    setPathwayLayouting ({ commit }, val) {
      commit('SET_PATHWAYLAYOUTING', val)
    }
  },
  modules: {}
})
