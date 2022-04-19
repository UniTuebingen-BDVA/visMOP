<template>
  <div>
    <div class="row">
      <!-- Misc. Tabs -->
      <div class="col-5 q-pa-md">
        <div class="q-gutter-y-md" style="max-width: 600px">
        <q-card>
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
                <q-card>
                  <div class="label-h6" id="#lookup">
                    Data
                  </div>
                      <q-separator></q-separator>
                      <q-input
                        class="pt-0"
                        v-model="tableSearch"
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
                          v-model="selectedTranscriptomics"
                          :columns="transcriptomicsTableHeaders"
                          :rows="transcriptomicsTableData"
                          row-key="name"
                          :filter="tableSearch"
                          class="elevation-1 scrollableTable"
                          id="transcriptomics"
                          @click:row="transcriptomicsSelection"
                        ></q-table>
                      </q-tab-panel>

                      <q-tab-panel name="proteome">
                        <q-table
                          v-model="selectedProteomics"
                          :columns="proteomicsTableHeaders"
                          :rows="proteomicsTableData"
                          row-key="name"
                          :filter="tableSearch"
                          class="elevation-1 scrollableTable"
                          id="proteomicsTable"
                          @click:row="proteomicsSelection"
                        ></q-table>
                      </q-tab-panel>

                      <q-tab-panel name="metabol" >
                        <q-table
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
                        ></q-table>
                      </q-tab-panel>
                    </q-tab-panels>
                </q-card>
              </q-tab-panel>
              <q-tab-panel name="selectedNodes">
                <interaction-graph-table> </interaction-graph-table>
              </q-tab-panel>
              <q-tab-panel name="ppiGraph">
                <interaction-graph
                conlabelID="interactionGraph"
                > </interaction-graph>
              </q-tab-panel>
               <q-tab-panel name="pathwayCompare">
                      <pathway-compare>
                      </pathway-compare>
              </q-tab-panel>
            </q-tab-panels>
          
        </q-card>
        </div>
      </div>
      <!-- Network -->
      <div class="col-7 d-flex flex-column mb-2">
        <q-card>
          <q-tabs
            v-model="selectedTabNetwork"
            background-color="blue lighten-2"
            slider-color="indigo darken-4"
            dark
            center-active
            next-icon="mdi-arrow-right-bold-box-outline"
            preq-icon="mdi-arrow-left-bold-box-outline"
            show-arrows
          >
            <q-tab name="overviewNetwork">Overview</q-tab>
            <q-tab name="detailNetwork">Detail</q-tab>
          </q-tabs>

          <q-tab-panels v-model="selectedTabNetwork">
            <q-tab-panel name="overviewNetwork">
              <div class="row">
                <div class="col-12">
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

                </div>
                </div>
                <div v-if="targetDatabase === 'kegg'">
                  <keep-alive>
                    <kegg-detail-component
                      conlabelID="detailConlabel"
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
                      conlabelID="reactomeDetail"
                      :transcriptomicsSelection="transcriptomicsSelectionData"
                      :proteomicsSelection="proteomicsSelectionData"
                      :metabolomicsSelection="metabolomicsSelectionData"
                      :isActive="activeOverview"
                    >
                    </reactome-detail-component>
                  </keep-alive>
                </div>
            </q-tab-panel>

            <q-tab-panel name="detailNetwork">
              <p> placeholder </p>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { mapState } from 'pinia'
import KeggDetailComponent from './KeggDetailComponent.vue'
import ReactomeDetailComponent from './ReactomeDetailComponent.vue'
import KeggOverviewComponent from './KeggOverviewComponent.vue'
import InteractionGraph from './InteractionGraph.vue'
import InteractionGraphTable from './InteractionGraphTable.vue'
import PathwayCompare from './PathwayCompare.vue'
import ReactomeOverviewComponent from './ReactomeOverviewComponent.vue'
import { useMainStore } from '@/stores'


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

export default {
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
    ...mapState(useMainStore,[
      'targetDatabase',
      'transcriptomicsTableHeaders',
      'transcriptomicsTableData',
      'proteomicsTableHeaders',
      'proteomicsTableData',
      'metabolomicsTableHeaders',
      'metabolomicsTableData',
      'fcs',
      'transcriptomicsSymbolDict',
      'proteomicsSymbolDict',
      'usedSymbolCols',
      'overlay',
      'pathwayLayouting',
      'pathwayDropdown'
      ]
    ),
 
    activeOverview: function () {
      return this.selectedTabNetwork === 'overviewNetwork'
    },
    activeDetail: function () {
      return this.selectedTabNetwork === 'detailNetwork'
    }
  },
  watch: {
    pathwayLayouting: function () {
      const mainStore = useMainStore()
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
      this.transcriptomicsTableHeaders.forEach((entry: {label: string, name: string}) => {
        if (entry.name === 'available') {
          entry.label = `available (${transcriptomicsAvailable} of ${transcriptomicsTotal})`
        }
      })
      mainStore.setTranscriptomicsTableHeaders(this.transcriptomicsTableHeaders)
      mainStore.setTranscriptomicsTableData(this.transcriptomicsTableData)

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
      this.proteomicsTableHeaders.forEach((entry: {label: string, name: string}) => {
        if (entry.name === 'available') {
          entry.label = `available (${proteomiocsAvailable} of ${proteomicsTotal})`
        }
      })
      mainStore.setProteomicsTableHeaders(this.proteomicsTableHeaders)
      mainStore.setProteomicsTableData(this.proteomicsTableData)

      console.log(this.proteomicsTableHeaders)

      let metabolomicsAvailable = 0
      let metabolomicsTotal = 0

      this.metabolomicsTableData.forEach((row: {[key: string]: string | number }) => {
        metabolomicsTotal += 1
        const symbol = row[this.usedSymbolCols.metabolomics]
        const pathwaysContaining = this.pathwayLayouting.nodePathwayDictionary[symbol]
        row.available = (pathwaysContaining) ? pathwaysContaining.length : 'No'
        if (pathwaysContaining) metabolomicsAvailable += 1
      })
      this.metabolomicsTableHeaders.forEach((entry: {label: string, name: string}) => {
        if (entry.name === 'available') {
          entry.label = `available (${metabolomicsAvailable} of ${metabolomicsTotal})`
        }
      })
      mainStore.setMetabolomicsTableHeaders(this.metabolomicsTableHeaders)
      mainStore.setMetabolomicsTableData(this.metabolomicsTableData)
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
      const mainStore = useMainStore()
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
      mainStore.setTranscriptomicsTableData(this.transcriptomicsTableData)

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
      mainStore.setProteomicsTableData(this.proteomicsTableData)

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
      mainStore.setMetabolomicsTableData(this.metabolomicsTableData)
    }
  },

  // mounted () {},

  methods: {
    transcriptomicsSelection (val: { [key: string]: string }) {
      // this.transcriptomicsSelectionData = val
    },
    proteomicsSelection (val: { [key: string]: string }) {
      const mainStore = useMainStore()
      mainStore.addClickedNodeFromTable(val)
    },
    metabolomicsSelection (val: { [key: string]: string }) {
      // this.metabolomicsSelectionData = val
    },
    itemRowColor (item: {[key:string]: string}) {
      return (item.available !== 'No') ? ((item.inSelected === 'Yes') ? 'rowstyle-inPathway' : 'rowstyle-available') : 'rowstyle-notAvailable'
    }
  }
}
</script>

