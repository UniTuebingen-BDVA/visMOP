<template>
  <div>
    <q-card v-bind:class="[minimizeButton ? 'detailComponentSmaller' : '', expandButton ? 'detailComponentLarger' : '','detailComponent']">
      <div class = "col">
        <q-select
        filled
        :options="pathwayDropdownOptions"
        label="Focus Pathway"
        v-model="pathwaySelection"
        use-input
        input-debounce="0"
        option-label="text"
        option-value="value"
        @filter="filterFunction"
        ></q-select>
      <div :id="contextID" v-bind:class="[minimizeButton ? 'webglContainerDetailSmaller' : '',expandButton ? 'webglContainerDetailLarger' : '','webglContainerDetail']"></div>
      <q-card-actions>
        <q-fab
          icon="keyboard_arrow_down"
          direction="down"
        >
          <q-fab-action
            icon="mdi-arrow-expand"
            @click="expandComponent"
          ></q-fab-action>
          <q-fab-action
            icon="mdi-arrow-collapse"
            @click="minimizeComponent"
          ></q-fab-action>

        </q-fab>
          
      </q-card-actions>
      </div>
    </q-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import ReactomeDetailView from '../core/reactomeDetailView'
import { graphJSON, layoutJSON, foldChangesByType, foldChangesByID } from '../core/reactomeTypes'
import { getEntryAmounts } from '../core/reactomeUtils'
import { PropType } from 'vue'
import { useMainStore } from '@/stores'
import { useQuasar } from 'quasar'


interface Data{
  mutationObserver: (MutationObserver | undefined)
  tableSearch: string
  selectedTab: string
  outstandingDraw: boolean
  pathwaySelection: {title: string, value: string, text: string}
  expandButton: boolean
  minimizeButton: boolean
  currentLayoutJson: layoutJSON
  currentGraphJson: graphJSON
  currentInsetPathwaysTotals: {[key: number]: {proteomics: number, metabolomics: number, transcriptomics: number}},
  currentView: (ReactomeDetailView | undefined),
  $q: unknown
  pathwayDropdownOptions: {title: string, value: string, text: string}[]

}

export default {
  // name of the component
  name: 'ReactomeDetailComponent',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    $q : useQuasar(),
    mutationObserver: undefined,
    tableSearch: '',
    selectedTab: 'transcriptomics',
    outstandingDraw: false,
    pathwaySelection: {title: '', value: '', text: ''},
    expandButton: false,
    minimizeButton: false,
    // currentGraphJson: {},
    currentLayoutJson: {} as layoutJSON,
    currentGraphJson: {} as graphJSON,
    currentInsetPathwaysTotals: {} as {[key: number]: {proteomics: number, metabolomics: number, transcriptomics: number}},
    currentView: undefined,
    pathwayDropdownOptions : []
  }),

  computed: {
    ...mapState(useMainStore,{
      sideBarExpand: (state:any) => state.sideBarExpand,
      pathwayDropdown: (state: any) => state.pathwayDropdown,
      pathwayLayouting: (state: any) => state.pathwayLayouting,
      overviewData: (state: any) => state.overviewData
    })
  },
  watch: {

    isActive: function () {
      console.log(
        this.contextID,
        'isActive: ',
        this.isActive,
        this.outstandingDraw
      )
    },
    pathwayLayouting: function() {
      this.pathwayDropdownOptions = this.pathwayLayouting.pathwayList
    },
    pathwaySelection: function () {
      console.log('this.pathwaySelection',this.pathwaySelection)
      const mainStore = useMainStore()
      const tarID = this.pathwaySelection.value
      this.getJsonFiles(tarID)
      mainStore.focusPathwayViaDropdown(this.pathwaySelection)
    },
    pathwayDropdown: function () {
      this.pathwaySelection = this.pathwayDropdown
    }
  },

  mounted () {
    // allows to run function when tar changes
    this.mutationObserver = new MutationObserver(this.refreshSize)
    const config = { attributes: true }
    const tar = document.getElementById(this.contextID ? this.contextID : '')
    if (tar) this.mutationObserver.observe(tar, config)
  },
  props: {
    contextID: String,
    transcriptomicsSelection: Array as PropType<{[key: string]: string}[]>,
    proteomicsSelection: Array as PropType<{[key: string]: string}[]>,
    metabolomicsSelection: Array as PropType<{[key: string]: string}[]>,
    isActive: Boolean
  },
  methods: {
    filterFunction (val: string, update: (n: () => void) => void) {
      update(() => {
        const tarValue = val.toLowerCase()
        this.pathwayDropdownOptions = this.pathwayLayouting.pathwayList.filter((v: {text: string, value: string, title: string}) => v.text.toLowerCase().indexOf(tarValue) > -1)
      })
    },
    getJsonFiles (reactomeID: string) {
      this.$q.loading.show()
      console.log(reactomeID)
      fetch(`/get_reactome_json_files/${reactomeID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then((response) => response.json())
        .then((dataContent) => {
          this.currentLayoutJson = dataContent.layoutJson as layoutJSON
          this.currentGraphJson = dataContent.graphJson as graphJSON
          this.currentInsetPathwaysTotals = dataContent.insetPathwayTotals as {[key: number]: {proteomics: number, metabolomics: number, transcriptomics: number}}
          this.drawDetailView()
        }).then(() => this.$q.loading.hide())
    },
    /**
     * Fill the fc objects for the selected type with the supplied pathway Data
     *
     * @param pathwayData
     * @param {foldChangesByType} fcs
     * @param {foldChangesByID} fcsReactomeKey
     * @param {'proteomics' | 'metabolomics' | 'transcriptomics'} type
     */
    prepareFcs (pathwayData: any, fcs: foldChangesByType, fcsReactomeKey:foldChangesByID, type: 'proteomics' | 'metabolomics' | 'transcriptomics') {
      // Regular node parsing
      for (const entry of pathwayData.ownMeasuredEntryIDs[type]) {
        try {
          const measureEntry = pathwayData.entries[type].measured[entry] as {queryId: string, value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
          const val = measureEntry.value
          for (const entity in measureEntry.forms) {
            const entityElem = measureEntry.forms[entity]
            for (const id of entityElem.toplevelId) {
              fcs[type][id] = val
              const totalAmount = getEntryAmounts(id, this.currentGraphJson)
              if (id in fcsReactomeKey) {
                fcsReactomeKey[id][type].available = true
                fcsReactomeKey[id][type].foldChanges.push({ value: val, name: entityElem.name, queryID: measureEntry.queryId })
                fcsReactomeKey[id][type].meanFoldchange = ((fcsReactomeKey[id][type].nodeState.regulated * fcsReactomeKey[id][type].meanFoldchange) + val) / (fcsReactomeKey[id][type].nodeState.regulated + 1)
                fcsReactomeKey[id][type].nodeState.regulated += 1
              } else {
                fcsReactomeKey[id] = { pathwayID: '' + id, proteomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalProteins, regulated: 0 } }, transcriptomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalProteins, regulated: 0 } }, metabolomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalMolecules, regulated: 0 } } }

                fcsReactomeKey[id][type] = { available: true, foldChanges: [{ value: val, name: entityElem.name, queryID: measureEntry.queryId }], meanFoldchange: val, nodeState: { total: ((type === 'proteomics') || (type === 'transcriptomics')) ? totalAmount.totalProteins : totalAmount.totalMolecules, regulated: 1 } }
              }
            }
          }
        } catch (error) { console.log(error, pathwayData.ownMeasuredEntryIDs) }
      }

      // Inset Pathways
      for (const entry in pathwayData.insetPathwayEntryIDs[type] as {[key:number]: {stableID: string, nodes: string[]}}) {
        try {
          const entryList = pathwayData.insetPathwayEntryIDs[type][entry].nodes
          const totalAmount = this.currentInsetPathwaysTotals[entry]
          for (const measureEntryID of entryList) {
            const measureEntry = pathwayData.entries[type].measured[measureEntryID] as {queryId: string, value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
            const val = measureEntry.value
            for (const entity in measureEntry.forms) {
              const entityElem = measureEntry.forms[entity]
              fcs[type][entry] = val
              if (entry in fcsReactomeKey) {
                fcsReactomeKey[entry][type].available = true
                fcsReactomeKey[entry][type].foldChanges.push({ value: val, name: entityElem.name, queryID: measureEntry.queryId })
                fcsReactomeKey[entry][type].meanFoldchange = ((fcsReactomeKey[entry][type].nodeState.regulated * fcsReactomeKey[entry][type].meanFoldchange) + val) / (fcsReactomeKey[entry][type].nodeState.regulated + 1)
                fcsReactomeKey[entry][type].nodeState.regulated += 1
              } else {
                fcsReactomeKey[entry] = { pathwayID: '' + entry, proteomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.proteomics, regulated: 0 } }, transcriptomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.transcriptomics, regulated: 0 } }, metabolomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.metabolomics, regulated: 0 } } }

                fcsReactomeKey[entry][type] = { available: true, foldChanges: [{ value: val, name: entityElem.name, queryID: measureEntry.queryId }], meanFoldchange: val, nodeState: { total: totalAmount[type], regulated: 1 } }
              }
            }
          }
        } catch (error) { console.log('INSET', error, pathwayData.insetPathwayEntryIDs) }
      }
    },
    drawDetailView () {
      this.currentView?.clearView()
      const fcs: foldChangesByType = { proteomics: {}, transcriptomics: {}, metabolomics: {} }
      const fcsReactomeKey: foldChangesByID = {}
      const pathwayData = this.overviewData.find((elem: { pathwayId: string }) => elem.pathwayId === this.pathwaySelection.value)

      this.prepareFcs(pathwayData, fcs, fcsReactomeKey, 'proteomics')
      this.prepareFcs(pathwayData, fcs, fcsReactomeKey, 'transcriptomics')
      this.prepareFcs(pathwayData, fcs, fcsReactomeKey, 'metabolomics')

      this.currentView = new ReactomeDetailView(this.currentLayoutJson, this.currentGraphJson, '#' + this.contextID, fcs, fcsReactomeKey)
    },
    expandComponent () {
      this.expandButton = !this.expandButton
      this.minimizeButton = false
    },
    minimizeComponent () {
      this.minimizeButton = !this.minimizeButton
      this.expandButton = false
    },
    refreshSize () {
      this.currentView?.refreshSize()
    },
    getTotalsFromGraphJson () {
      // TODO get correct totals from graph json via recursion
    }
  }
}
</script>
