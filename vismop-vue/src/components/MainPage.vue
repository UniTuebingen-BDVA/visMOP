<template>
  <q-page class="row no-wrap items-stretch max-height">
    <!-- Misc. Tabs -->
    <transition name="changeWidth" mode="out-in">
      <div
        ref="miscTabs"
        :key="minimizeMiscTabs ? 'minimized' : 'maximized'"
        :class="[
          minimizeMiscTabs ? '' : 'q-pl-md q-pr-md',
          'col inFront transition-width q-py-md',
        ]"
        :style="minimizeMiscTabs ? minimizedMiscTabsStyle : miscTabsStyle"
      >
        <div class="row fit no-wrap">
          <q-card class="col-12 column no-wrap">
            <q-btn
              class="collapse-btn absolute middle"
              color="primary"
              align="right"
              round
              :icon="
                minimizeMiscTabs
                  ? 'keyboard_arrow_right'
                  : 'keyboard_arrow_left'
              "
              @click="minimizeMiscTabs = !minimizeMiscTabs"
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

                  <q-tab-panel
                    name="proteomics"
                    class="column no-wrap q-pa-none"
                  >
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
    </transition>
    <q-separator
      color="primary"
      class="resizeSeperator"
      vertical
      @mousedown="sliderDrag"
    />
    <!-- Network -->
    <div class="col q-pl-md q-pr-md q-py-md back">
      <div class="row fit">
        <keep-alive>
          <reactome-overview-component-vue
            context-i-d="overviewContext"
            :transcriptomics-selection="selectedTranscriptomics"
            :proteomics-selection="selectedProteomics"
            :metabolomics-selection="selectedMetabolomics"
            :is-active="activeOverview"
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
import { computed, Ref, ref, watch } from 'vue';

const mainStore = useMainStore();

// width of the miscTabs section in template

const miscTabs = ref<HTMLElement | null>(null);
const miscTabsWidth = ref(window.innerWidth * 0.4);
const minimizeMiscTabs = ref(false);
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

// style of the miscTabs section in template
const miscTabsStyle = computed(() => {
  return {
    'max-width': miscTabsWidth.value + 'px',
    width: miscTabsWidth.value + 'px',
    'min-width': miscTabsWidth.value + 'px',
  };
});

const minimizedMiscTabsStyle = {
  'max-width': '0px',
  width: '0px',
  'min-width': '0px',
};

//sliderDrag function, on mouse down, add event listeners to the document so that mousemove increases and decreases the width of the miscTabs section by increaseing and deacreasing the miscTabsWidth variable
const sliderDrag = (e: MouseEvent) => {
  const initialX = e.clientX;
  const initialWidth = miscTabsWidth.value;
  let currentWidth = miscTabsWidth.value;

  const windowMinWidthThreshold = window.innerWidth * 0.25;
  const windowMaxWidthThreshold = window.innerWidth * 0.75;
  if (!minimizeMiscTabs.value) {
    const drag = (e: MouseEvent) => {
      currentWidth = initialWidth + (e.clientX - initialX);
      if (currentWidth < windowMinWidthThreshold) {
        minimizeMiscTabs.value = true;
        miscTabsWidth.value = windowMinWidthThreshold;
        stopDrag();
      } else if (currentWidth > windowMaxWidthThreshold) {
        miscTabsWidth.value = windowMaxWidthThreshold;
      } else {
        miscTabsWidth.value = currentWidth;
        minimizeMiscTabs.value = false;
      }
    };
    const stopDrag = () => {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    };
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
  }
};

//watcher for queryToPathwayDictionary, when the dictionary changes, set the availables of the mainStore

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
  top: 25px;
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
  transition: width 0.5s;
  -webkit-transition: width 0.5s;
  -moz-transition: width 0.5s;
}
.resizeSeperator {
  width: 5px !important;
  cursor: e-resize;
}
</style>
