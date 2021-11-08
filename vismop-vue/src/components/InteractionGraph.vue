
<template>
  <div>
    <v-card>
      <v-row justify="space-between">
        <v-card-title>
          InteractionGraph
        </v-card-title>
      </v-row>
      <v-row>
        <v-col cols="12" class="mb-2">
          <div :id="contextID" class="webglContainerSmall"></div>
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
  placeHolder: string;
  interactionGraph: Sigma | undefined;
}

export default Vue.extend({
  // name of the component
  name: 'InteractionGraph',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    placeHolder: '',
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
      generateInteractionGraph(this.contextID, this.interactionGraphData)
    }
  },

  // mounted () {},
  props: ['contextID'],
  methods: {
    drawInteractionGraph () {
      console.log('Placeholder')
    }
  }
})
</script>
