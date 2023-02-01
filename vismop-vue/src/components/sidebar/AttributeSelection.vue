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
          <div
            v-if="currentLayoutOmic != 'not related to specific omic'"
            class="row"
          >
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
const allOmicLayoutAttributes = {
  common: [
    { text: 'Number of values', value: 'common_numVals' },
    { text: '% regulated', value: 'common_reg' },
    { text: '% unregulated', value: 'common_unReg' },
    { text: '% with measured value', value: 'common_measured' },
  ],
  timeseries: [
    { text: 'Mean Slope above limit', value: 'timeseries_meanSlopeAbove' },
    { text: 'Mean Slope below limit', value: 'timeseries_meanSlopeBelow' },
    { text: '% slopes below limit', value: 'timeseries_percentSlopeBelow' },
    { text: '% slopes above limit', value: 'timeseries_percentSlopeAbove' },
    {
      text: 'Mean standard error above limit',
      value: 'timeseries_meanSeAbove',
    },
    {
      text: 'Mean standard error below limit',
      value: 'timeseries_meanSeBelow',
    },
    {
      text: '% standard error above limit',
      value: 'timeseries_percentSeAbove',
    },
    {
      text: '% standard error below limit',
      value: 'timeseries_percentSeBelow',
    },
  ],
  foldChange: [
    { text: 'Mean expression above limit', value: 'fc_meanFcAbove' },
    { text: '% values above limit', value: 'fc_percentFcAbove' },
    { text: 'Mean expression below limit ', value: 'fc_meanFcBelow' },
    { text: '% values below limit ', value: 'fc_percentFcBelow' },
  ],
};
const allNonOmicAttributes = [
  {
    text: '% values measured over all omics',
    value: 'nonOmic_percentMeasured',
  },
];

const currentLayoutOmic: Ref<
  | 'transcriptomics'
  | 'proteomics'
  | 'metabolomics'
  | 'not related to specific omic'
  | ''
> = ref('');

const layoutAttributes = computed(() => {
  return currentLayoutOmic.value === 'not related to specific omic'
    ? allNonOmicAttributes
    : [
        ...allOmicLayoutAttributes.common,
        ...allOmicLayoutAttributes[
          props.timeseriesModeToggle === 'fc' ? 'foldChange' : 'timeseries'
        ],
      ];
});
</script>
