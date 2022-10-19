<template>
  <div>
    <div class="graphFilterCard">
      <q-expansion-item
        v-model="expandGeneral"
        :header-inset-level="0.5"
        :content-inset-level="0.5"
        expand-separator
        icon="mdi-filter"
        label="General"
        @click.prevent
      >
        <div class="row flex-center" justify="space-between" align="center">
          <div class="col-12 text-caption text-grey-9">
            Filter By Reactome Topic
          </div>
        </div>
        <div class="row flex-center" justify="space-between" align="center">
          <div class="col-2">
            <q-checkbox
              v-model="rootNegativeFilter.filterActive"
              checked-icon="task_alt"
              unchecked-icon="highlight_off"
            />
          </div>
          <div class="col-10">
            <q-select
              v-model="rootNegativeSelection"
              filled
              multiple
              :options="rootFilterOptionsInternal"
              input-debounce="0"
              option-label="text"
              option-value="value"
              use-chips
              label="Reactome Topic Negative Filter"
              @filter="filterFunction"
            />
          </div>
        </div>

        <div class="row flex-center" justify="space-between" align="center">
          <div class="col-2">
            <q-checkbox
              v-model="rootFilter.filterActive"
              checked-icon="task_alt"
              unchecked-icon="highlight_off"
            />
          </div>
          <div class="col-10">
            <q-select
              v-model="rootSelection"
              filled
              :options="rootFilterOptionsInternal"
              label="Reactome Topic Positive Filter"
              use-input
              input-debounce="0"
              option-label="text"
              option-value="value"
              @filter="filterFunction"
            ></q-select>
          </div>
        </div>
        <div class="row flex-center" justify="space-between" align="center">
          <div class="col-12 text-caption text-grey-9">
            Sum all omics, absolute
          </div>
        </div>
        <regulation-filter
          v-model:filter-value="sumRegulatedFilter.absolute"
          :stepsize="1"
        ></regulation-filter>
        <div class="row flex-center" justify="space-between" align="center">
          <div class="col-12 text-caption text-grey-9">
            Sum all omics, relative
          </div>
        </div>
        <regulation-filter
          v-model:filter-value="sumRegulatedFilter.relative"
          :stepsize="0.5"
        ></regulation-filter>
      </q-expansion-item>
      <omics-filter
        v-model:omics="transcriptomicsFilter"
        v-model:omics-regulated="transcriptomicsRegulatedFilter"
        omics-type="Transcriptomics"
      >
      </omics-filter>
      <omics-filter
        v-model:omics="proteomicsFilter"
        v-model:omics-regulated="proteomicsRegulatedFilter"
        omics-type="Proteomics"
      >
      </omics-filter>
      <omics-filter
        v-model:omics="metabolomicsFilter"
        v-model:omics-regulated="metabolomicsRegulatedFilter"
        omics-type="Metabolomics"
      >
      </omics-filter>
    </div>
  </div>
</template>

<script setup lang="ts">
import { filterValues } from '@/core/generalTypes';
import { useMainStore } from '@/stores/index.js';
import { computed, defineProps, defineEmits, PropType, ref, watch } from 'vue';
import RegulationFilter from './RegulationFilter.vue';
import OmicsFilter from './OmicsFilter.vue';

const props = defineProps({
  rootNegativeFilter: {
    type: Object as PropType<{
      filterActive: boolean;
      rootIDs: string[];
    }>,
    required: true,
  },
  rootFilter: {
    type: Object as PropType<{
      filterActive: boolean;
      rootID: string;
    }>,
    required: true,
  },
  sumRegulated: {
    type: Object as PropType<{
      absolute: filterValues;
      relative: filterValues;
    }>,
    required: true,
  },
  transcriptomics: {
    type: Object as PropType<filterValues>,
    required: true,
  },
  transcriptomicsRegulated: {
    type: Object as PropType<{
      absolute: filterValues;
      relative: filterValues;
    }>,
    required: true,
  },
  proteomics: {
    type: Object as PropType<filterValues>,
    required: true,
  },
  proteomicsRegulated: {
    type: Object as PropType<{
      absolute: filterValues;
      relative: filterValues;
    }>,
    required: true,
  },
  metabolomics: {
    type: Object as PropType<filterValues>,
    required: true,
  },
  metabolomicsRegulated: {
    type: Object as PropType<{
      absolute: filterValues;
      relative: filterValues;
    }>,
    required: true,
  },
});

const emit = defineEmits([
  'update:sumRegulated',
  'update:transcriptomics',
  'update:transcriptomicsRegulated',
  'update:proteomics',
  'update:proteomicsRegulated',
  'update:metabolomics',
  'update:metabolomicsRegulated',
  'update:rootFilter',
  'update:rootNegativeFilter',
]);
const mainStore = useMainStore();

const rootNegativeSelection = ref([]);
watch(rootNegativeSelection, () => {
  if (rootNegativeSelection.value) {
    rootNegativeFilter.value.rootIDs = rootNegativeSelection.value.map(
      (elem: { title: string; value: string; text: string }) => elem.value
    );
  }
});
const expandGeneral = ref(false);

const rootSelection = ref({ title: '', value: '', text: '' });
watch(rootSelection, () => {
  if (rootSelection.value) {
    rootFilter.value.rootID = rootSelection.value.value;
  }
});

const rootNegativeFilter = computed({
  get: () => props.rootNegativeFilter,
  set: (value) => emit('update:rootNegativeFilter', value),
});

const rootFilter = computed({
  get: () => props.rootFilter,
  set: (value) => emit('update:rootFilter', value),
});

const rootFilterOptions = computed(() => {
  const rootIDs = mainStore.pathwayLayouting.rootIds;
  const pathways = mainStore.pathwayLayouting.pathwayList;
  const options: { text: string; value: string; title: string }[] = [];
  rootIDs.forEach((v) => {
    const text = pathways.filter((d) => {
      return d.value === v;
    })[0].title;
    options.push({ title: text, value: v, text: text });
  });
  return options;
});

const rootFilterOptionsInternal = ref(rootFilterOptions.value);
watch(rootFilterOptions.value, () => {
  rootFilterOptionsInternal.value = rootFilterOptions.value;
});

const filterFunction = (val: string, update: (n: () => void) => void) => {
  update(() => {
    const tarValue = val.toLowerCase();
    rootFilterOptionsInternal.value = rootFilterOptions.value.filter(
      (v: { text: string; value: string; title: string }) =>
        v.text.toLowerCase().indexOf(tarValue) > -1
    );
  });
};

const sumRegulatedFilter = computed({
  get: () => props.sumRegulated,
  set: (value) => emit('update:sumRegulated', value),
});

const transcriptomicsFilter = computed({
  get: () => props.transcriptomics,
  set: (value) => emit('update:transcriptomics', value),
});

const transcriptomicsRegulatedFilter = computed({
  get: () => props.transcriptomicsRegulated,
  set: (value) => emit('update:transcriptomicsRegulated', value),
});

const proteomicsFilter = computed({
  get: () => props.proteomics,
  set: (value) => emit('update:proteomics', value),
});

const proteomicsRegulatedFilter = computed({
  get: () => props.proteomicsRegulated,
  set: (value) => emit('update:proteomicsRegulated', value),
});

const metabolomicsFilter = computed({
  get: () => props.metabolomics,
  set: (value) => emit('update:metabolomics', value),
});

const metabolomicsRegulatedFilter = computed({
  get: () => props.metabolomicsRegulated,
  set: (value) => emit('update:metabolomicsRegulated', value),
});
// watch

// methods
</script>
<style lang="css">
.graphFilterCard {
  width: 300px;
  max-width: 300px;
}

.bg-graphFilterSlider {
  background: rgb(187, 187, 187) !important;
}
.text-graphFilterSlider {
  color: rgba(187, 187, 187) !important;
}
</style>
