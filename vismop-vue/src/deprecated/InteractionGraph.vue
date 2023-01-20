<template>
  <div>
    <q-card>
      <div class="row" justify="space-between" align="center">
        <div class="col-4">
          <div>InteractionGraph</div>
        </div>
        <div class="col-3">
          <q-btn @click="queryEgoGraphs">Plot</q-btn>
        </div>
        <div class="col-5">
          <q-slider
            v-model="stringSlider"
            thumb-label
            :min="400"
            :max="1000"
            :step="1"
          >
          </q-slider>
        </div>
      </div>
      <div class="row">
        <div class="col-12 mb-2">
          <div :id="props.contextID" class="webglContainerInteraction"></div>
        </div>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { generateInteractionGraph } from './interactionGraph';
import Sigma from 'sigma';
import { useMainStore } from '@/stores';
import { computed, ref, watch, defineProps } from 'vue';
import type { Ref } from 'vue';
import { useQuasar } from 'quasar';

const props = defineProps({
  contextID: { type: String, required: true },
});

const mainStore = useMainStore();

// data section of the Vue component. Access via this.<varName> .
const stringSlider = ref(900);
const interactionGraph: Ref<Sigma | undefined> = ref(undefined);

// get from store
const interactionGraphData = computed(() => mainStore.interactionGraphData);
const clickedNodes = computed(() => mainStore.clickedNodes);

// watch
watch(interactionGraphData, () => {
  if (interactionGraph.value) {
    interactionGraph.value.kill();
  }
  interactionGraph.value = generateInteractionGraph(
    props.contextID,
    mainStore.interactionGraphData
  );
});
// methods
const queryEgoGraphs = () => {
  //const $q = useQuasar();
  //$q.loading.show();
  let ids: string[] = [];
  ids = clickedNodes.value.map((elem) => {
    return elem.id;
  });
  fetch('/interaction_graph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes: ids, threshold: stringSlider.value }),
  })
    .then((response) => response.json())
    .then((content) => {
      mainStore.setInteractionGraphData(content.interaction_graph);
      //$q.loading.hide();
    });
  mainStore.queryEgoGraps(stringSlider.value);
};
</script>
