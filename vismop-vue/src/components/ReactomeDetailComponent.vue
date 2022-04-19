<template>
  <div>
    <q-card v-bind:class="[minimizeButton ? 'detailComponentSmaller' : '', expandButton ? 'detailComponentLarger' : '','detailComponent']">
      <div class = "col">
        <q-select
        :options="pathwayLayouting.pathwayList"
        label="Focus Pathway"
        v-model="pathwaySelection"
        option-label="text"
        option-value="value"
        @filter="filterFunction"
        ></q-select>
      <div :id="contextID" v-bind:class="[minimizeButton ? 'webglContainerDetailSmaller' : '',expandButton ? 'webglContainerDetailLarger' : '','webglContainerDetail']"></div>
      <q-card-actions>
        <q-btn
          class="mx-2 expandButton"
          fab
          dark
          small
          @click="expandComponent"
        ><q-icon>mdi-arrow-expand</q-icon></q-btn>
          <q-btn
          class="mx-2 minimizeButton"
          fab
          dark
          small
          @click="minimizeComponent"
        ><q-icon>mdi-window-minimize</q-icon></q-btn>
      </q-card-actions>
      </div>
    </q-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import ReactomeDetailView from '../core/reactomeDetailView'
import { graphJSON, layoutJSON, foldChangesByType, foldChangesByID } from '../core/reactomeTypes'
import { glyphData } from '../core/overviewGlyph'
import { getEntryAmounts } from '../core/reactomeUtils'
import { defineComponent } from 'vue'
import vue from 'vue'
import { PropType } from 'vue'
import { Function } from 'lodash'


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
  currentInsetPathwaysTotals: {[key: number]: {proteomics: number, metabolomics: number, transcriptomics: number}},
  currentView: (ReactomeDetailView | undefined)

}

export default {
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
    currentInsetPathwaysTotals: {} as {[key: number]: {proteomics: number, metabolomics: number, transcriptomics: number}},
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
        this.pathwayLayouting.pathwayList = this.pathwayLayouting.pathwayList.filter((v: string) => v.toLowerCase().indexOf(tarValue) > -1)
      })
    },
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
          this.currentInsetPathwaysTotals = dataContent.insetPathwayTotals as {[key: number]: {proteomics: number, metabolomics: number, transcriptomics: number}}
          this.drawDetailView()
        }).then(() => this.$store.dispatch('setOverlay', false))
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
      const pathwayData = this.overviewData.find((elem: { pathwayId: string }) => elem.pathwayId === this.pathwaySelection)

      this.prepareFcs(pathwayData, fcs, fcsReactomeKey, 'proteomics')
      this.prepareFcs(pathwayData, fcs, fcsReactomeKey, 'transcriptomics')
      this.prepareFcs(pathwayData, fcs, fcsReactomeKey, 'metabolomics')

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
}
</script>
