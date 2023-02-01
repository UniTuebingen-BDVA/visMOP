<template>
  <q-list nav class="q-pa-sm">
    <q-select
      v-model="targetDatabase"
      :options="targetDatabases"
      label="Target Database"
      option-label="text"
      option-value="value"
      @update:model-value="setTargetDatabase"
    ></q-select>
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
      :true-value="'aggregate'"
      :false-value="'individual'"
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
      <q-expansion-item
        label="Layout Attributes"
        group="omicsSelect"
        header-class="bg-primary text-white"
        expand-icon-class="text-white"
        icon="svguse:/icons/Metabolites.svg#metabolites|0 0 9 9"
      >
        <q-card>
          <q-card-section>
            <q-select
              v-model="currentLayoutOmic"
              :options="layoutOmics"
              label="Omic Type"
            ></q-select>
            <div v-if="currentLayoutOmic != ''">
              <q-select
                v-model="chosenLayoutAttributes[currentLayoutOmic]"
                :options="layoutAttributes"
                label="Attributes"
                use-chips
                clearable
                multiple
              >
                <template #option="{ itemProps, opt, selected, toggleOption }">
                  <q-item v-bind="itemProps">
                    <q-item-section side>
                      <q-checkbox
                        :model-value="selected"
                        @update:model-value="toggleOption(opt)"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ opt }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <div
                v-if="currentLayoutOmic != 'not related to specific omic'"
                class="row"
              >
                <q-input
                  v-model.number="omicLimitMin[currentLayoutOmic]"
                  type="number"
                  step="0.1"
                  style="max-width: 130px"
                  class="mt-4 ml-2"
                  label="minimal FC limit"
                  filled
                />
                <q-input
                  v-model.number="omicLimitMax[currentLayoutOmic]"
                  type="number"
                  step="0.1"
                  style="max-width: 130px"
                  class="mt-2 mr-2"
                  label="maximal FC limit"
                  filled
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-list>
    <q-btn @click="dataQuery">Plot</q-btn>
  </q-list>
</template>

<script setup lang="ts">
import { ColType } from '@/core/generalTypes';
import { useMainStore } from '@/stores';
import { useQuasar } from 'quasar';
import { ref, Ref, computed, watch, onMounted } from 'vue';
import OmicInput from './OmicInput.vue';
interface layoutSettingsInterface {
  'Transcriptomics ': { attributes: string[]; limits: number[] };
  'Proteomics ': { attributes: string[]; limits: number[] };
  'Metabolomics ': { attributes: string[]; limits: number[] };
  'not related to specific omic ': { attributes: string[]; limits: number[] };
}
const mainStore = useMainStore();

const $q = useQuasar();

const targetOrganisms = ref([
  { text: 'Mouse', value: 'mmu' },
  { text: 'Human', value: 'hsa' },
]);
const targetOrganism = ref({ text: 'Human', value: 'hsa' });
const targetDatabases = ref([{ text: 'Reactome', value: 'reactome' }]);
const targetDatabase = ref({ text: 'Reactome', value: 'reactome' });

const recievedTranscriptomicsData = ref(false);
const recievedProteomicsData = ref(false);
const recievedMetabolomicsData = ref(false);

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

const allOmicLayoutAttributes = {
  common: [
    'Number of values',
    '% regulated',
    '% unregulated',
    '% with measured value',
  ],
  timeseries: [
    'Mean Slope above limit',
    'Mean Slope below limit',
    '% slopes below limit',
    '% slopes above limit',
    'standard error above limit',
    'standard error below limit',
    '% standard error above limit',
    '% standard error below limit',
  ],
  foldChange: [
    'Mean expression above limit',
    '% values above limit',
    'Mean expression below limit ',
    '% values below limit ',
  ],
};
const allNonOmicAttributes = ['% values measured over all omics'];

const omicLimitMin = ref({
  transcriptomics: -1.3,
  proteomics: -1.3,
  metabolomics: -1.3,
});
const omicLimitMax = ref({
  transcriptomics: 1.3,
  proteomics: 1.3,
  metabolomics: 1.3,
});
const currentLayoutOmic: Ref<
  | 'transcriptomics'
  | 'proteomics'
  | 'metabolomics'
  | 'not related to specific omic'
  | ''
> = ref('');
const layoutOmics = ref(['']);
const chosenLayoutAttributes = ref({
  transcriptomics: [''],
  proteomics: [''],
  metabolomics: [''],
  'not related to specific omic': [''],
});
const chosenOmics = computed((): string[] => {
  const chosen = [];
  if (recievedTranscriptomicsData.value) chosen.push('Transcriptomics');
  if (recievedProteomicsData.value) chosen.push('Proteomics');
  if (recievedMetabolomicsData.value) chosen.push('Metabolomics');
  return chosen;
});
watch(chosenOmics, () => {
  layoutOmics.value = chosenOmics.value.concat([
    'not related to specific omic',
  ]);
});

const layoutAttributes = computed(() => {
  return currentLayoutOmic.value === 'not related to specific omic'
    ? allNonOmicAttributes
    : [
        ...allOmicLayoutAttributes.common,
        ...allOmicLayoutAttributes[
          timeseriesModeToggle.value === 'fc' ? 'foldChange' : 'timeseries'
        ],
      ];
});

const layoutSettings = computed(() => {
  return {
    'Transcriptomics ': {
      attributes: chosenLayoutAttributes.value.transcriptomics,
      limits: [
        omicLimitMin.value.transcriptomics,
        omicLimitMax.value.transcriptomics,
      ],
    },
    'Proteomics ': {
      attributes: chosenLayoutAttributes.value.proteomics,
      limits: [omicLimitMin.value.proteomics, omicLimitMax.value.proteomics],
    },
    'Metabolomics ': {
      attributes: chosenLayoutAttributes.value.metabolomics,
      limits: [
        omicLimitMin.value.metabolomics,
        omicLimitMax.value.metabolomics,
      ],
    },
    'not related to specific omic ': {
      attributes: chosenLayoutAttributes.value['not related to specific omic'],
      limits: [0, 0],
    },
  };
});

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
    layoutSettings: layoutSettings.value,
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
const setTargetDatabase = (inputVal: { text: string; value: string }) => {
  mainStore.setTargetDatabase(inputVal.value);
};
</script>
