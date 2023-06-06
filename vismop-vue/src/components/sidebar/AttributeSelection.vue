<!-- vue compontent controlling the used attributes-->
<template>
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
            v-model="layoutSettingsInternal[currentLayoutOmic].attributes"
            :options="layoutAttributes"
            label="Attributes"
            option-value="value"
            option-label="text"
            use-chips
            clearable
            multiple
          >
            <template #option="{ itemProps, opt, selected, toggleOption }">
              <q-item v-bind="itemProps">
                <q-item-section side>
                  <q-checkbox
                    :model-value="selected"
                    @update:model-value="toggleOption(opt.value)"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ opt.text }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <div v-if="currentLayoutOmic != 'nonSpecific'" class="row">
            <q-input
              v-model.number="
                layoutSettingsInternal[currentLayoutOmic].limits[0]
              "
              type="number"
              step="0.1"
              style="max-width: 130px"
              class="mt-4 ml-2"
              label="minimal FC limit"
              filled
            />
            <q-input
              v-model.number="
                layoutSettingsInternal[currentLayoutOmic].limits[1]
              "
              type="number"
              step="0.1"
              style="max-width: 130px"
              class="mt-2 mr-2"
              label="maximal FC limit"
              filled
            />
          </div>
          <div v-if="timeseriesModeToggle === 'slope'" class="row">
            <!-- Another set of inputs if timeseriesModeToggle is slope -->
            <q-input
              v-model.number="
                layoutSettingsInternal[currentLayoutOmic].limits[2]
              "
              type="number"
              step="0.1"
              style="max-width: 130px"
              class="mt-4 ml-2"
              label="minimal slope limit"
              filled
            />
            <q-input
              v-if="timeseriesModeToggle === 'slope'"
              v-model.number="
                layoutSettingsInternal[currentLayoutOmic].limits[3]
              "
              type="number"
              step="0.1"
              style="max-width: 130px"
              class="mt-2 mr-2"
              label="maximal slope limit"
              filled
            />
          </div>
          <div v-if="timeseriesModeToggle === 'slope'" class="row">
            <!-- Another set of inputs if timeseriesModeToggle is slope -->
            <q-input
              v-model.number="
                layoutSettingsInternal[currentLayoutOmic].limits[4]
              "
              type="number"
              step="0.1"
              style="max-width: 130px"
              class="mt-4 ml-2"
              label="minimal std. err limit"
              filled
            />
            <q-input
              v-if="timeseriesModeToggle === 'slope'"
              v-model.number="
                layoutSettingsInternal[currentLayoutOmic].limits[5]
              "
              type="number"
              step="0.1"
              style="max-width: 130px"
              class="mt-2 mr-2"
              label="maximal std. err limit"
              filled
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>
<script setup lang="ts">
import { computed, Ref, ref, watch } from 'vue';
import { LayoutSettings } from '@/core/generalTypes';
const emit = defineEmits(['update:layoutSettings']);

const props = defineProps<{
  timeseriesModeToggle: 'fc' | 'slope';
  layoutSettings: LayoutSettings;
  layoutOmics: string[];
}>();

const layoutSettingsInternal = computed({
  get: () => props.layoutSettings,
  set: (value) => emit('update:layoutSettings', value),
});
const allOmicLayoutAttributes = computed(() => {
  const prefix =
    currentLayoutOmic.value === 'nonSpecific'
      ? ''
      : currentLayoutOmic.value[0] + '_';
  return {
    common: [
      { text: 'Number of values', value: prefix + 'common_numVals' },
      { text: '% regulated', value: prefix + 'common_reg' },
      { text: '% unregulated', value: prefix + 'common_unReg' },
      { text: '% with measured value', value: prefix + 'common_measured' },
    ],
    timeseries: [
      {
        text: 'Mean Slope above limit',
        value: prefix + 'timeseries_meanSlopeAbove',
      },
      {
        text: 'Mean Slope below limit',
        value: prefix + 'timeseries_meanSlopeBelow',
      },
      {
        text: '% slopes below limit',
        value: prefix + 'timeseries_percentSlopeBelow',
      },
      {
        text: '% slopes above limit',
        value: prefix + 'timeseries_percentSlopeAbove',
      },
      {
        text: 'Mean standard error above limit',
        value: prefix + 'timeseries_meanSeAbove',
      },
      {
        text: 'Mean standard error below limit',
        value: prefix + 'timeseries_meanSeBelow',
      },
      {
        text: '% standard error above limit',
        value: prefix + 'timeseries_percentSeAbove',
      },
      {
        text: '% standard error below limit',
        value: prefix + 'timeseries_percentSeBelow',
      },
    ],
    foldChange: [
      { text: 'Mean expression above limit', value: prefix + 'fc_meanFcAbove' },
      { text: '% values above limit', value: prefix + 'fc_percentFcAbove' },
      {
        text: 'Mean expression below limit ',
        value: prefix + 'fc_meanFcBelow',
      },
      { text: '% values below limit ', value: prefix + 'fc_percentFcBelow' },
    ],
  };
});
const allNonOmicAttributes = [
  {
    text: '% values measured over all omics',
    value: 'nonOmic_percentMeasured',
  },
];

const currentLayoutOmic: Ref<
  'transcriptomics' | 'proteomics' | 'metabolomics' | 'nonSpecific' | ''
> = ref('');

const layoutAttributes = computed(() => {
  return currentLayoutOmic.value === 'nonSpecific'
    ? allNonOmicAttributes
    : [
        ...allOmicLayoutAttributes.value.common,
        ...allOmicLayoutAttributes.value[
          props.timeseriesModeToggle === 'fc' ? 'foldChange' : 'timeseries'
        ],
      ];
});
</script>
