<template>
  <div>
    <div class="text-h6 text-grey-9 grey-9">Fa2 Layout Params</div>
    <div class="graphFilterCard">
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-4">
          <q-checkbox
            v-model="fa2LayoutParams.outboundAttractionDistribution"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            label="OutboundAttractionDistribution"
          />
        </div>
        <div class="col-4">
          <q-checkbox
            v-model="fa2LayoutParams.adjustSizes"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            label="Adjust Sizes"
          />
        </div>
        <div class="col-4">
          <q-checkbox
            v-model="fa2LayoutParams.strongGravity"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            label="Strong Gravity"
          />
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-4">
          <q-checkbox
            v-model="fa2LayoutParams.barnesHut"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            label="Barnes Hut"
          />
        </div>
        <div class="col-4">
          <q-checkbox
            v-model="fa2LayoutParams.linLog"
            checked-icon="task_alt"
            unchecked-icon="highlight_off"
            label="linlog"
          />
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">iterations</div>
        <div class="col-12">
          <q-slider
            :model-value="fa2LayoutParams.iterations"
            :min="0"
            :max="20000"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.iterations = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">weightShared</div>
        <div class="col-12">
          <q-slider
            :model-value="fa2LayoutParams.weightShared"
            :min="0"
            :max="100"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.weightShared = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">weightDefault</div>
        <div class="col-12">
          <q-slider
            :model-value="fa2LayoutParams.weightDefault"
            :min="0"
            :max="25"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.weightDefault = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">gravity</div>
        <div class="col-12">
          <q-slider
            :model-value="fa2LayoutParams.gravity"
            :min="0"
            :max="100"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.gravity = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12 text-caption text-grey-9">edgeWeightInfluence</div>
        <div class="col-12">
          <q-slider
            :model-value="fa2LayoutParams.edgeWeightInfluence"
            :min="0"
            :max="25"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.edgeWeightInfluence = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12">
          <div class="col-12 text-caption text-grey-9">scalingRatio</div>
          <q-slider
            :model-value="fa2LayoutParams.scalingRatio"
            :min="0"
            :max="100"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.scalingRatio = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12">
          <div class="col-12 text-caption text-grey-9">scalingRatio</div>
          <q-slider
            :model-value="fa2LayoutParams.scalingRatio"
            :min="0"
            :max="50"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.scalingRatio = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12">
          <div class="col-12 text-caption text-grey-9">barnes hut theta</div>
          <q-slider
            :model-value="fa2LayoutParams.barnesHutTheta"
            :min="0"
            :max="30"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.barnesHutTheta = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
      <div class="row flex-center" justify="space-between" align="center">
        <div class="col-12">
          <div class="col-12 text-caption text-grey-9">slowDown</div>
          <q-slider
            :model-value="fa2LayoutParams.slowDown"
            :min="0"
            :max="100"
            :step="1"
            label
            @change="
              (val) => {
                fa2LayoutParams.slowDown = val;
              }
            "
          >
          </q-slider>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits, PropType, ref, watch } from 'vue';

const props = defineProps({
  fa2LayoutParams: {
    type: Object as PropType<{
      iterations: number;
      weightShared: number;
      weightDefault: number;
      gravity: number;
      edgeWeightInfluence: number;
      scalingRatio: number;
      adjustSizes: boolean;
      outboundAttractionDistribution: boolean;
      strongGravity: boolean;
      barnesHut: boolean;
      barnesHutTheta: number;
      slowDown: number;
      linLog: boolean;
    }>,
    required: true,
  },
});

const emit = defineEmits(['update:fa2LayoutParams']);

const fa2LayoutParams = computed({
  get: () => props.fa2LayoutParams,
  set: (value) => emit('update:fa2LayoutParams', value),
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
