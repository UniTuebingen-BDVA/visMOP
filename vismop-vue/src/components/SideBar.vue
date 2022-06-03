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
      ></omic-input>
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
const mainStore = useMainStore();

const $q = useQuasar();

const targetOrganisms = ref([
  { text: 'Mouse', value: 'mmu' },
  { text: 'Human', value: 'hsa' },
]);
const targetOrganism = ref({ text: 'Mouse', value: 'mmu' });
const targetDatabases = ref([
  { text: 'Reactome', value: 'reactome' },
  { text: 'KEGG', value: 'kegg' },
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
const chosenOmics = computed((): string[] => {
  const chosen = [];
  if (recievedTranscriptomicsData.value) chosen.push('Transcriptomics');
  if (recievedProteomicsData.value) chosen.push('Proteomics');
  if (recievedMetabolomicsData.value) chosen.push('Metabolomics');
  return chosen;
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
      transcriptomcis: sliderValsTranscriptomics.value,
      proteomics: sliderValsProteomics.value,
      metabolomics: sliderValsMetabolomics.value,
    },
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
      if (dataContent === 1) return 1;
      mainStore.setOmicsRecieved(dataContent.omicsRecieved);
      mainStore.setUsedSymbolCols(dataContent.used_symbol_cols);
      mainStore.setFCSReactome(dataContent.fcs);
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
      console.log('PATHWAYLAYOUTING', dataContent);
      mainStore.setOverviewData(dataContent.overviewData);
      mainStore.setPathwayLayoutingReactome(dataContent.pathwayLayouting);
    })
    .then(() => $q.loading.hide());
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
      transcriptomcis: sliderValsTranscriptomics,
      proteomics: sliderValsProteomics,
      metabolomics: sliderValsMetabolomics,
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
