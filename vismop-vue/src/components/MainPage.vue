<template>
  <v-container fluid>
    <v-row>
      <!-- Data Table-->
      <v-col cols="3" class="mb-2" id="inputTable">
        <div>
          <v-card class="mb-5">
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
                <v-data-table
                  dense
                  :headers="metabolomicsTableHeaders"
                  :items="metabolomicsTableData"
                  :items-per-page="5"
                  :search="tableSearch"
                  class="elevation-1"
                  id="metabolomicsTable"
                  @click:row="metabolomicsSelection"
                ></v-data-table>
              </v-tab-item>
            </v-tabs-items>
          </v-card>
        </div>
        <interaction-graph
        contextID="interactionGraph"
        > </interaction-graph>
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
              <v-row>
                <v-col cols="12">
                  <keep-alive>
                    <overview-component
                      contextID="overviewContext"
                      :transcriptomicsSelection="transcriptomicsSelectionData"
                      :proteomicsSelection="proteomicsSelectionData"
                      :metabolomicsSelection="metabolomicsSelectionData"
                      :isActive="activeOverview"
                    >
                    </overview-component>
                  </keep-alive>
                </v-col>
                </v-row>
                  <keep-alive>
                    <!-- <network-graph-component
                      contextID="detailContext"
                      :transcriptomicsSelection="transcriptomicsSelectionData"
                      :proteomicsSelection="proteomicsSelectionData"
                      :metabolomicsSelection="metabolomicsSelectionData"
                      :isActive="activeOverview"
                    >
                    </network-graph-component> -->
                  </keep-alive>
            </v-tab-item>

            <v-tab-item value="detailNetwork">
              <p> placeholder </p>
            </v-tab-item>
          </v-tabs-items>
        </v-card>
      </v-col>
      <!-- Data Table-->
      <v-col cols="2" class="mb-2" id="selectedTable">
        <interaction-graph-table> </interaction-graph-table>
      </v-col>
    </v-row>
    <div class="text-center">
      <v-overlay :value="overlay">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
      </v-overlay>
    </div>
  </v-container>
</template>
<script lang="ts">
import { mapState } from 'vuex'
// import NetworkGraphComponent from './NetworkGraphComponent.vue'
import OverviewComponent from './OverviewComponent.vue'
import InteractionGraph from './InteractionGraph.vue'
import Vue from 'vue'
import InteractionGraphTable from './InteractionGraphTable.vue'

export default Vue.extend({
  components: { OverviewComponent, InteractionGraph, InteractionGraphTable }, // removed NetworkGraphComponent,
  // name of the component
  name: 'MainPage',

  // data section of the Vue component. Access via this.<varName> .
  data: () => ({
    tableSearch: '',
    selectedTabTable: 'transcriptomics',
    selectedTabNetwork: 'overviewNetwork',
    transcriptomicsSelectionData: {},
    proteomicsSelectionData: {},
    metabolomicsSelectionData: {},
    pathwaySelection: ''
  }),

  computed: {
    ...mapState({
      transcriptomicsTableHeaders: (state: any) => state.transcriptomicsTableHeaders,
      transcriptomicsTableData: (state: any) => state.transcriptomicsTableData,
      proteomicsTableHeaders: (state: any) => state.proteomicsTableHeaders,
      proteomicsTableData: (state: any) => state.proteomicsTableData,
      metabolomicsTableHeaders: (state: any) => state.metabolomicsTableHeaders,
      metabolomicsTableData: (state: any) => state.metabolomicsTableData,
      fcs: (state: any) => state.fcs,
      transcriptomicsSymbolDict: (state: any) => state.transcriptomicsSymbolDict,
      proteomicsSymbolDict: (state: any) => state.proteomicsSymbolDict,
      usedSymbolCols: (state: any) => state.usedSymbolCols,
      overlay: (state: any) => state.overlay,
      pathwayLayouting: (state: any) => state.pathwayLayouting,
      pathwayDropdown: (state: any) => state.pathwayDropdown
    }),
    activeOverview: {
      get: function () {
        return this.selectedTabNetwork === 'overviewNetwork'
      }
    },
    activeDetail: {
      get: function () {
        return this.selectedTabNetwork === 'detailNetwork'
      }
    }
  },
  // watch: {},

  // mounted () {},

  methods: {
    transcriptomicsSelection (val: string) {
      this.transcriptomicsSelectionData = val
    },
    proteomicsSelection (val: string) {
      this.proteomicsSelectionData = val
    },
    metabolomicsSelection (val: string) {
      this.metabolomicsSelectionData = val
    }
  }
})
</script>
