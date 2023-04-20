<template>
  <div ref="toplevelRef">
    <q-card
      class="detailComponent"
      :style="{
        '--detailComponentWidth': detailWidth + 'px',
        '--detailComponentHeight': detailHeight + 'px',
      }"
    >
      <div class="col">
        <q-select
          v-model="pathwaySelection"
          filled
          :options="selectedPathwayOptions"
          label="Focus Pathway"
          use-input
          input-debounce="0"
          option-label="text"
          option-value="value"
          @filter="filterFunction"
        >
          <template #append>
            <q-icon
              name="close"
              class="cursor-pointer"
              @click.stop.prevent="
                pathwaySelection = {
                  title: '',
                  value: '',
                  text: '',
                }
              "
            />
          </template>
        </q-select>
        <q-btn
          round
          color="primary"
          class="cycleButton"
          :icon="sizeIcon"
          @click="clickCycleSize"
        />
        <q-icon
          class="resizeHandle"
          size="2em"
          name="fa-solid fa-up-down-left-right"
          @mousedown="sliderDrag"
        />
        <div
          :id="contextID"
          :key="transitionName"
          class="svgContainerDetail"
          :style="{
            '--svgContainerDetailWidth': detailWidth + 'px',
            '--svgContainerDetailHeight': detailHeight + 'px',
          }"
        ></div>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import ReactomeDetailView from '../../core/reactomeGraphs/reactomeDetailView';
import {
  graphJSON,
  layoutJSON,
  measureByType,
  measureById,
  reactomeEntry,
} from '../../core/reactomeGraphs/reactomeTypes';
import { getEntryAmounts } from '../../core/reactomeGraphs/reactomeUtils';
import {
  computed,
  onMounted,
  PropType,
  ref,
  Ref,
  watch,
  defineProps,
} from 'vue';
import { useMainStore } from '@/stores';
import { useQuasar } from 'quasar';
import _, { size } from 'lodash';

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

const $q = useQuasar();
const transitionName = ref('toMinimized');
const toplevelRef = ref<HTMLElement | null>(null);
const parentWidth = ref(0);
const parentHeight = ref(0);
const minWidth = ref(0);
const minHeight = ref(0);
const maxWidth = ref(0);
const maxHeight = ref(0);
const detailWidth = ref(35);
const detailHeight = ref(38);
const mutationObserver: Ref<MutationObserver | undefined> = ref(undefined);
const pathwaySelection = ref({ title: '', value: '', text: '' });
const sizeCycleState = ref(0);
// const currentGraphJson = ref({})
const currentLayoutJson: Ref<layoutJSON> = ref({} as layoutJSON);
const currentGraphJson: Ref<graphJSON> = ref({} as graphJSON);
const currentInsetPathwaysTotals = ref(
  {} as {
    [key: number]: {
      proteomics: number;
      metabolomics: number;
      transcriptomics: number;
    };
  }
);
const currentView: Ref<ReactomeDetailView | undefined> = ref(undefined);
const selectedPathwayOptions: Ref<
  { title: string; value: string; text: string }[]
> = ref([]);

// mounted function to get window.innerWidth
onMounted(() => {
  setWindowSize();
  window.addEventListener('resize', _.debounce(setWindowSize, 100));
  // allows to run function when tar changes
  mutationObserver.value = new MutationObserver(refreshSize);
  const config = { attributes: true };
  const tar = document.getElementById(props.contextID ? props.contextID : '');
  if (tar) mutationObserver.value.observe(tar, config);
});

const setWindowSize = () => {
  parentWidth.value = toplevelRef.value?.parentElement?.clientWidth || 0;
  parentHeight.value = toplevelRef.value?.parentElement?.clientHeight || 0;
  minWidth.value = sizeThresholds.value.minimizedWidth;
  minHeight.value = sizeThresholds.value.minimizedHeight;
  maxWidth.value = window.innerWidth * 0.98;
  maxHeight.value = parentHeight.value * 0.93;
  detailWidth.value = sizeThresholds.value.smallWidth;
  detailHeight.value = sizeThresholds.value.smallHeight;
};

const detailDropdown = computed(() => mainStore.detailDropdown);
const pathwayList = computed(() => mainStore.pathwayList);
const overviewData = computed(
  () => mainStore.overviewData as { [key: string]: reactomeEntry }
);

const sizeIcon = computed(() => {
  switch (sizeCycleState.value) {
    case 0:
      return 'mdi-size-s';
    case 1:
      return 'mdi-size-m';
    case 2:
      return 'mdi-size-l';
    case 3:
      return 'fa-solid fa-minimize';
    default:
      return 'mdi-size-s';
  }
});

watch(pathwayList, () => {
  selectedPathwayOptions.value = pathwayList.value;
});
watch(pathwaySelection, () => {
  if (pathwaySelection.value) {
    const tarID = pathwaySelection.value.value;
    if (pathwaySelection.value.value != '') {
      getJsonFiles(tarID);
    } else {
      currentView.value?.clearView();
    }
    mainStore.focusPathwayViaDropdown(pathwaySelection.value);
  }
});
watch(detailDropdown, () => {
  if (detailDropdown.value) {
    const optionEntry = selectedPathwayOptions.value.find(
      (elem) => elem.value === detailDropdown.value
    );
    pathwaySelection.value = optionEntry
      ? optionEntry
      : { text: '', title: '', value: '' };
  }
});

// size thresholds as computed values
const sizeThresholds = computed(() => {
  return {
    smallWidth: parentWidth.value * 0.35,
    smallHeight: parentHeight.value * 0.38,
    mediumWidth: parentWidth.value * 0.65,
    mediumHeight: parentHeight.value * 0.55,
    largeWidth: parentWidth.value * 1.45,
    largeHeight: parentHeight.value * 0.7,
    minimizedWidth: parentWidth.value * 0.35,
    minimizedHeight: parentHeight.value * 0.07,
  };
});

/* METHODS */

const clickCycleSize = () => {
  cycleSize();
  switch (sizeCycleState.value) {
    case 0:
      transitionName.value = 'toSmall';
      detailWidth.value = sizeThresholds.value.smallWidth;
      detailHeight.value = sizeThresholds.value.smallHeight;
      break;
    case 1:
      transitionName.value = 'toMedium';
      detailWidth.value = sizeThresholds.value.mediumWidth;
      detailHeight.value = sizeThresholds.value.mediumHeight;
      break;
    case 2:
      transitionName.value = 'toLarge';
      detailWidth.value = sizeThresholds.value.largeWidth;
      detailHeight.value = sizeThresholds.value.largeHeight;
      break;
    case 3:
      transitionName.value = 'toMinimized';
      detailWidth.value = sizeThresholds.value.minimizedWidth;
      detailHeight.value = sizeThresholds.value.minimizedHeight;
      break;
    default:
      transitionName.value = 'toSmall';
      detailWidth.value = sizeThresholds.value.smallWidth;
      detailHeight.value = sizeThresholds.value.smallHeight;
  }
};

const cycleSize = () => {
  sizeCycleState.value = (sizeCycleState.value + 1) % 4;
};

const sliderDrag = (e: MouseEvent) => {
  const initialX = e.clientX;
  const initialY = e.clientY;
  const initialWidth = detailWidth.value;
  const initialHeight = detailHeight.value;
  let currentWidth = detailWidth.value;
  let currentHeight = detailHeight.value;
  e.preventDefault();

  const drag = (e: MouseEvent) => {
    currentWidth = initialWidth + (initialX - e.clientX);
    if (currentWidth < minWidth.value) {
      detailWidth.value = minWidth.value;
    } else if (currentWidth > maxWidth.value) {
      detailWidth.value = maxWidth.value;
    } else {
      detailWidth.value = currentWidth;
    }
    currentHeight = initialHeight + (e.clientY - initialY);
    if (currentHeight < minHeight.value) {
      detailHeight.value = minHeight.value;
    } else if (currentHeight > maxHeight.value) {
      detailHeight.value = maxHeight.value;
    } else {
      detailHeight.value = currentHeight;
    }
    // call sizeCycleState if the current height and width falls into the respective range
    if (
      currentWidth < sizeThresholds.value.smallWidth &&
      currentHeight < sizeThresholds.value.smallHeight
    ) {
      sizeCycleState.value = 3;
    } else if (
      currentWidth < sizeThresholds.value.mediumWidth &&
      currentHeight < sizeThresholds.value.mediumHeight
    ) {
      sizeCycleState.value = 0;
    } else if (
      currentWidth < sizeThresholds.value.largeWidth &&
      currentHeight < sizeThresholds.value.largeHeight
    ) {
      sizeCycleState.value = 1;
    } else {
      sizeCycleState.value = 2;
    }
  };
  const stopDrag = () => {
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
  };
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
};

const filterFunction = (val: string, update: (n: () => void) => void) => {
  update(() => {
    const tarValue = val.toLowerCase();
    selectedPathwayOptions.value = pathwayList.value.filter(
      (v: { text: string; value: string; title: string }) =>
        v.text.toLowerCase().indexOf(tarValue) > -1
    );
  });
};

const getJsonFiles = (reactomeID: string) => {
  $q.loading.show();
  fetch(`/get_reactome_json_files/${reactomeID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => response.json())
    .then((dataContent) => {
      currentLayoutJson.value = dataContent.layoutJson as layoutJSON;
      currentGraphJson.value = dataContent.graphJson as graphJSON;
      currentInsetPathwaysTotals.value = dataContent.insetPathwayTotals as {
        [key: number]: {
          proteomics: number;
          metabolomics: number;
          transcriptomics: number;
        };
      };
      drawDetailView();
    })
    .then(() => $q.loading.hide());
};
/**
 * Fill the fc objects for the selected type with the supplied pathway Data
 *
 * @param pathwayData
 * @param {measureByType} measureByType
 * @param {measureById} measureById
 * @param {'proteomics' | 'metabolomics' | 'transcriptomics'} type
 */
const measureDataDetail = (
  pathwayData: reactomeEntry,
  targetMeasurement: 'fc' | 'slope',
  measureByType: measureByType,
  measureById: measureById,
  type: 'proteomics' | 'metabolomics' | 'transcriptomics'
) => {
  const accessor =
    targetMeasurement === 'fc' ? 'value' : 'regressionData.slope';
  // Regular node parsing
  for (const entry of pathwayData.ownMeasuredEntryIDs[type]) {
    try {
      const measureEntry = pathwayData.entries[type].measured[entry];
      const val = _.get(measureEntry, accessor);
      for (const entity in measureEntry.forms) {
        const entityElem = measureEntry.forms[entity];
        for (const id of entityElem.toplevelId) {
          measureByType[type][id] = val;
          const totalAmount = getEntryAmounts(id, currentGraphJson.value);
          if (id in measureById) {
            measureById[id][type].available = true;
            //only push if not already in the array
            if (
              !measureById[id][type].measurements.find(
                (elem) => elem.queryId === measureEntry.queryId
              )
            ) {
              measureById[id][type].measurements.push({
                value: val,
                name: entityElem.name,
                queryId: measureEntry.queryId,
                regressionData: measureEntry.regressionData || {},
                forms: {},
              });
              measureById[id][type].meanMeasure =
                (measureById[id][type].nodeState.regulated *
                  measureById[id][type].meanMeasure +
                  val) /
                (measureById[id][type].nodeState.regulated + 1);
              measureById[id][type].nodeState.regulated += 1;
            }
          } else {
            measureById[id] = {
              pathwayID: '' + id,
              proteomics: {
                available: false,
                measurements: [],
                meanMeasure: -100,
                nodeState: { total: totalAmount.totalProteins, regulated: 0 },
              },
              transcriptomics: {
                available: false,
                measurements: [],
                meanMeasure: -100,
                nodeState: { total: totalAmount.totalProteins, regulated: 0 },
              },
              metabolomics: {
                available: false,
                measurements: [],
                meanMeasure: -100,
                nodeState: { total: totalAmount.totalMolecules, regulated: 0 },
              },
            };

            measureById[id][type] = {
              available: true,
              measurements: [
                {
                  value: val,
                  name: entityElem.name,
                  queryId: measureEntry.queryId,
                  regressionData: measureEntry.regressionData || {},
                  forms: {},
                },
              ],
              meanMeasure: val,
              nodeState: {
                total:
                  type === 'proteomics' || type === 'transcriptomics'
                    ? totalAmount.totalProteins
                    : totalAmount.totalMolecules,
                regulated: 1,
              },
            };
          }
        }
      }
    } catch (error) {
      console.log(error, pathwayData.ownMeasuredEntryIDs);
    }
  }

  // Inset Pathways
  for (const entry in pathwayData.insetPathwayEntryIDs[type] as {
    [key: number]: { stableID: string; nodes: string[] };
  }) {
    try {
      const entryList = pathwayData.insetPathwayEntryIDs[type][entry].nodes;
      const totalAmount = currentInsetPathwaysTotals.value[entry];
      for (const measureEntryID of entryList) {
        const measureEntry = pathwayData.entries[type].measured[measureEntryID];
        const val = _.get(measureEntry, accessor);
        if (val === undefined) {
          continue;
        }
        for (const entity in measureEntry.forms) {
          const entityElem = measureEntry.forms[entity];
          measureByType[type][entry] = val;
          if (entry in measureById) {
            measureById[entry][type].available = true;
            //only push if not already in the array
            if (
              !measureById[entry][type].measurements.find(
                (elem) => elem.queryId === measureEntry.queryId
              )
            ) {
              measureById[entry][type].measurements.push({
                value: val,
                name: entityElem.name,
                queryId: measureEntry.queryId,
                regressionData: measureEntry.regressionData || {},
                forms: {},
              });
              measureById[entry][type].meanMeasure =
                (measureById[entry][type].nodeState.regulated *
                  measureById[entry][type].meanMeasure +
                  val) /
                (measureById[entry][type].nodeState.regulated + 1);
              measureById[entry][type].nodeState.regulated += 1;
            }
          } else {
            measureById[entry] = {
              pathwayID: '' + entry,
              proteomics: {
                available: false,
                measurements: [],
                meanMeasure: -100,
                nodeState: { total: totalAmount.proteomics, regulated: 0 },
              },
              transcriptomics: {
                available: false,
                measurements: [],
                meanMeasure: -100,
                nodeState: { total: totalAmount.transcriptomics, regulated: 0 },
              },
              metabolomics: {
                available: false,
                measurements: [],
                meanMeasure: -100,
                nodeState: { total: totalAmount.metabolomics, regulated: 0 },
              },
            };

            measureById[entry][type] = {
              available: true,
              measurements: [
                {
                  value: val,
                  name: entityElem.name,
                  queryId: measureEntry.queryId,
                  regressionData: measureEntry.regressionData || {},
                  forms: {},
                },
              ],
              meanMeasure: val,
              nodeState: { total: totalAmount[type], regulated: 1 },
            };
          }
        }
      }
    } catch (error) {
      console.log('INSET', error, pathwayData.insetPathwayEntryIDs);
    }
  }
};
const drawDetailView = () => {
  currentView.value?.clearView();
  const measureByType: measureByType = {
    proteomics: {},
    transcriptomics: {},
    metabolomics: {},
  };
  const measureById: measureById = {};
  const pathwayData = overviewData.value[pathwaySelection.value.value];
  if (pathwayData) {
    measureDataDetail(
      pathwayData,
      mainStore.getTimeSeriesMode(),
      measureByType,
      measureById,
      'proteomics'
    );
    measureDataDetail(
      pathwayData,
      mainStore.getTimeSeriesMode(),
      measureByType,
      measureById,
      'transcriptomics'
    );
    measureDataDetail(
      pathwayData,
      mainStore.getTimeSeriesMode(),
      measureByType,
      measureById,
      'metabolomics'
    );
    console.log('DetailPWData', measureByType, measureById);
  }

  currentView.value = new ReactomeDetailView(
    currentLayoutJson.value,
    currentGraphJson.value,
    mainStore.getTimeSeriesMode(),
    '#' + props.contextID,
    measureByType,
    measureById
  );
};
const refreshSize = () => {
  currentView.value?.refreshSize();
};
const _getTotalsFromGraphJson = () => {
  // TODO get correct totals from graph json via recursion
};
</script>
<style>
.toSmall-enter-active,
.toMedium-enter-active,
.toLarge-enter-active,
.toMinimized-enter-active {
  transition: all 5s ease-in-out;
  -webkit-transition: all 5s ease-in-out;
  -moz-transition: all 5s ease-in-out;
}

.toSmall-enter-to,
.toMedium-enter-to,
.toLarge-enter-to,
.toMinimized-enter-to {
}

.detailComponent {
  position: absolute !important;
  right: 2vh;
  top: 2vh;
  z-index: 5;
  display: flex;
  max-width: var(--detailComponentWidth) !important;
  max-height: var(--svgContainerDetailHeight) !important;
}

.svgContainerDetail {
  display: inline-block;
  position: relative;
  vertical-align: top;
  overflow: hidden;
  z-index: 5;
  height: var(--svgContainerDetailHeight) !important;
  width: var(--svgContainerDetailWidth) !important;
}

.cycleButton {
  position: absolute !important;
  right: 0;
  z-index: 6;
  margin: 9px;
}
.resizeHandle {
  position: absolute !important;
  left: 0;
  bottom: 0;
  z-index: 6;
  margin: 9px;
}
</style>
