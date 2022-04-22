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
                      dense
                      virtual-scroll
                      style="height: 63vh"
                      v-model:pagination="pagination"
                      :rows-per-page-options="[0]"
                      v-model="selectedTranscriptomics"
                      :columns="transcriptomicsTableHeaders"
                      :rows="transcriptomicsTableData"
                      row-key="name"
                      :filter="tableSearch"
                      id="transcriptomics"
                      @row-dblclick="transcriptomicsSelection"
                    >
                      <template v-slot:body-cell="props">
                        <q-td
                          :props="props"
                          :class="itemRowColor(props)"
                        >
                          {{props.value}}
                        </q-td>
                      </template>
                    </q-table>
                  </q-tab-panel>

                  <q-tab-panel name="proteome">
                    <q-table
                      dense
                      virtual-scroll
                      style="height: 63vh"
                      v-model:pagination="pagination"
                      :rows-per-page-options="[0]"
                      v-model="selectedProteomics"
                      :columns="proteomicsTableHeaders"
                      :rows="proteomicsTableData"
                      row-key="name"
                      :filter="tableSearch"
                      id="proteomicsTable"
                      @row-dblclick="proteomicsSelection"
                    >
                      <template v-slot:body-cell="props">
                        <q-td
                          :props="props"
                          :class="itemRowColor(props)"
                        >
                          {{props.value}}
                        </q-td>
                      </template>
                    </q-table>
                  </q-tab-panel>

                  <q-tab-panel name="metabol" >
                    <q-table
                      dense
                      virtual-scroll
                      style="height: 63vh"
                      v-model:pagination="pagination"
                      :rows-per-page-options="[0]"
                      v-model="selectedMetabolomics"
                      :columns="metabolomicsTableHeaders"
                      :rows="metabolomicsTableData"
                      row-key="name"
                      :filter="tableSearch"
                      id="metabolomicsTable"
                      @row-dblclick="metabolomicsSelection"
                    >
                      <template v-slot:body-cell="props">
                        <q-td
                          :props="props"
                          :class="itemRowColor(props)"
                        >
                          {{props.value}}
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
                <interaction-graph
                contextID="interactionGraph"
                > </interaction-graph>
              </q-tab-panel>
               <q-tab-panel name="pathwayCompare">
                      <pathway-compare>
                      </pathway-compare>
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
            
            <div v-if="targetDatabase === 'kegg'">
              <keep-alive>
                <kegg-detail-component
                  contextID="detailcontext"
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
        </div>
        </q-card>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { mapState } from 'pinia'
  import KeggDetailComponent from './KeggDetailComponent.vue'
  import ReactomeDetailComponent from './ReactomeDetailComponent.vue'
  import KeggOverviewComponent from './KeggOverviewComponent.vue'
  import InteractionGraph from './InteractionGraph.vue'
  import InteractionGraphTable from './InteractionGraphTable.vue'
  import PathwayCompare from './PathwayCompare.vue'
  import ReactomeOverviewComponent from './ReactomeOverviewComponent.vue'
  import { useMainStore } from '@/stores'
  import { computed, Ref, ref, watch } from 'vue'
import { QTable, QTableProps } from 'quasar'
import { ColType } from '@/core/generalTypes'

  const mainStore = useMainStore()

  const tableSearch = ref('')
  const selectedTabTable = ref('transcriptomics')
  const selectedTabNetwork = ref('overviewNetwork')
  const selectedTabMisc = ref('dataTable')
  const transcriptomicsSelectionData: Ref<{ [key: string]: string }[]> =  ref([])
  const proteomicsSelectionData: Ref<{ [key: string]: string }[]> =  ref([])
  const metabolomicsSelectionData: Ref<{ [key: string]: string }[]> =  ref([])
  const selectedTranscriptomics: Ref<{ [key: string]: string }[]> =  ref([])
  const selectedProteomics: Ref<{ [key: string]: string }[]> =  ref([])
  const selectedMetabolomics: Ref<{ [key: string]: string }[]> =  ref([])
  const pagination = ref({rowsPerPage: 0})
  
  const targetDatabase = computed(() => mainStore.targetDatabase )
  const transcriptomicsTableHeaders = computed(() => mainStore.transcriptomicsTableHeaders )
  const transcriptomicsTableData = computed(() => mainStore.transcriptomicsTableData )
  const proteomicsTableHeaders = computed(() => mainStore.proteomicsTableHeaders )
  const proteomicsTableData = computed(() => mainStore.proteomicsTableData )
  const metabolomicsTableHeaders = computed(() => mainStore.metabolomicsTableHeaders )
  const metabolomicsTableData = computed(() => mainStore.metabolomicsTableData )
  const transcriptomicsSymbolDict = computed(() => mainStore.transcriptomicsSymbolDict )
  const proteomicsSymbolDict = computed(() => mainStore.proteomicsSymbolDict )
  const usedSymbolCols = computed(() => mainStore.usedSymbolCols )
  const pathwayLayouting = computed(() => mainStore.pathwayLayouting )
  const pathwayDropdown = computed(() => mainStore.pathwayDropdown )


  const activeOverview = computed(() => selectedTabNetwork.value === 'overviewNetwork' )
  
  watch(pathwayLayouting, () => {
      const mainStore = useMainStore()
      let transcriptomicsAvailable = 0
      let transcriptomicsTotal = 0

      transcriptomicsTableData.value.forEach((row: {[key: string]: string | number }) => {
        transcriptomicsTotal += 1
        let symbol = row[usedSymbolCols.value.transcriptomics]
        if (targetDatabase.value === 'kegg') {
          symbol = transcriptomicsSymbolDict.value[symbol]
        }
        const pathwaysContaining = pathwayLayouting.value.nodePathwayDictionary[symbol]
        row.available = (pathwaysContaining) ? pathwaysContaining.length : 'No'
        if (pathwaysContaining) transcriptomicsAvailable += 1
      })
      console.log('table headers', transcriptomicsTableHeaders)
      transcriptomicsTableHeaders.value.forEach((entry: ColType) => {
        if (entry?.name === 'available') {
          entry.label = `available (${transcriptomicsAvailable} of ${transcriptomicsTotal})`
        }
      })
      mainStore.setTranscriptomicsTableHeaders(transcriptomicsTableHeaders.value)
      mainStore.setTranscriptomicsTableData(transcriptomicsTableData.value)

      let proteomiocsAvailable = 0
      let proteomicsTotal = 0

      proteomicsTableData.value.forEach((row: {[key: string]: string | number }) => {
        proteomicsTotal += 1
        let symbol = row[usedSymbolCols.value.proteomics]
        if (targetDatabase.value === 'kegg') {
          symbol = proteomicsSymbolDict.value[symbol]
        }
        const pathwaysContaining = pathwayLayouting.value.nodePathwayDictionary[symbol]
        row.available = (pathwaysContaining) ? pathwaysContaining.length : 'No'
        if (pathwaysContaining) proteomiocsAvailable += 1
      })
      proteomicsTableHeaders.value.forEach((entry: {label: string, name: string}) => {
        if (entry.name === 'available') {
          entry.label = `available (${proteomiocsAvailable} of ${proteomicsTotal})`
        }
      })
      mainStore.setProteomicsTableHeaders(proteomicsTableHeaders.value)
      mainStore.setProteomicsTableData(proteomicsTableData.value)

      let metabolomicsAvailable = 0
      let metabolomicsTotal = 0

      metabolomicsTableData.value.forEach((row: {[key: string]: string | number }) => {
        metabolomicsTotal += 1
        const symbol = row[usedSymbolCols.value.metabolomics]
        const pathwaysContaining = pathwayLayouting.value.nodePathwayDictionary[symbol]
        row.available = (pathwaysContaining) ? pathwaysContaining.length : 'No'
        if (pathwaysContaining) metabolomicsAvailable += 1
      })
      metabolomicsTableHeaders.value.forEach((entry: {label: string, name: string}) => {
        if (entry.name === 'available') {
          entry.label = `available (${metabolomicsAvailable} of ${metabolomicsTotal})`
        }
      })
      mainStore.setMetabolomicsTableHeaders(metabolomicsTableHeaders.value)
      mainStore.setMetabolomicsTableData(metabolomicsTableData.value)
    })
    watch(selectedTranscriptomics, () => {
      transcriptomicsSelectionData.value = selectedTranscriptomics.value
    })
    watch(selectedProteomics, () => {
      proteomicsSelectionData.value = selectedProteomics.value
    })
    watch(selectedMetabolomics, () => {
      metabolomicsSelectionData.value = selectedMetabolomics.value
    })
    watch(pathwayDropdown, () => {
      const mainStore = useMainStore()
      transcriptomicsTableData.value.forEach((row: {[key: string]: string | number }) => {
        let symbol = row[usedSymbolCols.value.transcriptomics]
        const available = !(row.available === 'No')
        if (available) {
          let includedInSelectedPathway = false
          if (targetDatabase.value === 'kegg') {
            symbol = transcriptomicsSymbolDict.value[symbol]
            includedInSelectedPathway = pathwayDropdown.value ? pathwayLayouting.value.pathwayNodeDictionaryClean[pathwayDropdown.value.value].includes(symbol) : false
          }
          if (targetDatabase.value === 'reactome') {
            includedInSelectedPathway = pathwayDropdown.value ? pathwayLayouting.value.pathwayNodeDictionary[symbol].includes(pathwayDropdown.value.value) : false
          }
          row.inSelected = (includedInSelectedPathway) ? 'Yes' : 'No'
        }
      })
      mainStore.setTranscriptomicsTableData(transcriptomicsTableData.value)

      proteomicsTableData.value.forEach((row: {[key: string]: string | number }) => {
        let symbol = row[usedSymbolCols.value.proteomics]
        const available = !(row.available === 'No')
        if (available) {
          let includedInSelectedPathway = false
          if (targetDatabase.value === 'kegg') {
            symbol = proteomicsSymbolDict.value[symbol]
            includedInSelectedPathway = pathwayDropdown.value ? pathwayLayouting.value.pathwayNodeDictionaryClean[pathwayDropdown.value.value].includes(symbol) : false
          }
          if (targetDatabase.value === 'reactome') {
            includedInSelectedPathway = pathwayDropdown.value ? pathwayLayouting.value.pathwayNodeDictionary[symbol].includes(pathwayDropdown.value.value) : false
          }
          row.inSelected = (includedInSelectedPathway) ? 'Yes' : 'No'
        }
      })
      mainStore.setProteomicsTableData(proteomicsTableData.value)

      metabolomicsTableData.value.forEach((row: {[key: string]: string | number }) => {
        const symbol = row[usedSymbolCols.value.metabolomics]
        const available = !(row.available === 'No')
        if (available) {
          let includedInSelectedPathway = false
          if (targetDatabase.value === 'kegg') {
            includedInSelectedPathway = pathwayDropdown.value ? pathwayLayouting.value.pathwayNodeDictionaryClean[pathwayDropdown.value.value].includes(symbol) : false
          }
          if (targetDatabase.value === 'reactome') {
            includedInSelectedPathway = pathwayDropdown.value ? pathwayLayouting.value.pathwayNodeDictionary[symbol].includes(pathwayDropdown.value.value) : false
          }
          row.inSelected = (includedInSelectedPathway) ? 'Yes' : 'No'
        }
      })
      mainStore.setMetabolomicsTableData(metabolomicsTableData.value)
    })

    const transcriptomicsSelection = ((event: Event, row: { [key: string]: string }, index: number) => {
      // this.transcriptomicsSelectionData = val
    })
    const proteomicsSelection =  ((event: Event, row: { [key: string]: string }, index: number) => {
      mainStore.addClickedNodeFromTable(row)
    })
    const metabolomicsSelection = ((event: Event, row: { [key: string]: string }, index: number) => {
      // this.metabolomicsSelectionData = val
    })
    const itemRowColor = ((item: {row: {[key:string]: string}}) => {
      return (item.row.available !== 'No') ? ((item.row.inSelected === 'Yes') ? 'rowstyle-inPathway' : 'rowstyle-available') : 'rowstyle-notAvailable'
    })
</script>

