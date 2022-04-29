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
import { generateInteractionGraph } from "../core/interactionGraph";
import Sigma from "sigma";
import { useMainStore } from "@/stores";
import { computed, ref, watch } from "vue";
import type { Ref } from "vue";

const props = defineProps(["contextID"]);

const mainStore = useMainStore();

// data section of the Vue component. Access via this.<varName> .
const stringSlider = ref(900);
const interactionGraph: Ref<Sigma | undefined> = ref(undefined);

// get from store
const interactionGraphData = computed(() => mainStore.interactionGraphData);

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
  mainStore.queryEgoGraps(stringSlider.value);
};
</script>
