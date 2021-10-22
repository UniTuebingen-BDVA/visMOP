import { Store } from 'vuex'

declare module '@vue/runtime-core' {
  // declare your own store states
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
    clickedNodes: unknown,
    proteomicsData: unknown,
    proteomicsSymbolDict: {[key:string]: string},
    usedSymbolCols: unknown,
    overlay: unknown,
    graphData: unknown,
    fcs: unknown,
    pathwayLayouting: unknown
  }

  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store<State>
  }
}