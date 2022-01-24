import Vue from 'vue'
import Vuex from 'vuex'
import _ from 'lodash'
import { scaleSequential, interpolateInferno, ScaleSequential } from 'd3'

Vue.use(Vuex)
interface State {
  sideBarExpand: boolean
  overviewData: unknown,
  transcriptomicsTableHeaders: unknown,
  transcriptomicsTableData: unknown,
  transcriptomicsData: unknown,
  /**
   * KEY: Symbol -> VAL: KEGGID
   */
  transcriptomicsSymbolDict: { [key: string]: string },
  /**
   * KEY: KEGGID -> VAL: SYMBOL
   */
  transcriptomicsKeggIDDict: { [key: string]: string },
  proteomicsTableHeaders: unknown,
  proteomicsTableData: unknown,
  clickedNodes: { id: string, name: string, fcTranscript: number, fcProt: number, delete: unknown }[],
  proteomicsData: unknown,
  /**
   * KEY: Symbol -> VAL: KEGGID
   */
  proteomicsSymbolDict: { [key: string]: string },
  /**
   * KEY: KEGGID -> VAL: SYMBOL
   */
  proteomicsKeggDict: { [key: string]: string },
  metabolomicsData: unknown,
  metabolomicsTableHeaders: unknown,
  metabolomicsTableData: unknown,
  usedSymbolCols: unknown,
  overlay: unknown,
  graphData: unknown,
  fcs: { [key: string]: { transcriptomics: (string | number), proteomics: (string | number), metabolomics: (string | number)} },
  fcQuantiles: {transcriptomics: [number, number], proteomics: [number, number], metabolomics: [number, number]},
  interactionGraphData: unknown,
  pathwayLayouting: { pathwayList: [{ text: string, value: string }], pathwayNodeDictionary: { [key: string]: string[] }, nodePathwayDictionary: { [key: string]: string[]} },
  pathwayDropdown: string,
  omicsRecieved: {proteomics: boolean, transcriptomics: boolean, metabolomics: boolean}
  pathayAmountDict: {[key: string]: {genes: number, maplinks: number, compounds: number}},
  keggIDGenesymbolDict: {[key: string]: string},
  pathwayCompare: string[],
  glyphData: unknown,
  glyphs: { url: { [key: string]: string }, svg: { [key: string]: SVGElement }}
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
    metabolomicsTableHeaders: [],
    metabolomicsTableData: [],
    metabolomicsData: null,
    usedSymbolCols: { transcriptomics: null, proteomics: null, metabolomics: null },
    overlay: false,
    graphData: null,
    fcs: {},
    fcQuantiles: { transcriptomics: [0, 0], proteomics: [0, 0], metabolomics: [0, 0] },
    interactionGraphData: null,
    pathwayLayouting: {
      pathwayList: [{ text: 'empty', value: 'empty' }],
      pathwayNodeDictionary: { },
      nodePathwayDictionary: { }
    },
    pathwayDropdown: '',
    omicsRecieved: { transcriptomics: false, proteomics: false, metabolomics: false },
    pathayAmountDict: {},
    keggIDGenesymbolDict: {},
    pathwayCompare: [],
    glyphData: {},
    glyphs: { url: {}, svg: {} }
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
    SET_METABOLOMICSTABLEHEADER (state, val) {
      state.metabolomicsTableHeaders = val
    },
    SET_METABOLOMICSTABLEDATA (state, val) {
      state.metabolomicsTableData = val
    },
    SET_METABOLOMICSDATA (state, val) {
      state.metabolomicsData = val
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
    SET_PATHWAYLAYOUTING (state, val) {
      state.pathwayLayouting = val
    },
    SET_INTERACTIONGRAPHDATA (state, val) {
      state.interactionGraphData = val
    },
    SET_PATHWAYDROPDOWN (state, val) {
      state.pathwayDropdown = val
    },
    SET_OMICSRECIEVED (state, val) {
      state.omicsRecieved = val
    },
    SET_PATHWAYAMOUNTDICT (state, val) {
      state.pathayAmountDict = val
    },
    SET_KEGGIDGENESYMBOLDICT (state, val) {
      state.keggIDGenesymbolDict = val
    },
    APPEND_PATHWAYCOMPARE (state, val) {
      state.pathwayCompare.push(val)
    },
    REMOVE_PATHWAYCOMPARE (state, val) {
      state.pathwayCompare.splice(val, 1)
    },
    SET_GLYPHDATA (state, val) {
      state.glyphData = val
    },
    SET_GLYPHS (state, val) {
      state.glyphs = val
    }
  },
  actions: {
    addClickedNode ({ commit, state }, val: string) {
      // TODO atm uniprot IDs will be used when no transcriptomics id is saved
      // TODO multiIDs will not work at the moment
      const keggIDs = val.split(';')
      const enteredKeys = state.clickedNodes.map(row => { return row.id })
      keggIDs.forEach(element => {
        try {
          if (!enteredKeys.includes(element)) {
            const sybmolName = state.keggIDGenesymbolDict[element]
            const tableEntry = { id: element, name: sybmolName, fcTranscript: state.fcs[element].transcriptomics, fcProt: state.fcs[element].proteomics, delete: val }
            commit('APPEND_CLICKEDNODE', tableEntry)
          }
        } catch (error) {
        }
      })
    },
    queryEgoGraps ({ commit, state }, val) {
      const ids = state.clickedNodes.map((elem) => { return state.proteomicsKeggDict[elem.id] })
      fetch('/interaction_graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: ids, threshold: val })
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
    setKeggIDGeneSymbolDict ({ commit }, val) {
      commit('SET_KEGGIDGENESYMBOLDICT', val)
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
    setMetabolomicsTableHeaders ({ commit }, val) {
      commit('SET_METABOLOMICSTABLEHEADER', val)
    },
    setMetabolomicsTableData ({ commit }, val) {
      commit('SET_METABOLOMICSTABLEDATA', val)
    },
    setMetabolomicsData ({ commit }, val) {
      commit('SET_METABOLOMICSDATA', val)
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
      const fcsTranscriptomics: number[] = []
      const fcsProteomics: number[] = []
      const fcsMetabolomics: number[] = []

      for (const key in val) {
        const entry: { transcriptomics: (string | number), proteomics: (string | number), metabolomics: (string | number) } = val[key]
        if (!(typeof entry.transcriptomics === 'string')) {
          fcsTranscriptomics.push(entry.transcriptomics)
        }
        if (!(typeof entry.proteomics === 'string')) {
          fcsProteomics.push(entry.proteomics)
        }
        if (!(typeof entry.metabolomics === 'string')) {
          fcsMetabolomics.push(entry.metabolomics)
        }
      }
      const fcsTranscriptomicsAsc = fcsTranscriptomics.sort((a, b) => a - b)
      const fcsProteomicsAsc = fcsProteomics.sort((a, b) => a - b)
      const fcsMetabolomicsAsc = fcsMetabolomics.sort((a, b) => a - b)

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
      const quantTranscriptomics = [quantile(fcsTranscriptomicsAsc, 0.05), quantile(fcsTranscriptomicsAsc, 0.95)]
      const quantProteomics = [quantile(fcsProteomicsAsc, 0.05), quantile(fcsProteomicsAsc, 0.95)]
      const quantMetabolomics = [quantile(fcsMetabolomicsAsc, 0.05), quantile(fcsMetabolomicsAsc, 0.95)]

      commit('SET_FCQUANTILES', { transcriptomics: quantTranscriptomics, proteomics: quantProteomics, metabolomics: quantMetabolomics })
    },
    setPathwayLayouting ({ commit }, val: {pathwayList: string[], pathwayNodeDictionary: { [key: string]: string[]} }) {
      const nodePathwayDict: {[key: string]: string[]} = {}
      Object.keys(val.pathwayNodeDictionary).forEach(pathwayID => {
        val.pathwayNodeDictionary[pathwayID].forEach(nodeIDstr => {
          const nodeIDs = nodeIDstr.split(';')
          nodeIDs.forEach(nodeID => {
            const nodeIDreplace = nodeID.replace('cpd:', '').replace('gl:', '')
            if (Object.keys(nodePathwayDict).includes(nodeIDreplace)) {
              nodePathwayDict[nodeIDreplace].push(pathwayID)
            } else {
              nodePathwayDict[nodeIDreplace] = [pathwayID]
            }
          })
        })
      })
      commit('SET_PATHWAYLAYOUTING', { ...val, nodePathwayDictionary: nodePathwayDict })
    },
    focusPathwayViaOverview ({ commit }, val) {
      const valClean = val.replace('path:', '')
      commit('SET_PATHWAYDROPDOWN', valClean)
    },
    focusPathwayViaDropdown ({ commit }, val) {
      commit('SET_PATHWAYDROPDOWN', val)
    },
    selectPathwayCompare ({ commit, state }, val) {
      const valClean = val.replace('path:', '')
      if (!state.pathwayCompare.includes(valClean)) commit('APPEND_PATHWAYCOMPARE', valClean)
    },
    removePathwayCompare ({ commit, state }, val) {
      const idx = state.pathwayCompare.indexOf(val)
      commit('REMOVE_PATHWAYCOMPARE', idx)
    },
    setOmicsRecieved ({ commit }, val) {
      commit('SET_OMICSRECIEVED', val)
    },
    setPathayAmountDict ({ commit }, val) {
      commit('SET_PATHWAYAMOUNTDICT', val)
    },
    setGlyphData ({ commit }, val) {
      commit('SET_GLYPHDATA', val)
    },
    setGlyphs ({ commit }, val) {
      commit('SET_GLYPHS', val)
    }

  },
  modules: {}
})
