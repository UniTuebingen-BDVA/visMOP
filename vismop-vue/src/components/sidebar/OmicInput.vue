<template>
  <q-expansion-item
    :label="`${omicsType} Data`"
    header-class="bg-primary text-white"
    expand-icon-class="text-white"
    group="omicsSelect"
    :icon="`svguse:/icons/${omicsType}.svg#${omicsType}|0 0 9 9`"
  >
    <q-card>
      <q-card-section>
        <q-file
          v-model="omicsFile"
          chips
          label=".xlsx File Input"
          @update:model-value="setSheetOptions"
        ></q-file>

        <q-separator />

        <q-select
          v-model="sheetSelection"
          :options="sheetOptions"
          label="Sheet Names"
        ></q-select>

        <q-separator />

        <q-select
          v-model="symbolColInternal"
          :options="dropdownHeaders"
          option-label="label"
          option-value="name"
          label="ID. Col."
        ></q-select>

        <q-separator />
        <div
          v-for="timepoint in [...Array(amtValueCols).keys()]"
          :key="timepoint"
        >
          <q-select
            v-model="valueColInternal[timepoint]"
            :options="dropdownHeaders"
            option-label="label"
            option-value="name"
            :label="'Value Col.' + timepoint"
          ></q-select>
        </div>
        <div class="row">
          <q-btn
            flat
            color="primary"
            icon="fa-solid fa-plus"
            @click="changeValueColAmt('+')"
          />
          <q-btn
            flat
            color="primary"
            icon="fa-solid fa-minus"
            @click="changeValueColAmt('-')"
          />
        </div>
        <q-separator />
        Input Filter:
        <div v-for="variable in slider" :key="variable.text" class="row">
          <q-badge color="primary">
            {{ variable.text }}
          </q-badge>
          <div class="col-2">
            <q-checkbox
              v-model="slidersInternal[variable.text].empties"
              :label="'Empties'"
            ></q-checkbox>
          </div>
          <div class="col-8">
            <q-range
              v-model="slidersInternal[variable.text].vals"
              :max="variable.max"
              :min="variable.min"
              :step="variable.step"
              label
              :color="
                slidersInternal[variable.text].inside
                  ? 'primary'
                  : 'graphFilterSlider'
              "
              :track-color="
                slidersInternal[variable.text].inside
                  ? 'graphFilterSlider'
                  : 'primary'
              "
            >
            </q-range>
          </div>
          <div class="col-2">
            <q-toggle
              v-model="slidersInternal[variable.text].inside"
              checked-icon="mdi-arrow-collapse-horizontal"
              color="primary"
              unchecked-icon="mdi-arrow-split-vertical"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { useMainStore } from '@/stores';
import { computed, ref, defineProps, watch, defineEmits } from 'vue';
import type { Ref } from 'vue';
import { useQuasar } from 'quasar';
import { ColType } from '@/core/generalTypes';
import * as Excel from 'exceljs';

const emit = defineEmits([
  'update:recievedOmicsData',
  'update:sliderValue',
  'update:symbolCol',
  'update:valueCol',
]);

const props = defineProps<{
  omicsType: 'transcriptomics' | 'proteomics' | 'metabolomics';
  tableHeaders: ColType[];
  tableData: {
    [x: string]: string | number;
  }[];
  symbolCol: ColType;
  valueCol: ColType[];
  recievedOmicsData: boolean;
  sliderVals: {
    [key: string]: {
      vals: { min: number; max: number };
      empties: boolean;
      inside: boolean;
    };
  };
}>();

const mainStore = useMainStore();

const $q = useQuasar();
const omicsFile: Ref<File | null> = ref(null);
const amtValueCols = ref(1);
const dropdownHeaders = computed(() => {
  return props.tableHeaders.filter(
    (elem) =>
      ![
        '_reserved_sort_id',
        '_reserved_inSelected',
        '_reserved_available',
      ].includes(elem.name)
  );
});

const symbolColInternal = computed({
  get: () => props.symbolCol,
  set: (value) => emit('update:symbolCol', value),
});

const valueColInternal = computed({
  get: () => props.valueCol,
  set: (value) => emit('update:valueCol', value),
});

const recievedOmicsDataInternal = computed({
  get: () => props.recievedOmicsData,
  set: (value) => emit('update:recievedOmicsData', value),
});

const slidersInternal = computed({
  get: () => props.sliderVals,
  set: (value) => emit('update:sliderValue', value),
});

const sheetSelection = ref('');
const sheetOptions: Ref<string[]> = ref([]);

const setSheetOptions = () => {
  if (omicsFile.value) {
    const reader = new FileReader();

    reader.onload = () => {
      const data = reader.result as ArrayBuffer;
      const workbook = new Excel.Workbook();
      workbook.xlsx.load(data).then(
        (workbookThen) => {
          const sheetNames = workbookThen.worksheets.map((sheet) => sheet.name);
          sheetOptions.value = sheetNames;
        },
        (error) => {
          console.log(error);
        }
      );
    };

    reader.readAsArrayBuffer(omicsFile.value);
  }
};

const slider = computed(() => {
  const outObj: {
    [key: string]: { min: number; max: number; step: number; text: string };
  } = {};
  const typedArrayData = props.tableData;
  const typedArrayHeader = props.tableHeaders;
  typedArrayHeader.forEach((element) => {
    if (
      element.field !== '_reserved_available' &&
      element.field !== '_reserved_sort_id' &&
      element.field !== '_reserved_inSelected' &&
      typeof element.field === 'string'
    ) {
      const valArr = typedArrayData.map((elem) =>
        typeof element.field === 'string' ? elem[element.field] : ''
      );
      const numArr: number[] = [];
      let amtNum = 0;
      let amtNonNum = 0;
      let _empties = 0;
      valArr.forEach((val) => {
        if (typeof val === 'number') {
          amtNum += 1;
          numArr.push(val);
        } else if (val === 'None') {
          _empties += 1;
        } else amtNonNum += 1;
      });
      if (amtNonNum / (amtNum + amtNonNum) <= 0.25) {
        const min = Math.floor(Math.min(...numArr) * 10) / 10;
        const max = Math.ceil(Math.max(...numArr) * 10) / 10;
        outObj[element.field] = {
          min: min,
          max: max,
          step: (Math.abs(min) + Math.abs(max)) / 100,
          text: element.field,
        };
      }
    }
  });
  return outObj;
});

watch(slider, () => {
  Object.assign(slidersInternal.value, {});
  for (const key in slider.value) {
    if (Object.prototype.hasOwnProperty.call(slider.value, key)) {
      const element = slider.value[key];
      if (!Object.keys(slidersInternal.value).includes(element.text)) {
        slidersInternal.value[element.text] = {
          vals: { min: element.min, max: element.max },
          empties: true,
          inside: true,
        };
      }
    }
  }
});

watch(sheetSelection, () => {
  fetchOmicsTable(omicsFile.value);
});

const changeValueColAmt = (type: '+' | '-') => {
  if (type === '+') {
    valueColInternal.value = [
      ...valueColInternal.value,
      {
        field: '',
        label: '',
        name: '',
        align: undefined,
      },
    ];
    amtValueCols.value += 1;
  } else if (type === '-' && amtValueCols.value > 1) {
    amtValueCols.value -= 1;
    valueColInternal.value.pop();
  }
};

const fetchOmicsTable = (fileInput: File | null) => {
  mainStore.setOmicsTableHeaders([], props.omicsType);
  mainStore.setOmicsTableData([], props.omicsType);
  slidersInternal.value = {};
  if (fileInput !== null && sheetSelection.value) {
    $q.loading.show();
    const formData = new FormData();
    formData.append('dataTable', fileInput);
    formData.append('sheetName', sheetSelection.value);
    fetch(`/${props.omicsType}_table`, {
      method: 'POST',
      headers: {},
      body: formData,
    })
      .then((response) => response.json())
      .then((responseContent) => {
        if (responseContent.exitState == 1) {
          alert(responseContent.errorMsg);
          return 1;
        }
        if (responseContent.exitState == 0) {
          mainStore.setOmicsTableHeaders(
            responseContent.header,
            props.omicsType
          );
          mainStore.setOmicsTableData(responseContent.entries, props.omicsType);
          recievedOmicsDataInternal.value = true;
        }
      })
      .then(() => {
        symbolColInternal.value = dropdownHeaders.value[0];
        valueColInternal.value = [dropdownHeaders.value[1]];
        $q.loading.hide();
      });
  } else {
    // more errorhandling?
    recievedOmicsDataInternal.value = false;
  }
};

const sheetRules = ref([
  (value: string) => {
    const pattern = /^([0-9]*)$/;
    return pattern.test(value) || 'Enter a number';
  },
]);
</script>
<style lang="css">
.text-graphFilterSlider {
  color: rgba(187, 187, 187) !important;
}
</style>
