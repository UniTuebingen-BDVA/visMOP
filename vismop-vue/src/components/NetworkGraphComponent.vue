<template>
  <div>
    <v-card>
      <v-row justify="space-between">
        <v-card-title>
          Network Graph
          <v-spacer></v-spacer>
        </v-card-title>
        <v-col cols="4" class="mb-2">
          <v-overflow-btn
            :items="pathwayLayouting.pathway_list"
            v-on:change="selectPathway"
            editable
            clearable
            label="Focus Pathway"
            hide-details
            overflow
            dense
          ></v-overflow-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" class="mb-2">
          <div :id="contextID" class="webglContainer"></div>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import {
  mainGraph,
  panToNode,
  layoutToPathway,
  relaxLayout
} from '../core/mainNetwork'
import { generateGraphData } from '../core/graphPreparation'
import Vue from 'vue'
import Sigma from 'sigma'

interface Data{
  tableSearch: string
  selectedTab: string
  outstandingDraw: boolean
  networkGraph: (Sigma | undefined)
}

export default Vue.extend({
  // name of the component
  name: 'NetworkGraphComponent',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    selectedTab: 'transcriptomics',
    outstandingDraw: false,
    networkGraph: undefined
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
      pathwayLayouting: (state:any) => state.pathwayLayouting
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
    transcriptomicsSelection: function () {
      this.focusNodeTranscriptomics(this.transcriptomicsSelection)
    },
    proteomicsSelection: function () {
      this.focusNodeProteomics(this.proteomicsSelection)
    },
    metabolomicsSelection: function () {
      this.focusNodeMetabolomics(this.metabolomicsSelection)
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
      this.networkGraph = mainGraph(this.contextID, networkData)
    },
    focusNodeTranscriptomics (row: {[key: string]: string}) {
      const symbol = row[this.usedSymbolCols.transcriptomics]
      console.log('Symbol', symbol)
      console.log('dict', this.transcriptomicsSymbolDict)
      const keggID = this.transcriptomicsSymbolDict[symbol]
      console.log('ID', keggID)
      panToNode(this.networkGraph as Sigma, keggID)
    },
    focusNodeProteomics (row: {[key: string]: string}) {
      const symbol = row[this.usedSymbolCols.proteomics]
      const keggID = this.proteomicsSymbolDict[symbol]
      panToNode(this.networkGraph as Sigma, keggID)
    },
    focusNodeMetabolomics (row: {[key: string]: string}) {
      const symbol = row[this.usedSymbolCols.metabolomics]
      //  const keggID = this.proteomicsSymbolDict[symbol]
      panToNode(this.networkGraph as Sigma, symbol)
    },
    selectPathway (key: string) {
      console.log('KEY', key)
      if (key !== undefined && key !== null) {
        const nodeList = this.pathwayLayouting.pathway_node_dictionary[key]
        layoutToPathway(this.networkGraph as Sigma, key, nodeList)
      } else {
        relaxLayout(this.networkGraph as Sigma)
      }
    }
    // basic GET request using fetch

  }
})
</script>
