<template>
  <div class="row flex-center" justify="space-between" align="center">
    <div class="col-2">
      <q-checkbox
        v-model="filterValueInternal.filterActive"
        checked-icon="task_alt"
        unchecked-icon="highlight_off"
        :disable="filterValueInternal.disable"
      />
    </div>
    <div class="col-8">
      <q-range
        :model-value="filterValueInternal.value"
        :min="Math.floor(filterValueInternal.limits.min)"
        :max="Math.ceil(filterValueInternal.limits.max)"
        :step="stepsize"
        label
        :color="filterValueInternal.inside ? 'primary' : 'graphFilterSlider'"
        :track-color="
          filterValueInternal.inside ? 'graphFilterSlider' : 'primary'
        "
        :disable="filterValueInternal.disable"
        @change="
          (val) => {
            filterValueInternal.value = val;
          }
        "
      >
      </q-range>
    </div>
    <div class="col-2">
      <q-toggle
        v-model="filterValueInternal.inside"
        checked-icon="mdi-arrow-collapse-horizontal"
        color="primary"
        unchecked-icon="mdi-arrow-split-vertical"
        :disable="filterValueInternal.disable"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { filterValues } from '@/core/generalTypes';
import { computed, PropType } from 'vue';

const emit = defineEmits(['update:filterValue']);

const props = defineProps({
  stepsize: {
    type: Number,
    required: true,
  },
  filterValue: {
    type: Object as PropType<filterValues>,
    required: true,
  },
});

const filterValueInternal = computed({
  get: () => props.filterValue,
  set: (value) => emit('update:filterValue', value),
});
</script>
