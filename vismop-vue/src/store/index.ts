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
  transcriptomicsSymbolDict: unknown,
  transcriptomicsKeggIDDict: unknown,
  proteomicsTableHeaders: unknown,
  proteomicsTableData: unknown,
  clickedNodes: { id: string, name: string }[],
  proteomicsData: unknown,
  proteomicsSymbolDict: {[key:string]: string},
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
    addClickedNode (state, val) {
      const tableEntry = { id: val, name: state.proteomicsSymbolDict[val] }
      state.clickedNodes.push(tableEntry)
    },
    removeClickedNode (state, val) {
      const indexNode = state.clickedNodes.indexOf(val)
      if (indexNode > -1) {
        state.clickedNodes.splice(indexNode, 1)
      }
    },
    setSideBarExpand (state, val) {
      state.sideBarExpand = val
    },
    setOverviewData (state, val) {
      state.overviewData = val
    },
    setTranscriptomicsTableHeaders (state, val) {
      state.transcriptomicsTableHeaders = val
      console.log(state.transcriptomicsTableHeaders)
    },
    setTranscriptomicsTableData (state, val) {
      state.transcriptomicsTableData = val
    },
    setTranscriptomicsData (state, val) {
      state.transcriptomicsData = val
    },
    setTranscriptomicsSymbolDict (state, val) {
      state.transcriptomicsSymbolDict = val
      state.transcriptomicsKeggIDDict = _.invert(val)
    },
    setProteomicsTableHeaders (state, val) {
      state.proteomicsTableHeaders = val
    },
    setProteomicsTableData (state, val) {
      state.proteomicsTableData = val
    },
    setProteomicsData (state, val) {
      state.transcriptomicsData = val
    },
    setProteomicsSymbolDict (state, val) {
      state.proteomicsSymbolDict = val
    },
    setUsedSymbolCols (state, val) {
      state.usedSymbolCols = val
    },
    setOverlay (state, val) {
      state.overlay = val
    },
    setGraphData (state, val) {
      state.graphData = val
    },
    setFCS (state, val) {
      state.fcs = val
    },
    setPathwayLayouting (state, val) {
      state.pathwayLayouting = val
    }
  },
  actions: {},
  modules: {}
})
