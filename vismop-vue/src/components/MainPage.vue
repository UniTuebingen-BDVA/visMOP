<template>
  <div>
    <div class="row">
      <!-- Misc. Tabs -->
      <div class="col-5 q-pa-md">
        <div class="q-gutter-y-md">
          <q-tabs
            v-model="selectedTabMisc"
            dense
            class="label-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify"
            narrow-indicator
          >
            <q-tab name="dataTable" label="Data Table"></q-tab>
            <q-tab name="selectedNodes" label="Selected Entities"></q-tab>
            <q-tab name="ppiGraph" label="Protein-Protein Interaction"></q-tab>
            <q-tab name="pathwayCompare" label="Pathway Compare"></q-tab>
          </q-tabs>
          <q-tab-panels v-model="selectedTabMisc">
            <q-tab-panel name="dataTable">
              <q-input
                v-model="tableSearch"
                class="pt-0"
                append-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
              ></q-input>

              <q-tabs
                v-model="selectedTabTable"
                dense
                class="label-grey"
                active-color="primary"
                indicator-color="primary"
                align="justify"
                narrow-indicator
              >
                <q-tab name="transcriptomics" label="Transcriptomics"></q-tab>
                <q-tab name="proteome" label="Proteomics"></q-tab>
                <q-tab name="metabol" label="Metabolomics"></q-tab>
              </q-tabs>

              <q-tab-panels v-model="selectedTabTable">
                <q-tab-panel name="transcriptomics">
                  <q-table
                    id="transcriptomics"
                    v-model:pagination="pagination"
                    v-model:selected="selectedTranscriptomics"
                    selection="multiple"
                    dense
                    virtual-scroll
                    style="height: 63vh"
                    :rows-per-page-options="[0]"
                    :columns="transcriptomicsTableHeaders"
                    :rows="transcriptomicsTableData"
                    row-key="_reserved_sort_id"
                    :filter="tableSearch"
                    @row-dblclick="transcriptomicsSelection"
                  >
                    <template #body-cell="props">
                      <q-td :props="props" :class="itemRowColor(props)">
                        {{ props.value }}
                      </q-td>
                    </template>
                  </q-table>
                </q-tab-panel>

                <q-tab-panel name="proteome">
                  <q-table
                    id="proteomicsTable"
                    v-model:pagination="pagination"
                    v-model:selected="selectedProteomics"
                    selection="multiple"
                    dense
                    virtual-scroll
                    style="height: 63vh"
                    :rows-per-page-options="[0]"
                    :columns="proteomicsTableHeaders"
                    :rows="proteomicsTableData"
                    row-key="_reserved_sort_id"
                    :filter="tableSearch"
                    @row-dblclick="proteomicsSelection"
                  >
                    <template #body-cell="props">
                      <q-td :props="props" :class="itemRowColor(props)">
                        {{ props.value }}
                      </q-td>
                    </template>
                  </q-table>
                </q-tab-panel>

                <q-tab-panel name="metabol">
                  <q-table
                    id="metabolomicsTable"
                    v-model:pagination="pagination"
                    v-model:selected="selectedMetabolomics"
                    selection="multiple"
                    dense
                    virtual-scroll
                    style="height: 63vh"
                    :rows-per-page-options="[0]"
                    :columns="metabolomicsTableHeaders"
                    :rows="metabolomicsTableData"
                    row-key="_reserved_sort_id"
                    :filter="tableSearch"
                    @row-dblclick="metabolomicsSelection"
                  >
                    <template #body-cell="props">
                      <q-td :props="props" :class="itemRowColor(props)">
                        {{ props.value }}
                      </q-td>
                    </template>
                  </q-table>
                </q-tab-panel>
              </q-tab-panels>
            </q-tab-panel>
            <q-tab-panel name="selectedNodes">
              <interaction-graph-table> </interaction-graph-table>
            </q-tab-panel>
            <q-tab-panel name="ppiGraph">
              <interaction-graph context-i-d="interactionGraph">
              </interaction-graph>
            </q-tab-panel>
            <q-tab-panel name="pathwayCompare">
              <pathway-compare> </pathway-compare>
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </div>
      <!-- Network -->
      <div class="col-7 q-pa-md">
        <q-card>
          <div class="row">
            <div class="col-12">
              <div v-if="targetDatabase === 'kegg'">
                <keep-alive>
                  <kegg-overview-component
                    context-i-d="overviewContext"
                    :transcriptomics-selection="selectedTranscriptomics"
                    :proteomics-selection="selectedProteomics"
                    :metabolomics-selection="selectedMetabolomics"
                    :is-active="activeOverview"
                  >
                  </kegg-overview-component>
                </keep-alive>
              </div>
              <div v-if="targetDatabase === 'reactome'">
                <keep-alive>
                  <reactome-overview-component
                    context-i-d="overviewContext"
                    :transcriptomics-selection="selectedTranscriptomics"
                    :proteomics-selection="selectedProteomics"
                    :metabolomics-selection="selectedMetabolomics"
                    :is-active="activeOverview"
                  >
                  </reactome-overview-component>
                </keep-alive>
              </div>
            </div>

            <div v-if="targetDatabase === 'kegg'">
              <keep-alive>
                <kegg-detail-component
                  context-i-d="detailcontext"
                  :transcriptomics-selection="selectedTranscriptomics"
                  :proteomics-selection="selectedProteomics"
                  :metabolomics-selection="selectedMetabolomics"
                  :is-active="activeOverview"
                >
                </kegg-detail-component>
              </keep-alive>
            </div>
            <div v-if="targetDatabase === 'reactome'">
              <keep-alive>
                <reactome-detail-component
                  context-i-d="reactomeDetail"
                  :transcriptomics-selection="selectedTranscriptomics"
                  :proteomics-selection="selectedProteomics"
                  :metabolomics-selection="selectedMetabolomics"
                  :is-active="activeOverview"
                >
                </reactome-detail-component>
              </keep-alive>
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import KeggDetailComponent from './KeggDetailComponent.vue';
import ReactomeDetailComponent from './ReactomeDetailComponent.vue';
import KeggOverviewComponent from './KeggOverviewComponent.vue';
import InteractionGraph from './InteractionGraph.vue';
import InteractionGraphTable from './InteractionGraphTable.vue';
import PathwayCompare from './PathwayCompare.vue';
import ReactomeOverviewComponent from './ReactomeOverviewComponent.vue';
import { useMainStore } from '@/stores';
import { computed, Ref, ref, watch } from 'vue';
import { QTable } from 'quasar';
import { ColType } from '@/core/generalTypes';

const mainStore = useMainStore();

const tableSearch = ref('');
const selectedTabTable = ref('transcriptomics');
const selectedTabNetwork = ref('overviewNetwork');
const selectedTabMisc = ref('dataTable');
const selectedTranscriptomics: Ref<{ [key: string]: string }[]> = ref([]);
const selectedProteomics: Ref<{ [key: string]: string }[]> = ref([]);
const selectedMetabolomics: Ref<{ [key: string]: string }[]> = ref([]);
const pagination = ref({ rowsPerPage: 0 });

const targetDatabase = computed(() => mainStore.targetDatabase);
const transcriptomicsTableHeaders = computed(
  () => mainStore.transcriptomicsTableHeaders
);
const transcriptomicsTableData = computed(
  () => mainStore.transcriptomicsTableData
);
const proteomicsTableHeaders = computed(() => mainStore.proteomicsTableHeaders);
const proteomicsTableData = computed(() => mainStore.proteomicsTableData);
const metabolomicsTableHeaders = computed(
  () => mainStore.metabolomicsTableHeaders
);
const metabolomicsTableData = computed(() => mainStore.metabolomicsTableData);
const transcriptomicsSymbolDict = computed(
  () => mainStore.transcriptomicsSymbolDict
);
const proteomicsSymbolDict = computed(() => mainStore.proteomicsSymbolDict);
const usedSymbolCols = computed(() => mainStore.usedSymbolCols);
const pathwayLayouting = computed(() => mainStore.pathwayLayouting);
const pathwayDropdown = computed(() => mainStore.pathwayDropdown);

const activeOverview = computed(
  () => selectedTabNetwork.value === 'overviewNetwork'
);

watch(pathwayLayouting, () => {
  const mainStore = useMainStore();
  let transcriptomicsAvailable = 0;
  let transcriptomicsTotal = 0;

  transcriptomicsTableData.value.forEach(
    (row: { [key: string]: string | number }) => {
      transcriptomicsTotal += 1;
      let symbol = row[usedSymbolCols.value.transcriptomics];
      if (targetDatabase.value === 'kegg') {
        symbol = transcriptomicsSymbolDict.value[symbol];
      }
      const pathwaysContaining =
        pathwayLayouting.value.nodePathwayDictionary[symbol];
      row._reserved_available = pathwaysContaining
        ? pathwaysContaining.length
        : 'No';
      if (pathwaysContaining) transcriptomicsAvailable += 1;
    }
  );
  console.log('table headers', transcriptomicsTableHeaders);
  transcriptomicsTableHeaders.value.forEach((entry: ColType) => {
    if (entry?.name === '_reserved_available') {
      entry.label = `available (${transcriptomicsAvailable} of ${transcriptomicsTotal})`;
    }
  });
  mainStore.setTranscriptomicsTableHeaders(transcriptomicsTableHeaders.value);
  mainStore.setTranscriptomicsTableData(transcriptomicsTableData.value);

  let proteomiocsAvailable = 0;
  let proteomicsTotal = 0;

  proteomicsTableData.value.forEach(
    (row: { [key: string]: string | number }) => {
      proteomicsTotal += 1;
      let symbol = row[usedSymbolCols.value.proteomics];
      if (targetDatabase.value === 'kegg') {
        symbol = proteomicsSymbolDict.value[symbol];
      }
      const pathwaysContaining =
        pathwayLayouting.value.nodePathwayDictionary[symbol];
      row._reserved_available = pathwaysContaining
        ? pathwaysContaining.length
        : 'No';
      if (pathwaysContaining) proteomiocsAvailable += 1;
    }
  );
  proteomicsTableHeaders.value.forEach(
    (entry: { label: string; name: string }) => {
      if (entry.name === '_reserved_available') {
        entry.label = `available (${proteomiocsAvailable} of ${proteomicsTotal})`;
      }
    }
  );
  mainStore.setProteomicsTableHeaders(proteomicsTableHeaders.value);
  mainStore.setProteomicsTableData(proteomicsTableData.value);

  let metabolomicsAvailable = 0;
  let metabolomicsTotal = 0;

  metabolomicsTableData.value.forEach(
    (row: { [key: string]: string | number }) => {
      metabolomicsTotal += 1;
      const symbol = row[usedSymbolCols.value.metabolomics];
      const pathwaysContaining =
        pathwayLayouting.value.nodePathwayDictionary[symbol];
      row._reserved_available = pathwaysContaining
        ? pathwaysContaining.length
        : 'No';
      if (pathwaysContaining) metabolomicsAvailable += 1;
    }
  );
  metabolomicsTableHeaders.value.forEach(
    (entry: { label: string; name: string }) => {
      if (entry.name === '_reserved_available') {
        entry.label = `available (${metabolomicsAvailable} of ${metabolomicsTotal})`;
      }
    }
  );
  mainStore.setMetabolomicsTableHeaders(metabolomicsTableHeaders.value);
  mainStore.setMetabolomicsTableData(metabolomicsTableData.value);
});
watch(pathwayDropdown, () => {
  const mainStore = useMainStore();
  transcriptomicsTableData.value.forEach(
    (row: { [key: string]: string | number }) => {
      let symbol = row[usedSymbolCols.value.transcriptomics];
      const available = !(row._reserved_available === 'No');
      if (available) {
        let includedInSelectedPathway = false;
        if (targetDatabase.value === 'kegg') {
          symbol = transcriptomicsSymbolDict.value[symbol];
          includedInSelectedPathway = pathwayDropdown.value
            ? pathwayLayouting.value.pathwayNodeDictionaryClean[
                pathwayDropdown.value.value
              ].includes(symbol)
            : false;
        }
        if (targetDatabase.value === 'reactome') {
          includedInSelectedPathway = pathwayDropdown.value
            ? pathwayLayouting.value.pathwayNodeDictionary[symbol].includes(
                pathwayDropdown.value.value
              )
            : false;
        }
        row._reserved_inSelected = includedInSelectedPathway ? 'Yes' : 'No';
      }
    }
  );
  mainStore.setTranscriptomicsTableData(transcriptomicsTableData.value);

  proteomicsTableData.value.forEach(
    (row: { [key: string]: string | number }) => {
      let symbol = row[usedSymbolCols.value.proteomics];
      const available = !(row._reserved_available === 'No');
      if (available) {
        let includedInSelectedPathway = false;
        if (targetDatabase.value === 'kegg') {
          symbol = proteomicsSymbolDict.value[symbol];
          includedInSelectedPathway = pathwayDropdown.value
            ? pathwayLayouting.value.pathwayNodeDictionaryClean[
                pathwayDropdown.value.value
              ].includes(symbol)
            : false;
        }
        if (targetDatabase.value === 'reactome') {
          includedInSelectedPathway = pathwayDropdown.value
            ? pathwayLayouting.value.pathwayNodeDictionary[symbol].includes(
                pathwayDropdown.value.value
              )
            : false;
        }
        row._reserved_inSelected = includedInSelectedPathway ? 'Yes' : 'No';
      }
    }
  );
  mainStore.setProteomicsTableData(proteomicsTableData.value);

  metabolomicsTableData.value.forEach(
    (row: { [key: string]: string | number }) => {
      const symbol = row[usedSymbolCols.value.metabolomics];
      const available = !(row._reserved_available === 'No');
      if (available) {
        let includedInSelectedPathway = false;
        if (targetDatabase.value === 'kegg') {
          includedInSelectedPathway = pathwayDropdown.value
            ? pathwayLayouting.value.pathwayNodeDictionaryClean[
                pathwayDropdown.value.value
              ].includes(symbol)
            : false;
        }
        if (targetDatabase.value === 'reactome') {
          includedInSelectedPathway = pathwayDropdown.value
            ? pathwayLayouting.value.pathwayNodeDictionary[symbol].includes(
                pathwayDropdown.value.value
              )
            : false;
        }
        row._reserved_inSelected = includedInSelectedPathway ? 'Yes' : 'No';
      }
    }
  );
  mainStore.setMetabolomicsTableData(metabolomicsTableData.value);
});

const transcriptomicsSelection = (
  _event: Event,
  _row: { [key: string]: string },
  _index: number
) => {
  // this.transcriptomicsSelectionData = val
};
const proteomicsSelection = (
  _event: Event,
  row: { [key: string]: string },
  _index: number
) => {
  mainStore.addClickedNodeFromTable(row);
};
const metabolomicsSelection = (
  _event: Event,
  _row: { [key: string]: string },
  _index: number
) => {
  // this.metabolomicsSelectionData = val
};
const itemRowColor = (item: { row: { [key: string]: string } }) => {
  return item.row._reserved_available !== 'No'
    ? item.row._reserved_inSelected === 'Yes'
      ? 'rowstyle-inPathway'
      : 'rowstyle-available'
    : 'rowstyle-notAvailable';
};
</script>
