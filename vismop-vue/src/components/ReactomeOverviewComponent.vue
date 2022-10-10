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
              v-model:rootFilter="rootFilter"
              v-model:transcriptomics="transcriptomicsFilter"
              v-model:proteomics="proteomicsFilter"
              v-model:metabolomics="metabolomicsFilter"
              v-model:sumRegulated="sumRegulated"
            ></graph-filter>
          </q-fab-action>
          <q-fab-action color="white">
            <fa2-params
              v-model:fa2LayoutParams="fa2LayoutParams"
            ></fa2-params>
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
import { computed, PropType, Ref, ref, watch, defineProps } from 'vue';
import { reactomeEntry } from '@/core/reactomeGraphs/reactomeTypes';
import { glyphData } from '@/core/generalTypes';
import { useMainStore } from '@/stores';
import { HighDetailGlyph } from '@/core/overviewGlyphs/highDetailGlyph';
import { LowDetailGlyph } from '@/core/overviewGlyphs/lowDetailGlyph';
import {
  generateVoronoiCells,
  nodePolygonMapping,
} from '@/core/layouting/voronoiLayout';
import Fa2Params from './Fa2Params.vue';

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

const sumRegulated = ref({
  absolute: {
    limits: { min: 0, max: 100 },
    value: { min: 0, max: 100 },
    filterActive: false,
    inside: true,
    disable: false,
  },
  relative: {
    limits: { min: 0, max: 100 },
    value: { min: 0, max: 100 },
    filterActive: false,
    inside: true,
    disable: false,
  },
});

const rootFilter = ref({
  filterActive: false,
  rootID: '',
});

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

const fa2LayoutParams = ref({
  iterations: 250,
  weightShared: 5.0,
  weightDefault: 1.0,
  gravity: 2.0,
  edgeWeightInfluence: 7.0,
  scalingRatio: 5.0,
  adjustSizes: true,
  outboundAttractionDistribution: false
})

const overviewData = computed(() => mainStore.overviewData as reactomeEntry[]);
const pathwayDropdown = computed(() => mainStore.pathwayDropdown);
const pathwayLayouting = computed(() => mainStore.pathwayLayouting);
const usedSymbolCols = computed(() => mainStore.usedSymbolCols);
const keggChebiTranslate = computed(() => mainStore.keggChebiTranslate);

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
        let pathwaysContaining: string[] = [];
        const symbol = element[usedSymbolCols.value.metabolomics];

        let chebiIDs = keggChebiTranslate.value[symbol];
        console.log('CHEBI SELECT', chebiIDs);
        if (chebiIDs) {
          chebiIDs.forEach((element) => {
            try {
              pathwaysContaining.push(
                ...pathwayLayouting.value.nodePathwayDictionary[element]
              );
            } catch {
              // id not in dict
            }
          });
        } else {
          pathwaysContaining =
            pathwayLayouting.value.nodePathwayDictionary[symbol]; //[0] ???? bugcheck
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

  for (const pathwayKey in glyphDataVar.value) {
    const currPathway = glyphDataVar.value[pathwayKey];
    let sumRegulatedNodes = 0;
    if (currPathway.transcriptomics.available) {
      transcriptomicsAvailable = true;
      sumRegulatedNodes += currPathway.transcriptomics.nodeState.regulated;
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
      sumRegulatedNodes += currPathway.proteomics.nodeState.regulated;
      if (currPathway.proteomics.meanFoldchange < proteomicsLimits.min)
        proteomicsLimits.min = currPathway.proteomics.meanFoldchange;
      if (currPathway.proteomics.meanFoldchange > proteomicsLimits.max)
        proteomicsLimits.max = currPathway.proteomics.meanFoldchange;
    }
    if (currPathway.metabolomics.available) {
      metabolomicsAvailable = true;
      sumRegulatedNodes += currPathway.metabolomics.nodeState.regulated;
      if (currPathway.metabolomics.meanFoldchange < metabolomicsLimits.min)
        metabolomicsLimits.min = currPathway.metabolomics.meanFoldchange;
      if (currPathway.metabolomics.meanFoldchange > metabolomicsLimits.max)
        metabolomicsLimits.max = currPathway.metabolomics.meanFoldchange;
    }
    if (sumRegulatedNodes < regulatedLimits.min)
      regulatedLimits.min = sumRegulatedNodes;
    if (sumRegulatedNodes > regulatedLimits.max)
      regulatedLimits.max = sumRegulatedNodes;
  }

  sumRegulated.value.absolute.limits.min = regulatedLimits.min;
  sumRegulated.value.absolute.limits.max = regulatedLimits.max;
  transcriptomicsFilter.value.disable = !transcriptomicsAvailable;
  proteomicsFilter.value.disable = !proteomicsAvailable;
  metabolomicsFilter.value.disable = !metabolomicsAvailable;

  transcriptomicsFilter.value.limits.min = transcriptomicsLimits.min;
  transcriptomicsFilter.value.limits.max = transcriptomicsLimits.max;

  proteomicsFilter.value.limits.min = proteomicsLimits.min;
  proteomicsFilter.value.limits.max = proteomicsLimits.max;

  metabolomicsFilter.value.limits.min = metabolomicsLimits.min;
  metabolomicsFilter.value.limits.max = metabolomicsLimits.max;
});

watch(
  [
    transcriptomicsFilter.value,
    proteomicsFilter.value,
    metabolomicsFilter.value,
    sumRegulated.value,
  ],
  () => {
    console.log('change Filter');
    networkGraph?.value?.setAverageFilter(
      transcriptomicsFilter.value,
      proteomicsFilter.value,
      metabolomicsFilter.value,
      sumRegulated.value
    );
  }
);
watch(rootFilter.value, () => {
  networkGraph?.value?.setRootFilter(rootFilter.value);
});

watch(fa2LayoutParams.value, () => {
  networkGraph?.value?.relayoutGraph(fa2LayoutParams.value)
})

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
  //const moduleAreas = mainStore.moduleAreas;
  //console.log('moduleAreas', moduleAreas);
  console.log('overviewData.value', overviewData.value);
  //get module areas here!!!
  const clusterWeights = mainStore.modules.map((elem) => elem.length);
  const polygons = generateVoronoiCells(
    250,
    clusterWeights,
    mainStore.moduleCenters
  );
  console.log(
    'Rando Test',
    polygons[parseInt(Object.keys(polygons)[2])].pointInPolygonCoords(10, 10)
  );
  const positionMapping = nodePolygonMapping(mainStore.modules, polygons);
  const polygonsArrays: [number, number][][] = [];
  for (let index = 0; index < Object.keys(polygons).length; index++) {
    polygonsArrays.push(polygons[index].verticesToArray(true));
  }
  const networkData = generateGraphData(
    overviewData.value,
    generatedGlyphs.url,
    generatedGlyphsHighRes.url,
    generatedGlyphsLowZoom.url,
    glyphDataVar.value,
    pathwayLayouting.value.rootIds,
    [[1, 1, 1, 1]],
    polygonsArrays,
    positionMapping
  );
  console.log('base dat', networkData);
  networkGraph.value = new OverviewGraph(
    props.contextID ? props.contextID : '',
    networkData,
    polygons
  );
};
</script>
