<template>
  <div v-if="!omicsFilter.disable" class="graphFilterCard">
    <div class="row flex-center" justify="space-between" align="center">
      <div class="col-12 text-subtitle-10 text-grey-9">{{ omicsType }}</div>
    </div>
    <div class="row flex-center" justify="space-between" align="center">
      <div class="col-12 text-caption text-grey-9">fold change average</div>
    </div>
    <div class="row flex-center" justify="space-between" align="center">
      <div class="col-2">
        <q-checkbox
          v-model="omicsFilter.filterActive"
          checked-icon="task_alt"
          unchecked-icon="highlight_off"
          :disable="omicsFilter.disable"
        />
      </div>
      <div class="col-8">
        <q-range
          :model-value="omicsFilter.value"
          :min="Math.floor(omicsFilter.limits.min)"
          :max="Math.ceil(omicsFilter.limits.max)"
          :step="0.1"
          label
          :color="omicsFilter.inside ? 'primary' : 'graphFilterSlider'"
          :track-color="omicsFilter.inside ? 'graphFilterSlider' : 'primary'"
          :disable="omicsFilter.disable"
          @change="
            (val) => {
              omicsFilter.value = val;
            }
          "
        >
        </q-range>
      </div>
      <div class="col-2">
        <q-toggle
          v-model="omicsFilter.inside"
          checked-icon="mdi-arrow-collapse-horizontal"
          color="primary"
          unchecked-icon="mdi-arrow-split-vertical"
          :disable="omicsFilter.disable"
        />
      </div>
    </div>
    <div class="row flex-center" justify="space-between" align="center">
      <div class="col-12 text-caption text-grey-9">regulation absolute</div>
    </div>
    <regulation-filter
      v-model:filter-value="omicsRegulatedFilter.absolute"
    ></regulation-filter>
    <div class="row flex-center" justify="space-between" align="center">
      <div class="col-12 text-caption text-grey-9">regulation relative</div>
    </div>
    <regulation-filter
      v-model:filter-value="omicsRegulatedFilter.relative"
    ></regulation-filter>
  </div>
</template>

<script setup lang="ts">
import RegulationFilter from './RegulationFilter.vue';
import { filterValues } from '@/core/generalTypes';
import { computed, defineProps, defineEmits, PropType } from 'vue';

const props = defineProps({
  omicsType: {
    type: String,
    required: true,
  },
  omics: {
    type: Object as PropType<filterValues>,
    required: true,
  },
  omicsRegulated: {
    type: Object as PropType<{
      absolute: filterValues;
      relative: filterValues;
    }>,
    required: true,
  },
});
const emit = defineEmits(['update:omics', 'update:omicsRegulated']);

const omicsFilter = computed({
  get: () => props.omics,
  set: (value) => emit('update:omics', value),
});

const omicsRegulatedFilter = computed({
  get: () => props.omicsRegulated,
  set: (value) => emit('update:omicsRegulated', value),
});
</script>
