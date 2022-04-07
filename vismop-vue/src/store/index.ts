import _ from 'lodash'
import * as d3 from 'd3'
import mutations from './mutations'
import actions from './actions'
import { createStore as _createStore } from 'vuex'

export default function createStore () { return _createStore({
  state: {
    sideBarExpand: true,
    overviewData: null,
    targetDatabase: 'reactome',
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
    proteomicsKeggIDDict: {},
    metabolomicsTableHeaders: [],
    metabolomicsTableData: [],
    metabolomicsData: null,
    usedSymbolCols: { transcriptomics: '', proteomics: '', metabolomics: '' },
    overlay: false,
    graphData: null,
    fcs: {},
    fcsReactome: { transcriptomics: {}, proteomics: {}, metabolomics: {} },
    fcQuantiles: { transcriptomics: [0, 0], proteomics: [0, 0], metabolomics: [0, 0] },
    fcScales: { transcriptomics: d3.scaleSequential(), proteomics: d3.scaleSequential(), metabolomics: d3.scaleSequential() },
    interactionGraphData: null,
    pathwayLayouting: {
      pathwayList: [{ text: 'empty', value: 'empty' }],
      pathwayNodeDictionary: { },
      nodePathwayDictionary: { },
      pathwayNodeDictionaryClean: { },
      rootIds: []
    },
    pathwayDropdown: '',
    omicsRecieved: { transcriptomics: false, proteomics: false, metabolomics: false },
    pathayAmountDict: {},
    keggIDGenesymbolDict: {},
    pathwayCompare: [],
    glyphData: {},
    glyphs: { url: {}, svg: {} }
  },
  mutations,
  actions,
  modules: {}
})
}