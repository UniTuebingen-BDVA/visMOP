// vuex-shim.d.ts

import { ComponentCustomProperties } from 'vue'
import { Store } from 'vuex'

declare module '@vue/runtime-core' {
  // Declare your own store states.
  interface State {
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

  interface ComponentCustomProperties {
    $store: Store<State>
  }
}
