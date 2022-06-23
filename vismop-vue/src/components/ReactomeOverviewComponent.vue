<template>
  <div>
    <q-card :class="expandOverview ? 'overviewFullscreen' : ''">
      <div class="col-12 q-pa-md">
        <q-fab
          icon="keyboard_arrow_down"
          direction="down"
          vertical-actions-align="left"
        >
          <q-fab-action
            color="primary"
            icon="keyboard_arrow_left"
            @click="expandComponent"
          ></q-fab-action>
          <q-fab-action
            color="primary"
            icon="keyboard_arrow_right"
            @click="minimizeComponent"
          ></q-fab-action>
          <q-fab-action
            color="primary"
            icon="mdi-restore"
            @click="resetZoom"
          ></q-fab-action>
          <q-fab-action color="white">
            <graph-filter
              v-model:transcriptomics="transcriptomicsFilter"
              v-model:proteomics="proteomicsFilter"
              v-model:metabolomics="metabolomicsFilter"
            ></graph-filter>
          </q-fab-action>
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
import OverviewGraph from '../core/reactomeGraphs/reactomeOverviewNetwork/overviewNetwork';
import GraphFilter from './GraphFilter.vue';
import { generateGraphData } from '../core/reactomeGraphs/reactomeOverviewGraphPreparation';
import { generateGlyphDataReactome } from '../core/overviewGlyphs/glyphDataPreparation';
import { generateGlyphs } from '../core/overviewGlyphs/generator';
import {
  computed,
  onMounted,
  PropType,
  Ref,
  ref,
  watch,
  defineProps,
} from 'vue';
import { reactomeEntry } from '@/core/reactomeGraphs/reactomeTypes';
import { glyphData } from '@/core/generalTypes';
import { useMainStore } from '@/stores';
import { HighDetailGlyph } from '@/core/overviewGlyphs/highDetailGlyph';
import { LowDetailGlyph } from '@/core/overviewGlyphs/lowDetailGlyph';

const props = defineProps({
  contextID: { type: String, required: true },
  transcriptomicsSelection: {
    type: Array as PropType<{ [key: string]: string }[]>,
    required: true,
  },
  proteomicsSelection: {
    type: Array as PropType<{ [key: string]: string }[]>,
    required: true,
  },
  metabolomicsSelection: {
    type: Array as PropType<{ [key: string]: string }[]>,
    required: true,
  },
  isActive: {
    type: Boolean,
    required: true,
  },
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
const glyphDataVar: Ref<{
  [key: string]: glyphData;
}> = ref({});

const transcriptomicsFilter = ref({
  limits: { min: 0, max: 5 },
  value: { min: 1, max: 2 },
  filterActive: false,
  inside: true,
  disable: true,
});
const proteomicsFilter = ref({
  limits: { min: 0, max: 5 },
  value: { min: 1, max: 2 },
  filterActive: false,
  inside: true,
  disable: true,
});
const metabolomicsFilter = ref({
  limits: { min: 0, max: 5 },
  value: { min: 1, max: 2 },
  filterActive: false,
  inside: true,
  disable: true,
});

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
    console.log('foundPathways', foundPathways);
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
      console.log('foundPathways', pathwaysContaining);
    });
    console.log('foundPathways', foundPathways);
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
    console.log(props.contextID, 'outstanding draw');
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

watch(glyphDataVar, () => {
  let transcriptomicsAvailable = false;
  let proteomicsAvailable = false;
  let metabolomicsAvailable = false;
  let transcriptomicsLimits = {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  };
  let proteomicsLimits = {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  };
  let metabolomicsLimits = {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  };

  for (const pathwayKey in glyphDataVar.value) {
    const currPathway = glyphDataVar.value[pathwayKey];
    if (currPathway.transcriptomics.available) {
      transcriptomicsAvailable = true;
      if (
        currPathway.transcriptomics.meanFoldchange < transcriptomicsLimits.min
      )
        transcriptomicsLimits.min = currPathway.transcriptomics.meanFoldchange;
      if (
        currPathway.transcriptomics.meanFoldchange > transcriptomicsLimits.max
      )
        transcriptomicsLimits.max = currPathway.transcriptomics.meanFoldchange;
    }
    if (currPathway.proteomics.available) {
      proteomicsAvailable = true;
      if (currPathway.proteomics.meanFoldchange < proteomicsLimits.min)
        proteomicsLimits.min = currPathway.transcriptomics.meanFoldchange;
      if (currPathway.proteomics.meanFoldchange > proteomicsLimits.max)
        proteomicsLimits.max = currPathway.proteomics.meanFoldchange;
    }
    if (currPathway.metabolomics.available) {
      metabolomicsAvailable = true;
      if (currPathway.metabolomics.meanFoldchange < metabolomicsLimits.min)
        metabolomicsLimits.min = currPathway.metabolomics.meanFoldchange;
      if (currPathway.metabolomics.meanFoldchange > metabolomicsLimits.max)
        metabolomicsLimits.max = currPathway.metabolomics.meanFoldchange;
    }
  }
  transcriptomicsFilter.value.disable = !transcriptomicsAvailable;
  proteomicsFilter.value.disable = !proteomicsAvailable;
  metabolomicsFilter.value.disable = !metabolomicsAvailable;

  transcriptomicsFilter.value.limits.max = transcriptomicsLimits.max;
  transcriptomicsFilter.value.limits.max = transcriptomicsLimits.max;

  proteomicsFilter.value.limits.max = proteomicsLimits.max;
  proteomicsFilter.value.limits.max = proteomicsLimits.max;

  metabolomicsFilter.value.limits.max = metabolomicsLimits.max;
  metabolomicsFilter.value.limits.max = metabolomicsLimits.max;
});

watch(
  [
    transcriptomicsFilter.value,
    proteomicsFilter.value,
    metabolomicsFilter.value,
  ],
  () => {
    console.log('change Filter');
    networkGraph?.value?.setAverageFilter(
      transcriptomicsFilter.value,
      proteomicsFilter.value,
      metabolomicsFilter.value
    );
  }
);

onMounted(() => {
  console.log('OVDATA', overviewData);
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
const resetZoom = () => {
  networkGraph.value?.resetZoom();
};
const drawNetwork = () => {
  networkGraph.value?.killGraph();
  // const fcExtents = fcQuantiles
  glyphDataVar.value = generateGlyphDataReactome();
  mainStore.setGlyphData(glyphDataVar.value);
  console.log('GLYPH DATA', glyphDataVar.value);
  const generatedGlyphs = generateGlyphs(glyphDataVar.value, HighDetailGlyph);
  const generatedGlyphsHighRes = generateGlyphs(
    glyphDataVar.value,
    HighDetailGlyph,
    128
  );
  const generatedGlyphsLowZoom = generateGlyphs(
    glyphDataVar.value,
    LowDetailGlyph,
    128
  );
  mainStore.setGlyphs(generatedGlyphs);
  console.log('GLYPHs', mainStore.glyphs);
  console.log('GLYPHs HighRes', generatedGlyphsHighRes);
  console.log('GLYPHs lowZOOM', generatedGlyphsLowZoom);

  const networkData = generateGraphData(
    overviewData.value,
    generatedGlyphs.url,
    generatedGlyphsHighRes.url,
    generatedGlyphsLowZoom.url,
    glyphDataVar.value,
    pathwayLayouting.value.rootIds
  );
  console.log('base dat', networkData);
  networkGraph.value = new OverviewGraph(
    props.contextID ? props.contextID : '',
    networkData
  );
};
</script>
