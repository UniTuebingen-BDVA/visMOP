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
        omics-type="Transcriptomics"
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
        omics-type="Proteomics"
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
        omics-type="Metabolomics"
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
                v-model="chosenLayoutAttributes"
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
                      <q-item-label v-html="opt" />
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <div
                v-if="currentLayoutOmic != 'not related to specific omic'"
                class="row"
              >
                <q-input
                  v-model.number="omicLimitMin"
                  type="number"
                  step="0.1"
                  style="max-width: 130px"
                  class="mt-4 ml-2"
                  label="minimal FC limit"
                  filled
                />
                <q-input
                  v-model.number="omicLimitMax"
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
const targetOrganism = ref({ text: 'Mouse', value: 'mmu' });
const targetDatabases = ref([
  { text: 'Reactome', value: 'reactome' },
  //{ text: 'KEGG', value: 'kegg' }, //comment in to allow usage of kegg
]);
const targetDatabase = ref({ text: 'Reactome', value: 'reactome' });

const recievedTranscriptomicsData = ref(false);
const recievedProteomicsData = ref(false);
const recievedMetabolomicsData = ref(false);

const sliderValsTranscriptomics = ref(
  {} as {
    [key: string]: { vals: { min: number; max: number }; empties: boolean };
  }
);
const sliderValsProteomics = ref(
  {} as {
    [key: string]: { vals: { min: number; max: number }; empties: boolean };
  }
);
const sliderValsMetabolomics = ref(
  {} as {
    [key: string]: { vals: { min: number; max: number }; empties: boolean };
  }
);
const transcriptomicsTableHeaders = computed(
  () => mainStore.transcriptomicsTableHeaders
);
const proteomicsTableHeaders = computed(() => mainStore.proteomicsTableHeaders);

const metabolomicsTableHeaders = computed(
  () => mainStore.metabolomicsTableHeaders
);
const transcriptomicsTableData = computed(
  () => mainStore.transcriptomicsTableData
);
const proteomicsTableData = computed(() => mainStore.proteomicsTableData);
const metabolomicsTableData = computed(() => mainStore.metabolomicsTableData);

const transcriptomicsSymbolCol: Ref<ColType> = ref({
  name: '',
  label: '',
  field: '',
  align: undefined,
});
const transcriptomicsValueCol: Ref<ColType> = ref({
  field: '',
  label: '',
  name: '',
  align: undefined,
});

const proteomicsSymbolCol: Ref<ColType> = ref({
  name: '',
  label: '',
  field: '',
  align: undefined,
});
const proteomicsValueCol: Ref<ColType> = ref({
  field: '',
  label: '',
  name: '',
  align: undefined,
});

const metabolomicsSymbolCol: Ref<ColType> = ref({
  name: '',
  label: '',
  field: '',
  align: undefined,
});
const metabolomicsValueCol: Ref<ColType> = ref({
  field: '',
  label: '',
  name: '',
  align: undefined,
});
const allOmicLayoutAttributes = [
  'Number of values',
  'Mean expression above limit',
  '% values above limit',
  'Mean expression below limit ',
  '% values below limit ',
  '% regulated',
  '% unregulated',
  '% with measured value',
];
const allNoneOmicAttributes = ['% values measured over all omics'];
const availableOmics = [
  'Transcriptomics ',
  'Proteomics ',
  'Metabolomics ',
  'not related to specific omic ',
];
const layoutSettings = ref({
  'Transcriptomics ': {
    attributes: allOmicLayoutAttributes,
    limits: [-1.3, 1.3],
  },
  'Proteomics ': { attributes: allOmicLayoutAttributes, limits: [0.8, 1.2] },
  'Metabolomics ': { attributes: allOmicLayoutAttributes, limits: [0.8, 1.2] },
  'not related to specific omic ': {
    attributes: allNoneOmicAttributes,
    limits: [0, 0],
  },
});
const omicLimitMin = ref(-1.3);
const omicLimitMax = ref(1.3);
const currentLayoutOmic = ref('');
const layoutOmics = ref(['']);
const chosenLayoutAttributes = ref(['']);
const layoutAttributes = ref(['']);
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
watch(currentLayoutOmic, () => {
  // change dropdown list Attributes
  layoutAttributes.value =
    currentLayoutOmic.value === 'not related to specific omic'
      ? allNoneOmicAttributes
      : allOmicLayoutAttributes;
  chosenLayoutAttributes.value =
    layoutSettings.value[
      (currentLayoutOmic.value + ' ') as keyof layoutSettingsInterface
    ].attributes;
  // console.log(typeof (layoutSettings))
  // change limits
  const limits =
    layoutSettings.value[
      (currentLayoutOmic.value + ' ') as keyof layoutSettingsInterface
    ].limits;
  omicLimitMin.value = limits[0];
  omicLimitMax.value = limits[1];
});
watch(omicLimitMin, () => {
  layoutSettings.value[
    (currentLayoutOmic.value + ' ') as keyof layoutSettingsInterface
  ].limits[0] = omicLimitMin.value;
});
watch(omicLimitMax, () => {
  layoutSettings.value[
    (currentLayoutOmic.value + ' ') as keyof layoutSettingsInterface
  ].limits[1] = omicLimitMax.value;
});
watch(chosenLayoutAttributes, () => {
  // save choosen Layout attribute for omic
  layoutSettings.value[
    (currentLayoutOmic.value + ' ') as keyof layoutSettingsInterface
  ].attributes = chosenLayoutAttributes.value;
});

const dataQuery = () => {
  if (targetDatabase.value.value === 'kegg') {
    generateKGMLs();
  } else if (targetDatabase.value.value === 'reactome') {
    queryReactome();
  }
};

const queryReactome = () => {
  const mainStore = useMainStore();

  $q.loading.show();
  const payload = {
    targetOrganism: targetOrganism.value,
    transcriptomics: {
      recieved: recievedTranscriptomicsData.value,
      symbol: transcriptomicsSymbolCol.value.field,
      value: transcriptomicsValueCol.value.field,
    },
    proteomics: {
      recieved: recievedProteomicsData.value,
      symbol: proteomicsSymbolCol.value.field,
      value: proteomicsValueCol.value.field,
    },
    metabolomics: {
      recieved: recievedMetabolomicsData.value,
      symbol: metabolomicsSymbolCol.value.field,
      value: metabolomicsValueCol.value.field,
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
      mainStore.setOmicsRecieved(dataContent.omicsRecieved);
      mainStore.setUsedSymbolCols(dataContent.used_symbol_cols);
      mainStore.setFCSReactome(dataContent.fcs);
      mainStore.setKeggChebiTranslate(dataContent.keggChebiTranslate);
    })
    .then(() => getReactomeData());
};

const getReactomeData = () => {
  fetch('/reactome_overview', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => response.json())
    .then((dataContent) => {
      if (dataContent.exitState == 1) {
        return Promise.reject(dataContent.ErrorMsg);
      }
      mainStore.setOverviewData(dataContent.overviewData);
      mainStore.setModuleAreas(dataContent.moduleAreas);
      mainStore.setPathwayLayoutingReactome(dataContent.pathwayLayouting);
      console.log('OVDATA', dataContent.overviewData);
    })
    .then(
      () => $q.loading.hide(),
      (reason) => {
        $q.loading.hide();
        alert(reason);
      }
    );
};
const generateKGMLs = () => {
  $q.loading.show();
  const payload = {
    targetOrganism: targetOrganism.value,
    transcriptomics: {
      recieved: recievedTranscriptomicsData.value,
      symbol: transcriptomicsSymbolCol.value.field,
      value: transcriptomicsValueCol.value.field,
    },
    proteomics: {
      recieved: recievedProteomicsData.value,
      symbol: proteomicsSymbolCol.value.field,
      value: proteomicsValueCol.value.field,
    },
    metabolomics: {
      recieved: recievedMetabolomicsData.value,
      symbol: metabolomicsSymbolCol.value.field,
      value: metabolomicsValueCol.value.field,
    },
    sliderVals: {
      transcriptomics: sliderValsTranscriptomics.value,
      proteomics: sliderValsProteomics.value,
      metabolomics: sliderValsMetabolomics.value,
    },
  };
  fetch('/kegg_parsing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((dataContent) => {
      if (dataContent === 1) return 1;
      mainStore.setOmicsRecieved(dataContent.omicsRecieved);
      mainStore.setPathayAmountDict(dataContent.pathways_amount_dict);
      mainStore.setOverviewData(dataContent.overview_data);
      mainStore.setGraphData(dataContent.main_data);
      mainStore.setFCS(dataContent.fcs);
      mainStore.setTranscriptomicsSymbolDict(
        dataContent.transcriptomics_symbol_dict
      );
      mainStore.setProteomicsSymbolDict(dataContent.proteomics_symbol_dict);
      mainStore.setUsedSymbolCols(dataContent.used_symbol_cols);
      mainStore.setPathwayLayoutingKegg(dataContent.pathwayLayouting);
      mainStore.setModuleAreas(dataContent.moduleAreas);
    })
    .then((val) => {
      if (val)
        alert(
          'Empty Data Selection! Adjust data source and/or filter settings'
        );
      $q.loading.hide();
    });
};
const setTargetDatabase = (inputVal: { text: string; value: string }) => {
  mainStore.setTargetDatabase(inputVal.value);
};
</script>
