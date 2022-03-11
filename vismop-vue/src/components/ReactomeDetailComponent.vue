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
import { layoutJSON } from '../core/reactomeTypes'
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
          console.log(this.currentLayoutJson)
          this.drawDetailView()
        }).then(() => this.$store.dispatch('setOverlay', false))
    },
    drawDetailView () {
      this.currentView?.clearView()
      const fcs: {prot: { [key: number]: number}, gen:{ [key: number]: number}, chem:{ [key: number]: number} } = { prot: {}, gen: {}, chem: {} }
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
          }
        }
      }
      for (const entry in pathwayData.entries.transcriptomics.measured) {
        const measureEntry = pathwayData.entries.transcriptomics.measured[entry] as {value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
        const val = measureEntry.value
        for (const entity in measureEntry.forms) {
          const entityElem = measureEntry.forms[entity]
          for (const id of entityElem.toplevelId) {
            fcs.gen[id] = val
          }
        }
      }
      for (const entry in pathwayData.entries.metabolomics.measured) {
        const measureEntry = pathwayData.entries.metabolomics.measured[entry] as {value: number, forms: {[key: string]: {name: string, toplevelId: number[]}}}
        const val = measureEntry.value
        for (const entity in measureEntry.forms) {
          const entityElem = measureEntry.forms[entity]
          for (const id of entityElem.toplevelId) {
            fcs.chem[id] = val
          }
        }
      }
      this.currentView = new ReactomeDetailView(this.currentLayoutJson, '#' + this.contextID, fcs)
    },
    expandComponent () {
      this.expandButton = !this.expandButton
    },
    minimizeComponent () {
      this.minimizeButton = !this.minimizeButton
    },
    refreshSize () {
      this.currentView?.refreshSize()
    }
  }
})
</script>
