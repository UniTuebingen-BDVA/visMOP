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

<script>
import { mapState } from 'vuex'
import {
  mainGraph,
  panToNode,
  layoutToPathway,
  relaxLayout
} from '../core/mainNetwork'
import { generateGraphData } from '../core/graphPreparation'
import Vue from 'vue'

export default Vue.extend({
  // name of the component
  name: 'NetworkGraphComponent',

  // data section of the Vue component. Access via this.<varName> .
  data: () => ({
    tableSearch: '',
    selectedTab: 'transcriptomics',
    outstandingDraw: false
  }),

  computed: {
    ...mapState({
      graphData: (state) => state.graphData,
      fcs: (state) => state.fcs,
      transcriptomicsSymbolDict: (state) => state.transcriptomicsSymbolDict,
      proteomicsSymbolDict: (state) => state.proteomicsSymbolDict,
      usedSymbolCols: (state) => state.usedSymbolCols,
      overlay: (state) => state.overlay,
      pathwayLayouting: (state) => state.pathwayLayouting
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
      console.log(this.contextID, 'isActive: ', this.isActive, this.outstandingDraw)
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
    pathwaySelection: function () {
      this.selectPathway(this.pathwaySelection)
    }
  },

  mounted () {
    if (this.graphData) {
      this.drawNetwork()
    }
  },
  props: ['contextID', 'transcriptomicsSelection', 'proteomicsSelection', 'isActive'],
  methods: {
    drawNetwork () {
      const fcExtents = this.calculateCombinedExtent()
      const networkData = generateGraphData(this.graphData, fcExtents)
      console.log('base dat', networkData)
      this.networkGraph = mainGraph(this.contextID, networkData)
    },
    focusNodeTranscriptomics (row) {
      const symbol = row[this.usedSymbolCols.transcriptomics]
      console.log('Symbol', symbol)
      console.log('dict', this.transcriptomicsSymbolDict)
      const keggID = this.transcriptomicsSymbolDict[symbol]
      console.log('ID', keggID)
      panToNode(this.networkGraph, keggID)
    },
    focusNodeProteomics (row) {
      const symbol = row[this.usedSymbolCols.proteomics]
      const keggID = this.proteomicsSymbolDict[symbol]
      panToNode(this.networkGraph, keggID)
    },
    selectPathway (key) {
      console.log('KEY', key)
      if (key !== undefined && key !== null) {
        const nodeList = this.pathwayLayouting.pathway_node_dictionary[key]
        layoutToPathway(this.networkGraph, key, nodeList)
      } else {
        relaxLayout(this.networkGraph)
      }
    },
    // basic GET request using fetch
    calculateCombinedExtent () {
      console.log('fcs', this.fcs)
      const fcsNum = []
      this.fcs.forEach((element) => {
        if (!(typeof element.transcriptomics === 'string')) {
          fcsNum.push(element.transcriptomics)
        }
        if (!(typeof element.proteomics === 'string')) {
          fcsNum.push(element.proteomics)
        }
      })
      const fcsAsc = fcsNum.sort((a, b) => a - b)

      // https://stackoverflow.com/a/55297611
      const quantile = (arr, q) => {
        const pos = (arr.length - 1) * q
        const base = Math.floor(pos)
        const rest = pos - base
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base])
        } else {
          return arr[base]
        }
      }

      const minVal5 = quantile(fcsAsc, 0.05)
      const maxVal95 = quantile(fcsAsc, 0.95)
      return [minVal5, maxVal95]
    }
  }
})
</script>
