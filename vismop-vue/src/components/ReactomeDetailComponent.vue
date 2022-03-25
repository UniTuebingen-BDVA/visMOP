<template>
  <div>
    <v-card v-bind:class="[minimizeButton ? 'detailComponentSmaller' : '', expandButton ? 'detailComponentLarger' : '','detailComponent']">
      <v-col>
      <v-overflow-btn
                    :items="pathwayLayouting.pathwayList"
                    editable
                    clearable
                    label="Focus Pathway"
                    hide-details
                    overflow
                    dense
                    v-model="pathwaySelection"
      ></v-overflow-btn>
      <div :id="contextID" v-bind:class="[minimizeButton ? 'webglContainerDetailSmaller' : '',expandButton ? 'webglContainerDetailLarger' : '','webglContainerDetail']"></div>
      <v-card-actions>
        <v-btn
          class="mx-2 expandButton"
          fab
          dark
          small
          @click="expandComponent"
        ><v-icon>mdi-arrow-expand</v-icon></v-btn>
          <v-btn
          class="mx-2 minimizeButton"
          fab
          dark
          small
          @click="minimizeComponent"
        ><v-icon>mdi-window-minimize</v-icon></v-btn>
      </v-card-actions>
      </v-col>
    </v-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import ReactomeDetailView from '../core/reactomeDetailView'
import { graphJSON, layoutJSON } from '../core/reactomeTypes'
import { glyphData } from '../core/overviewGlyph'
import { getEntryAmounts } from '../core/reactomeUtils'
import Vue from 'vue'

interface Data{
  mutationObserver: (MutationObserver | undefined)
  tableSearch: string
  selectedTab: string
  outstandingDraw: boolean
  pathwaySelection: string
  expandButton: boolean
  minimizeButton: boolean
  currentLayoutJson: layoutJSON
  currentGraphJson: graphJSON
  currentInsetPathwaysTotals: {[key: number]: {prot: number, meta: number}},
  currentView: (ReactomeDetailView | undefined)

}

export default Vue.extend({
  // name of the component
  name: 'ReactomeDetailComponent',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    mutationObserver: undefined,
    tableSearch: '',
    selectedTab: 'transcriptomics',
    outstandingDraw: false,
    pathwaySelection: '',
    expandButton: false,
    minimizeButton: false,
    // currentGraphJson: {},
    currentLayoutJson: {} as layoutJSON,
    currentGraphJson: {} as graphJSON,
    currentInsetPathwaysTotals: {} as {[key: number]: {prot: number, meta: number}},
    currentView: undefined
  }),

  computed: {
    ...mapState({
      sideBarExpand: (state:any) => state.sideBarExpand,
      overlay: (state:any) => state.overlay,
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
    pathwaySelection: function () {
      this.getJsonFiles(this.pathwaySelection)
      this.$store.dispatch('focusPathwayViaDropdown', this.pathwaySelection)
    },
    pathwayDropdown: function () {
      this.pathwaySelection = this.pathwayDropdown
    }
  },

  mounted () {
    // allows to run function when tar changes
    this.mutationObserver = new MutationObserver(this.refreshSize)
    const config = { attributes: true }
    const tar = document.getElementById(this.contextID)
    if (tar) this.mutationObserver.observe(tar, config)
  },
  props: {
    contextID: String,
    transcriptomicsSelection: Array as Vue.PropType<{[key: string]: string}[]>,
    proteomicsSelection: Array as Vue.PropType<{[key: string]: string}[]>,
    metabolomicsSelection: Array as Vue.PropType<{[key: string]: string}[]>,
    isActive: Boolean
  },
  methods: {
    getJsonFiles (reactomeID: string) {
      fetch(`/get_reactome_json_files/${reactomeID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then((response) => response.json())
        .then((dataContent) => {
          this.currentLayoutJson = dataContent.layoutJson as layoutJSON
          this.currentGraphJson = dataContent.graphJson as graphJSON
          this.currentInsetPathwaysTotals = dataContent.insetPathwayTotals as {[key: number]: {prot: number, meta: number}}
          this.drawDetailView()
        }).then(() => this.$store.dispatch('setOverlay', false))
    },
    drawDetailView () {
      this.currentView?.clearView()
      const fcs: {proteomics: { [key: number]: number}, transcriptomics:{ [key: number]: number}, metabolomics:{ [key: number]: number} } = { proteomics: {}, transcriptomics: {}, metabolomics: {} }
      const fcsReactomeKey: { [key: number]: glyphData } = {}
      const pathwayData = this.overviewData.find((elem: { pathwayId: string }) => elem.pathwayId === this.pathwaySelection)
      // Regular node parsing

      for (const entry of pathwayData.ownMeasuredEntryIDs.proteomics) {
        try {
          const measureEntry = pathwayData.entries.proteomics.measured[entry] as {queryId: string, value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
          const val = measureEntry.value
          for (const entity in measureEntry.forms) {
            const entityElem = measureEntry.forms[entity]
            for (const id of entityElem.toplevelId) {
              fcs.proteomics[id] = val
              const totalAmount = getEntryAmounts(id, this.currentGraphJson)
              if (id in fcsReactomeKey) {
                fcsReactomeKey[id].proteomics.available = true
                fcsReactomeKey[id].proteomics.foldChanges.push({ value: val, name: entityElem.name, queryID: measureEntry.queryId })
                fcsReactomeKey[id].proteomics.meanFoldchange = ((fcsReactomeKey[id].proteomics.nodeState.regulated * fcsReactomeKey[id].proteomics.meanFoldchange) + val) / (fcsReactomeKey[id].proteomics.nodeState.regulated + 1)
                fcsReactomeKey[id].proteomics.nodeState.regulated += 1
              } else {
                fcsReactomeKey[id] = { pathwayID: '' + id, proteomics: { available: true, foldChanges: [{ value: val, name: entityElem.name, queryID: measureEntry.queryId }], meanFoldchange: val, nodeState: { total: totalAmount.totalProteins, regulated: 1 } }, transcriptomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalProteins, regulated: 0 } }, metabolomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalMolecules, regulated: 0 } } }
              }
            }
          }
        } catch (error) { console.log(error, pathwayData.ownMeasuredEntryIDs) }
      }

      // Inset Pathways
      for (const entry in pathwayData.insetPathwayEntryIDs.proteomics as {[key:number]: {stableID: string, nodes: string[]}}) {
        try {
          const entryList = pathwayData.insetPathwayEntryIDs.proteomics[entry].nodes
          const totalAmount = this.currentInsetPathwaysTotals[entry].prot
          for (const measureEntryID of entryList) {
            const measureEntry = pathwayData.entries.proteomics.measured[measureEntryID] as {queryId: string, value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
            const val = measureEntry.value
            for (const entity in measureEntry.forms) {
              const entityElem = measureEntry.forms[entity]
              fcs.proteomics[entry] = val
              if (entry in fcsReactomeKey) {
                fcsReactomeKey[entry].proteomics.available = true
                fcsReactomeKey[entry].proteomics.foldChanges.push({ value: val, name: entityElem.name, queryID: measureEntry.queryId })
                fcsReactomeKey[entry].proteomics.meanFoldchange = ((fcsReactomeKey[entry].proteomics.nodeState.regulated * fcsReactomeKey[entry].proteomics.meanFoldchange) + val) / (fcsReactomeKey[entry].proteomics.nodeState.regulated + 1)
                fcsReactomeKey[entry].proteomics.nodeState.regulated += 1
              } else {
                fcsReactomeKey[entry] = { pathwayID: '' + entry, proteomics: { available: true, foldChanges: [{ value: val, name: entityElem.name, queryID: measureEntry.queryId }], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 1 } }, transcriptomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount, regulated: 0 } }, metabolomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount, regulated: 0 } } }
              }
            }
          }
        } catch (error) { console.log('INSET', error, pathwayData.insetPathwayEntryIDs) }
      }

      // regular node parsing
      for (const entry of pathwayData.ownMeasuredEntryIDs.transcriptomics) {
        try {
          const measureEntry = pathwayData.entries.transcriptomics.measured[entry] as {queryId: string, value: number, forms: { [key: string]: {name: string, toplevelId: number[] }}}
          const val = measureEntry.value
          for (const entity in measureEntry.forms) {
            const entityElem = measureEntry.forms[entity]
            for (const id of entityElem.toplevelId) {
              fcs.transcriptomics[id] = val
              const totalAmount = getEntryAmounts(id, this.currentGraphJson)
              if (id in fcsReactomeKey) {
                fcsReactomeKey[id].transcriptomics.available = true
                fcsReactomeKey[id].transcriptomics.foldChanges.push({ value: val, name: entityElem.name, queryID: measureEntry.queryId })
                fcsReactomeKey[id].transcriptomics.meanFoldchange = ((fcsReactomeKey[id].transcriptomics.nodeState.regulated * fcsReactomeKey[id].transcriptomics.meanFoldchange) + val) / (fcsReactomeKey[id].transcriptomics.nodeState.regulated + 1)
                fcsReactomeKey[id].transcriptomics.nodeState.regulated += 1
              } else {
                fcsReactomeKey[id] = { pathwayID: '' + id, transcriptomics: { available: true, foldChanges: [{ value: val, name: entityElem.name, queryID: measureEntry.queryId }], meanFoldchange: val, nodeState: { total: totalAmount.totalProteins, regulated: 1 } }, proteomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalProteins, regulated: 0 } }, metabolomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalMolecules, regulated: 0 } } }
              }
            }
          }
        } catch (error) { console.log(error, pathwayData.ownMeasuredEntryIDs) }
      }

      // Inset Pathways
      for (const entry in pathwayData.insetPathwayEntryIDs.transcriptomics as {[key:number]: {stableID: string, nodes: string[]}}) {
        try {
          const entryList = pathwayData.insetPathwayEntryIDs.transcriptomics[entry].nodes
          const totalAmount = this.currentInsetPathwaysTotals[entry].prot
          for (const measureEntryID of entryList) {
            const measureEntry = pathwayData.entries.transcriptomics.measured[measureEntryID] as {queryId: string, value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
            const val = measureEntry.value
            for (const entity in measureEntry.forms) {
              const entityElem = measureEntry.forms[entity]
              fcs.transcriptomics[entry] = val
              if (entry in fcsReactomeKey) {
                fcsReactomeKey[entry].transcriptomics.available = true
                fcsReactomeKey[entry].transcriptomics.foldChanges.push({ value: val, name: entityElem.name, queryID: measureEntry.queryId })
                fcsReactomeKey[entry].transcriptomics.meanFoldchange = ((fcsReactomeKey[entry].transcriptomics.nodeState.regulated * fcsReactomeKey[entry].transcriptomics.meanFoldchange) + val) / (fcsReactomeKey[entry].transcriptomics.nodeState.regulated + 1)
                fcsReactomeKey[entry].transcriptomics.nodeState.regulated += 1
              } else {
                fcsReactomeKey[entry] = { pathwayID: '' + entry, transcriptomics: { available: true, foldChanges: [{ value: val, name: entityElem.name, queryID: measureEntry.queryId }], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 1 } }, proteomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount, regulated: 0 } }, metabolomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount, regulated: 0 } } }
              }
            }
          }
        } catch (error) { console.log('INSET', error, pathwayData.insetPathwayEntryIDs) }
      }

      // regular node parsing
      for (const entry of pathwayData.ownMeasuredEntryIDs.metabolomics) {
        try {
          const measureEntry = pathwayData.entries.metabolomics.measured[entry] as {queryId: string, value: number, forms: { [key: string]: {name: string, toplevelId: number[] }}}
          const val = measureEntry.value
          for (const entity in measureEntry.forms) {
            const entityElem = measureEntry.forms[entity]
            for (const id of entityElem.toplevelId) {
              fcs.metabolomics[id] = val
              const totalAmount = getEntryAmounts(id, this.currentGraphJson)
              if (id in fcsReactomeKey) {
                fcsReactomeKey[id].metabolomics.available = true
                fcsReactomeKey[id].metabolomics.foldChanges.push({ value: val, name: entityElem.name, queryID: measureEntry.queryId })
                fcsReactomeKey[id].metabolomics.meanFoldchange = ((fcsReactomeKey[id].metabolomics.nodeState.regulated * fcsReactomeKey[id].metabolomics.meanFoldchange) + val) / (fcsReactomeKey[id].metabolomics.nodeState.regulated + 1)
                fcsReactomeKey[id].metabolomics.nodeState.regulated += 1
              } else {
                fcsReactomeKey[id] = { pathwayID: '' + id, metabolomics: { available: true, foldChanges: [{ value: val, name: entityElem.name, queryID: measureEntry.queryId }], meanFoldchange: val, nodeState: { total: totalAmount.totalMolecules, regulated: 1 } }, transcriptomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalProteins, regulated: 0 } }, proteomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount.totalProteins, regulated: 0 } } }
              }
            }
          }
        } catch (error) { console.log(error, pathwayData.ownMeasuredEntryIDs) }
      }

      // Inset Pathways
      for (const entry in pathwayData.insetPathwayEntryIDs.metabolomics as {[key:number]: {stableID: string, nodes: string[]}}) {
        try {
          const entryList = pathwayData.insetPathwayEntryIDs.metabolomics[entry].nodes
          const totalAmount = this.currentInsetPathwaysTotals[entry].meta
          for (const measureEntryID of entryList) {
            const measureEntry = pathwayData.entries.metabolomics.measured[measureEntryID] as {queryId: string, value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
            const val = measureEntry.value
            for (const entity in measureEntry.forms) {
              const entityElem = measureEntry.forms[entity]
              fcs.metabolomics[entry] = val
              if (entry in fcsReactomeKey) {
                fcsReactomeKey[entry].metabolomics.available = true
                fcsReactomeKey[entry].metabolomics.foldChanges.push({ value: val, name: entityElem.name, queryID: measureEntry.queryId })
                fcsReactomeKey[entry].metabolomics.meanFoldchange = ((fcsReactomeKey[entry].metabolomics.nodeState.regulated * fcsReactomeKey[entry].metabolomics.meanFoldchange) + val) / (fcsReactomeKey[entry].metabolomics.nodeState.regulated + 1)
                fcsReactomeKey[entry].metabolomics.nodeState.regulated += 1
              } else {
                fcsReactomeKey[entry] = { pathwayID: '' + entry, metabolomics: { available: true, foldChanges: [{ value: val, name: entityElem.name, queryID: measureEntry.queryId }], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 1 } }, proteomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount, regulated: 0 } }, transcriptomics: { available: false, foldChanges: [], meanFoldchange: -100, nodeState: { total: totalAmount, regulated: 0 } } }
              }
            }
          }
        } catch (error) { console.log('INSET', error, pathwayData.insetPathwayEntryIDs) }
      }
      this.currentView = new ReactomeDetailView(this.currentLayoutJson, this.currentGraphJson, '#' + this.contextID, fcs, fcsReactomeKey)
    },
    expandComponent () {
      this.expandButton = !this.expandButton
    },
    minimizeComponent () {
      this.minimizeButton = !this.minimizeButton
    },
    refreshSize () {
      this.currentView?.refreshSize()
    },
    getTotalsFromGraphJson () {
      // TODO get correct totals from graph json via recursion
    }
  }
})
</script>
