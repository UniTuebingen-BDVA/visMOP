<template>
  <q-page class="row no-wrap items-stretch max-height">
    <!-- Misc. Tabs -->
    <div
      ref="miscTabs"
      :class="[
        expandOverview ? 'col q-pa-0' : 'col-5 q-pl-sm q-pr-md',
        ' inFront transition-width q-py-md',
      ]"
    >
      <div class="row fit no-wrap">
        <q-card class="col-12 column no-wrap">
          <q-btn
            class="collapse-btn absolute middle"
            color="primary"
            align="right"
            round
            :icon="
              expandOverview ? 'keyboard_arrow_right' : 'keyboard_arrow_left'
            "
            @click="expandOverview = !expandOverview"
            ><q-tooltip class="bg-accent">Toggle Table</q-tooltip></q-btn
          >
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
            <!-- <q-tab name="selectedNodes" label="Selected Entities"></q-tab> -->
            <!-- <q-tab name="ppiGraph" label="Protein-Protein Interaction"></q-tab> -->
            <q-tab name="pathwayCompare" label="Pathway Compare"></q-tab>
          </q-tabs>
          <q-tab-panels v-model="selectedTabMisc" class="q-space">
            <q-tab-panel name="dataTable" class="column no-wrap q-pa-none">
              <q-input
                v-model="tableSearch"
                append-icon="fa-solid fa-magnifying-glass"
                label="Search"
                single-line
                hide-details
                filled
              ></q-input>
              <q-separator></q-separator>
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
                <q-tab name="proteomics" label="Proteomics"></q-tab>
                <q-tab name="metabolomics" label="Metabolomics"></q-tab>
              </q-tabs>
              <q-separator></q-separator>
              <q-tab-panels v-model="selectedTabTable" class="q-space">
                <q-tab-panel
                  name="transcriptomics"
                  class="column no-wrap q-pa-none"
                >
                  <omics-data-table-vue
                    v-model:selected-entries="selectedTranscriptomics"
                    omics-type="transcriptomics"
                    :search-query="tableSearch"
                  />
                </q-tab-panel>

                <q-tab-panel name="proteomics" class="column no-wrap q-pa-none">
                  <omics-data-table-vue
                    v-model:selected-entries="selectedProteomics"
                    omics-type="proteomics"
                    :search-query="tableSearch"
                  />
                </q-tab-panel>

                <q-tab-panel
                  name="metabolomics"
                  class="column no-wrap q-pa-none"
                >
                  <omics-data-table-vue
                    v-model:selected-entries="selectedMetabolomics"
                    omics-type="metabolomics"
                    :search-query="tableSearch"
                  />
                </q-tab-panel>
              </q-tab-panels>
            </q-tab-panel>
            <!-- <q-tab-panel name="selectedNodes">
              <interaction-graph-table> </interaction-graph-table>
            </q-tab-panel> -->
            <!-- <q-tab-panel name="ppiGraph">
              <keep-alive>
                <interaction-graph context-i-d="interactionGraph">
                </interaction-graph>
              </keep-alive>
            </q-tab-panel> -->
            <q-tab-panel name="pathwayCompare">
              <pathway-compare-vue> </pathway-compare-vue>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>
    <!-- Network -->
    <div
      :class="[
        expandOverview ? 'col-12' : 'col-7',
        'q-pl-sm q-pr-md q-py-md back transition-width',
      ]"
    >
      <div class="row fit">
        <keep-alive>
          <reactome-overview-component-vue
            context-i-d="overviewContext"
            :transcriptomics-selection="selectedTranscriptomics"
            :proteomics-selection="selectedProteomics"
            :metabolomics-selection="selectedMetabolomics"
            :is-active="activeOverview"
            :expand-overview="expandOverview"
          >
          </reactome-overview-component-vue>
        </keep-alive>
        <keep-alive>
          <reactome-detail-component-vue
            context-i-d="reactomeDetail"
            :transcriptomics-selection="selectedTranscriptomics"
            :proteomics-selection="selectedProteomics"
            :metabolomics-selection="selectedMetabolomics"
            :is-active="activeOverview"
          >
          </reactome-detail-component-vue>
        </keep-alive>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import ReactomeDetailComponentVue from './graphComponents/ReactomeDetailComponent.vue';
import PathwayCompareVue from './tabComponents/PathwayCompare.vue';
import ReactomeOverviewComponentVue from './graphComponents/ReactomeOverviewComponent.vue';
import OmicsDataTableVue from './tabComponents/OmicsDataTable.vue';
import { useMainStore } from '@/stores';
import { computed, KeepAlive, Ref, ref, watch } from 'vue';

const mainStore = useMainStore();

// width of the miscTabs section in template

const miscTabs = ref<HTMLElement | null>(null);
const expandOverview = ref(false);
const tableSearch = ref('');
const selectedTabTable = ref('transcriptomics');
const selectedTabNetwork = ref('overviewNetwork');
const selectedTabMisc = ref('dataTable');
const selectedTranscriptomics: Ref<{ [key: string]: string }[]> = ref([]);
const selectedProteomics: Ref<{ [key: string]: string }[]> = ref([]);
const selectedMetabolomics: Ref<{ [key: string]: string }[]> = ref([]);
const queryToPathwayDictionary = computed(
  () => mainStore.queryToPathwayDictionary
);

watch(queryToPathwayDictionary, () => {
  mainStore.setAvailables('transcriptomics');
  mainStore.setAvailables('proteomics');
  mainStore.setAvailables('metabolomics');
});

const activeOverview = computed(
  () => selectedTabNetwork.value === 'overviewNetwork'
);
</script>
<style>
.max-height {
  max-height: 100%;
  height: 100%;
}
.collapse-btn {
  top: 0;
  right: 0;
  transform: translateX(50%);
  z-index: -1;
}
.inFront {
  z-index: 10;
}
.back {
  z-index: 1;
}
.transition-width {
}
</style>
