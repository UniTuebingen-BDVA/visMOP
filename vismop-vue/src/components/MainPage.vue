<template>
  <v-container fluid>
    <v-row>
      <!-- Misc. Tabs -->
      <v-col cols="5" class="d-flex flex-column mb-2">
        <v-card>
          <v-tabs
            v-model="selectedTabMisc"
            background-color="blue lighten-2"
            dark
            center-active
            next-icon="mdi-arrow-right-bold-box-outline"
            prev-icon="mdi-arrow-left-bold-box-outline"
            show-arrows
          >
            <v-tabs-slider color="indigo darken-4"></v-tabs-slider>
            <v-tab href="#dataTable">Data Table</v-tab>
            <v-tab href="#selectedNodes">Selected Entities</v-tab>
            <v-tab href="#ppiGraph"> Protein-Protein Interaction </v-tab>
            <v-tab href="#pathwayCompare"> Pathway Compare </v-tab>
            <v-tabs-items :value="selectedTabMisc">
              <v-tab-item value="dataTable">
                <v-row>
                  <v-col cols="12" id="inputTable">
                    <keep-alive>
                      <div>
                        <v-card class="mb-5">
                          <v-card-title>
                            Data
                            <v-spacer></v-spacer>
                            <v-text-field
                              class="pt-0"
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
                                v-model="selectedTranscriptomics"
                                show-select
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
                                v-model="selectedProteomics"
                                show-select
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
                                v-model="selectedMetabolomics"
                                show-select
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
                    </keep-alive>
                  </v-col>
                </v-row>
              </v-tab-item>
              <v-tab-item value="selectedNodes">
                <v-row>
                  <v-col cols="12" id="selectedTable">
                    <keep-alive>
                       <interaction-graph-table> </interaction-graph-table>
                    </keep-alive>
                  </v-col>
                </v-row>
              </v-tab-item>
              <v-tab-item value="ppiGraph">
                <v-row>
                  <v-col cols="12">
                    <keep-alive>
                       <interaction-graph
                        contextID="interactionGraph"
                        > </interaction-graph>
                    </keep-alive>
                  </v-col>
                </v-row>
              </v-tab-item>
               <v-tab-item value="pathwayCompare">
                <v-row>
                  <v-col cols="12">
                    <keep-alive>
                      <pathway-compare>
                      </pathway-compare>
                    </keep-alive>
                  </v-col>
                </v-row>
              </v-tab-item>
            </v-tabs-items>
          </v-tabs>
        </v-card>
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
                    <network-graph-component
                      contextID="detailContext"
                      :transcriptomicsSelection="transcriptomicsSelectionData"
                      :proteomicsSelection="proteomicsSelectionData"
                      :metabolomicsSelection="metabolomicsSelectionData"
                      :isActive="activeOverview"
                    >
                    </network-graph-component>
                  </keep-alive>
            </v-tab-item>

            <v-tab-item value="detailNetwork">
              <p> placeholder </p>
            </v-tab-item>
          </v-tabs-items>
        </v-card>
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
import NetworkGraphComponent from './NetworkGraphComponent.vue'
import OverviewComponent from './OverviewComponent.vue'
import InteractionGraph from './InteractionGraph.vue'
import Vue from 'vue'
import InteractionGraphTable from './InteractionGraphTable.vue'
import PathwayCompare from './PathwayCompare.vue'

interface Data{
  tableSearch: string
  selectedTabTable: string
  selectedTabNetwork: string
  selectedTabMisc: string
  transcriptomicsSelectionData: { [key: string]: string }[],
  proteomicsSelectionData: { [key: string]: string }[],
  metabolomicsSelectionData: { [key: string]: string }[],
  pathwaySelection: string,
  selectedTranscriptomics: { [key: string]: string }[],
  selectedProteomics: { [key: string]: string }[],
  selectedMetabolomics: { [key: string]: string }[]
}

export default Vue.extend({
  components: { NetworkGraphComponent, OverviewComponent, InteractionGraph, InteractionGraphTable, PathwayCompare },
  // name of the component
  name: 'MainPage',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    selectedTabTable: 'transcriptomics',
    selectedTabNetwork: 'overviewNetwork',
    selectedTabMisc: 'dataTable',
    transcriptomicsSelectionData: [{}],
    proteomicsSelectionData: [{}],
    metabolomicsSelectionData: [{}],
    pathwaySelection: '',
    selectedTranscriptomics: [],
    selectedProteomics: [],
    selectedMetabolomics: []
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
  watch: {
    selectedTranscriptomics: function () {
      this.transcriptomicsSelectionData = (this.selectedTranscriptomics)
    },
    selectedProteomics: function () {
      console.log(this.selectedProteomics)
    },
    selectedMetabolomics: function () {
      console.log(this.selectedMetabolomics)
    }
  },

  // mounted () {},

  methods: {
    transcriptomicsSelection (val: { [key: string]: string }) {
      // this.transcriptomicsSelectionData = val
    },
    proteomicsSelection (val: { [key: string]: string }) {
      // this.proteomicsSelectionData = val
    },
    metabolomicsSelection (val: { [key: string]: string }) {
      // this.metabolomicsSelectionData = val
    }
  }
})
</script>
