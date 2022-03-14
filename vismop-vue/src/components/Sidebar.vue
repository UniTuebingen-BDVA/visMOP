<template>
  <v-list nav dense>
    <v-select
      :items="targetDatabases"
      label="Target Database"
      v-model="targetDatabase"
      v-on:change="setTargetDatabase"
      @click="lockHover"
      @input="unlockHover"
    ></v-select>
    <div v-if="targetDatabase === 'reactome'">
      <v-text-field :rules="sheetRules" label="Reactome Target Tier" :value="reactomeLevelSelection" v-model="reactomeLevelSelection"></v-text-field>
    </div>
    <v-select
      :items="targetOrganisms"
      label="Target Organism"
      v-model="targetOrganism"
      @click="lockHover"
      @input="unlockHover"
    ></v-select>
      Selected Omics:
      {{ chosenOmics.length }}
    <v-chip-group active-class="primary--text" column>
      <v-chip
        v-for="variable in chosenOmics"
        :key="variable"
      >
        {{ variable }}
      </v-chip>
    </v-chip-group>
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-header>
          Transcriptomics Data
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-file-input
            v-on:change="fetchTranscriptomicsTable"
            v-model="transcriptomicsFile"
            chips
            label=".xlsx File Input"
          ></v-file-input>

          <v-spacer></v-spacer>

          <v-text-field :rules="sheetRules" label="Sheet Number" :value="transcriptomicsSheetVal" v-model="transcriptomicsSheetVal"></v-text-field>

          <v-spacer></v-spacer>

          <v-select
            :items="transcriptomicsTableHeaders"
            v-model="transcriptomicsSymbolCol"
            label="Genesymbol Col."
            @click="lockHover"
            @input="unlockHover"
          ></v-select>

          <v-spacer></v-spacer>

          <v-select
            :items="transcriptomicsTableHeaders"
            v-model="transcriptomicsValueCol"
            label="Value Col."
            @click="lockHover"
            @input="unlockHover"
          ></v-select>
          <v-spacer></v-spacer>
          Input Filter:
          <v-row
            v-for="variable in sliderTranscriptomics"
            :key="variable.text"
          >
            <v-checkbox
              v-model="sliderVals.transcriptomics[variable.text].empties"
              :label="'Empties'"
            ></v-checkbox>
            <v-range-slider
              v-model="sliderVals.transcriptomics[variable.text].vals"
              :max="variable.max"
              :min="variable.min"
              :step="variable.step"
              :hint="variable.text"
              thumb-label
              persistent-hint
            >
            </v-range-slider>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header> Proteomics Data </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-file-input
            v-on:change="fetchProteomicsTable"
            v-model="proteomicsFile"
            chips
            label=".xlsx File Input"
          ></v-file-input>

          <v-spacer></v-spacer>

          <v-text-field :rules="sheetRules" label="Sheet Number" :value="proteomicsSheetVal" v-model="proteomicsSheetVal"></v-text-field>

          <v-spacer></v-spacer>

          <v-select
            :items="proteomicsTableHeaders"
            v-model="proteomicsSymbolCol"
            label="Symbol Col."
            @click="lockHover"
            @input="unlockHover"
          ></v-select>

          <v-spacer></v-spacer>

          <v-select
            :items="proteomicsTableHeaders"
            v-model="proteomicsValueCol"
            label="Value Col."
            @click="lockHover"
            @input="unlockHover"
          ></v-select>
          <v-spacer></v-spacer>
          Input Filter:
           <v-row
            v-for="variable in sliderProteomics"
            :key="variable.text"
          >
            <v-checkbox
              v-model="sliderVals.proteomics[variable.text].empties"
              :label="'Empties'"
            ></v-checkbox>
            <v-range-slider
              v-model="sliderVals.proteomics[variable.text].vals"
              :max="variable.max"
              :min="variable.min"
              :step="variable.step"
              :hint="variable.text"
              thumb-label
              persistent-hint
            >
            </v-range-slider>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header> Metabolomics Data </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-file-input
            v-on:change="fetchMetabolomicsTable"
            v-model="metabolomicsFile"
            chips
            label=".xlsx File Input"
          ></v-file-input>

          <v-spacer></v-spacer>

          <v-text-field :rules="sheetRules" label="Sheet Number" :value="metabolomicsSheetVal" v-model="metabolomicsSheetVal"></v-text-field>

          <v-spacer></v-spacer>

          <v-select
            :items="metabolomicsTableHeaders"
            v-model="metabolomicsSymbolCol"
            label="Symbol Col."
            @click="lockHover"
            @input="unlockHover"
          ></v-select>

          <v-spacer></v-spacer>

          <v-select
            :items="metabolomicsTableHeaders"
            v-model="metabolomicsValueCol"
            label="Value Col."
            @click="lockHover"
            @input="unlockHover"
          ></v-select>
          <v-spacer></v-spacer>
          Input Filter:
          <v-row
            v-for="variable in sliderMetabolomics"
            :key="variable.text"
          >
            <v-checkbox
              v-model="sliderVals.metabolomics[variable.text].empties"
              :label="'Empties'"
            ></v-checkbox>
            <v-range-slider
              v-model="sliderVals.metabolomics[variable.text].vals"
              :max="variable.max"
              :min="variable.min"
              :step="variable.step"
              :hint="variable.text"
              thumb-label
              persistent-hint
            >
            </v-range-slider>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-btn v-on:click="dataQuery">Plot</v-btn>
  </v-list>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import Vue from 'vue'
import { Function } from 'lodash'

interface Data{
   overlay: boolean,
  transcriptomicsFile: File | null,
  transcriptomicsSheetVal: string,
  transcriptomicsSymbolCol: string,
  transcriptomicsValueCol: string,
  recievedTranscriptomicsData: boolean,
  proteomicsFile: File | null,
  proteomicsSheetVal: string,
  proteomicsSymbolCol: string,
  proteomicsValueCol: string,
  recievedProteomicsData: boolean,
  metabolomicsFile: File | null,
  metabolomicsSheetVal: string,
  metabolomicsSymbolCol: string,
  metabolomicsValueCol: string,
  recievedMetabolomicsData: boolean,
  targetOrganisms: { text: string, value: string}[],
  targetOrganism: string,
  targetDatabases: { text: string, value: string}[],
  targetDatabase: string,
  reactomeLevelSelection: number,
  sliderVals: { transcriptomics: {[key: string]: {vals: number[], empties: boolean}}, proteomics: {[key: string]: {vals: number[], empties: boolean}}, metabolomics: {[key: string]: {vals: number[], empties: boolean}} },
  sheetRules(value: string): boolean | string
}

export default Vue.extend({
  name: 'SideBar',
  components: {},

  data: () => ({
    overlay: false,
    transcriptomicsFile: null,
    transcriptomicsSheetVal: '0',
    transcriptomicsSymbolCol: '',
    transcriptomicsValueCol: '',
    recievedTranscriptomicsData: false,
    proteomicsFile: null,
    proteomicsSheetVal: '0',
    proteomicsSymbolCol: '',
    proteomicsValueCol: '',
    recievedProteomicsData: false,
    metabolomicsFile: null,
    metabolomicsSheetVal: '0',
    metabolomicsSymbolCol: '',
    metabolomicsValueCol: '',
    recievedMetabolomicsData: false,
    targetOrganisms: [
      { text: 'Mouse', value: 'mmu' },
      { text: 'Human', value: 'hsa' }
    ],
    targetOrganism: 'mmu',
    targetDatabases: [
      { text: 'Reactome', value: 'reactome' },
      { text: 'KEGG', value: 'kegg' }
    ],
    targetDatabase: 'reactome',
    reactomeLevelSelection: 1,
    sliderVals: { transcriptomics: {}, proteomics: {}, metabolomics: {} } as { transcriptomics: {[key: string]: {vals: number[], empties: boolean}}, proteomics: {[key: string]: {vals: number[], empties: boolean}}, metabolomics: {[key: string]: {vals: number[], empties: boolean}} },
    sheetRules: [
      (value: string) => {
        const pattern = /^([0-9]*)$/
        return pattern.test(value) || 'Enter a number'
      }
    ]
  }),
  computed: {
    ...mapState({
      transcriptomicsTableHeaders: (state: any) => state.transcriptomicsTableHeaders,
      proteomicsTableHeaders: (state: any) => state.proteomicsTableHeaders,
      metabolomicsTableHeaders: (state: any) => state.metabolomicsTableHeaders,
      transcriptomicsTableData: (state: any) => state.transcriptomicsTableData,
      proteomicsTableData: (state: any) => state.proteomicsTableData,
      metabolomicsTableData: (state: any) => state.metabolomicsTableData
    }),
    chosenOmics: {
      get: function () {
        const chosen = []
        if (this.recievedTranscriptomicsData) chosen.push('Transcriptomics')
        if (this.recievedProteomicsData) chosen.push('Proteomics')
        if (this.recievedMetabolomicsData) chosen.push('Metabolomics')
        return chosen
      }
    },
    sliderTranscriptomics: {
      get: function () {
        const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
        const typedArrayData = this.transcriptomicsTableData as [{[key: string]: number}]
        const typedArrayHeader = this.transcriptomicsTableHeaders as [{[key: string]: string}]

        typedArrayHeader.forEach(element => {
          const valArr = typedArrayData.map(elem => elem[element.value])
          const numArr: number[] = []
          let amtNum = 0
          let amtNonNum = 0
          let empties = 0
          valArr.forEach((val) => {
            if (typeof val === 'number') {
              amtNum += 1
              numArr.push(val)
            } else if (val === 'None') {
              empties += 1
            } else amtNonNum += 1
          })
          if (amtNonNum / (amtNum + amtNonNum) <= 0.25) {
            console.log(element.value, numArr)
            const min = Math.floor(Math.min(...numArr))
            const max = Math.ceil(Math.max(...numArr))
            outObj[element.value] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.value }
            if (!Object.keys(this.sliderVals.transcriptomics).includes(element.value)) {
              this.sliderVals.transcriptomics[element.value] = { vals: [min, max], empties: true }
            }
            console.log(element.value, this.sliderVals)
          }
        })
        return outObj
      }
    },
    sliderProteomics: {
      get: function () {
        const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
        const typedArrayData = this.proteomicsTableData as [{[key: string]: number}]
        const typedArrayHeader = this.proteomicsTableHeaders as [{[key: string]: string}]

        typedArrayHeader.forEach(element => {
          const valArr = typedArrayData.map(elem => elem[element.value])
          const numArr: number[] = []
          let amtNum = 0
          let amtNonNum = 0
          let empties = 0
          valArr.forEach((val) => {
            if (typeof val === 'number') {
              amtNum += 1
              numArr.push(val)
            } else if (val === 'None') {
              empties += 1
            } else amtNonNum += 1
          })
          if (amtNonNum / (amtNum + amtNonNum) <= 0.25) {
            console.log(element.value, numArr)
            const min = Math.floor(Math.min(...numArr))
            const max = Math.ceil(Math.max(...numArr))
            outObj[element.value] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.value }
            if (!Object.keys(this.sliderVals.proteomics).includes(element.value)) {
              this.sliderVals.proteomics[element.value] = { vals: [min, max], empties: true }
            }
            console.log(element.value, this.sliderVals)
          }
        })
        return outObj
      }
    },
    sliderMetabolomics: {
      get: function () {
        const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
        const typedArrayData = this.metabolomicsTableData as [{[key: string]: number}]
        const typedArrayHeader = this.metabolomicsTableHeaders as [{[key: string]: string}]

        typedArrayHeader.forEach(element => {
          const valArr = typedArrayData.map(elem => elem[element.value])
          const numArr: number[] = []
          let amtNum = 0
          let amtNonNum = 0
          let empties = 0
          valArr.forEach((val) => {
            if (typeof val === 'number') {
              amtNum += 1
              numArr.push(val)
            } else if (val === 'None') {
              empties += 1
            } else amtNonNum += 1
          })
          if (amtNonNum / (amtNum + amtNonNum) <= 0.25) {
            console.log(element.value, numArr)
            const min = Math.floor(Math.min(...numArr))
            const max = Math.ceil(Math.max(...numArr))
            outObj[element.value] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.value }
            if (!Object.keys(this.sliderVals.metabolomics).includes(element.value)) {
              this.sliderVals.metabolomics[element.value] = { vals: [min, max], empties: true }
            }
            console.log(element.value, this.sliderVals)
          }
        })
        return outObj
      }
    }
  },

  watch: {
    transcriptomicsSheetVal: function () { this.fetchTranscriptomicsTable(this.transcriptomicsFile) },
    proteomicsSheetVal: function () { this.fetchProteomicsTable(this.transcriptomicsFile) },
    metabolomicsSheetVal: function () { this.fetchMetabolomicsTable(this.transcriptomicsFile) }
  },

  // functions to call on mount (after DOM etc. is built)
  mounted () {
    // this.$vuetify.theme.themes.light.primary = '#2196F3';
  },

  methods: {
    fetchTranscriptomicsTable (fileInput: File | null) {
      this.$store.dispatch(
        'setTranscriptomicsTableHeaders',
        []
      )
      this.$store.dispatch(
        'setTranscriptomicsTableData',
        []
      )
      this.$store.dispatch(
        'setTranscriptomicsData',
        []
      )
      Vue.set(this.sliderVals, 'transcriptomics', {})
      if (fileInput !== null) {
        this.overlay = true
        const formData = new FormData()
        formData.append('dataTable', fileInput)
        formData.append('sheetNumber', this.transcriptomicsSheetVal)
        fetch('/transcriptomics_table', {
          method: 'POST',
          headers: {},
          body: formData
        })
          .then((response) => response.json())
          .then((responseContent) => {
            this.$store.dispatch(
              'setTranscriptomicsTableHeaders',
              responseContent.header
            )
            this.$store.dispatch(
              'setTranscriptomicsTableData',
              responseContent.entries
            )
            this.$store.dispatch(
              'setTranscriptomicsData',
              JSON.parse(responseContent.data)
            )
            this.recievedTranscriptomicsData = true
          })
          .then(() => (this.overlay = false))
      } else {
        // more errorhandling?
        this.recievedTranscriptomicsData = false
        console.log('Transcriptomics file Cleared')
      }
    },

    fetchProteomicsTable (fileInput: File | null) {
      this.$store.dispatch(
        'setProteomicsTableHeaders',
        []
      )
      this.$store.dispatch(
        'setProteomicsTableData',
        []
      )
      this.$store.dispatch(
        'setProteomicsData',
        []
      )
      Vue.set(this.sliderVals, 'proteomics', {})
      if (fileInput !== null) {
        this.overlay = true
        const formData = new FormData()
        formData.append('dataTable', fileInput)
        formData.append('sheetNumber', this.proteomicsSheetVal)

        fetch('/proteomics_table', {
          method: 'POST',
          headers: {},
          body: formData

        })
          .then((response) => response.json())

          .then((responseContent) => {
            this.$store.dispatch(
              'setProteomicsTableHeaders',
              responseContent.header
            )
            this.$store.dispatch(
              'setProteomicsTableData',
              responseContent.entries
            )
            this.$store.dispatch(
              'setProteomicsData',
              responseContent.data
            )
            this.recievedProteomicsData = true
          })
          .then(() => (this.overlay = false))
      } else {
        // more errorhandling?
        this.recievedProteomicsData = false
        console.log('Protfile Cleared')
      }
    },
    fetchMetabolomicsTable (fileInput: File | null) {
      this.$store.dispatch(
        'setMetabolomicsTableHeaders',
        []
      )
      this.$store.dispatch(
        'setMetabolomicsTableData',
        []
      )
      this.$store.dispatch(
        'setMetabolomicsData',
        []
      )
      Vue.set(this.sliderVals, 'metabolomics', {})
      if (fileInput !== null) {
        this.overlay = true
        const formData = new FormData()
        formData.append('dataTable', fileInput)
        formData.append('sheetNumber', this.metabolomicsSheetVal)

        fetch('/metabolomics_table', {
          method: 'POST',
          headers: {},
          body: formData
        })
          .then((response) => response.json())

          .then((responseContent) => {
            this.$store.dispatch(
              'setMetabolomicsTableHeaders',
              responseContent.header
            )
            this.$store.dispatch(
              'setMetabolomicsTableData',
              responseContent.entries
            )
            this.$store.dispatch(
              'setMetabolomicsData',
              responseContent.data
            )
            this.recievedMetabolomicsData = true
          })
          .then(() => (this.overlay = false))
      } else {
        // more errorhandling?
        this.recievedMetabolomicsData = false
        console.log('Metabol. file Cleared')
      }
    },

    dataQuery () {
      if (this.targetDatabase === 'kegg') {
        this.generateKGMLs()
      } else if (this.targetDatabase === 'reactome') {
        this.queryReactome()
      }
    },

    queryReactome () {
      this.$store.dispatch('setOverlay', true)
      const payload = {
        targetOrganism: this.targetOrganism,
        transcriptomics: {
          recieved: this.recievedTranscriptomicsData,
          symbol: this.transcriptomicsSymbolCol,
          value: this.transcriptomicsValueCol
        },
        proteomics: {
          recieved: this.recievedProteomicsData,
          symbol: this.proteomicsSymbolCol,
          value: this.proteomicsValueCol
        },
        metabolomics: {
          recieved: this.recievedMetabolomicsData,
          symbol: this.metabolomicsSymbolCol,
          value: this.metabolomicsValueCol
        },
        sliderVals: this.sliderVals
      }
      fetch('/reactome_parsing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then((response) => response.json())
        .then((dataContent) => {
          if (dataContent === 1) return 1
          this.$store.dispatch('setOmicsRecieved', dataContent.omicsRecieved)
          this.$store.dispatch('setUsedSymbolCols', dataContent.used_symbol_cols)
          this.$store.dispatch('setFCSReactome', dataContent.fcs)
        })
        .then(() => this.getReactomeData())
    },

    getReactomeData () {
      fetch(`/reactome_overview/${this.reactomeLevelSelection}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then((response) => response.json())
        .then((dataContent) => {
          this.$store.dispatch('setOverviewData', dataContent.overviewData)
          this.$store.dispatch('setPathwayLayoutingReactome', dataContent.pathwayLayouting)
          // this.$store.dispatch('setOverviewData', dataContent.overview_data)
        }).then(() => this.$store.dispatch('setOverlay', false))
    },
    generateKGMLs () {
      console.log('sliderTest', this.sliderVals)
      this.$store.dispatch('setOverlay', true)
      const payload = {
        targetOrganism: this.targetOrganism,
        transcriptomics: {
          recieved: this.recievedTranscriptomicsData,
          symbol: this.transcriptomicsSymbolCol,
          value: this.transcriptomicsValueCol
        },
        proteomics: {
          recieved: this.recievedProteomicsData,
          symbol: this.proteomicsSymbolCol,
          value: this.proteomicsValueCol
        },
        metabolomics: {
          recieved: this.recievedMetabolomicsData,
          symbol: this.metabolomicsSymbolCol,
          value: this.metabolomicsValueCol
        },
        sliderVals: this.sliderVals
      }
      fetch('/kegg_parsing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then((response) => response.json())
        .then((dataContent) => {
          if (dataContent === 1) return 1
          this.$store.dispatch('setOmicsRecieved', dataContent.omicsRecieved)
          this.$store.dispatch('setPathayAmountDict', dataContent.pathways_amount_dict)
          this.$store.dispatch('setOverviewData', dataContent.overview_data)
          this.$store.dispatch('setGraphData', dataContent.main_data)
          this.$store.dispatch('setFCS', dataContent.fcs)
          this.$store.dispatch(
            'setTranscriptomicsSymbolDict',
            dataContent.transcriptomics_symbol_dict
          )
          this.$store.dispatch(
            'setProteomicsSymbolDict',
            dataContent.proteomics_symbol_dict
          )
          this.$store.dispatch('setUsedSymbolCols', dataContent.used_symbol_cols)
          this.$store.dispatch(
            'setPathwayLayoutingKegg',
            dataContent.pathwayLayouting
          )
        })
        .then((val) => {
          if (val) alert('Empty Data Selection! Adjust data source and/or filter settings')
          this.$store.dispatch('setOverlay', false)
        })
    },
    lockHover () {
      this.$store.dispatch('setSideBarExpand', false)
    },
    unlockHover () {
      this.$store.dispatch('setSideBarExpand', true)
    },
    setTargetDatabase () {
      this.$store.dispatch('setTargetDatabase', this.targetDatabase)
    }
  }
})
</script>
