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
              color="primary"
              @click="expandComponent"
            ></q-fab-action>
            <q-fab-action
              icon="mdi-arrow-collapse"
              color="primary"
              @click="minimizeComponent"
            ></q-fab-action>
          </q-fab>
        </q-card-actions>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import ReactomeDetailView from '../core/reactomeGraphs/reactomeDetailView';
import {
  graphJSON,
  layoutJSON,
  foldChangesByType,
  foldChangesByID,
  reactomeEntry,
} from '../core/reactomeGraphs/reactomeTypes';
import { getEntryAmounts } from '../core/reactomeGraphs/reactomeUtils';
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
const mutationObserver: Ref<MutationObserver | undefined> = ref(undefined);
const pathwaySelection = ref({ title: '', value: '', text: '' });
const expandButton = ref(false);
const minimizeButton = ref(false);
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
const pathwayDropdownOptions: Ref<
  { title: string; value: string; text: string }[]
> = ref([]);

const pathwayDropdown = computed(() => mainStore.pathwayDropdown);
const pathwayLayouting = computed(() => mainStore.pathwayLayouting);
const overviewData = computed(() => mainStore.overviewData as reactomeEntry[]);

watch(pathwayLayouting, () => {
  pathwayDropdownOptions.value = pathwayLayouting.value.pathwayList;
});
watch(pathwaySelection, () => {
  const tarID = pathwaySelection.value.value;
  getJsonFiles(tarID);
  mainStore.focusPathwayViaDropdown(pathwaySelection.value);
});
watch(pathwayDropdown, () => {
  pathwaySelection.value = pathwayDropdown.value;
});

onMounted(() => {
  // allows to run function when tar changes
  mutationObserver.value = new MutationObserver(refreshSize);
  const config = { attributes: true };
  const tar = document.getElementById(props.contextID ? props.contextID : '');
  if (tar) mutationObserver.value.observe(tar, config);
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

const getJsonFiles = (reactomeID: string) => {
  $q.loading.show();
  console.log(reactomeID);
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
 * @param {foldChangesByType} fcs
 * @param {foldChangesByID} fcsReactomeKey
 * @param {'proteomics' | 'metabolomics' | 'transcriptomics'} type
 */
const prepareFcs = (
  pathwayData: reactomeEntry,
  fcs: foldChangesByType,
  fcsReactomeKey: foldChangesByID,
  type: 'proteomics' | 'metabolomics' | 'transcriptomics'
) => {
  // Regular node parsing
  for (const entry of pathwayData.ownMeasuredEntryIDs[type]) {
    try {
      const measureEntry = pathwayData.entries[type].measured[entry] as {
        queryId: string;
        value: number;
        forms: { [key: string]: { name: string; toplevelId: number[] } };
      };
      const val = measureEntry.value;
      for (const entity in measureEntry.forms) {
        const entityElem = measureEntry.forms[entity];
        for (const id of entityElem.toplevelId) {
          fcs[type][id] = val;
          const totalAmount = getEntryAmounts(id, currentGraphJson.value);
          if (id in fcsReactomeKey) {
            fcsReactomeKey[id][type].available = true;
            fcsReactomeKey[id][type].foldChanges.push({
              value: val,
              name: entityElem.name,
              queryID: measureEntry.queryId,
            });
            fcsReactomeKey[id][type].meanFoldchange =
              (fcsReactomeKey[id][type].nodeState.regulated *
                fcsReactomeKey[id][type].meanFoldchange +
                val) /
              (fcsReactomeKey[id][type].nodeState.regulated + 1);
            fcsReactomeKey[id][type].nodeState.regulated += 1;
          } else {
            fcsReactomeKey[id] = {
              pathwayID: '' + id,
              proteomics: {
                available: false,
                foldChanges: [],
                meanFoldchange: -100,
                nodeState: { total: totalAmount.totalProteins, regulated: 0 },
              },
              transcriptomics: {
                available: false,
                foldChanges: [],
                meanFoldchange: -100,
                nodeState: { total: totalAmount.totalProteins, regulated: 0 },
              },
              metabolomics: {
                available: false,
                foldChanges: [],
                meanFoldchange: -100,
                nodeState: { total: totalAmount.totalMolecules, regulated: 0 },
              },
            };

            fcsReactomeKey[id][type] = {
              available: true,
              foldChanges: [
                {
                  value: val,
                  name: entityElem.name,
                  queryID: measureEntry.queryId,
                },
              ],
              meanFoldchange: val,
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
        const measureEntry = pathwayData.entries[type].measured[
          measureEntryID
        ] as {
          queryId: string;
          value: number;
          forms: { [key: string]: { name: string; toplevelId: number[] } };
        };
        const val = measureEntry.value;
        for (const entity in measureEntry.forms) {
          const entityElem = measureEntry.forms[entity];
          fcs[type][entry] = val;
          if (entry in fcsReactomeKey) {
            fcsReactomeKey[entry][type].available = true;
            fcsReactomeKey[entry][type].foldChanges.push({
              value: val,
              name: entityElem.name,
              queryID: measureEntry.queryId,
            });
            fcsReactomeKey[entry][type].meanFoldchange =
              (fcsReactomeKey[entry][type].nodeState.regulated *
                fcsReactomeKey[entry][type].meanFoldchange +
                val) /
              (fcsReactomeKey[entry][type].nodeState.regulated + 1);
            fcsReactomeKey[entry][type].nodeState.regulated += 1;
          } else {
            fcsReactomeKey[entry] = {
              pathwayID: '' + entry,
              proteomics: {
                available: false,
                foldChanges: [],
                meanFoldchange: -100,
                nodeState: { total: totalAmount.proteomics, regulated: 0 },
              },
              transcriptomics: {
                available: false,
                foldChanges: [],
                meanFoldchange: -100,
                nodeState: { total: totalAmount.transcriptomics, regulated: 0 },
              },
              metabolomics: {
                available: false,
                foldChanges: [],
                meanFoldchange: -100,
                nodeState: { total: totalAmount.metabolomics, regulated: 0 },
              },
            };

            fcsReactomeKey[entry][type] = {
              available: true,
              foldChanges: [
                {
                  value: val,
                  name: entityElem.name,
                  queryID: measureEntry.queryId,
                },
              ],
              meanFoldchange: val,
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
  const fcs: foldChangesByType = {
    proteomics: {},
    transcriptomics: {},
    metabolomics: {},
  };
  const fcsReactomeKey: foldChangesByID = {};
  console.log('OVERVIEW DATA', overviewData.value);
  const pathwayData = overviewData.value.find(
    (elem: { pathwayId: string }) =>
      elem.pathwayId === pathwaySelection.value.value
  );
  if (pathwayData) {
    prepareFcs(pathwayData, fcs, fcsReactomeKey, 'proteomics');
    prepareFcs(pathwayData, fcs, fcsReactomeKey, 'transcriptomics');
    prepareFcs(pathwayData, fcs, fcsReactomeKey, 'metabolomics');
  }

  currentView.value = new ReactomeDetailView(
    currentLayoutJson.value,
    currentGraphJson.value,
    '#' + props.contextID,
    fcs,
    fcsReactomeKey
  );
};
const expandComponent = () => {
  expandButton.value = !expandButton.value;
  minimizeButton.value = false;
};
const minimizeComponent = () => {
  minimizeButton.value = !minimizeButton.value;
  expandButton.value = false;
};
const refreshSize = () => {
  currentView.value?.refreshSize();
};
const _getTotalsFromGraphJson = () => {
  // TODO get correct totals from graph json via recursion
};
</script>
