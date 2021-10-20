<template>
  <v-container fluid>
    <v-row>
      <!-- Data Table-->
      <v-col cols="3" class="mb-2" id="inputTable">
        <div>
          <v-card>
            <v-card-title>
              Data
              <v-spacer></v-spacer>
              <v-text-field
                v-model="tableSearch"
                append-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
            </v-card-title>

            <v-tabs
              v-model="selectedTabTable"
              background-color="blue lighten-2"
              dark
              center-active
              next-icon="mdi-arrow-right-bold-box-outline"
              prev-icon="mdi-arrow-left-bold-box-outline"
              show-arrows
            >
              <v-tabs-slider color="indigo darken-4"></v-tabs-slider>
              <v-tab href="#transcriptomics">Transcriptomics</v-tab>
              <v-tab href="#proteome">Proteomics</v-tab>
              <v-tab href="#metabol">Metabolomics</v-tab>
            </v-tabs>

            <v-tabs-items :value="selectedTabTable">
              <v-tab-item value="transcriptomics">
                <v-data-table
                  dense
                  :headers="transcriptomicsTableHeaders"
                  :items="transcriptomicsTableData"
                  :items-per-page="5"
                  :search="tableSearch"
                  class="elevation-1"
                  id="transcriptomics"
                  @click:row="transcriptomicsSelection"
                ></v-data-table>
              </v-tab-item>

              <v-tab-item value="proteome">
                <v-data-table
                  dense
                  :headers="proteomicsTableHeaders"
                  :items="proteomicsTableData"
                  :items-per-page="5"
                  :search="tableSearch"
                  class="elevation-1"
                  id="proteomicsTable"
                  @click:row="proteomicsSelection"
                ></v-data-table>
              </v-tab-item>

              <v-tab-item value="metabol">
                <v-card-text>Extension for Metabolomics Data</v-card-text>
              </v-tab-item>
            </v-tabs-items>
          </v-card>
        </div>
      </v-col>
      <!-- Network -->
      <v-col cols="7" class="d-flex flex-column mb-2">
        <v-card>
          <v-tabs
            v-model="selectedTabNetwork"
            background-color="blue lighten-2"
            dark
            center-active
            next-icon="mdi-arrow-right-bold-box-outline"
            prev-icon="mdi-arrow-left-bold-box-outline"
            show-arrows
          >
            <v-tabs-slider color="indigo darken-4"></v-tabs-slider>
            <v-tab href="#overviewNetwork">Overview</v-tab>
            <v-tab href="#detailNetwork">Detail</v-tab>
          </v-tabs>

          <v-tabs-items :value="selectedTabNetwork">
            <v-tab-item value="overviewNetwork">
              <keep-alive>
                <overview-component
                  contextID="overviewContext"
                  :transcriptomicsSelection="transcriptomicsSelectionData"
                  :proteomicsSelection="proteomicsSelectionData"
                  :isActive="activeOverview"
                >
                </overview-component>
              </keep-alive>
            </v-tab-item>

            <v-tab-item value="detailNetwork">
              <keep-alive>
                <network-graph-component
                  contextID="detailContext"
                  :transcriptomicsSelection="transcriptomicsSelectionData"
                  :proteomicsSelection="proteomicsSelectionData"
                  :isActive="activeDetail"
                >
                </network-graph-component>
              </keep-alive>
            </v-tab-item>
          </v-tabs-items>
        </v-card>
      </v-col>
      <!-- Data Table-->
      <v-col cols="2" class="mb-2" id="selectedTable">
        <div>
          <v-card>
            <v-card-title>
              Selected Nodes
              <v-spacer></v-spacer>
              <v-text-field
                v-model="tableSearch"
                append-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
            </v-card-title>

            <v-data-table
              dense
              :headers="selectedNodesHeader"
              :items="clickedNodes"
              :items-per-page="5"
              :search="tableSearch"
              class="elevation-1"
              id="selectedNodes"
            ></v-data-table>
          </v-card>
        </div>
      </v-col>
    </v-row>
    <div class="text-center">
      <v-overlay :value="overlay">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
      </v-overlay>
    </div>
  </v-container>
</template>
<script>
import { mapState } from "vuex";
import NetworkGraphComponent from "./NetworkGraphComponent.vue";
import OverviewComponent from "./OverviewComponent.vue";
export default {
  components: { NetworkGraphComponent, OverviewComponent },
  // name of the component
  name: "MainPage",

  // data section of the Vue component. Access via this.<varName> .
  data: () => ({
    tableSearch: "",
    selectedTabTable: "transcriptomics",
    selectedTabNetwork: "detailNetwork",
    transcriptomicsSelectionData: "",
    proteomicsSelectionData: "",
    pathwaySelection: "",
    selectedNodesHeader: [{"value": "id", "text": "Kegg ID"},{"value": "name", "text": "Name"}]
  }),

  computed: {
    ...mapState({
      transcriptomicsTableHeaders: (state) => state.transcriptomicsTableHeaders,
      transcriptomicsTableData: (state) => state.transcriptomicsTableData,
      proteomicsTableHeaders: (state) => state.proteomicsTableHeaders,
      proteomicsTableData: (state) => state.proteomicsTableData,
      fcs: (state) => state.fcs,
      transcriptomicsSymbolDict: (state) => state.transcriptomicsSymbolDict,
      proteomicsSymbolDict: (state) => state.proteomicsSymbolDict,
      usedSymbolCols: (state) => state.usedSymbolCols,
      overlay: (state) => state.overlay,
      pathwayLayouting: (state) => state.pathwayLayouting,
      clickedNodes: (state) => state.clickedNodes,
    }),
    activeOverview: {
      get: function () {
        return this.selectedTabNetwork == "overviewNetwork";
      },
    },
    activeDetail: {
      get: function () {
        return this.selectedTabNetwork == "detailNetwork";
      },
    },
  },
  watch: {},

  mounted() {},

  methods: {
    transcriptomicsSelection(val) {
      this.transcriptomicsSelectionData = val;
    },
    proteomicsSelection(val) {
      this.proteomicsSelectionData = val;
    },
  },
};
</script>


