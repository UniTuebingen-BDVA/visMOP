<template>
  <div>
    <q-card v-bind:class="[minimizeButton ? 'detailComponentSmaller' : '', expandButton ? 'detailComponentLarger' : '','detailComponent']">
      <div class="col">
        <q-select
        :options="pathwayListOptions"
        label="Focus Pathway"
        v-model="pathwaySelection"
        option-label="text"
        option-value="value"
        ></q-select>
      <div :id="contextID" v-bind:class="[minimizeButton ? 'webglContainerDetailSmaller' : '',expandButton ? 'webglContainerDetailLarger' : '','webglContainerDetail']"></div>
      <q-card-actions>
        <q-btn
          class="mx-2 expandButton"
          fab
          dark
          small
          @click="expandComponent"
        ><q-icon>mdi-arrow-expand</q-icon></q-btn>
          <q-btn
          class="mx-2 minimizeButton"
          fab
          dark
          small
          @click="minimizeComponent"
        ><q-icon>mdi-window-minimize</q-icon></q-btn>
      </q-card-actions>
      </div>
    </q-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import DetailNetwork from '../core/keggDetailView'
import { generateGraphData } from '../core/detailGraphPreparation'
import { PropType } from 'vue'
import { useMainStore } from '@/stores'


interface Data{
  mutationObserver: (MutationObserver | undefined)
  tableSearch: string
  selectedTab: string
  outstandingDraw: boolean
  networkGraph: (DetailNetwork | undefined)
  pathwaySelection: {title: string, value: string, text: string}
  expandButton: boolean
  minimizeButton: boolean
}

export default {
  // name of the component
  name: 'KeggDetailComponent',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    mutationObserver: undefined,
    tableSearch: '',
    selectedTab: 'transcriptomics',
    outstandingDraw: false,
    networkGraph: undefined,
    pathwaySelection: {title: '', value: '', text: ''},
    expandButton: false,
    minimizeButton: false

  }),

  computed: {
    ...mapState(useMainStore,{
      sideBarExpand: state => state.sideBarExpand,
      graphData: state => state.graphData,
      fcs: state => state.fcs,
      fcQuantiles: state => state.fcQuantiles,
      transcriptomicsSymbolDict: state => state.transcriptomicsSymbolDict,
      proteomicsSymbolDict: state => state.proteomicsSymbolDict,
      usedSymbolCols: state => state.usedSymbolCols,
      pathwayLayouting: (state: any) => state.pathwayLayouting,
      pathwayDropdown: (state: any) => state.pathwayDropdown

    }),
    pathwayListOptions () {return this.pathwayLayouting.pathwayList}
  },
  watch: {
    graphData: function () {
      if (this.isActive) {
        console.log(this.contextID)
        this.drawNetwork()
      } else {
        console.log(this.contextID, 'outstanding draw')
        this.outstandingDraw = true
      }
    },
    isActive: function () {
      console.log(
        this.contextID,
        'isActive: ',
        this.isActive,
        this.outstandingDraw
      )
      if (this.outstandingDraw) {
        setTimeout(() => {
          this.drawNetwork()
        }, 1000)
        this.outstandingDraw = false
      }
    },
    pathwaySelection: function () {
      const mainStore = useMainStore()
      this.selectPathway(this.pathwaySelection.value)
      mainStore.focusPathwayViaDropdown(this.pathwaySelection)
    },
    transcriptomicsSelection: function () {
      // this.focusNodeTranscriptomics(this.transcriptomicsSelection)
    },
    proteomicsSelection: function () {
      // this.focusNodeProteomics(this.proteomicsSelection)
    },
    metabolomicsSelection: function () {
      // this.focusNodeMetabolomics(this.metabolomicsSelection)
    },
    pathwayDropdown: function () {
      this.pathwaySelection = this.pathwayDropdown
    }
  },

  mounted () {
    this.mutationObserver = new MutationObserver(this.refreshGraph)
    const config = { attributes: true }
    const tar =  document.getElementById(this.contextID ? this.contextID : '')
    if (tar) this.mutationObserver.observe(tar, config)
    if (this.graphData) {
      this.drawNetwork()
    }
  },
  props: {
    contextID: String,
    transcriptomicsSelection: Array as PropType<{[key: string]: string}[]>,
    proteomicsSelection: Array as PropType<{[key: string]: string}[]>,
    metabolomicsSelection: Array as PropType<{[key: string]: string}[]>,
    isActive: Boolean
  },
  methods: {
    filterFunction (val: string, update: (n: () => void) => void) {
      update(() => {
        const tarValue = val.toLowerCase()
        this.pathwayListOptions = this.pathwayListOptions.filter((v: string) => v.toLowerCase().indexOf(tarValue) > -1)
      })
    },
    drawNetwork () {
      if (this.networkGraph) { this.networkGraph.killGraph() }
      const fcExtents = this.fcQuantiles
      const networkData = generateGraphData(this.graphData, fcExtents)
      console.log('base dat', networkData)
      const key = this.pathwayDropdown ? this.pathwayDropdown : Object.keys(this.pathwayLayouting.pathwayNodeDictionary)[0]
      const nodeList = this.pathwayLayouting.pathwayNodeDictionary[key]
      this.networkGraph = new DetailNetwork(networkData, this.contextID ? this.contextID : '', key, nodeList)
    },
    focusNodeTranscriptomics (row: {[key: string]: string}) {
      const symbol = row[this.usedSymbolCols.transcriptomics]
      // console.log('Symbol', symbol)
      // console.log('dict', this.transcriptomicsSymbolDict)
      // const keggID = this.transcriptomicsSymbolDict[symbol]
      // console.log('ID', keggID)
      // panToNode(this.networkGraph as Sigma, keggID)
    },
    focusNodeProteomics (row: {[key: string]: string}) {
      const symbol = row[this.usedSymbolCols.proteomics]
      const keggID = this.proteomicsSymbolDict[symbol]
      // panToNode(this.networkGraph as Sigma, keggID)
    },
    focusNodeMetabolomics (row: {[key: string]: string}) {
      const symbol = row[this.usedSymbolCols.metabolomics]
      //  const keggID = this.proteomicsSymbolDict[symbol]
      let queryString = symbol
      if (symbol.startsWith('C')) {
        queryString = 'cpd:' + symbol
      }
      if (symbol.startsWith('G')) {
        queryString = 'gl:' + symbol
      }
      // panToNode(this.networkGraph as Sigma, queryString)
    },
    selectPathway (key: string) {
      console.log('KEY', key)
      if (key !== undefined && key !== null) {
        const nodeList = this.pathwayLayouting.pathwayNodeDictionary[key]
        this.networkGraph?.selectNewPathway(key, nodeList)
      } else {
        console.log('TEST')
        // relaxLayout(this.networkGraph as Sigma)
      }
    },
    expandComponent () {
      this.expandButton = !this.expandButton
      this.networkGraph?.refresh()
    },
    minimizeComponent () {
      this.minimizeButton = !this.minimizeButton
      this.networkGraph?.refresh()
    },
    refreshGraph () {
      this.networkGraph?.refresh()
    }

  }
}
</script>
