<template>
  <div>
    <div class="text-h6 text-grey-9">Graph Filtering</div>
    <div class="graphFilterCard">
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-subtitle-10 text-grey-9">Transcriptomics</div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-2">
          <q-checkbox
            v-model="transcriptomicsFilter.filterActive"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            :disable="transcriptomicsFilter.disable"
          />
        </div>
        <div class="col-8">
          <q-range
            v-model="transcriptomicsFilter.value"
            thumb-label
            :min="transcriptomicsFilter.limits.min"
            :max="transcriptomicsFilter.limits.max"
            :step="0.1"
            label
            :color="
              transcriptomicsFilter.inside ? 'primary' : 'graphFilterSlider'
            "
            :track-color="
              transcriptomicsFilter.inside ? 'graphFilterSlider' : 'primary'
            "
            :disable="transcriptomicsFilter.disable"
          >
          </q-range>
        </div>
        <div class="col-2">
          <q-toggle
            v-model="transcriptomicsFilter.inside"
            checked-icon="mdi-arrow-collapse-horizontal"
            color="primary"
            unchecked-icon="mdi-arrow-split-vertical"
            :disable="transcriptomicsFilter.disable"
          />
        </div>
      </div>
    </div>
    <div class="graphFilterCard">
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-subtitle-10 text-grey-9">Proteomics</div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-2">
          <q-checkbox
            v-model="proteomicsFilter.filterActive"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            :disable="proteomicsFilter.disable"
          />
        </div>
        <div class="col-8">
          <q-range
            v-model="proteomicsFilter.value"
            thumb-label
            :min="proteomicsFilter.limits.min"
            :max="proteomicsFilter.limits.max"
            :step="0.1"
            label
            :color="proteomicsFilter.inside ? 'primary' : 'graphFilterSlider'"
            :track-color="
              proteomicsFilter.inside ? 'graphFilterSlider' : 'primary'
            "
            :disable="proteomicsFilter.disable"
          >
          </q-range>
        </div>
        <div class="col-2">
          <q-toggle
            v-model="proteomicsFilter.inside"
            checked-icon="mdi-arrow-collapse-horizontal"
            color="primary"
            unchecked-icon="mdi-arrow-split-vertical"
            :disable="proteomicsFilter.disable"
          />
        </div>
      </div>
    </div>
    <div class="graphFilterCard">
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-subtitle-10 text-grey-9">Metabolomics</div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-2">
          <q-checkbox
            v-model="metabolomicsFilter.filterActive"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            :disable="metabolomicsFilter.disable"
          />
        </div>
        <div class="col-8">
          <q-range
            v-model="metabolomicsFilter.value"
            thumb-label
            :min="metabolomicsFilter.limits.min"
            :max="metabolomicsFilter.limits.max"
            :step="0.1"
            label
            :color="metabolomicsFilter.inside ? 'primary' : 'graphFilterSlider'"
            :track-color="
              metabolomicsFilter.inside ? 'graphFilterSlider' : 'primary'
            "
            :disable="metabolomicsFilter.disable"
          >
          </q-range>
        </div>
        <div class="col-2">
          <q-toggle
            v-model="metabolomicsFilter.inside"
            checked-icon="mdi-arrow-collapse-horizontal"
            color="primary"
            unchecked-icon="mdi-arrow-split-vertical"
            :disable="metabolomicsFilter.disable"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMainStore } from '@/stores';
import { computed, ref, watch, defineProps, defineEmits, PropType } from 'vue';
import type { Ref } from 'vue';

const props = defineProps({
  transcriptomics: {
    type: Object as PropType<{
      limits: { min: number; max: number };
      value: { min: number; max: number };
      filterActive: boolean;
      inside: boolean;
      disable: boolean;
    }>,
    required: true,
  },
  proteomics: {
    type: Object as PropType<{
      limits: { min: number; max: number };
      value: { min: number; max: number };
      filterActive: boolean;
      inside: boolean;
      disable: boolean;
    }>,
    required: true,
  },
  metabolomics: {
    type: Object as PropType<{
      limits: { min: number; max: number };
      value: { min: number; max: number };
      filterActive: boolean;
      inside: boolean;
      disable: boolean;
    }>,
    required: true,
  },
});

const emit = defineEmits([
  'update:transcriptomics',
  'update:proteomics',
  'update:metabolomics',
]);

const mainStore = useMainStore();

const transcriptomicsFilter = computed({
  get: () => props.transcriptomics,
  set: (value) => emit('update:transcriptomics', value),
});
const proteomicsFilter = computed({
  get: () => props.proteomics,
  set: (value) => emit('update:proteomics', value),
});
const metabolomicsFilter = computed({
  get: () => props.metabolomics,
  set: (value) => emit('update:metabolomics', value),
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
