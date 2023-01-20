<template>
  <q-table
    :id="omicsType + 'Table'"
    v-model:pagination="pagination"
    v-model:selected="selectedEntriesComp"
    selection="multiple"
    style="max-height: 100%; max-width: 100%; flex: 1"
    dense
    virtual-scroll
    :rows-per-page-options="[0]"
    :columns="tableHeaders"
    :rows="tableData"
    row-key="_reserved_sort_id"
    :filter="searchQuery"
    class="q-space"
  >
    <!-- if interaction with rows is needed at a future point in time:
   @row-dblclick="rowClick"-->
    <template #body-cell="rowProps">
      <q-td :props="rowProps" :class="itemRowColor(rowProps)">
        {{ rowProps.value }}
      </q-td>
    </template>
  </q-table>
</template>
<script setup lang="ts">
import { useMainStore } from '@/stores';
import { computed, ref, watch } from 'vue';
const emit = defineEmits(['update:selectedEntries']);
const props = defineProps<{
  omicsType: 'transcriptomics' | 'proteomics' | 'metabolomics';
  selectedEntries: { [key: string]: string }[];
  searchQuery: string;
}>();

/* Local Variables*/
const mainStore = useMainStore();
const pagination = ref({ rowsPerPage: 0 });

/* Local Computed */
const selectedEntriesComp = computed({
  get: () => props.selectedEntries,
  set: (value) => emit('update:selectedEntries', value),
});

/* Store Variables */
const pathwayLayouting = computed(() => mainStore.pathwayLayouting);
const tableData = computed(() => mainStore.tableData[props.omicsType]);
const tableHeaders = computed(() => mainStore.tableHeaders[props.omicsType]);
const usedSymbolCols = computed(() => mainStore.usedSymbolCols);
const keggChebiTranslate = computed(() => mainStore.keggChebiTranslate);
const selectedPathway = computed(() => mainStore.selectedPathway);
const targetDatabase = computed(() => mainStore.targetDatabase);

/* watchers */

watch(selectedPathway, () => {
  tableData.value.forEach((row: { [key: string]: string | number }) => {
    let symbol = row[usedSymbolCols.value[props.omicsType]];
    const available = !(row._reserved_available === 0);
    if (available) {
      let includedInSelectedPathway = false;
      if (targetDatabase.value === 'reactome') {
        if (props.omicsType === 'metabolomics') {
          console.log('meta-test in selected');
          const keggChebiConvert =
            Object.keys(keggChebiTranslate.value).length > 0;
          if (keggChebiConvert) {
            let chebiIDs = keggChebiTranslate.value[symbol];
            if (chebiIDs) {
              chebiIDs.forEach((element) => {
                try {
                  includedInSelectedPathway = selectedPathway.value
                    ? pathwayLayouting.value.queryToPathwayDictionary[
                        element
                      ].includes(selectedPathway.value)
                    : false;
                } catch (error) {
                  //
                }
              });
            }
          } else {
            includedInSelectedPathway = selectedPathway.value
              ? pathwayLayouting.value.queryToPathwayDictionary[
                  symbol
                ].includes(selectedPathway.value)
              : false;
          }
        } else {
          includedInSelectedPathway = selectedPathway.value
            ? pathwayLayouting.value.queryToPathwayDictionary[symbol].includes(
                selectedPathway.value
              )
            : false;
        }
      }
      row._reserved_inSelected = includedInSelectedPathway ? 'Yes' : 'No';
    }
  });
  mainStore.setOmicsTableData(tableData.value, props.omicsType);
});

/* Local Functions */
const itemRowColor = (item: { row: { [key: string]: number | string } }) => {
  return item.row._reserved_available !== 0
    ? item.row._reserved_inSelected === 'Yes'
      ? 'rowstyle-inPathway'
      : 'rowstyle-available'
    : 'rowstyle-notAvailable';
};

/* rowclick function if it is to be reimplemented
const rowClick = (
  _event: Event,
  _row: { [key: string]: string },
  _index: number
) => {
  // 
};
*/
</script>
