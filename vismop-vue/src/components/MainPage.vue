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
                  <v-col cols="12" class="inputTable">
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
                                fixed-header
                                multi-sort
                                :headers="transcriptomicsTableHeaders"
                                :item-class="itemRowColor"
                                :items="transcriptomicsTableData"
                                :items-per-page="10"
                                :search="tableSearch"
                                class="elevation-1 scrollableTable"
                                id="transcriptomics"
                                @click:row="transcriptomicsSelection"
                              ></v-data-table>
                            </v-tab-item>

                            <v-tab-item value="proteome">
                              <v-data-table
                                dense
                                v-model="selectedProteomics"
                                show-select
                                fixed-header
                                multi-sort
                                :headers="proteomicsTableHeaders"
                                :item-class="itemRowColor"
                                :items="proteomicsTableData"
                                :items-per-page="10"
                                :search="tableSearch"
                                class="elevation-1 scrollableTable"
                                id="proteomicsTable"
                                @click:row="proteomicsSelection"
                              ></v-data-table>
                            </v-tab-item>

                            <v-tab-item value="metabol" >
                              <v-data-table
                                dense
                                v-model="selectedMetabolomics"
                                show-select
                                fixed-header
                                multi-sort
                                :headers="metabolomicsTableHeaders"
                                :item-class="itemRowColor"
                                :items="metabolomicsTableData"
                                :items-per-page="10"
                                :search="tableSearch"
                                class="elevation-1 scrollableTable"
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
                  <v-col cols="12">
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
                    <div v-if="targetDatabase === 'kegg'">
                      <keep-alive>
                          <kegg-overview-component
                          contextID="overviewContext"
                          :transcriptomicsSelection="transcriptomicsSelectionData"
                          :proteomicsSelection="proteomicsSelectionData"
                          :metabolomicsSelection="metabolomicsSelectionData"
                          :isActive="activeOverview"
                        >
                        </kegg-overview-component>
                      </keep-alive>
                    </div>
                    <div v-if="targetDatabase === 'reactome'">
                      <keep-alive>
                        <reactome-overview-component
                          contextID="overviewContext"
                          :transcriptomicsSelection="transcriptomicsSelectionData"
                          :proteomicsSelection="proteomicsSelectionData"
                          :metabolomicsSelection="metabolomicsSelectionData"
                          :isActive="activeOverview"
                        >
                        </reactome-overview-component>
                      </keep-alive>
                    </div>

                </v-col>
                </v-row>
                <div v-if="targetDatabase === 'kegg'">
                  <keep-alive>
                    <kegg-detail-component
                      contextID="detailContext"
                      :transcriptomicsSelection="transcriptomicsSelectionData"
                      :proteomicsSelection="proteomicsSelectionData"
                      :metabolomicsSelection="metabolomicsSelectionData"
                      :isActive="activeOverview"
                    >
                    </kegg-detail-component>
                  </keep-alive>
                </div>
                <div v-if="targetDatabase === 'reactome'">
                  <keep-alive>
                    <reactome-detail-component
                      contextID="reactomeDetail"
                      :transcriptomicsSelection="transcriptomicsSelectionData"
                      :proteomicsSelection="proteomicsSelectionData"
                      :metabolomicsSelection="metabolomicsSelectionData"
                      :isActive="activeOverview"
                    >
                    </reactome-detail-component>
                  </keep-alive>
                </div>
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
import KeggDetailComponent from './KeggDetailComponent.vue'
import ReactomeDetailComponent from './ReactomeDetailComponent.vue'
import KeggOverviewComponent from './KeggOverviewComponent.vue'
import InteractionGraph from './InteractionGraph.vue'
import Vue from 'vue'
import InteractionGraphTable from './InteractionGraphTable.vue'
import PathwayCompare from './PathwayCompare.vue'
import ReactomeOverviewComponent from './ReactomeOverviewComponent.vue'

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
  components: { KeggDetailComponent, ReactomeDetailComponent, KeggOverviewComponent, InteractionGraph, InteractionGraphTable, PathwayCompare, ReactomeOverviewComponent },
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
      targetDatabase: (state: any) => state.targetDatabase,
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
    pathwayLayouting: function () {
      let transcriptomicsAvailable = 0
      let transcriptomicsTotal = 0

      this.transcriptomicsTableData.forEach((row: {[key: string]: string | number }) => {
        transcriptomicsTotal += 1
        let symbol = row[this.usedSymbolCols.transcriptomics]
        if (this.targetDatabase === 'kegg') {
          symbol = this.transcriptomicsSymbolDict[symbol]
        }
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[symbol]
        row.available = (pathwaysContaining) ? pathwaysContaining.length : 'No'
        if (pathwaysContaining) transcriptomicsAvailable += 1
      })
      console.log('table headers', this.transcriptomicsTableHeaders)
      this.transcriptomicsTableHeaders.forEach((entry: {text: string, value: string}) => {
        if (entry.value === 'available') {
          entry.text = `available (${transcriptomicsAvailable} of ${transcriptomicsTotal})`
        }
      })
      this.$store.dispatch('setTranscriptomicsTableHeaders', this.transcriptomicsTableHeaders)
      this.$store.dispatch('setTranscriptomicsTableData', this.transcriptomicsTableData)

      let proteomiocsAvailable = 0
      let proteomicsTotal = 0

      this.proteomicsTableData.forEach((row: {[key: string]: string | number }) => {
        proteomicsTotal += 1
        let symbol = row[this.usedSymbolCols.proteomics]
        if (this.targetDatabase === 'kegg') {
          symbol = this.proteomicsSymbolDict[symbol]
        }
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[symbol]
        row.available = (pathwaysContaining) ? pathwaysContaining.length : 'No'
        if (pathwaysContaining) proteomiocsAvailable += 1
      })
      this.proteomicsTableHeaders.forEach((entry: {text: string, value: string}) => {
        if (entry.value === 'available') {
          entry.text = `available (${proteomiocsAvailable} of ${proteomicsTotal})`
        }
      })
      this.$store.dispatch('setProteomicsTableHeaders', this.proteomicsTableHeaders)
      this.$store.dispatch('setProteomicsTableData', this.proteomicsTableData)

      let metabolomicsAvailable = 0
      let metabolomicsTotal = 0

      this.metabolomicsTableData.forEach((row: {[key: string]: string | number }) => {
        metabolomicsTotal += 1
        const symbol = row[this.usedSymbolCols.metabolomics]
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[symbol]
        row.available = (pathwaysContaining) ? pathwaysContaining.length : 'No'
        if (pathwaysContaining) metabolomicsAvailable += 1
      })
      this.metabolomicsTableHeaders.forEach((entry: {text: string, value: string}) => {
        if (entry.value === 'available') {
          entry.text = `available (${metabolomicsAvailable} of ${metabolomicsTotal})`
        }
      })
      this.$store.dispatch('setMetabolomicsTableHeaders', this.metabolomicsTableHeaders)
      this.$store.dispatch('setMetabolomicsTableData', this.metabolomicsTableData)
    },
    selectedTranscriptomics: function () {
      this.transcriptomicsSelectionData = (this.selectedTranscriptomics)
    },
    selectedProteomics: function () {
      this.proteomicsSelectionData = (this.selectedProteomics)
    },
    selectedMetabolomics: function () {
      this.metabolomicsSelectionData = (this.selectedMetabolomics)
    },
    pathwayDropdown: function () {
      this.transcriptomicsTableData.forEach((row: {[key: string]: string | number }) => {
        let symbol = row[this.usedSymbolCols.transcriptomics]
        const available = !(row.available === 'No')
        if (available) {
          let includedInSelectedPathway = false
          if (this.targetDatabase === 'kegg') {
            symbol = this.transcriptomicsSymbolDict[symbol]
            includedInSelectedPathway = this.pathwayDropdown ? this.pathwayLayouting.pathwayNodeDictionaryClean[this.pathwayDropdown].includes(symbol) : false
          }
          if (this.targetDatabase === 'reactome') {
            includedInSelectedPathway = this.pathwayDropdown ? this.pathwayLayouting.pathwayNodeDictionary[symbol].includes(this.pathwayDropdown) : false
          }
          row.inSelected = (includedInSelectedPathway) ? 'Yes' : 'No'
        }
      })
      this.$store.dispatch('setTranscriptomicsTableData', this.transcriptomicsTableData)

      this.proteomicsTableData.forEach((row: {[key: string]: string | number }) => {
        let symbol = row[this.usedSymbolCols.proteomics]
        const available = !(row.available === 'No')
        if (available) {
          let includedInSelectedPathway = false
          if (this.targetDatabase === 'kegg') {
            symbol = this.proteomicsSymbolDict[symbol]
            includedInSelectedPathway = this.pathwayDropdown ? this.pathwayLayouting.pathwayNodeDictionaryClean[this.pathwayDropdown].includes(symbol) : false
          }
          if (this.targetDatabase === 'reactome') {
            includedInSelectedPathway = this.pathwayDropdown ? this.pathwayLayouting.pathwayNodeDictionary[symbol].includes(this.pathwayDropdown) : false
          }
          row.inSelected = (includedInSelectedPathway) ? 'Yes' : 'No'
        }
      })
      this.$store.dispatch('setProteomicsTableData', this.proteomicsTableData)

      this.metabolomicsTableData.forEach((row: {[key: string]: string | number }) => {
        const symbol = row[this.usedSymbolCols.metabolomics]
        const available = !(row.available === 'No')
        if (available) {
          let includedInSelectedPathway = false
          if (this.targetDatabase === 'kegg') {
            includedInSelectedPathway = this.pathwayDropdown ? this.pathwayLayouting.pathwayNodeDictionaryClean[this.pathwayDropdown].includes(symbol) : false
          }
          if (this.targetDatabase === 'reactome') {
            includedInSelectedPathway = this.pathwayDropdown ? this.pathwayLayouting.pathwayNodeDictionary[symbol].includes(this.pathwayDropdown) : false
          }
          row.inSelected = (includedInSelectedPathway) ? 'Yes' : 'No'
        }
      })
      this.$store.dispatch('setMetabolomicsTableData', this.metabolomicsTableData)
    }
  },

  // mounted () {},

  methods: {
    transcriptomicsSelection (val: { [key: string]: string }) {
      // this.transcriptomicsSelectionData = val
    },
    proteomicsSelection (val: { [key: string]: string }) {
      this.$store.dispatch('addClickedNodeFromTable', val)
    },
    metabolomicsSelection (val: { [key: string]: string }) {
      // this.metabolomicsSelectionData = val
    },
    itemRowColor (item: {[key:string]: string}) {
      return (item.available !== 'No') ? ((item.inSelected === 'Yes') ? 'rowstyle-inPathway' : 'rowstyle-available') : 'rowstyle-notAvailable'
    }
  }
})
</script>
