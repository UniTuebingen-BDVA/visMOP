<template>
    <div>
      <q-card v-bind:class="expandOverview ? 'overviewFullscreen' :  ''">
        <div class="col-12 q-pa-md">
            <q-fab
              icon="keyboard_arrow_down"
              direction="down"
            >
              <q-fab-action
                icon="keyboard_arrow_left"
                @click="expandComponent"
              ></q-fab-action>
              <q-fab-action
                icon="keyboard_arrow_right"
                @click="minimizeComponent"
              ></q-fab-action>
            </q-fab>
          <div :id="contextID" v-bind:class="[expandOverview ? '' :  '','webglContainer']"></div>                    
        </div>
      </q-card>
    </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import OverviewGraph from '../core/overviewNetwork'
import { generateGraphData } from '../core/keggOverviewGraphPreparation'
import { generateGlyphData, generateGlyphs } from '../core/overviewGlyph'
import { PropType } from 'vue'
import { useMainStore } from '@/stores'

interface Data{
  expandOverview: boolean
  outstandingDraw: boolean
  networkGraph: (OverviewGraph | undefined)
  transcriptomicsIntersection: string[]
  transcriptomicsUnion: string[]
  proteomicsIntersection: string[]
  proteomicsUnion: string[]
  metabolomicsIntersection: string[]
  metabolomicsUnion: string[]
}

export default {
  // name of the component
  name: 'KeggOverviewComponent',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    expandOverview: false,
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
    ...mapState(useMainStore, {
      overviewData: (state:any) => state.overviewData,
      fcs: (state:any) => state.fcs,
      fcQuantiles: (state:any) => state.fcQuantiles,
      pathwayDropdown: (state:any) => state.pathwayDropdown,
      pathwayLayouting: (state: any) => state.pathwayLayouting,
      usedSymbolCols: (state: any) => state.usedSymbolCols,
      transcriptomicsSymbolDict: (state:any) => state.transcriptomicsSymbolDict,
      proteomicsSymbolDict: (state:any) => state.proteomicsSymbolDict
    }),
    combinedIntersection: function (): string[] {
      const combinedElements = []
      if (this.transcriptomicsIntersection.length > 0) combinedElements.push(this.transcriptomicsIntersection)
      if (this.proteomicsIntersection.length > 0) combinedElements.push(this.proteomicsIntersection)
      if (this.metabolomicsIntersection.length > 0) combinedElements.push(this.metabolomicsIntersection)
      let intersection = combinedElements.length > 0 ? combinedElements.reduce((a, b) => a.filter((c) => b.includes(c))) : []

      intersection = [...new Set([...intersection])]
      return intersection
    },
    combinedUnion: function (): string[] {
      return [...new Set([...this.transcriptomicsUnion, ...this.proteomicsUnion, ...this.metabolomicsUnion])]
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
      this.transcriptomicsSelection?.forEach((element: { [key: string]: string}) => {
        const symbol = element[this.usedSymbolCols.transcriptomics]
        const keggID = this.transcriptomicsSymbolDict[symbol]
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[keggID]
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
      this.proteomicsSelection?.forEach((element: { [key: string]: string}) => {
        const symbol = element[this.usedSymbolCols.proteomics]
        const keggID = this.proteomicsSymbolDict[symbol]
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[keggID]
        if (pathwaysContaining) foundPathways.push(pathwaysContaining)
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
      this.metabolomicsSelection?.forEach((element: { [key: string]: string}) => {
        const symbol = element[this.usedSymbolCols.metabolomics]
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[symbol]
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
    transcriptomicsSelection: Array as PropType<{[key: string]: string}[]>,
    proteomicsSelection: Array as PropType<{[key: string]: string}[]>,
    metabolomicsSelection: Array as PropType<{[key: string]: string}[]>,
    isActive: Boolean
  },
  methods: {

    expandComponent () {
      this.expandOverview = true
    },
    minimizeComponent () {
      this.expandOverview = false
    },

    drawNetwork () {
      if (this.networkGraph) { this.networkGraph.killGraph() }
      const mainStore = useMainStore()
      const fcExtents = this.fcQuantiles
      const glyphData = generateGlyphData(fcExtents)
      mainStore.setGlyphData(glyphData)
      console.log('GLYPH DATA', glyphData)
      const generatedGlyphs = generateGlyphs(glyphData)
      mainStore.setGlyphs(generatedGlyphs)
      const glyphsURL = generatedGlyphs.url
      console.log('GLYPHs', mainStore.glyphs)
      const networkData = generateGraphData(this.overviewData, fcExtents, glyphsURL)
      console.log('base dat', networkData)
      this.networkGraph = new OverviewGraph(this.contextID ? this.contextID : '', networkData)
    }
  }
}
</script>
