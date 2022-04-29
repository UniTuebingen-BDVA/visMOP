<template>
  <div>
    <q-card :class="expandOverview ? 'overviewFullscreen' : ''">
      <div class="col-12 q-pa-md">
        <q-fab icon="keyboard_arrow_down" direction="down">
          <q-fab-action
            icon="keyboard_arrow_left"
            @click="expandComponent"
          ></q-fab-action>
          <q-fab-action
            icon="keyboard_arrow_right"
            @click="minimizeComponent"
          ></q-fab-action>
        </q-fab>
        <div
          :id="contextID"
          :class="[expandOverview ? '' : '', 'webglContainer']"
        ></div>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import OverviewGraph from "../core/overviewNetwork";
import { generateGraphData } from "../core/reactomeOverviewGraphPreparation";
import {
  generateGlyphDataReactome,
  generateGlyphs,
} from "../core/overviewGlyph";
import { computed, onMounted, PropType, Ref, ref, watch } from "vue";
import { reactomeEntry } from "@/core/reactomeTypes";
import { useMainStore } from "@/stores";

interface Data {
  expandOverview: boolean;
  outstandingDraw: boolean;
  networkGraph: OverviewGraph | undefined;
  transcriptomicsIntersection: string[];
  transcriptomicsUnion: string[];
  proteomicsIntersection: string[];
  proteomicsUnion: string[];
  metabolomicsIntersection: string[];
  metabolomicsUnion: string[];
}
const props = defineProps({
  contextID: String,
  transcriptomicsSelection: Array as PropType<{ [key: string]: string }[]>,
  proteomicsSelection: Array as PropType<{ [key: string]: string }[]>,
  metabolomicsSelection: Array as PropType<{ [key: string]: string }[]>,
  isActive: Boolean,
});

const mainStore = useMainStore();

const expandOverview = ref(false);
const outstandingDraw = ref(false);
const networkGraph: Ref<OverviewGraph | undefined> = ref(undefined);
const transcriptomicsIntersection: Ref<string[]> = ref([]);
const transcriptomicsUnion: Ref<string[]> = ref([]);
const proteomicsIntersection: Ref<string[]> = ref([]);
const proteomicsUnion: Ref<string[]> = ref([]);
const metabolomicsIntersection: Ref<string[]> = ref([]);
const metabolomicsUnion: Ref<string[]> = ref([]);

const overviewData = computed(() => mainStore.overviewData as reactomeEntry[]);
const pathwayDropdown = computed(() => mainStore.pathwayDropdown);
const pathwayLayouting = computed(() => mainStore.pathwayLayouting);
const usedSymbolCols = computed(() => mainStore.usedSymbolCols);

const combinedIntersection = computed((): string[] => {
  const combinedElements = [];
  if (transcriptomicsIntersection.value.length > 0)
    combinedElements.push(transcriptomicsIntersection.value);
  if (proteomicsIntersection.value.length > 0)
    combinedElements.push(proteomicsIntersection.value);
  if (metabolomicsIntersection.value.length > 0)
    combinedElements.push(metabolomicsIntersection.value);
  let intersection =
    combinedElements.length > 0
      ? combinedElements.reduce((a, b) => a.filter((c) => b.includes(c)))
      : [];

  intersection = [...new Set([...intersection])];
  return intersection;
});
const combinedUnion = computed((): string[] => {
  return [
    ...new Set([
      ...transcriptomicsUnion.value,
      ...proteomicsUnion.value,
      ...metabolomicsUnion.value,
    ]),
  ];
});
watch(combinedIntersection, () => {
  networkGraph.value?.setPathwaysContainingIntersecion(
    combinedIntersection.value
  );
});
watch(combinedUnion, () => {
  networkGraph.value?.setPathwaysContainingUnion(combinedUnion.value);
});
watch(
  () => props.transcriptomicsSelection,
  () => {
    const foundPathways: string[][] = [];
    props.transcriptomicsSelection?.forEach(
      (element: { [key: string]: string }) => {
        const symbol = element[usedSymbolCols.value.transcriptomics];
        const pathwaysContaining =
          pathwayLayouting.value.nodePathwayDictionary[symbol]; // [0] ??????? TODO BUG CHECK???
        if (pathwaysContaining) foundPathways.push(pathwaysContaining);
      }
    );
    console.log("foundPathways", foundPathways);
    const intersection =
      foundPathways.length > 0
        ? foundPathways.reduce((a, b) => a.filter((c) => b.includes(c)))
        : [];
    const union =
      foundPathways.length > 0
        ? foundPathways.reduce((a, b) => [...new Set([...a, ...b])])
        : [];
    transcriptomicsIntersection.value = intersection;
    transcriptomicsUnion.value = union;
    // networkGraph?.setPathwaysContainingSelection(intersection)
  }
);
watch(
  () => props.proteomicsSelection,
  () => {
    const foundPathways: string[][] = [];
    props.proteomicsSelection?.forEach((element: { [key: string]: string }) => {
      const symbol = element[usedSymbolCols.value.proteomics];
      const pathwaysContaining =
        pathwayLayouting.value.nodePathwayDictionary[symbol];
      if (pathwaysContaining) foundPathways.push(pathwaysContaining);
      console.log("foundPathways", pathwaysContaining);
    });
    console.log("foundPathways", foundPathways);
    const intersection =
      foundPathways.length > 0
        ? foundPathways.reduce((a, b) => a.filter((c) => b.includes(c)))
        : [];
    const union =
      foundPathways.length > 0
        ? foundPathways.reduce((a, b) => [...new Set([...a, ...b])])
        : [];
    proteomicsIntersection.value = intersection;
    proteomicsUnion.value = union;
    // networkGraph?.setPathwaysContainingSelection(intersection)
  }
);
watch(
  () => props.metabolomicsSelection,
  () => {
    const foundPathways: string[][] = [];
    props.metabolomicsSelection?.forEach(
      (element: { [key: string]: string }) => {
        const symbol = element[usedSymbolCols.value.metabolomics];
        const pathwaysContaining =
          pathwayLayouting.value.nodePathwayDictionary[symbol]; //[0] ???? bugcheck
        if (pathwaysContaining) foundPathways.push(pathwaysContaining);
      }
    );
    const intersection =
      foundPathways.length > 0
        ? foundPathways.reduce((a, b) => a.filter((c) => b.includes(c)))
        : [];
    const union =
      foundPathways.length > 0
        ? foundPathways.reduce((a, b) => [...new Set([...a, ...b])])
        : [];
    metabolomicsIntersection.value = intersection;
    metabolomicsUnion.value = union;
    // networkGraph?.setPathwaysContainingSelection(intersection)
  }
);
watch(pathwayDropdown, () => {
  networkGraph.value?.refreshCurrentPathway();
});
watch(overviewData, () => {
  if (props.isActive) {
    console.log(props.contextID);
    drawNetwork();
  } else {
    console.log(props.contextID, "outstanding draw");
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

onMounted(() => {
  console.log("OVDATA", overviewData);
  if (overviewData.value) {
    drawNetwork();
  }
});
const expandComponent = () => {
  expandOverview.value = true;
};
const minimizeComponent = () => {
  expandOverview.value = false;
};
const drawNetwork = () => {
  networkGraph.value?.killGraph();
  // const fcExtents = fcQuantiles
  const glyphData = generateGlyphDataReactome();
  mainStore.setGlyphData(glyphData);
  console.log("GLYPH DATA", glyphData);
  const generatedGlyphs = generateGlyphs(glyphData);
  mainStore.setGlyphs(generatedGlyphs);
  const glyphsURL = generatedGlyphs.url;
  console.log("GLYPHs", mainStore.glyphs);
  const networkData = generateGraphData(
    overviewData.value,
    glyphsURL,
    pathwayLayouting.value.rootIds
  );
  console.log("base dat", networkData);
  networkGraph.value = new OverviewGraph(
    props.contextID ? props.contextID : "",
    networkData
  );
};
</script>
