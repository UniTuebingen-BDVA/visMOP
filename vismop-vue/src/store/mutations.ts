
export default {
    APPEND_CLICKEDNODE (state, val) {
      state.clickedNodes.push(val)
    },
    REMOVE_CLICKEDNODE (state, val) {
      state.clickedNodes.splice(val, 1)
    },
    SET_TARTGETDATABASE (state, val) {
      state.targetDatabase = val
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
    SET_PROTEOMICSKEGGIDDICT (state, val) {
      state.proteomicsKeggIDDict = val
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
    SET_FCSCALES (state, val) {
      state.fcScales = val
    },
    SET_FCSREACTOME (state, val) {
      state.fcsReactome = val
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
}