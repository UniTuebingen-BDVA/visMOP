<template>
  <q-list nav class="q-pa-sm">
    <!-- DEPRECATED: For the time being, we only support one database
    <q-select
      v-model="targetDatabase"
      :options="targetDatabases"
      label="Target Database"
      option-label="text"
      option-value="value"
      @update:model-value="setTargetDatabase"
    ></q-select>
    -->
    <q-select
      v-model="targetOrganism"
      :options="targetOrganisms"
      label="Target Organism"
      option-label="text"
      option-value="value"
    ></q-select>
    <!-- A toggle switch to switch between aggergate and individual time series mode-->
    <q-toggle
      v-model="timeseriesModeToggle"
      :label="`Timeseries ${timeseriesModeToggle} Mode`"
      color="primary"
      :true-value="'fc'"
      :false-value="'slope'"
    ></q-toggle>
    <q-separator />
    Selected Omics:
    {{ chosenOmics.length }}
    <!--
    <q-chip-group active-class="primary--text" column>
      <q-chip
        v-for="variable in chosenOmics"
        :key="variable"
      >
        {{ variable }}
      </q-chip>
    </q-chip-group>
    -->
    <q-list bordered class="rounded-borders">
      <omic-input
        v-model:recievedOmicsData="recievedTranscriptomicsData"
        v-model:sliderVals="sliderValsTranscriptomics"
        v-model:symbolCol="transcriptomicsSymbolCol"
        v-model:valueCol="transcriptomicsValueCol"
        :table-headers="transcriptomicsTableHeaders"
        :table-data="transcriptomicsTableData"
        omics-type="transcriptomics"
        @update:slider-value="(newVal) => (sliderValsTranscriptomics = newVal)"
      ></omic-input>

      <q-separator />

      <omic-input
        v-model:recievedOmicsData="recievedProteomicsData"
        v-model:sliderVals="sliderValsProteomics"
        v-model:symbolCol="proteomicsSymbolCol"
        v-model:valueCol="proteomicsValueCol"
        :table-headers="proteomicsTableHeaders"
        :table-data="proteomicsTableData"
        omics-type="proteomics"
        @update:slider-value="(newVal) => (sliderValsProteomics = newVal)"
      ></omic-input>

      <q-separator />
      <omic-input
        v-model:recievedOmicsData="recievedMetabolomicsData"
        v-model:sliderVals="sliderValsMetabolomics"
        v-model:symbolCol="metabolomicsSymbolCol"
        v-model:valueCol="metabolomicsValueCol"
        :table-headers="metabolomicsTableHeaders"
        :table-data="metabolomicsTableData"
        omics-type="metabolomics"
        @update:slider-value="(newVal) => (sliderValsMetabolomics = newVal)"
      ></omic-input>
      <q-separator />
      <AttributeSelection
        v-model:layout-settings="layoutAttributes"
        :timeseries-mode-toggle="timeseriesModeToggle"
        :layout-omics="layoutOmics"
      ></AttributeSelection>
      <!--Expansion Item "Advanced Settings" with one entry field for the cluster_min_size_quotient-->
      <q-expansion-item
        dense
        icon="settings"
        label="Advanced Settings"
        expand-icon-class="text-primary"
        collapse-icon-class="text-primary"
      >
        <q-input
          v-model="cluster_min_size_quotient"
          label="Cluster Min Size Quotient"
          type="number"
          hint="Quotient influencing the minimum size of a cluster in relation to the number of nodes"
          stack-label
        />
      </q-expansion-item>
    </q-list>
    <q-btn @click="dataQuery">Plot</q-btn>
  </q-list>
</template>

<script setup lang="ts">
import { ColType } from '@/core/generalTypes';
import { useMainStore } from '@/stores';
import { useQuasar } from 'quasar';
import { ref, Ref, computed, watch } from 'vue';
import OmicInput from './OmicInput.vue';
import AttributeSelection from './AttributeSelection.vue';
import { LayoutSettings } from '@/core/generalTypes';

const mainStore = useMainStore();

const $q = useQuasar();

const targetOrganisms = ref([
  { text: 'Mouse', value: 'mmu' },
  { text: 'Human', value: 'hsa' },
]);
const targetOrganism = ref({ text: 'Human', value: 'hsa' });
//const targetDatabases = ref([{ text: 'Reactome', value: 'reactome' }]);
const targetDatabase = ref({ text: 'Reactome', value: 'reactome' });

const recievedTranscriptomicsData = ref(false);
const recievedProteomicsData = ref(false);
const recievedMetabolomicsData = ref(false);
const cluster_min_size_quotient = ref(80);
const sliderValsTranscriptomics = ref(
  {} as {
    [key: string]: {
      vals: { min: number; max: number };
      empties: boolean;
      inside: boolean;
    };
  }
);
const sliderValsProteomics = ref(
  {} as {
    [key: string]: {
      vals: { min: number; max: number };
      empties: boolean;
      inside: boolean;
    };
  }
);
const sliderValsMetabolomics = ref(
  {} as {
    [key: string]: {
      vals: { min: number; max: number };
      empties: boolean;
      inside: boolean;
    };
  }
);

const chosenOmics = computed((): string[] => {
  const chosen = [];
  if (recievedTranscriptomicsData.value) chosen.push('transcriptomics');
  if (recievedProteomicsData.value) chosen.push('proteomics');
  if (recievedMetabolomicsData.value) chosen.push('metabolomics');
  return chosen;
});

const layoutOmics = computed(() =>
  chosenOmics.value.concat(['not related to specific omic'])
);

const timeseriesModeToggle = computed({
  get: () => mainStore.timeseriesModeToggle,
  set: (value) => mainStore.setTimeSeriesToggle(value),
});

const transcriptomicsTableHeaders = computed(
  () => mainStore.tableHeaders.transcriptomics
);
const proteomicsTableHeaders = computed(
  () => mainStore.tableHeaders.proteomics
);

const metabolomicsTableHeaders = computed(
  () => mainStore.tableHeaders.metabolomics
);
const transcriptomicsTableData = computed(
  () => mainStore.tableData.transcriptomics
);
const proteomicsTableData = computed(() => mainStore.tableData.proteomics);
const metabolomicsTableData = computed(() => mainStore.tableData.metabolomics);

const transcriptomicsSymbolCol: Ref<ColType> = ref({
  name: '',
  label: '',
  field: '',
  align: undefined,
});
const transcriptomicsValueCol: Ref<ColType[]> = ref([
  {
    field: '',
    label: '',
    name: '',
    align: undefined,
  },
]);

const proteomicsSymbolCol: Ref<ColType> = ref({
  name: '',
  label: '',
  field: '',
  align: undefined,
});
const proteomicsValueCol: Ref<ColType[]> = ref([
  {
    field: '',
    label: '',
    name: '',
    align: undefined,
  },
]);

const metabolomicsSymbolCol: Ref<ColType> = ref({
  name: '',
  label: '',
  field: '',
  align: undefined,
});
const metabolomicsValueCol: Ref<ColType[]> = ref([
  {
    field: '',
    label: '',
    name: '',
    align: undefined,
  },
]);

const commonDefault = [
  { text: '% regulated', value: 'common_reg' },
  { text: '% with measured value', value: 'common_measured' },
];

const timeseriesDefault = [
  { text: 'Mean Slope above limit', value: 'timeseries_meanSlopeAbove' },
  { text: 'Mean Slope below limit', value: 'timeseries_meanSlopeBelow' },
  { text: '% slopes below limit', value: 'timeseries_percentSlopeBelow' },
  { text: '% slopes above limit', value: 'timeseries_percentSlopeAbove' },
  {
    text: 'Mean standard error above limit',
    value: 'timeseries_meanSeAbove',
  },
  {
    text: 'Mean standard error below limit',
    value: 'timeseries_meanSeBelow',
  },
  {
    text: '% standard error above limit',
    value: 'timeseries_percentSeAbove',
  },
  {
    text: '% standard error below limit',
    value: 'timeseries_percentSeBelow',
  },
];

const foldChangeDefault = [
  { text: 'Mean expression above limit', value: 'fc_meanFcAbove' },
  { text: '% values above limit', value: 'fc_percentFcAbove' },
  { text: 'Mean expression below limit ', value: 'fc_meanFcBelow' },
  { text: '% values below limit ', value: 'fc_percentFcBelow' },
];

const layoutAttributes: Ref<LayoutSettings> = ref({
  transcriptomics: {
    attributes:
      timeseriesModeToggle.value == 'slope'
        ? [
            ...commonDefault.map((x) => ({ ...x, value: 't_' + x.value })),
            ...timeseriesDefault.map((x) => ({ ...x, value: 't_' + x.value })),
          ]
        : [
            ...commonDefault.map((x) => ({ ...x, value: 't_' + x.value })),
            ...foldChangeDefault.map((x) => ({ ...x, value: 't_' + x.value })),
          ],
    limits: [0.8, 1.2, -0.1, 0.1, 0.1, 0.5],
  },
  proteomics: {
    attributes:
      timeseriesModeToggle.value == 'slope'
        ? [
            ...commonDefault.map((x) => ({ ...x, value: 'p_' + x.value })),
            ...timeseriesDefault.map((x) => ({ ...x, value: 'p_' + x.value })),
          ]
        : [
            ...commonDefault.map((x) => ({ ...x, value: 'p_' + x.value })),
            ...foldChangeDefault.map((x) => ({ ...x, value: 'p_' + x.value })),
          ],
    limits: [0.8, 1.2, -0.1, 0.1, 0.1, 0.5],
  },
  metabolomics: {
    attributes:
      timeseriesModeToggle.value == 'slope'
        ? [
            ...commonDefault.map((x) => ({ ...x, value: 'm_' + x.value })),
            ...timeseriesDefault.map((x) => ({ ...x, value: 'm_' + x.value })),
          ]
        : [
            ...commonDefault.map((x) => ({ ...x, value: 'm_' + x.value })),
            ...foldChangeDefault.map((x) => ({ ...x, value: 'm_' + x.value })),
          ],
    limits: [0.8, 1.2, -0.1, 0.1, 0.1, 0.5],
  },
  'not related to specific omic': {
    attributes: [
      {
        text: '% values measured over all omics',
        value: 'nonOmic_percentMeasured',
      },
    ],
    limits: [0.8, 1.2, -0.1, 0.1, 0.1, 0.5],
  },
} as LayoutSettings);

watch(timeseriesModeToggle, () => {
  setAttributeDefaults();
});

const setAttributeDefaults = () => {
  (layoutAttributes.value.transcriptomics.attributes =
    timeseriesModeToggle.value == 'slope'
      ? [
          ...commonDefault.map((x) => ({ ...x, value: 't_' + x.value })),
          ...timeseriesDefault.map((x) => ({ ...x, value: 't_' + x.value })),
        ]
      : [
          ...commonDefault.map((x) => ({ ...x, value: 't_' + x.value })),
          ...foldChangeDefault.map((x) => ({ ...x, value: 't_' + x.value })),
        ]),
    (layoutAttributes.value.proteomics.attributes =
      timeseriesModeToggle.value == 'slope'
        ? [
            ...commonDefault.map((x) => ({ ...x, value: 'p_' + x.value })),
            ...timeseriesDefault.map((x) => ({ ...x, value: 'p_' + x.value })),
          ]
        : [
            ...commonDefault.map((x) => ({ ...x, value: 'p_' + x.value })),
            ...foldChangeDefault.map((x) => ({ ...x, value: 'p_' + x.value })),
          ]);
  layoutAttributes.value.metabolomics.attributes =
    timeseriesModeToggle.value == 'slope'
      ? [
          ...commonDefault.map((x) => ({ ...x, value: 'm_' + x.value })),
          ...timeseriesDefault.map((x) => ({ ...x, value: 'm_' + x.value })),
        ]
      : [
          ...commonDefault.map((x) => ({ ...x, value: 'm_' + x.value })),
          ...foldChangeDefault.map((x) => ({ ...x, value: 'm_' + x.value })),
        ];
};

const dataQuery = () => {
  if (targetDatabase.value.value === 'reactome') {
    queryReactome();
  }
};

const queryReactome = () => {
  const mainStore = useMainStore();
  mainStore.resetStore();
  $q.loading.show();
  const amtTimepoints = Math.max(
    transcriptomicsValueCol.value.map((entry) => entry.field).length,
    proteomicsValueCol.value.map((entry) => entry.field).length,
    metabolomicsValueCol.value.map((entry) => entry.field).length
  );
  mainStore.setAmtTimepoints(amtTimepoints);
  const payload = {
    targetOrganism: targetOrganism.value,
    transcriptomics: {
      amtTimesteps: transcriptomicsValueCol.value.map((entry) => entry.field)
        .length,
      recieved: recievedTranscriptomicsData.value,
      symbol: transcriptomicsSymbolCol.value.field,
      value: transcriptomicsValueCol.value.map((entry) => entry.field),
    },
    proteomics: {
      amtTimesteps: proteomicsValueCol.value.map((entry) => entry.field).length,
      recieved: recievedProteomicsData.value,
      symbol: proteomicsSymbolCol.value.field,
      value: proteomicsValueCol.value.map((entry) => entry.field),
    },
    metabolomics: {
      amtTimesteps: metabolomicsValueCol.value.map((entry) => entry.field)
        .length,
      recieved: recievedMetabolomicsData.value,
      symbol: metabolomicsSymbolCol.value.field,
      value: metabolomicsValueCol.value.map((entry) => entry.field),
    },
    sliderVals: {
      transcriptomics: sliderValsTranscriptomics.value,
      proteomics: sliderValsProteomics.value,
      metabolomics: sliderValsMetabolomics.value,
    },
    timeseriesMode: mainStore.getTimeSeriesMode(),
    layoutSettings: layoutAttributes.value,
  };
  fetch('/reactome_parsing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((dataContent) => {
      if (dataContent.exitState == 1) {
        alert(dataContent.ErrorMsg);
        return Promise.reject(dataContent.errorMsg);
      }
      mainStore.setOmicsRecieved({
        transcriptomics: recievedTranscriptomicsData.value,
        proteomics: recievedProteomicsData.value,
        metabolomics: recievedMetabolomicsData.value,
      });
      mainStore.setUsedSymbolCols({
        transcriptomics: transcriptomicsSymbolCol.value.field.toString(),
        proteomics: proteomicsSymbolCol.value.field.toString(),
        metabolomics: metabolomicsSymbolCol.value.field.toString(),
      });
      mainStore.setKeggChebiTranslate(dataContent.keggChebiTranslate);
    })
    .then(() => getReactomeData());
};

const getReactomeData = () => {
  const payload = {
    timeseriesMode: mainStore.timeseriesModeToggle,
    cluster_min_size_quotient: cluster_min_size_quotient.value,
  };
  fetch('/reactome_overview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((dataContent) => {
      if (dataContent.exitState == 1) {
        return Promise.reject(dataContent.ErrorMsg);
      }
      mainStore.setOverviewData(dataContent.overviewData);
      mainStore.setClusterData(dataContent.clusterData);
      mainStore.setPathwayList(dataContent.pathwayList);
      mainStore.setQueryToPathwayDictionary(
        dataContent.queryToPathwayDictionary
      );
      mainStore.setRootIds(dataContent.rootIds);
    })
    .then(
      () => $q.loading.hide(),
      (reason) => {
        $q.loading.hide();
        alert(reason);
      }
    );
};
// const setTargetDatabase = (inputVal: { text: string; value: string }) => {
//   mainStore.setTargetDatabase(inputVal.value);
// };
</script>
