import _ from 'lodash'
import * as d3 from 'd3'
import mutations from './mutations'
import actions from './actions'
import { createStore as _createStore } from 'vuex'
export interface State {
  sideBarExpand: boolean
  overviewData: unknown,
  targetDatabase: string,
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
  proteomicsKeggIDDict: { [key: string]: string },
  metabolomicsData: unknown,
  metabolomicsTableHeaders: unknown,
  metabolomicsTableData: unknown,
  usedSymbolCols: {transcriptomics: string, proteomics: string, metabolomics: string},
  overlay: unknown,
  graphData: unknown,
  fcs: { [key: string]: { transcriptomics: (string | number), proteomics: (string | number), metabolomics: (string | number)} },
  fcsReactome: { transcriptomics: {[key: string]:number}, proteomics: {[key: string]:number}, metabolomics: {[key: string]:number}},
  fcQuantiles: {transcriptomics: [number, number], proteomics: [number, number], metabolomics: [number, number]},
  fcScales: {transcriptomics: d3.ScaleSequential<string, never>, proteomics: d3.ScaleSequential<string, never>, metabolomics: d3.ScaleSequential<string, never>}
  interactionGraphData: unknown,
  pathwayLayouting: { pathwayList: [{ text: string, value: string }], pathwayNodeDictionary: { [key: string]: string[] }, nodePathwayDictionary: { [key: string]: string[]}, pathwayNodeDictionaryClean: { [key: string]: string[]}, rootIds: string[] },
  pathwayDropdown: string,
  omicsRecieved: {proteomics: boolean, transcriptomics: boolean, metabolomics: boolean}
  pathayAmountDict: {[key: string]: {genes: number, maplinks: number, compounds: number}},
  keggIDGenesymbolDict: {[key: string]: string},
  pathwayCompare: string[],
  glyphData: unknown,
  glyphs: { url: { [key: string]: string }, svg: { [key: string]: SVGElement }}
}
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
  } as State,
  mutations,
  actions,
  modules: {}
})
}