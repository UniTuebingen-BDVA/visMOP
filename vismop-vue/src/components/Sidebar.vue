<template>
  <v-list nav dense>
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
          <v-range-slider
            v-for="variable in sliderTranscriptomics"
            v-model="sliderVals.transcriptomics[variable.text]"
            :key="variable.text"
            :max="variable.max"
            :min="variable.min"
            :step="variable.step"
            :hint="variable.text"
            thumb-label
            persistent-hint
          >
          </v-range-slider>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header> Proteomics Data </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-file-input
            v-on:change="fetchProteomicsTable"
            chips
            label=".xlsx File Input"
          ></v-file-input>

          <v-spacer></v-spacer>

          <v-text-field :rules="sheetRules" label="Sheet Number" :value="proteomicsSheetVal" :v-model="proteomicsSheetVal"></v-text-field>

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
          <v-range-slider
            v-for="variable in sliderProteomics"
            v-model="sliderVals.proteomics[variable.text]"
            :key="variable.text"
            :max="variable.max"
            :min="variable.min"
            :step="variable.step"
            :hint="variable.text"
            thumb-label
            persistent-hint
          >
          </v-range-slider>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header> Metabolomics Data </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-file-input
            v-on:change="fetchMetabolomicsTable"
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
          <v-range-slider
            v-for="variable in sliderMetabolomics"
            v-model="sliderVals.metabolomics[variable.text]"
            :key="variable.text"
            :max="variable.max"
            :min="variable.min"
            :step="variable.step"
            :hint="variable.text"
            thumb-label
            persistent-hint
          >
          </v-range-slider>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-btn v-on:click="generateKGMLs">Plot</v-btn>
  </v-list>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import Vue from 'vue'

export default Vue.extend({
  name: 'SideBar',
  components: {},

  data: () => ({
    overlay: false,
    transcriptomicsSheetVal: '0',
    transcriptomicsSymbolCol: '',
    transcriptomicsValueCol: '',
    recievedTranscriptomicsData: false,
    proteomicsSheetVal: '0',
    proteomicsSymbolCol: '',
    proteomicsValueCol: '',
    recievedProteomicsData: false,
    metabolomicsSheetVal: '0',
    metabolomicsSymbolCol: '',
    metabolomicsValueCol: '',
    recievedMetabolomicsData: false,
    sliderVals: { transcriptomics: {}, proteomics: {}, metabolomics: {} } as { transcriptomics: {[key: string]: number[]}, proteomics: {[key: string]: number[]}, metabolomics: {[key: string]: number[]} },
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
          if (valArr.every((val) => typeof val === 'number')) {
            console.log(element.value, valArr)
            const min = Math.floor(Math.min(...valArr))
            const max = Math.ceil(Math.max(...valArr))
            outObj[element.value] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.value }
            if (!Object.keys(this.sliderVals.transcriptomics).includes(element.value)) {
              this.sliderVals.transcriptomics[element.value] = [min, max]
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
          if (valArr.every((val) => typeof val === 'number')) {
            console.log(element.value, valArr)
            const min = Math.floor(Math.min(...valArr))
            const max = Math.ceil(Math.max(...valArr))
            outObj[element.value] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.value }
            if (!Object.keys(this.sliderVals.proteomics).includes(element.value)) {
              this.sliderVals.proteomics[element.value] = [min, max]
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
          if (valArr.every((val) => typeof val === 'number')) {
            console.log(element.value, valArr)
            const min = Math.floor(Math.min(...valArr))
            const max = Math.ceil(Math.max(...valArr))
            outObj[element.value] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.value }
            if (!Object.keys(this.sliderVals.metabolomics).includes(element.value)) {
              this.sliderVals.metabolomics[element.value] = [min, max]
            }
            console.log(element.value, this.sliderVals)
          }
        })
        return outObj
      }
    }
  },

  watch: {},

  // functions to call on mount (after DOM etc. is built)
  mounted () {
    // this.$vuetify.theme.themes.light.primary = '#2196F3';
  },

  methods: {
    fetchTranscriptomicsTable (fileInput: File) {
      if (typeof fileInput !== 'undefined') {
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
        alert('Malformed File!!!')
      }
    },

    fetchProteomicsTable (fileInput: File) {
      if (typeof fileInput !== 'undefined') {
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
        alert('Malformed File!!!')
      }
    },
    fetchMetabolomicsTable (fileInput: File) {
      if (typeof fileInput !== 'undefined') {
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
        alert('Malformed File!!!')
      }
    },
    generateKGMLs () {
      console.log('sliderTest', this.sliderVals)
      this.$store.dispatch('setOverlay', true)
      const payload = {
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
            'setPathwayLayouting',
            dataContent.pathwayLayouting
          )
        })

        .then(() => this.$store.dispatch('setOverlay', false))
    },
    lockHover () {
      this.$store.dispatch('setSideBarExpand', false)
    },
    unlockHover () {
      this.$store.dispatch('setSideBarExpand', true)
    }
  }
})
</script>
