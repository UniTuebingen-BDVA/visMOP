
<template>
  <div>
    <q-card>
      <div class="row" justify="space-between" align="center">
        <div class="col-4">
          <div>
            InteractionGraph
          </div>
        </div>
        <div class="col-3">
          <q-btn v-on:click="queryEgoGraphs">Plot</q-btn>
        </div>
        <div class="col-5">
          <q-range
            thumb-label
            v-model="stringSlider"
            min=400
            max=1000
            hide-details=""
          > </q-range>
        </div>
      </div>
      <div class="row">
        <div class="col-12 mb-2">
          <div :id="contextID" class="webglContainer"></div>
        </div>
      </div>
    </q-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { generateInteractionGraph } from '../core/interactionGraph'
import Sigma from 'sigma'
import { useMainStore } from '@/stores'

interface Data {
  stringSlider: number;
  interactionGraph: Sigma | undefined;
}

export default {
  // name of the component
  name: 'InteractionGraph',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    stringSlider: 900,
    interactionGraph: undefined
  }),

  computed: {
    ...mapState(useMainStore,{
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
      const mainStore = useMainStore()
      mainStore.queryEgoGraps(this.stringSlider)
    }
  }
}
</script>
