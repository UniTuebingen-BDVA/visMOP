<template>
  <div v-if="!omicsFilter.disable" class="graphFilterCard">
    <q-expansion-item
      v-model="expand"
      :header-inset-level="0.5"
      :content-inset-level="0.5"
      expand-separator
      :icon="`svguse:/icons/${omicsType}.svg#${omicsType}|0 0 9 9`"
      :label="omicsType"
      @click.prevent
    >
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
            :min="Math.round(omicsFilter.limits.min * 10) / 10"
            :max="Math.ceil(omicsFilter.limits.max * 10) / 10"
            :step="0.1"
            label
            :color="omicsFilter.inside ? 'primary' : 'graphFilterSlider'"
            :track-color="omicsFilter.inside ? 'graphFilterSlider' : 'primary'"
            :disable="omicsFilter.disable"
            @change="
              (val: {'min': number, 'max': number}) => {
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
        :stepsize="1"
      ></regulation-filter>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">regulation relative</div>
      </div>
      <regulation-filter
        v-model:filter-value="omicsRegulatedFilter.relative"
        :stepsize="0.5"
      ></regulation-filter>
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import RegulationFilter from './RegulationFilter.vue';
import { filterValues } from '@/core/generalTypes';
import { computed, defineProps, defineEmits, PropType, ref } from 'vue';

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
const expand = ref(false);
const omicsFilter = computed({
  get: () => props.omics,
  set: (value) => emit('update:omics', value),
});

const omicsRegulatedFilter = computed({
  get: () => props.omicsRegulated,
  set: (value) => emit('update:omicsRegulated', value),
});
</script>
