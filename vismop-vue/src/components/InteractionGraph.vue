
<template>
  <div>
    <v-card>
      <v-row justify="space-between" align="center">
        <v-col cols="4">
          <v-card-title>
            InteractionGraph
          </v-card-title>
        </v-col>
        <v-col cols="3">
          <v-btn v-on:click="queryEgoGraphs">Plot</v-btn>
        </v-col>
        <v-col cols="5">
          <v-slider
            thumb-label
            v-model="stringSlider"
            min=400
            max=1000
            hide-details=""
          > </v-slider>
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
import { generateInteractionGraph } from '../core/interactionGraph'
import Vue from 'vue'
import Sigma from 'sigma'

interface Data {
  stringSlider: number;
  interactionGraph: Sigma | undefined;
}

export default Vue.extend({
  // name of the component
  name: 'InteractionGraph',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    stringSlider: 900,
    interactionGraph: undefined
  }),

  computed: {
    ...mapState({
      overlay: (state: any) => state.overlay,
      interactionGraphData: (state: any) => state.interactionGraphData
    })
  },
  watch: {
    interactionGraphData: function () {
      if (this.interactionGraph) {
        this.interactionGraph.kill()
      }
      this.interactionGraph = generateInteractionGraph(this.contextID, this.interactionGraphData)
    }
  },

  // mounted () {},
  props: ['contextID'],
  methods: {
    queryEgoGraphs () {
      this.$store.dispatch('queryEgoGraps', this.stringSlider)
    }
  }
})
</script>
