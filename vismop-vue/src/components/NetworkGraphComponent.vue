<template>
  <div>
    <v-card v-bind:class="[expandButton ? 'detailComponentLarger' : '','detailComponent']">
      <v-col>
      <v-overflow-btn
                    :items="pathwayLayouting.pathwayList"
                    editable
                    clearable
                    label="Focus Pathway"
                    hide-details
                    overflow
                    dense
                    v-model="pathwaySelection"
      ></v-overflow-btn>
      <div :id="contextID" v-bind:class="[expandButton ? 'webglContainerDetailLarger' : '','webglContainerDetail']"></div>
       <v-btn
        class="mx-2 expandButton"
        fab
        dark
        small
        bottom
        left
        @click="expandComponent"
      ><v-icon>mdi-arrow-expand</v-icon></v-btn>
      </v-col>
    </v-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import DetailNetwork from '../core/detailNetwork'
import { generateGraphData } from '../core/detailGraphPreparation'
import Vue from 'vue'
import Sigma from 'sigma'

interface Data{
  tableSearch: string
  selectedTab: string
  outstandingDraw: boolean
  networkGraph: (DetailNetwork | undefined)
  pathwaySelection: string
  expandButton: boolean
}

export default Vue.extend({
  // name of the component
  name: 'NetworkGraphComponent',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    selectedTab: 'transcriptomics',
    outstandingDraw: false,
    networkGraph: undefined,
    pathwaySelection: '',
    expandButton: false

  }),

  computed: {
    ...mapState({
      sideBarExpand: (state:any) => state.sideBarExpand,
      graphData: (state:any) => state.graphData,
      fcs: (state:any) => state.fcs,
      fcQuantiles: (state:any) => state.fcQuantiles,
      transcriptomicsSymbolDict: (state:any) => state.transcriptomicsSymbolDict,
      proteomicsSymbolDict: (state:any) => state.proteomicsSymbolDict,
      usedSymbolCols: (state:any) => state.usedSymbolCols,
      overlay: (state:any) => state.overlay,
      pathwayLayouting: (state: any) => state.pathwayLayouting,
      pathwayDropdown: (state: any) => state.pathwayDropdown

    })
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
      this.selectPathway(this.pathwaySelection)
    },
    transcriptomicsSelection: function () {
      this.focusNodeTranscriptomics(this.transcriptomicsSelection)
    },
    proteomicsSelection: function () {
      this.focusNodeProteomics(this.proteomicsSelection)
    },
    metabolomicsSelection: function () {
      this.focusNodeMetabolomics(this.metabolomicsSelection)
    },
    pathwayDropdown: function () {
      this.pathwaySelection = this.pathwayDropdown
    }
  },

  mounted () {
    if (this.graphData) {
      this.drawNetwork()
    }
  },
  props: {
    contextID: String,
    transcriptomicsSelection: { type: Object },
    proteomicsSelection: { type: Object },
    metabolomicsSelection: { type: Object },
    isActive: Boolean
  },
  methods: {
    drawNetwork () {
      const fcExtents = this.fcQuantiles
      const networkData = generateGraphData(this.graphData, fcExtents)
      console.log('base dat', networkData)
      const key = Object.keys(this.pathwayLayouting.pathwayNodeDictionary)[0]
      const nodeList = this.pathwayLayouting.pathwayNodeDictionary[key]
      this.networkGraph = new DetailNetwork(networkData, this.contextID, key, nodeList)
    },
    focusNodeTranscriptomics (row: {[key: string]: string}) {
      const symbol = row[this.usedSymbolCols.transcriptomics]
      console.log('Symbol', symbol)
      console.log('dict', this.transcriptomicsSymbolDict)
      const keggID = this.transcriptomicsSymbolDict[symbol]
      console.log('ID', keggID)
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
    }
  }
})
</script>
