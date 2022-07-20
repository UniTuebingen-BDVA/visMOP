<template>
  <div>
    <div class="text-h6 text-grey-9 grey-9">Graph Filtering</div>
    <div class="graphFilterCard">
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-subtitle1 text-grey-9">General</div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">
          Sum all omics, relative
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-2">
          <q-checkbox
            v-model="sumRegulatedFilter.relative.filterActive"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            :disable="sumRegulatedFilter.relative.disable"
          />
        </div>
        <div class="col-8">
          <q-range
            :model-value="sumRegulatedFilter.relative.value"
            :min="Math.floor(sumRegulatedFilter.relative.limits.min)"
            :max="Math.ceil(sumRegulatedFilter.relative.limits.max)"
            :step="0.1"
            label
            :color="
              sumRegulatedFilter.relative.inside
                ? 'primary'
                : 'graphFilterSlider'
            "
            :track-color="
              sumRegulatedFilter.relative.inside
                ? 'graphFilterSlider'
                : 'primary'
            "
            :disable="sumRegulatedFilter.relative.disable"
            @change="
              (val) => {
                sumRegulatedFilter.relative.value = val;
              }
            "
          >
          </q-range>
        </div>
        <div class="col-2">
          <q-toggle
            v-model="sumRegulatedFilter.relative.inside"
            checked-icon="mdi-arrow-collapse-horizontal"
            color="primary"
            unchecked-icon="mdi-arrow-split-vertical"
            :disable="sumRegulatedFilter.relative.disable"
          />
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">
          Sum all omics, absolute
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-2">
          <q-checkbox
            v-model="sumRegulatedFilter.absolute.filterActive"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            :disable="sumRegulatedFilter.absolute.disable"
          />
        </div>
        <div class="col-8">
          <q-range
            :model-value="sumRegulatedFilter.absolute.value"
            :min="Math.floor(sumRegulatedFilter.absolute.limits.min)"
            :max="Math.ceil(sumRegulatedFilter.absolute.limits.max)"
            :step="0.1"
            label
            :color="
              sumRegulatedFilter.absolute.inside
                ? 'primary'
                : 'graphFilterSlider'
            "
            :track-color="
              sumRegulatedFilter.absolute.inside
                ? 'graphFilterSlider'
                : 'primary'
            "
            :disable="sumRegulatedFilter.absolute.disable"
            @change="
              (val) => {
                sumRegulatedFilter.absolute.value = val;
              }
            "
          >
          </q-range>
        </div>
        <div class="col-2">
          <q-toggle
            v-model="sumRegulatedFilter.absolute.inside"
            checked-icon="mdi-arrow-collapse-horizontal"
            color="primary"
            unchecked-icon="mdi-arrow-split-vertical"
            :disable="sumRegulatedFilter.absolute.disable"
          />
        </div>
      </div>
      <div v-if="!transcriptomicsFilter.disable" class="graphFilterCard">
        <div class="row flex-center" justify="space-between" align="center">
          <div class="col-12 text-subtitle-1 text-grey-9">Transcriptomics</div>
        </div>
        <div class="row flex-center" justify="space-between" align="center">
          <div class="col-12 text-caption text-grey-9">fold change average</div>
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
              :model-value="transcriptomicsFilter.value"
              :min="Math.floor(transcriptomicsFilter.limits.min)"
              :max="Math.ceil(transcriptomicsFilter.limits.max)"
              :step="0.1"
              label
              :color="
                transcriptomicsFilter.inside ? 'primary' : 'graphFilterSlider'
              "
              :track-color="
                transcriptomicsFilter.inside ? 'graphFilterSlider' : 'primary'
              "
              :disable="transcriptomicsFilter.disable"
              @change="
                (val) => {
                  transcriptomicsFilter.value = val;
                }
              "
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
    </div>
    <div v-if="!proteomicsFilter.disable" class="graphFilterCard">
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-subtitle-10 text-grey-9">Proteomics</div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">fold change average</div>
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
            :model-value="proteomicsFilter.value"
            :min="Math.floor(proteomicsFilter.limits.min)"
            :max="Math.ceil(proteomicsFilter.limits.max)"
            :step="0.1"
            label
            :color="proteomicsFilter.inside ? 'primary' : 'graphFilterSlider'"
            :track-color="
              proteomicsFilter.inside ? 'graphFilterSlider' : 'primary'
            "
            :disable="proteomicsFilter.disable"
            @change="
              (val) => {
                proteomicsFilter.value = val;
              }
            "
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
    <div v-if="!metabolomicsFilter.disable" class="graphFilterCard">
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-subtitle-10 text-grey-9">Metabolomics</div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">fold change average</div>
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
            :model-value="metabolomicsFilter.value"
            :min="Math.floor(metabolomicsFilter.limits.min)"
            :max="Math.ceil(metabolomicsFilter.limits.max)"
            :step="0.1"
            label
            :color="metabolomicsFilter.inside ? 'primary' : 'graphFilterSlider'"
            :track-color="
              metabolomicsFilter.inside ? 'graphFilterSlider' : 'primary'
            "
            :disable="metabolomicsFilter.disable"
            @change="
              (val) => {
                metabolomicsFilter.value = val;
              }
            "
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
import { computed, defineProps, defineEmits, PropType } from 'vue';

const props = defineProps({
  sumRegulated: {
    type: Object as PropType<{
      absolute: {
        limits: { min: number; max: number };
        value: { min: number; max: number };
        filterActive: boolean;
        inside: boolean;
        disable: boolean;
      };
      relative: {
        limits: { min: number; max: number };
        value: { min: number; max: number };
        filterActive: boolean;
        inside: boolean;
        disable: boolean;
      };
    }>,
    required: true,
  },
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
  'update:sumRegulated',
  'update:transcriptomics',
  'update:proteomics',
  'update:metabolomics',
]);

const sumRegulatedFilter = computed({
  get: () => props.sumRegulated,
  set: (value) => emit('update:sumRegulated', value),
});

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
