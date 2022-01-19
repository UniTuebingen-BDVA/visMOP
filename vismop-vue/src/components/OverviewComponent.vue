<template>
  <div>
    <v-card>
      <v-row justify="space-between">
        <v-card-title>
          Network Graph
          <v-spacer></v-spacer>
        </v-card-title>
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
import OverviewGraph from '../core/overviewNetwork'
import { generateGraphData } from '../core/overviewGraphPreparation'
import { generateGlyphData, generateGlyphs } from '../core/overviewGlyph'
import Vue from 'vue'
import Sigma from 'sigma'

interface Data{
  tableSearch: string
  selectedTab: string
  outstandingDraw: boolean
  networkGraph: (OverviewGraph | undefined)
}

export default Vue.extend({
  // name of the component
  name: 'OverviewComponent',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    selectedTab: 'transcriptomics',
    outstandingDraw: false,
    networkGraph: undefined

  }),

  computed: {
    ...mapState({
      overviewData: (state:any) => state.overviewData,
      fcs: (state:any) => state.fcs,
      overlay: (state:any) => state.overlay,
      fcQuantiles: (state:any) => state.fcQuantiles,
      pathwayDropdown: (state:any) => state.pathwayDropdown,
      pathwayLayouting: (state: any) => state.pathwayLayouting,
      usedSymbolCols: (state: any) => state.usedSymbolCols,
      transcriptomicsSymbolDict: (state:any) => state.transcriptomicsSymbolDict,
      proteomicsSymbolDict: (state:any) => state.proteomicsSymbolDict
    })
  },
  watch: {
    transcriptomicsSelection: function () {
      const symbol = this.transcriptomicsSelection[this.usedSymbolCols.transcriptomics]
      const keggID = this.transcriptomicsSymbolDict[symbol]
      console.log('SYMBOL OVERVIEW', symbol)
      console.log('KEGGID OVERVIEW', keggID)
      console.log('nodePathwayDictionary', this.pathwayLayouting.nodePathwayDictionary)
      console.log('CLICKTEST', this.pathwayLayouting.nodePathwayDictionary[keggID])
    },
    proteomicsSelection: function () {
      const symbol = this.proteomicsSelection[this.usedSymbolCols.proteomics]
      const keggID = this.proteomicsSymbolDict[symbol]
      console.log('CLICKTEST', this.pathwayLayouting.nodePathwayDictionary[keggID])
    },
    metabolomicsSelection: function () {
      const symbol = this.metabolomicsSelection[this.usedSymbolCols.metabolomics]
      console.log('CLICKTEST', this.pathwayLayouting.nodePathwayDictionary[symbol])
    },
    pathwayDropdown: function () {
      this.networkGraph?.refreshCurrentPathway()
    },
    overviewData: function () {
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
    }
  },

  mounted () {
    console.log('OVDATA', this.overviewData)
    if (this.overviewData) {
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
      const glyphData = generateGlyphData(fcExtents)
      this.$store.dispatch('setGlyphData', glyphData)
      console.log('GLYPH DATA', glyphData)
      const generatedGlyphs = generateGlyphs(glyphData)
      this.$store.dispatch('setGlyphs', generatedGlyphs)
      const glyphsURL = generatedGlyphs.url
      console.log('GLYPHs', this.$store.state.glyphs)
      const networkData = generateGraphData(this.overviewData, fcExtents, glyphsURL)
      console.log('base dat', networkData)
      this.networkGraph = new OverviewGraph(this.contextID, networkData)
    }
  }
})
</script>
