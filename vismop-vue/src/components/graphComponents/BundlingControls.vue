<template>
  <div>
    <div class="graphFilterCard copy">
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12">
          <q-checkbox
            v-model="bundlingParams.showAllEdges"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            label="Show All Edges"
          />
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12">
          <q-checkbox
            v-model="bundlingParams.showBundling"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            label="Show Bundling"
          />
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">Maximum Distortion "k"</div>
        <div class="col-12">
          <q-slider
            :model-value="bundlingParams.maximumDistortion"
            :min="1"
            :max="10"
            :step="0.5"
            label
            @change="
              (val: number) => {
                bundlingParams.maximumDistortion = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">Edge Weight Factor "d"</div>
        <div class="col-12">
          <q-slider
            :model-value="bundlingParams.edgeWeightFactor"
            :min="1"
            :max="10"
            :step="0.5"
            label
            @change="
              (val: number) => {
                bundlingParams.edgeWeightFactor = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <q-btn @click="generateNewBundling">Generate New Bundling</q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits, PropType, ref, watch } from 'vue';

const props = defineProps({
  bundlingParams: {
    type: Object as PropType<{
      maximumDistortion: number;
      edgeWeightFactor: number;
      showAllEdges: boolean;
      showBundling: boolean;
    }>,
    required: true,
  },
});

function generateNewBundling() {
  emit('generateNewBundling');
}

const emit = defineEmits(['update:bundlingParams','generateNewBundling']);

const bundlingParams = computed({
  get: () => props.bundlingParams,
  set: (value) => emit('update:bundlingParams', value),
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
