<template>
  <q-page class="row no-wrap items-stretch max-height">
    <!-- Misc. Tabs -->
    <transition :name="transitionName">
      <div
        ref="miscTabs"
        :key="transitionName"
        :class="[
          minimizeMiscTabs ? '' : 'q-pl-md q-pr-md',
          'col transition-width q-py-md',
        ]"
        :style="miscTabsStyle"
      >
        <div class="row fit no-wrap">
          <q-card class="col-12 column no-wrap">
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
    <div class="sep-col">
      <div class="row fit no-wrap">
        <q-separator
          color="primary"
          class="resizeSeperator"
          inset
          vertical
          @mousedown="sliderDrag"
        />
        <q-btn
          class="collapse-btn-r absolute middle"
          color="primary"
          align="right"
          round
          :icon="'keyboard_arrow_right'"
          @click="minimizeMiscTabs ? returnFromMinimize() : setMaximized()"
          @mousedown="sliderDrag"
          ><q-tooltip class="bg-accent">Toggle Table</q-tooltip></q-btn
        >
        <q-btn
          class="collapse-btn-l absolute middle"
          color="primary"
          align="left"
          round
          icon="keyboard_arrow_left"
          @click="setMinimized()"
          @mousedown="sliderDrag"
          ><q-tooltip class="bg-accent">Toggle Table</q-tooltip></q-btn
        >
      </div>
    </div>

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
            class="highZ"
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
import { computed, onMounted, Ref, ref, watch } from 'vue';
import _ from 'lodash';

const mainStore = useMainStore();

// width of the miscTabs section in template

const transitionName = computed(() => {
  if (minimizeMiscTabs.value) {
    return 'slide-left';
  } else if (maximizeMiscTabs.value) {
    return 'slide-right';
  } else {
    return 'slide-center';
  }
});
const windowWidth = ref(0);
const miscTabs = ref<HTMLElement | null>(null);
const miscTabsWidth = ref(window.innerWidth * 0.4);
const centerPos = ref(window.innerWidth * 0.4);
const minimizeMiscTabs = ref(false);
const maximizeMiscTabs = ref(false);
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

// mounted function to get window.innerWidth
onMounted(() => {
  setWindowSize();
  window.addEventListener('resize', _.debounce(setWindowSize, 100));
});

const setWindowSize = () => {
  windowWidth.value = window.innerWidth;
};

const windowMaxWidthThreshold = computed(() => windowWidth.value * 0.75);
const windowMinWidthThreshold = computed(() => windowWidth.value * 0.25);

// style of the miscTabs section in template
const miscTabsStyle = computed(() => {
  return {
    '--centerPos': centerPos.value + 'px',
    'max-width': minimizeMiscTabs.value ? 0 : miscTabsWidth.value + 'px',
    width: minimizeMiscTabs.value ? 0 : miscTabsWidth.value + 'px',
    'min-width': minimizeMiscTabs.value ? 0 : miscTabsWidth.value + 'px',
  };
});

const returnFromMinimize = () => {
  if (minimizeMiscTabs.value) {
    miscTabsWidth.value = centerPos.value;
    minimizeMiscTabs.value = false;
  }
};

const setMaximized = () => {
  centerPos.value = miscTabsWidth.value;
  miscTabsWidth.value = windowMaxWidthThreshold.value;
  minimizeMiscTabs.value = false;
  maximizeMiscTabs.value = true;
};

const setMinimized = () => {
  centerPos.value = miscTabsWidth.value;
  miscTabsWidth.value = windowMinWidthThreshold.value;
  minimizeMiscTabs.value = true;
  maximizeMiscTabs.value = false;
};

//sliderDrag function, on mouse down, add event listeners to the document so that mousemove increases and decreases the width of the miscTabs section by increaseing and deacreasing the miscTabsWidth variable
const sliderDrag = (e: MouseEvent) => {
  const initialX = e.clientX;
  const initialWidth = miscTabsWidth.value;
  let currentWidth = miscTabsWidth.value;
  e.preventDefault();

  const drag = (e: MouseEvent) => {
    if (!minimizeMiscTabs.value) {
      currentWidth = initialWidth + (e.clientX - initialX);
      if (currentWidth < windowMinWidthThreshold.value) {
        setMinimized();
        stopDrag();
      } else if (currentWidth > windowMaxWidthThreshold.value) {
        miscTabsWidth.value = windowMaxWidthThreshold.value;
      } else {
        centerPos.value = currentWidth;
        miscTabsWidth.value = currentWidth;
        minimizeMiscTabs.value = false;
      }
    } else {
      if (e.clientX - initialX > 15) {
        miscTabsWidth.value = windowMinWidthThreshold.value;
        centerPos.value = windowMinWidthThreshold.value;
        minimizeMiscTabs.value = false;
        stopDrag();
      }
    }
  };
  const stopDrag = () => {
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
  };
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
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
.collapse-btn-r,
.collapse-btn-l {
  top: 45%;
  z-index: 1;
  width: 1rem !important;
  height: 2rem !important;
  min-width: 1rem !important;
  min-height: 1rem !important;
}
.collapse-btn-r {
  right: -1rem;
  border-radius: 0 1rem 1rem 0 !important;
}
.collapse-btn-l {
  left: -1rem;
  border-radius: 1rem 0 0 1rem !important;
}

.in-front {
  z-index: 10;
}

.slide-left-leave-active,
.slide-right-enter-active,
.slide-center-enter-active {
  transition: all 0.5s ease-in-out;
  -webkit-transition: all 0.5s ease-in-out;
  -moz-transition: all 0.5s ease-in-out;
}

.slide-left-leave-to,
.slide-center-enter-from {
  width: 0px !important;
  min-width: 0px !important;
  max-width: 0px !important;
}

.slide-center-enter-to {
  width: var(--centerPos) !important;
  min-width: var(--centerPos) !important;
  max-width: var(--centerPos) !important;
}

.slide-right-enter-from {
  width: var(--centerPos) !important;
  min-width: var(--centerPos) !important;
  max-width: var(--centerPos) !important;
}

.slide-right-enter-to {
  width: 75% !important;
  min-width: 75% !important;
  max-width: 75% !important;
}

.resizeSeperator {
  width: 0.4rem !important;
  cursor: col-resize;
}

.sep-col {
  position: relative;
  max-width: 0.4rem;
  flex: 10000 1 0%;
}
</style>
