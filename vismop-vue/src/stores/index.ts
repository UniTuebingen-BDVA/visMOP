import _ from 'lodash'
import * as d3 from 'd3'
import { defineStore } from 'pinia'
import { graphData } from '@/core/graphTypes'

interface State {
  sideBarExpand: boolean
  overviewData: unknown,
  targetDatabase: string,
  transcriptomicsTableHeaders: {label: string, name:string, field: string, align: string, sortable: boolean,  classes: string, style: string, headerClasses: string, headerStyle: string}[],
  transcriptomicsTableData: {[key: string]: string | number }[],
  /**
   * KEY: Symbol -> VAL: KEGGID
   */
  transcriptomicsSymbolDict: { [key: string]: string },
  /**
   * KEY: KEGGID -> VAL: SYMBOL
   */
  transcriptomicsKeggIDDict: { [key: string]: string },
  proteomicsTableHeaders: {label: string, name:string, field: string, align: string, sortable: boolean,  classes: string, style: string, headerClasses: string, headerStyle: string}[],
  proteomicsTableData: {[key: string]: string | number }[],
  clickedNodes: { id: string, name: string, fcTranscript: number, fcProt: number, delete: unknown }[],
  /**
   * KEY: Symbol -> VAL: KEGGID
   */
  proteomicsSymbolDict: { [key: string]: string },
  /**
   * KEY: KEGGID -> VAL: SYMBOL
   */
  proteomicsKeggIDDict: { [key: string]: string },
  metabolomicsTableHeaders: {label: string, name:string, field: string, align: string, sortable: boolean,  classes: string, style: string, headerClasses: string, headerStyle: string}[],
  metabolomicsTableData: {[key: string]: string | number }[],
  usedSymbolCols: {transcriptomics: string, proteomics: string, metabolomics: string},
  overlay: unknown,
  graphData: graphData,
  fcs: { [key: string]: { transcriptomics: (number), proteomics: (number), metabolomics: (number)} },
  fcsReactome: { transcriptomics: {[key: string]:number}, proteomics: {[key: string]:number}, metabolomics: {[key: string]:number}},
  fcQuantiles: {transcriptomics: number[], proteomics: number[], metabolomics: number[]},
  fcScales: {transcriptomics: d3.ScaleDiverging<string, never>, proteomics: d3.ScaleDiverging<string, never>, metabolomics: d3.ScaleDiverging<string, never>}
  interactionGraphData: unknown,
  pathwayLayouting: { pathwayList: [{ text: string, value: string }], pathwayNodeDictionary: { [key: string]: string[] }, nodePathwayDictionary: { [key: string]: string[]}, pathwayNodeDictionaryClean: { [key: string]: string[]}, rootIds: string[] },
  pathwayDropdown: {title: string, value: string, text: string},
  omicsRecieved: {proteomics: boolean, transcriptomics: boolean, metabolomics: boolean}
  pathayAmountDict: {[key: string]: {genes: number, maplinks: number, compounds: number}},
  keggIDGenesymbolDict: {[key: string]: string},
  pathwayCompare: string[],
  glyphData: unknown,
  glyphs: { url: { [key: string]: string }, svg: { [key: string]: SVGElement }}
}

export const useMainStore = defineStore('mainStore', {
  state: (): State => ({
    sideBarExpand: true,
    overviewData: null,
    targetDatabase: 'reactome',
    transcriptomicsTableHeaders: [],
    transcriptomicsTableData: [],
    transcriptomicsSymbolDict: {},
    transcriptomicsKeggIDDict: {},
    proteomicsTableHeaders: [],
    proteomicsTableData: [],
    clickedNodes: [],
    proteomicsSymbolDict: {},
    proteomicsKeggIDDict: {},
    metabolomicsTableHeaders: [],
    metabolomicsTableData: [],
    usedSymbolCols: { transcriptomics: '', proteomics: '', metabolomics: '' },
    overlay: false,
    graphData: {
      attributes: { name: '' },
      nodes: [],
      edges: [],
      options: null
    },
    fcs: {},
    fcsReactome: { transcriptomics: {}, proteomics: {}, metabolomics: {} },
    fcQuantiles: { transcriptomics: [0, 0], proteomics: [0, 0], metabolomics: [0, 0] },
    fcScales: { transcriptomics: d3.scaleDiverging(), proteomics: d3.scaleDiverging(), metabolomics: d3.scaleDiverging() },
    interactionGraphData: null,
    pathwayLayouting: {
      pathwayList: [{ text: 'empty', value: 'empty' }],
      pathwayNodeDictionary: { },
      nodePathwayDictionary: { },
      pathwayNodeDictionaryClean: { },
      rootIds: []
    },
    pathwayDropdown: {title: '', value: '', text: ''},
    omicsRecieved: { transcriptomics: false, proteomics: false, metabolomics: false },
    pathayAmountDict: {},
    keggIDGenesymbolDict: {},
    pathwayCompare: [],
    glyphData: {},
    glyphs: { url: {}, svg: {} }
  }),
  actions: {
    addClickedNode ( val: {queryID: string, name: string}) {
    // TODO atm uniprot IDs will be used when no transcriptomics id is saved
    // TODO multiIDs will not work at the moment
    const keggIDs = val.queryID.split(';')
    const enteredKeys = this.clickedNodes.map(row => { return row.id })
    keggIDs.forEach(element => {
      try {
        if (!enteredKeys.includes(element)) {
          this.appendClickedNode(val)
        }
      } catch (error) {
      }
    })
  },
  addClickedNodeFromTable (val: {[key: string]: string}) {
    let id = val[this.usedSymbolCols.proteomics]
    if (this.targetDatabase === 'kegg') {
      id = this.proteomicsSymbolDict[id]
    }
    console.log(this.targetDatabase)
    const enteredKeys = this.clickedNodes.map(row => { return row.id })
    try {
      if (!enteredKeys.includes(id)) {
        this.appendClickedNode({ queryID: id, name: '' })
      }
    } catch (error) {
    }
  },
  appendClickedNode (val: {queryID: string, name: string}) {
    let tableEntry = {id: '', name: '', fcTranscript: -1, fcProt: -1, delete: val }
    if (this.targetDatabase === 'kegg') {
      const symbolProt = this.proteomicsKeggIDDict[val.queryID]
      const symbolTrans = this.transcriptomicsKeggIDDict[val.queryID]
      tableEntry = { id: val.queryID, name: `${symbolTrans}/${symbolProt}`, fcTranscript:  this.fcs[val.queryID].transcriptomics, fcProt: this.fcs[val.queryID].proteomics, delete: val }
    }
    if (this.targetDatabase === 'reactome') {
      console.log('test', this.fcs)
      tableEntry = { id: val.queryID, name: `${val.name}`, fcTranscript: -1, fcProt: this.fcsReactome.proteomics[val.queryID], delete: val }
    }
    this.clickedNodes.push(tableEntry)
  },
  queryEgoGraps (val: number) {
    let ids: string[] = []
    if (this.targetDatabase === 'kegg') {
      ids = this.clickedNodes.map((elem) => { return this.proteomicsKeggIDDict[elem.id] })
    }
    if (this.targetDatabase === 'reactome') {
      ids = this.clickedNodes.map((elem) => { return elem.id })
    }
    fetch('/interaction_graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: ids, threshold: val })
    })
      .then((response) => response.json()).then((content) => this.interactionGraphData = content.interaction_graph)
  },
  removeClickedNode (val: string) {
    console.log('removedNode', val)

    const indexNode = this.clickedNodes.map(row => { return row.id }).indexOf(val)
    console.log('removedNode', indexNode)
    if (indexNode > -1) {
      this.clickedNodes = this.clickedNodes.splice(indexNode, 1)
    }
  },
  setTargetDatabase (val: string) {
    this.targetDatabase = val
  },
  setKeggIDGeneSymbolDict (val: {[x: string]: string}) {
    this.keggIDGenesymbolDict = val
  },
  setOverviewData (val: unknown) {
    this.overviewData = val

  },
  setTranscriptomicsTableHeaders (val: {label: string, name:string, field: string, align: string, sortable: boolean,  classes: string, style: string, headerClasses: string, headerStyle: string}[]) {
    this.transcriptomicsTableHeaders = val
  },
  setTranscriptomicsTableData (val: { [x: string]: string | number }[]) {
    this.transcriptomicsTableData = val
  },
  setTranscriptomicsSymbolDict (val: {[x: string]: string}) {
    this.transcriptomicsSymbolDict = val
    this.transcriptomicsKeggIDDict = _.invert(val)
  },
  setProteomicsTableHeaders (val: {label: string, name:string, field: string, align: string, sortable: boolean,  classes: string, style: string, headerClasses: string, headerStyle: string}[]) {
    this.proteomicsTableHeaders = val

  },
  setProteomicsTableData (val: { [x: string]: string | number }[]) {
    this.proteomicsTableData = val
  },

  setProteomicsSymbolDict (val: {[x: string]: string}) {
    this.proteomicsSymbolDict = val
    this.proteomicsKeggIDDict = _.invert(val)
  },
  setMetabolomicsTableHeaders (val: {label: string, name:string, field: string, align: string, sortable: boolean,  classes: string, style: string, headerClasses: string, headerStyle: string}[]) {
    this.metabolomicsTableHeaders = val
  },
  setMetabolomicsTableData (val: { [x: string]: string | number }[]) {
    this.metabolomicsTableData = val
  },
  setUsedSymbolCols (val:  {transcriptomics: string; proteomics: string; metabolomics: string;}) {
    this.usedSymbolCols = val
  },
  setOverlay (val: unknown) {
    this.overlay = val
  },
  setGraphData (val: graphData) {
    this.graphData = val
  },
  setFCS (val: {[x: string]: {
        transcriptomics: number;
        proteomics: number;
        metabolomics: number;
      };
    }) 
  {
    this.fcs = val
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

    const colorScaleTranscriptomics = d3.scaleDiverging(d => d3.interpolateRdBu(1 - d)).domain([quantTranscriptomics[0], quantTranscriptomics[0] < 0.0 ? 0.0 : 1.0, quantTranscriptomics[1]])
    const colorScaleProteomics = d3.scaleDiverging(d => d3.interpolateRdBu(1 - d)).domain([quantProteomics[0], quantProteomics[0] < 0.0 ? 0.0 : 1.0, quantProteomics[1]])
    const colorScaleMetabolomics = d3.scaleDiverging(d3.interpolatePRGn).domain([quantMetabolomics[0], quantProteomics[0] < 0.0 ? 0.0 : 1.0, quantMetabolomics[1]])

    this.fcQuantiles = { transcriptomics: quantTranscriptomics, proteomics: quantProteomics, metabolomics: quantMetabolomics }
    this.fcScales = { transcriptomics: colorScaleTranscriptomics, proteomics: colorScaleProteomics, metabolomics: colorScaleMetabolomics }
  },
  setFCSReactome (val: {transcriptomics: {[key: string]: number}, proteomics: {[key: string]: number}, metabolomics: {[key: string]: number}}) {
    this.fcsReactome = val
    console.log('fcs', val)
    const fcsTranscriptomicsAsc = Object.values(val.transcriptomics).sort((a, b) => a - b)
    const fcsProteomicsAsc = Object.values(val.proteomics).sort((a, b) => a - b)
    const fcsMetabolomicsAsc = Object.values(val.metabolomics).sort((a, b) => a - b)
    console.log('metafc', fcsMetabolomicsAsc)
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

    const colorScaleTranscriptomics = d3.scaleDiverging(d3.interpolateRdBu).domain([quantTranscriptomics[1], quantTranscriptomics[0] < 0.0 ? 0.0 : 1.0, quantTranscriptomics[0]])
    const colorScaleProteomics = d3.scaleDiverging(d3.interpolateRdBu).domain([quantProteomics[1], quantProteomics[0] < 0.0 ? 0.0 : 1.0, quantProteomics[0]])
    const colorScaleMetabolomics = d3.scaleDiverging(d3.interpolatePRGn).domain([quantMetabolomics[0], quantProteomics[0] < 0.0 ? 0.0 : 1.0, quantMetabolomics[1]])

    this.fcQuantiles = { transcriptomics: quantTranscriptomics, proteomics: quantProteomics, metabolomics: quantMetabolomics }
    this.fcScales = { transcriptomics: colorScaleTranscriptomics, proteomics: colorScaleProteomics, metabolomics: colorScaleMetabolomics }
  },
  setPathwayLayoutingKegg (val: {pathwayList: [{ text: string, value: string }], pathwayNodeDictionary: { [key: string]: string[]} }) {
    const nodePathwayDict: {[key: string]: string[]} = {}
    const pathwayNodeDictClean: {[key: string]: string[]} = {}
    Object.keys(val.pathwayNodeDictionary).forEach(pathwayID => {
      val.pathwayNodeDictionary[pathwayID].forEach(nodeIDstr => {
        const nodeIDs = nodeIDstr.split(';')
        nodeIDs.forEach(nodeID => {
          const nodeIDreplace = nodeID.replace('cpd:', '').replace('gl:', '')
          // for nodePathwayDict
          if (Object.keys(nodePathwayDict).includes(nodeIDreplace)) {
            nodePathwayDict[nodeIDreplace].push(pathwayID)
          } else {
            nodePathwayDict[nodeIDreplace] = [pathwayID]
          }
          // for pathwayNodeDictClean
          if (Object.keys(pathwayNodeDictClean).includes(pathwayID)) {
            pathwayNodeDictClean[pathwayID].push(nodeIDreplace)
          } else {
            pathwayNodeDictClean[pathwayID] = [nodeIDreplace]
          }
        })
      })
    })
    this.pathwayLayouting = { ...val, nodePathwayDictionary: nodePathwayDict, pathwayNodeDictionaryClean: pathwayNodeDictClean, rootIds: [] }
  },
  setPathwayLayoutingReactome (val: {pathwayList: [{ text: string, value: string }], pathwayNodeDictionary: { [key: string]: string[]} }) {
    console.log('TESTEST', val.pathwayNodeDictionary)
    this.pathwayLayouting = { ...val, nodePathwayDictionary: val.pathwayNodeDictionary, pathwayNodeDictionaryClean: val.pathwayNodeDictionary, rootIds: [] }
  },
  focusPathwayViaOverview (val: string) {
    const valClean = val.replace('path:', '')
    this.pathwayDropdown = {title: valClean, value: valClean, text: valClean}
  },
  focusPathwayViaDropdown (val: {title: string, value: string, text: string}) {
    this.pathwayDropdown = val
  },
  selectPathwayCompare (val: string[]) {
    val.forEach(element => {
      const valClean = element.replace('path:', '')
      if (!this.pathwayCompare.includes(valClean)) this.pathwayCompare.push(valClean)
    })
  },
  removePathwayCompare (val: string) {
    const idx = this.pathwayCompare.indexOf(val)
    this.pathwayCompare.splice(idx, 1)
  },
  setOmicsRecieved (val: {proteomics: boolean, transcriptomics: boolean, metabolomics: boolean}){
    this.omicsRecieved = val
  },
  setPathayAmountDict (val: {
    [x: string]: {
        genes: number;
        maplinks: number;
        compounds: number;
    };
  }){
    this.pathayAmountDict = val
  },
  setGlyphData (val: unknown) {
    this.glyphData = val
  },
  setGlyphs (val: {
    url: {
        [x: string]: string;
    };
    svg: {
        [x: string]: SVGElement;
    };
  }){
    this.glyphs = val
  }}
})