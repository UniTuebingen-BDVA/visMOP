<!--
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
import { mainGraph } from '../core/mainNetwork'
import { generateGraphData } from '../core/graphPreparation'
import Vue from 'vue'
import Sigma from 'sigma'

interface Data{
  placeHolder: string
  interactionGraph: (Sigma | undefined)
}

export default Vue.extend({
  // name of the component
  name: 'InteractionGraph',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    placeHolder: '',
    interactionGraph: undefined,

  }),

  computed: {
    ...mapState({
      overviewData: (state:any) => state.overviewData,
      fcs: (state:any) => state.fcs,
      overlay: (state:any) => state.overlay
    })
  },
  watch: {
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
      const networkData = generateGraphData(this.overviewData, [0, 0])
      console.log('base dat', networkData)
      this.networkGraph = mainGraph(this.contextID, networkData)
    }
  }
})
</script>
-->