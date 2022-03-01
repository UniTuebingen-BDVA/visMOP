<template>
  <div>
    <v-card>
      <v-row justify="space-between">
        <v-card-title>
          Network Graph Reactome
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
import { generateGraphData } from '../core/overviewGraphPreparationReactome'
import { generateGlyphData, generateGlyphDataReactome, generateGlyphs } from '../core/overviewGlyph'
import Vue from 'vue'
import Sigma from 'sigma'

interface Data{
  tableSearch: string
  selectedTab: string
  outstandingDraw: boolean
  networkGraph: (OverviewGraph | undefined)
  transcriptomicsIntersection: string[]
  transcriptomicsUnion: string[]
  proteomicsIntersection: string[]
  proteomicsUnion: string[]
  metabolomicsIntersection: string[]
  metabolomicsUnion: string[]
}

export default Vue.extend({
  // name of the component
  name: 'OverviewComponentReactome',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    selectedTab: 'transcriptomics',
    outstandingDraw: false,
    networkGraph: undefined,
    transcriptomicsIntersection: [],
    transcriptomicsUnion: [],
    proteomicsIntersection: [],
    proteomicsUnion: [],
    metabolomicsIntersection: [],
    metabolomicsUnion: []
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
    }),
    combinedIntersection: {
      get: function (): string[] {
        const combinedElements = []
        if (this.transcriptomicsIntersection.length > 0) combinedElements.push(this.transcriptomicsIntersection)
        if (this.proteomicsIntersection.length > 0) combinedElements.push(this.proteomicsIntersection)
        if (this.metabolomicsIntersection.length > 0) combinedElements.push(this.metabolomicsIntersection)
        let intersection = combinedElements.length > 0 ? combinedElements.reduce((a, b) => a.filter((c) => b.includes(c))) : []

        intersection = [...new Set([...intersection])]
        return intersection
      }
    },
    combinedUnion: {
      get: function (): string[] {
        return [...new Set([...this.transcriptomicsUnion, ...this.proteomicsUnion, ...this.metabolomicsUnion])]
      }
    }
  },
  watch: {
    combinedIntersection: function () {
      this.networkGraph?.setPathwaysContainingIntersecion(this.combinedIntersection)
    },
    combinedUnion: function () {
      this.networkGraph?.setPathwaysContainingUnion(this.combinedUnion)
    },
    transcriptomicsSelection: function () {
      const foundPathways: string[][] = []
      this.transcriptomicsSelection.forEach((element: { [key: string]: string}) => {
        const symbol = element[this.usedSymbolCols.transcriptomics]
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[symbol][0]
        if (pathwaysContaining) foundPathways.push(pathwaysContaining)
      })
      console.log('foundPathways', foundPathways)
      const intersection = foundPathways.length > 0 ? foundPathways.reduce((a, b) => a.filter((c) => b.includes(c))) : []
      const union = foundPathways.length > 0 ? foundPathways.reduce((a, b) => [...new Set([...a, ...b])]) : []
      this.transcriptomicsIntersection = intersection
      this.transcriptomicsUnion = union
      // this.networkGraph?.setPathwaysContainingSelection(intersection)
    },
    proteomicsSelection: function () {
      const foundPathways: string[][] = []
      this.proteomicsSelection.forEach((element: { [key: string]: string}) => {
        const symbol = element[this.usedSymbolCols.proteomics]
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[symbol]
        if (pathwaysContaining) foundPathways.push(pathwaysContaining); console.log('foundPathways', pathwaysContaining)
      })
      console.log('foundPathways', foundPathways)
      const intersection = foundPathways.length > 0 ? foundPathways.reduce((a, b) => a.filter((c) => b.includes(c))) : []
      const union = foundPathways.length > 0 ? foundPathways.reduce((a, b) => [...new Set([...a, ...b])]) : []
      this.proteomicsIntersection = intersection
      this.proteomicsUnion = union
      // this.networkGraph?.setPathwaysContainingSelection(intersection)
    },
    metabolomicsSelection: function () {
      const foundPathways: string[][] = []
      this.metabolomicsSelection.forEach((element: { [key: string]: string}) => {
        const symbol = element[this.usedSymbolCols.metabolomics]
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[symbol][0]
        if (pathwaysContaining) foundPathways.push(pathwaysContaining)
      })
      const intersection = foundPathways.length > 0 ? foundPathways.reduce((a, b) => a.filter((c) => b.includes(c))) : []
      const union = foundPathways.length > 0 ? foundPathways.reduce((a, b) => [...new Set([...a, ...b])]) : []
      this.metabolomicsIntersection = intersection
      this.metabolomicsUnion = union
      // this.networkGraph?.setPathwaysContainingSelection(intersection)
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
    transcriptomicsSelection: Array as Vue.PropType<{[key: string]: string}[]>,
    proteomicsSelection: Array as Vue.PropType<{[key: string]: string}[]>,
    metabolomicsSelection: Array as Vue.PropType<{[key: string]: string}[]>,
    isActive: Boolean
  },
  methods: {
    drawNetwork () {
      if (this.networkGraph) { this.networkGraph.killGraph() }
      // const fcExtents = this.fcQuantiles
      const glyphData = generateGlyphDataReactome()
      this.$store.dispatch('setGlyphData', glyphData)
      // console.log('GLYPH DATA', glyphData)
      const generatedGlyphs = generateGlyphs(glyphData)
      this.$store.dispatch('setGlyphs', generatedGlyphs)
      const glyphsURL = generatedGlyphs.url
      console.log('GLYPHs', this.$store.state.glyphs)
      const networkData = generateGraphData(this.overviewData, glyphsURL, this.pathwayLayouting.rootIds)
      console.log('base dat', networkData)
      this.networkGraph = new OverviewGraph(this.contextID, networkData)
    }
  }
})
</script>
