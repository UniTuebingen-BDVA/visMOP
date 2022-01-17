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
      pathwayDropdown: (state:any) => state.pathwayDropdown

    })
  },
  watch: {
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
  props: ['contextID', 'isActive'],
  methods: {
    drawNetwork () {
      const fcExtents = this.fcQuantiles
      const glyphData = generateGlyphData(fcExtents)
      this.$store.dispatch('setGlyphData', glyphData)
      console.log('GLYPH DATA', glyphData)
      const glyphs = generateGlyphs(glyphData)
      console.log('GLYPHs', glyphData)
      const networkData = generateGraphData(this.overviewData, fcExtents, glyphs)
      console.log('base dat', networkData)
      this.networkGraph = new OverviewGraph(this.contextID, networkData)
    }
  }
})
</script>
