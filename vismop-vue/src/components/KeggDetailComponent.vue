<template>
  <div>
    <v-card v-bind:class="[minimizeButton ? 'detailComponentSmaller' : '', expandButton ? 'detailComponentLarger' : '','detailComponent']">
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
      <div :id="contextID" v-bind:class="[minimizeButton ? 'webglContainerDetailSmaller' : '',expandButton ? 'webglContainerDetailLarger' : '','webglContainerDetail']"></div>
      <v-card-actions>
        <v-btn
          class="mx-2 expandButton"
          fab
          dark
          small
          @click="expandComponent"
        ><v-icon>mdi-arrow-expand</v-icon></v-btn>
          <v-btn
          class="mx-2 minimizeButton"
          fab
          dark
          small
          @click="minimizeComponent"
        ><v-icon>mdi-window-minimize</v-icon></v-btn>
      </v-card-actions>
      </v-col>
    </v-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import DetailNetwork from '../core/keggDetailView'
import { generateGraphData } from '../core/detailGraphPreparation'
import { defineComponent } from 'vue'
import Sigma from 'sigma'
import vue from 'vue'
import { String } from 'lodash'
import { PropType } from 'vue'


interface Data{
  mutationObserver: (MutationObserver | undefined)
  tableSearch: string
  selectedTab: string
  outstandingDraw: boolean
  networkGraph: (DetailNetwork | undefined)
  pathwaySelection: string
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
    pathwaySelection: '',
    expandButton: false,
    minimizeButton: false

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
      this.$store.dispatch('focusPathwayViaDropdown', this.pathwaySelection)
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
