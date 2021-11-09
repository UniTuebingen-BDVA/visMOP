import Vue from 'vue'
import Vuex from 'vuex'
import _ from 'lodash'
import { scaleSequential, interpolateInferno } from 'd3'

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
  clickedNodes: { id: string, name: string, fcTranscript: number, fcProt: number, delete: unknown }[],
  proteomicsData: unknown,
  proteomicsSymbolDict: { [key: string]: string },
  proteomicsKeggDict: { [key: string]: string },
  usedSymbolCols: unknown,
  overlay: unknown,
  graphData: unknown,
  fcs: { [key: string]: { transcriptomics: (string | number), proteomics: (string | number) } },
  fcQuantiles: [number, number],
  fcScale: unknown,
  interactionGraphData: unknown,
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
    proteomicsKeggDict: {},
    usedSymbolCols: { transcriptomics: null, proteomics: null },
    overlay: false,
    graphData: null,
    fcs: {},
    fcQuantiles: [0, 0],
    fcScale: null,
    interactionGraphData: null,
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
    SET_PROTEOMICSKEGGDICT (state, val) {
      state.proteomicsKeggDict = val
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
    SET_FCQUANTILES (state, val) {
      state.fcQuantiles = val
    },
    SET_FCSCALE (state, val) {
      state.fcScale = val
    },
    SET_PATHWAYLAYOUTING (state, val) {
      state.pathwayLayouting = val
    },
    SET_INTERACTIONGRAPHDATA (state, val) {
      state.interactionGraphData = val
    }
  },
  actions: {
    addClickedNode ({ commit, state }, val) {
      const enteredKeys = state.clickedNodes.map(row => { return row.id })
      if (!enteredKeys.includes(val)) {
        const tableEntry = { id: val, name: state.transcriptomicsKeggIDDict[val], fcTranscript: state.fcs[val].transcriptomics, fcProt: state.fcs[val].proteomics, delete: val }
        commit('APPEND_CLICKEDNODE', tableEntry)
      }
    },
    queryEgoGraps ({ commit, state }) {
      const ids = state.clickedNodes.map((elem) => { return state.proteomicsKeggDict[elem.id] })
      fetch('/interaction_graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: ids, threshold: 700 })
      })
        .then((response) => response.json()).then((content) => commit('SET_INTERACTIONGRAPHDATA', content.interaction_graph))
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
      commit('SET_PROTEOMICSKEGGDICT', _.invert(val))
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
      console.log('fcs', val)
      const fcsNum: number[] = []
      for (const key in val) {
        const entry: { transcriptomics: (string | number), proteomics: (string | number) } = val[key]
        if (!(typeof entry.transcriptomics === 'string')) {
          fcsNum.push(entry.transcriptomics)
        }
        if (!(typeof entry.proteomics === 'string')) {
          fcsNum.push(entry.proteomics)
        }
      }
      const fcsAsc = fcsNum.sort((a, b) => a - b)

      // https://stackoverflow.com/a/55297611
      const quantile = (arr: number[], q: number) => {
        const pos = (arr.length - 1) * q
        const base = Math.floor(pos)
        const rest = pos - base
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base])
        } else {
          return arr[base]
        }
      }
      const minVal5 = quantile(fcsAsc, 0.05)
      const maxVal95 = quantile(fcsAsc, 0.95)
      commit('SET_FCQUANTILES', [minVal5, maxVal95])
      const scale = scaleSequential().domain([minVal5, maxVal95]).interpolator(interpolateInferno)

      commit('SET_FCSCALE', scale)
    },
    setPathwayLayouting ({ commit }, val) {
      commit('SET_PATHWAYLAYOUTING', val)
    }
  },
  modules: {}
})
