<template>
  <div>
    <q-card
      :class="[
        minimizeButton ? 'detailComponentSmaller' : '',
        expandButton ? 'detailComponentLarger' : '',
        'detailComponent',
      ]"
    >
      <div class="col">
        <q-select
          v-model="pathwaySelection"
          filled
          :options="pathwayDropdownOptions"
          label="Focus Pathway"
          use-input
          input-debounce="0"
          option-label="text"
          option-value="value"
          @filter="filterFunction"
        ></q-select>
        <div
          :id="contextID"
          :class="[
            minimizeButton ? 'webglContainerDetailSmaller' : '',
            expandButton ? 'webglContainerDetailLarger' : '',
            'webglContainerDetail',
          ]"
        ></div>
        <q-card-actions>
          <q-fab icon="keyboard_arrow_down" direction="down">
            <q-fab-action
              icon="mdi-arrow-expand"
              @click="expandComponent"
            ></q-fab-action>
            <q-fab-action
              icon="mdi-arrow-collapse"
              @click="minimizeComponent"
            ></q-fab-action>
          </q-fab>
        </q-card-actions>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import DetailNetwork from "../core/keggDetailView";
import { generateGraphData } from "../core/detailGraphPreparation";
import { computed, onMounted, PropType, ref, Ref, watch } from "vue";
import { useMainStore } from "@/stores";

const props = defineProps({
  contextID: String,
  transcriptomicsSelection: Array as PropType<{ [key: string]: string }[]>,
  proteomicsSelection: Array as PropType<{ [key: string]: string }[]>,
  metabolomicsSelection: Array as PropType<{ [key: string]: string }[]>,
  isActive: Boolean,
});

const mainStore = useMainStore();

const mutationObserver: Ref<MutationObserver | undefined> = ref(undefined);
const expandButton = ref(false);
const minimizeButton = ref(false);
const outstandingDraw = ref(false);
const pathwayDropdownOptions: Ref<
  { title: string; value: string; text: string }[]
> = ref([]);
const pathwaySelection = ref({ title: "", value: "", text: "" });
const networkGraph: Ref<DetailNetwork | undefined> = ref(undefined);

const graphData = computed(() => mainStore.graphData);
const fcQuantiles = computed(() => mainStore.fcQuantiles);
const pathwayLayouting = computed(() => mainStore.pathwayLayouting);
const pathwayDropdown = computed(() => mainStore.pathwayDropdown);

watch(graphData, () => {
  if (props.isActive) {
    drawNetwork();
  } else {
    outstandingDraw.value = true;
  }
});
watch(
  () => props.isActive,
  () => {
    if (outstandingDraw.value) {
      setTimeout(() => {
        drawNetwork();
      }, 1000);
      outstandingDraw.value = false;
    }
  }
);
watch(pathwaySelection, () => {
  const mainStore = useMainStore();
  selectPathway(pathwaySelection.value.value);
  mainStore.focusPathwayViaDropdown(pathwaySelection.value);
});

watch(pathwayDropdown, () => {
  pathwaySelection.value = pathwayDropdown.value;
});

onMounted(() => {
  mutationObserver.value = new MutationObserver(refreshGraph);
  const config = { attributes: true };
  const tar = document.getElementById(props.contextID ? props.contextID : "");
  if (tar) mutationObserver.value.observe(tar, config);
  if (graphData.value.nodes.length > 0) {
    drawNetwork();
  }
});

/* METHODS */

const filterFunction = (val: string, update: (n: () => void) => void) => {
  update(() => {
    const tarValue = val.toLowerCase();
    pathwayDropdownOptions.value = pathwayLayouting.value.pathwayList.filter(
      (v: { text: string; value: string; title: string }) =>
        v.text.toLowerCase().indexOf(tarValue) > -1
    );
  });
};
const drawNetwork = () => {
  networkGraph.value?.killGraph();
  const fcExtents = fcQuantiles.value;
  const networkData = generateGraphData(graphData.value, fcExtents);
  const key = pathwayDropdown.value.value
    ? pathwayDropdown.value.value
    : Object.keys(pathwayLayouting.value.pathwayNodeDictionary)[0];
  console.log(
    "CURRENT BUG",
    pathwayDropdown.value,
    pathwayLayouting.value.pathwayNodeDictionary,
    key
  );
  const nodeList = pathwayLayouting.value.pathwayNodeDictionary[key];
  networkGraph.value = new DetailNetwork(
    networkData,
    props.contextID ? props.contextID : "",
    key,
    nodeList
  );
};
const selectPathway = (key: string) => {
  console.log("KEY", key);
  if (key !== undefined && key !== null) {
    const nodeList = pathwayLayouting.value.pathwayNodeDictionary[key];
    networkGraph.value?.selectNewPathway(key, nodeList);
  } else {
    console.log("TEST");
    // relaxLayout(this.networkGraph as Sigma)
  }
};
const expandComponent = () => {
  expandButton.value = !expandButton.value;
  minimizeButton.value = false;
  networkGraph.value?.refresh();
};
const minimizeComponent = () => {
  minimizeButton.value = !minimizeButton.value;
  expandButton.value = false;
  networkGraph.value?.refresh();
};
const refreshGraph = () => {
  networkGraph.value?.refresh();
};
</script>
