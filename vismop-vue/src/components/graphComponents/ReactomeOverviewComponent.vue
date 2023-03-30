<template>
  <q-card :class="[expandOverview ? 'overviewFullscreen' : '', 'row fit ']">
    <div class="col-12">
      <q-fab
        icon="keyboard_arrow_down"
        label="Overview Actions"
        direction="down"
        vertical-actions-align="left"
        class="absolute q-pa-md fab-class"
      >
        <div class="row graphControl">
          <div class="col-3">
            <q-btn
              color="primary"
              round
              icon="keyboard_arrow_left"
              @click="expandComponent"
              ><q-tooltip class="bg-accent">Expand</q-tooltip></q-btn
            >
          </div>
          <div class="col-3">
            <q-btn
              color="primary"
              round
              icon="keyboard_arrow_right"
              @click="minimizeComponent"
              ><q-tooltip class="bg-accent">Shrink</q-tooltip></q-btn
            >
          </div>
          <div class="col-3">
            <q-btn color="primary" round icon="mdi-restore" @click="resetZoom"
              ><q-tooltip class="bg-accent">Reset</q-tooltip></q-btn
            >
          </div>
          <div class="col-3">
            <q-btn
              color="primary"
              round
              icon="mdi-select-remove"
              @click="removeSelection"
              ><q-tooltip class="bg-accent">Deselect</q-tooltip></q-btn
            >
          </div>
        </div>

        <q-fab-action color="white" text-color="black">
          <q-expansion-item
            v-model="expandFilter"
            icon="fa-solid fa-filter"
            label="Graph Filter"
            @click.prevent
          >
            <graph-filter
              v-model:root-negative-filter="rootNegativeFilter"
              v-model:rootFilter="rootFilter"
              v-model:transcriptomics="transcriptomicsFilter"
              v-model:transcriptomics-regulated="transcriptomicsRegulatedFilter"
              v-model:proteomics="proteomicsFilter"
              v-model:proteomics-regulated="proteomicsRegulatedFilter"
              v-model:metabolomics="metabolomicsFilter"
              v-model:metabolomics-regulated="metabolomicsRegulatedFilter"
              v-model:sumRegulated="sumRegulated"
              @click.prevent
            ></graph-filter>
          </q-expansion-item>
        </q-fab-action>
        <q-fab-action color="white" text-color="black">
          <q-expansion-item
            v-model="expandFa2Controls"
            icon="fa-solid fa-diagram-project"
            label="FA2 Controls"
            @click.prevent
          >
            <fa2-params
              v-model:fa2LayoutParams="fa2LayoutParams"
              @click.prevent
            ></fa2-params>
          </q-expansion-item>
        </q-fab-action>
        <q-fab-action color="white" text-color="black">
          <q-expansion-item
            v-model="bundlingControl"
            icon="fa-solid fa-diagram-project"
            label="Bundling Controls"
            @click.prevent
          >
            <bundling-controls
              v-model:bundlingParams="bundlingParams"
              @generateNewBundling="generateNewBundling"
              @click.prevent
            ></bundling-controls>
          </q-expansion-item>
        </q-fab-action>
      </q-fab>
      <div
        :id="contextID"
        :class="[expandOverview ? '' : '', 'webglContainer']"
      ></div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import OverviewGraph from '../../core/reactomeGraphs/reactomeOverviewNetwork/overviewNetwork';
import GraphFilter from './GraphFilter.vue';
import BundlingControls from './BundlingControls.vue';
import { generateGraphData } from '../../core/reactomeGraphs/reactomeOverviewGraphPreparation';
import { generateGlyphDataReactome } from '../../core/overviewGlyphs/glyphDataPreparation';
import { generateGlyphs } from '../../core/overviewGlyphs/generator';
import { computed, PropType, Ref, ref, watch, defineProps } from 'vue';
import { reactomeEntry, glyphData } from '@/core/reactomeGraphs/reactomeTypes';
import { useMainStore } from '@/stores';
import { HighDetailGlyph } from '@/core/overviewGlyphs/highDetailGlyph';
import { LowDetailGlyph } from '@/core/overviewGlyphs/lowDetailGlyph';
import {
  generateVoronoiCells,
  nodePolygonMapping,
} from '@/core/layouting/voronoiLayout';
import Fa2Params from './Fa2Params.vue';
import { useQuasar } from 'quasar';
import FilterData from '@/core/reactomeGraphs/reactomeOverviewNetwork/filterData';

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

const $q = useQuasar();

const mainStore = useMainStore();

const expandOverview = ref(false);
const expandFilter = ref(false);
const expandFa2Controls = ref(false);
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

const sumRegulated = ref({
  absolute: new FilterData(),
  relative: new FilterData(),
});

const rootNegativeFilter = ref({
  filterActive: false,
  rootIDs: [],
});

const rootFilter = ref({
  filterActive: false,
  rootID: '',
});

const transcriptomicsFilter = ref(new FilterData());
const transcriptomicsRegulatedFilter = ref({
  absolute: new FilterData(),
  relative: new FilterData(),
});

const proteomicsFilter = ref(new FilterData());
const proteomicsRegulatedFilter = ref({
  absolute: new FilterData(),
  relative: new FilterData(),
});

const metabolomicsFilter = ref(new FilterData());
const metabolomicsRegulatedFilter = ref({
  absolute: new FilterData(),
  relative: new FilterData(),
});

const fa2LayoutParams = ref({
  iterations: 1050,
  weightShared: 9.2,
  weightDefault: 0.6,
  gravity: 3.0,
  edgeWeightInfluence: 3.5,
  scalingRatio: 58,
  adjustSizes: true,
  outboundAttractionDistribution: true,
  barnesHut: true,
  linLog: false,
  strongGravity: true,
  slowDown: 3,
  barnesHutTheta: 0.5,
  clusterSizeScalingFactor: 1,
});

const overviewData = computed(() => mainStore.overviewData);
const selectedPathway = computed(() => mainStore.selectedPathway);
const queryToPathwayDictionary = computed(
  () => mainStore.queryToPathwayDictionary
);
const rootIds = computed(() => mainStore.rootIds);
const usedSymbolCols = computed(() => mainStore.usedSymbolCols);
const keggChebiTranslate = computed(() => mainStore.keggChebiTranslate);

const width = computed(() => window.innerWidth);

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
const bundlingControl = ref(false);
const bundlingParams = ref({
  maximumDistortion: 2,
  edgeWeightFactor: 2,
  showAllEdges: false,
  showBundling: true,
});
watch(bundlingParams.value, () => {
  networkGraph.value?.setShowAllEdges(bundlingParams.value.showAllEdges);
});
watch(bundlingParams.value, () => {
  networkGraph.value?.setShowBundling(bundlingParams.value.showBundling);
});
const generateNewBundling = () => {
  $q.loading.show();
  networkGraph.value?.generateBezierControlPoints(
    bundlingParams.value.maximumDistortion,
    bundlingParams.value.edgeWeightFactor
  );
  $q.loading.hide();
};
watch(width, () => {
  networkGraph.value?.setSize(width.value);
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
        const pathwaysContaining = queryToPathwayDictionary.value[symbol]; // [0] ??????? TODO BUG CHECK???
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
      const pathwaysContaining = queryToPathwayDictionary.value[symbol];
      if (pathwaysContaining) foundPathways.push(pathwaysContaining);
    });
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
        let pathwaysContaining: string[] = [];
        const symbol = element[usedSymbolCols.value.metabolomics];

        let chebiIDs = keggChebiTranslate.value[symbol];
        if (chebiIDs) {
          chebiIDs.forEach((element) => {
            try {
              pathwaysContaining.push(
                ...queryToPathwayDictionary.value[element]
              );
            } catch {
              // id not in dict
            }
          });
        } else {
          pathwaysContaining = queryToPathwayDictionary.value[symbol]; //[0] ???? bugcheck
        }
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
watch(selectedPathway, () => {
  networkGraph.value?.refreshCurrentPathway();
});
watch(overviewData, () => {
  if (props.isActive) {
    drawNetwork();
  } else {
    outstandingDraw.value = true;
  }
});

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
  let regulatedLimits = {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  };
  let transcriptomicsRegulatedLimits = {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  };
  let proteomicsRegulatedLimits = {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  };
  let metabolomicsRegulatedLimits = {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  };

  for (const pathwayKey in glyphDataVar.value) {
    const currPathway = glyphDataVar.value[pathwayKey];
    let sumRegulatedNodes = 0;
    if (currPathway.transcriptomics.available) {
      transcriptomicsAvailable = true;
      if (
        currPathway.transcriptomics.nodeState.regulated <
        transcriptomicsRegulatedLimits.min
      )
        transcriptomicsRegulatedLimits.min =
          currPathway.transcriptomics.nodeState.regulated;
      if (
        currPathway.transcriptomics.nodeState.regulated >
        transcriptomicsRegulatedLimits.max
      )
        transcriptomicsRegulatedLimits.max =
          currPathway.transcriptomics.nodeState.regulated;
      sumRegulatedNodes += currPathway.transcriptomics.nodeState.regulated;
      if (currPathway.transcriptomics.meanMeasure < transcriptomicsLimits.min)
        transcriptomicsLimits.min = currPathway.transcriptomics.meanMeasure;
      if (currPathway.transcriptomics.meanMeasure > transcriptomicsLimits.max)
        transcriptomicsLimits.max = currPathway.transcriptomics.meanMeasure;
    }
    if (currPathway.proteomics.available) {
      proteomicsAvailable = true;
      if (
        currPathway.proteomics.nodeState.regulated <
        proteomicsRegulatedLimits.min
      )
        proteomicsRegulatedLimits.min =
          currPathway.proteomics.nodeState.regulated;
      if (
        currPathway.proteomics.nodeState.regulated >
        proteomicsRegulatedLimits.max
      )
        proteomicsRegulatedLimits.max =
          currPathway.proteomics.nodeState.regulated;
      sumRegulatedNodes += currPathway.proteomics.nodeState.regulated;
      if (currPathway.proteomics.meanMeasure < proteomicsLimits.min)
        proteomicsLimits.min = currPathway.proteomics.meanMeasure;
      if (currPathway.proteomics.meanMeasure > proteomicsLimits.max)
        proteomicsLimits.max = currPathway.proteomics.meanMeasure;
    }
    if (currPathway.metabolomics.available) {
      metabolomicsAvailable = true;
      if (
        currPathway.metabolomics.nodeState.regulated <
        metabolomicsRegulatedLimits.min
      )
        metabolomicsRegulatedLimits.min =
          currPathway.metabolomics.nodeState.regulated;
      if (
        currPathway.metabolomics.nodeState.regulated >
        metabolomicsRegulatedLimits.max
      )
        metabolomicsRegulatedLimits.max =
          currPathway.metabolomics.nodeState.regulated;
      sumRegulatedNodes += currPathway.metabolomics.nodeState.regulated;
      if (currPathway.metabolomics.meanMeasure < metabolomicsLimits.min)
        metabolomicsLimits.min = currPathway.metabolomics.meanMeasure;
      if (currPathway.metabolomics.meanMeasure > metabolomicsLimits.max)
        metabolomicsLimits.max = currPathway.metabolomics.meanMeasure;
    }
    if (sumRegulatedNodes < regulatedLimits.min)
      regulatedLimits.min = sumRegulatedNodes;
    if (sumRegulatedNodes > regulatedLimits.max)
      regulatedLimits.max = sumRegulatedNodes;
  }

  sumRegulated.value.absolute.disable = false;
  sumRegulated.value.relative.disable = false;
  sumRegulated.value.absolute.limits.min = regulatedLimits.min;
  sumRegulated.value.absolute.limits.max = regulatedLimits.max;
  sumRegulated.value.relative.limits.min = 0;
  sumRegulated.value.relative.limits.max = 100;

  transcriptomicsFilter.value.limits.min = transcriptomicsLimits.min;
  transcriptomicsFilter.value.limits.max = transcriptomicsLimits.max;
  transcriptomicsFilter.value.disable = !transcriptomicsAvailable;

  transcriptomicsRegulatedFilter.value.absolute.limits.min =
    transcriptomicsRegulatedLimits.min;
  transcriptomicsRegulatedFilter.value.absolute.limits.max =
    transcriptomicsRegulatedLimits.max;
  transcriptomicsRegulatedFilter.value.absolute.disable =
    !transcriptomicsAvailable;

  transcriptomicsRegulatedFilter.value.relative.limits.min = 0;
  transcriptomicsRegulatedFilter.value.relative.limits.max = 100;
  transcriptomicsRegulatedFilter.value.relative.disable =
    !transcriptomicsAvailable;

  proteomicsFilter.value.limits.min = proteomicsLimits.min;
  proteomicsFilter.value.limits.max = proteomicsLimits.max;
  proteomicsFilter.value.disable = !proteomicsAvailable;

  proteomicsRegulatedFilter.value.absolute.limits.min =
    proteomicsRegulatedLimits.min;
  proteomicsRegulatedFilter.value.absolute.limits.max =
    proteomicsRegulatedLimits.max;
  proteomicsRegulatedFilter.value.absolute.disable = !proteomicsAvailable;

  proteomicsRegulatedFilter.value.relative.limits.min = 0;
  proteomicsRegulatedFilter.value.relative.limits.max = 100;
  proteomicsRegulatedFilter.value.relative.disable = !proteomicsAvailable;

  metabolomicsFilter.value.limits.min = metabolomicsLimits.min;
  metabolomicsFilter.value.limits.max = metabolomicsLimits.max;
  metabolomicsFilter.value.disable = !metabolomicsAvailable;

  metabolomicsRegulatedFilter.value.absolute.limits.min =
    metabolomicsRegulatedLimits.min;
  metabolomicsRegulatedFilter.value.absolute.limits.max =
    metabolomicsRegulatedLimits.max;
  metabolomicsRegulatedFilter.value.absolute.disable = !metabolomicsAvailable;

  metabolomicsRegulatedFilter.value.relative.limits.min = 0;
  metabolomicsRegulatedFilter.value.relative.limits.max = 100;
  metabolomicsRegulatedFilter.value.relative.disable = !metabolomicsAvailable;
});

watch(
  [
    transcriptomicsFilter.value,
    transcriptomicsRegulatedFilter.value,
    proteomicsFilter.value,
    proteomicsRegulatedFilter.value,
    metabolomicsFilter.value,
    metabolomicsRegulatedFilter.value,
    sumRegulated.value,
  ],
  () => {
    networkGraph?.value?.filter.setAverageFilter(
      transcriptomicsFilter.value,
      transcriptomicsRegulatedFilter.value,
      proteomicsFilter.value,
      proteomicsRegulatedFilter.value,
      metabolomicsFilter.value,
      metabolomicsRegulatedFilter.value,
      sumRegulated.value
    );
  }
);
watch(rootFilter.value, () => {
  networkGraph?.value?.filter.setRootFilter(rootFilter.value);
});

watch(rootNegativeFilter.value, () => {
  networkGraph?.value?.filter.setRootNegativeFilter(rootNegativeFilter.value);
});

watch(fa2LayoutParams.value, () => {
  networkGraph?.value?.relayoutGraph(fa2LayoutParams.value);
  console.log(fa2LayoutParams.value);
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
const removeSelection = () => {
  networkGraph.value?.clearSelection();
};
const drawNetwork = () => {
  networkGraph.value?.killGraph();
  glyphDataVar.value = generateGlyphDataReactome(mainStore.getTimeSeriesMode());
  mainStore.setGlyphData(glyphDataVar.value);
  const generatedGlyphsHighDetail = generateGlyphs(
    glyphDataVar.value,
    mainStore.getTimeSeriesMode(),
    HighDetailGlyph,
    OverviewGraph.GLYPH_SIZE
  );
  const generatedGlyphsLowDetail = generateGlyphs(
    glyphDataVar.value,
    mainStore.getTimeSeriesMode(),
    LowDetailGlyph,
    OverviewGraph.GLYPH_SIZE
  );
  console.log(generatedGlyphsHighDetail, generatedGlyphsLowDetail);
  mainStore.setGlyphs(generatedGlyphsHighDetail);
  const clusterWeights = mainStore.clusterData.clusters.map(
    (elem) => elem.length
  );
  const polygons = generateVoronoiCells(
    250,
    clusterWeights,
    mainStore.clusterData.clusterCenters
  );
  const positionMapping = nodePolygonMapping(
    mainStore.clusterData.clusters,
    polygons
  );
  const polygonsArrays: [number, number][][] = [];
  for (let index = 0; index < Object.keys(polygons).length; index++) {
    polygonsArrays.push(polygons[index].verticesToArray(true));
  }

  const networkData = generateGraphData(
    overviewData.value,
    generatedGlyphsHighDetail.url,
    generatedGlyphsLowDetail.url,
    glyphDataVar.value,
    rootIds.value,
    polygons,
    positionMapping
  );
  networkGraph.value = new OverviewGraph(
    props.contextID ? props.contextID : '',
    networkData,
    polygons,
    fa2LayoutParams.value,
    clusterWeights,
    width.value
  );
};
</script>
<style lang="scss">
.fab-class {
  z-index: 4;
}
.graphControl {
  min-width: 10vw;
}
.webglContainer {
  height: 100%;
  min-height: 100%;
  z-index: 2;
}
.overviewFit {
  width: 100% !important;
  height: 100% !important;
}
.overviewFullscreen {
  z-index: 3;
  position: fixed !important;
  right: 1vh;
  bottom: 1vh;
  left: 1vh;
  max-width: 99%;
}
@media (max-width: 1920px) {
  .overviewFullscreen {
    top: 7vh !important;
    height: 92vh !important;
  }
}
@media (min-width: 1921px) {
  .overviewFullscreen {
    top: 3vh !important;
    height: 96vh !important;
    font-size: 16px;
  }
}
</style>
