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
          this.drawDetailView()
        }).then(() => this.$store.dispatch('setOverlay', false))
    },
    drawDetailView () {
      console.log('GRAPHJSON', this.currentGraphJson)
      this.currentView?.clearView()
      const fcs: {prot: { [key: number]: number}, gen:{ [key: number]: number}, chem:{ [key: number]: number} } = { prot: {}, gen: {}, chem: {} }
      const fcsReactomeKey: { [key: number]: glyphData } = {}
      console.log(this.overviewData)
      console.log(this.pathwaySelection)
      const pathwayData = this.overviewData.find((elem: { pathwayId: string }) => elem.pathwayId === this.pathwaySelection)
      for (const entry in pathwayData.entries.proteomics.measured) {
        const measureEntry = pathwayData.entries.proteomics.measured[entry] as {value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
        const val = measureEntry.value
        for (const entity in measureEntry.forms) {
          const entityElem = measureEntry.forms[entity]
          for (const id of entityElem.toplevelId) {
            fcs.prot[id] = val
            console.log('GRAPHTEST', id, this.currentGraphJson)
            const totalAmount = ('children' in this.currentGraphJson.nodes[id]) ? this.currentGraphJson.nodes[id].children.length : 1
            if (id in fcsReactomeKey) {
              fcsReactomeKey[id].proteomics.available = true
              fcsReactomeKey[id].proteomics.foldChanges.push({ value: val, symbol: entityElem.name })
              fcsReactomeKey[id].proteomics.nodeState.regulated += 1
            } else {
              fcsReactomeKey[id] = { pathwayID: '' + entityElem.toplevelId, proteomics: { available: true, foldChanges: [{ value: val, symbol: entityElem.name }], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 1 } }, transcriptomics: { available: false, foldChanges: [], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 0 } }, metabolomics: { available: false, foldChanges: [], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 0 } } }
            }
          }
        }
      }
      for (const entry in pathwayData.entries.transcriptomics.measured) {
        const measureEntry = pathwayData.entries.transcriptomics.measured[entry] as {value: number, forms: { [key: string]: {name: string, toplevelId: number[] }}}
        const val = measureEntry.value
        for (const entity in measureEntry.forms) {
          const entityElem = measureEntry.forms[entity]
          for (const id of entityElem.toplevelId) {
            fcs.gen[id] = val
            const totalAmount = ('children' in this.currentGraphJson.nodes[id]) ? this.currentGraphJson.nodes[id].children.length : 1
            if (id in fcsReactomeKey) {
              fcsReactomeKey[id].transcriptomics.available = true
              fcsReactomeKey[id].transcriptomics.foldChanges.push({ value: val, symbol: entityElem.name })
              fcsReactomeKey[id].transcriptomics.nodeState.regulated += 1
            } else {
              fcsReactomeKey[id] = { pathwayID: '' + entityElem.toplevelId, transcriptomics: { available: true, foldChanges: [{ value: val, symbol: entityElem.name }], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 1 } }, proteomics: { available: false, foldChanges: [], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 0 } }, metabolomics: { available: false, foldChanges: [], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 0 } } }
            }
          }
        }
      }
      for (const entry in pathwayData.entries.metabolomics.measured) {
        const measureEntry = pathwayData.entries.metabolomics.measured[entry] as {value: number, forms: { [key: string]: {name: string, toplevelId: number[] }}}
        const val = measureEntry.value
        for (const entity in measureEntry.forms) {
          const entityElem = measureEntry.forms[entity]
          for (const id of entityElem.toplevelId) {
            fcs.chem[id] = val
            const totalAmount = ('children' in this.currentGraphJson.nodes[id]) ? this.currentGraphJson.nodes[id].children.length : 1
            if (id in fcsReactomeKey) {
              fcsReactomeKey[id].metabolomics.available = true
              fcsReactomeKey[id].metabolomics.foldChanges.push({ value: val, symbol: entityElem.name })
              fcsReactomeKey[id].metabolomics.nodeState.regulated += 1
            } else {
              fcsReactomeKey[id] = { pathwayID: '' + entityElem.toplevelId, metabolomics: { available: true, foldChanges: [{ value: val, symbol: entityElem.name }], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 1 } }, transcriptomics: { available: false, foldChanges: [], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 0 } }, proteomics: { available: false, foldChanges: [], meanFoldchange: val, nodeState: { total: totalAmount, regulated: 0 } } }
            }
          }
        }
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
