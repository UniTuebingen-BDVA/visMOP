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
      <v-chip v-for="variable in chosenOmics" :key="variable">
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

          <v-text-field
            :rules="sheetRules"
            label="Sheet Number"
            :value="transcriptomicsSheetVal"
            v-model="transcriptomicsSheetVal"
            :disabled="overlay"
          ></v-text-field>

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
          <v-row v-for="variable in sliderTranscriptomics" :key="variable.text">
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

          <v-text-field
            :rules="sheetRules"
            label="Sheet Number"
            :value="proteomicsSheetVal"
            v-model="proteomicsSheetVal"
            :disabled="overlay"
          ></v-text-field>

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
          <v-row v-for="variable in sliderProteomics" :key="variable.text">
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

          <v-text-field
            :rules="sheetRules"
            label="Sheet Number"
            :value="metabolomicsSheetVal"
            v-model="metabolomicsSheetVal"
            :disabled="overlay"
          ></v-text-field>

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
          <v-row v-for="variable in sliderMetabolomics" :key="variable.text">
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
    <!-- </v-expansion-panels> -->
    <!-- <v-spacer></v-spacer> -->
    <!-- <v-expansion-panels> -->
      <v-expansion-panel>
        <v-expansion-panel-header> Layout Attributes </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-select
            :items="layoutOmics"
            v-model="currentLayoutOmic"
            label="Omic Type"
            @click="lockHover"
            @input="unlockHover"
          ></v-select>
          <v-spacer></v-spacer>
          <div v-if="currentLayoutOmic != ''">
          <v-select
            :items="layoutAttributes"
            v-model="chosenLayoutAttributes"
            label="Attributes"
            @click="lockHover"
            @input="unlockHover"
            multiple
          ></v-select>
          <v-spacer></v-spacer>
          <v-row v-if="currentLayoutOmic != 'not related to specific omic'">
            <v-text-field
                  v-model="omicLimitMin"
                  type="number"
                  step="0.1"
                  class="mt-4 mr-5 ml-3"
                  style="width: 30px"
                  label="minimal FC limit"
                ></v-text-field>
          <v-text-field
                  v-model="omicLimitMax"
                  type="number"
                  step="0.1"
                  class="mt-4 ml-2 mr-5"
                  style="width: 30px"
                  label="maximal FC limit"
                ></v-text-field>
          </v-row>
          </div>

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

interface layoutSettings{
    'Transcriptomics ': { attributes: string[], limits: number[]};
    'Proteomics ': { attributes: string[], limits: number[]};
    'Metabolomics ': { attributes: string[], limits: number[]};
    'not related to specific omic ': { attributes: string[], limits: number[] };
}
interface Data {
  overlay: boolean;
  transcriptomicsFile: File | null;
  transcriptomicsSheetVal: string;
  transcriptomicsSymbolCol: string;
  transcriptomicsValueCol: string;
  chosenLayoutAttributes: string[];
  layoutAttributes: string [];
  recievedTranscriptomicsData: boolean;
  allOmicLayoutAttributes: string[];
  allNoneOmicAttributes: string[];
  proteomicsFile: File | null;
  proteomicsSheetVal: string;
  proteomicsSymbolCol: string;
  proteomicsValueCol: string;
  recievedProteomicsData: boolean;
  metabolomicsFile: File | null;
  metabolomicsSheetVal: string;
  metabolomicsSymbolCol: string;
  metabolomicsValueCol: string;
  currentLayoutOmic: string;
  recievedMetabolomicsData: boolean;
  targetOrganisms: { text: string; value: string }[];
  targetOrganism: string;
  targetDatabases: { text: string; value: string }[];
  targetDatabase: string;
  reactomeLevelSelection: number;
  sliderVals: {
    transcriptomics: { [key: string]: { vals: number[]; empties: boolean } };
    proteomics: { [key: string]: { vals: number[]; empties: boolean } };
    metabolomics: { [key: string]: { vals: number[]; empties: boolean } };
  };
  availableOmics: string[];
  sheetRules(value: string): boolean | string;
}

export default Vue.extend({
  name: 'SideBar',
  components: {},

  data: () => ({
    transcriptomicsFile: null,
    transcriptomicsSheetVal: '0',
    transcriptomicsSymbolCol: '',
    transcriptomicsValueCol: '',
    recievedTranscriptomicsData: false,
    currentLayoutOmic: '',
    chosenLayoutAttributes: [''],
    allOmicLayoutAttributes: ['Number of values', 'Mean expression above limit', '% values above limit',
      'Mean expression below limit ', '% values below limit ', '% regulated', '% unregulated', '% with measured value'],
    allNoneOmicAttributes: ['Pathway size'],
    layoutOmics: [''],
    omicLimitMin: -1.3,
    omicLimitMax: 1.3,
    layoutAttributes: [''],
    // currentLayoutOmicLimit: [],
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
    sliderVals: { transcriptomics: {}, proteomics: {}, metabolomics: {} } as {
      transcriptomics: { [key: string]: { vals: number[]; empties: boolean } };
      proteomics: { [key: string]: { vals: number[]; empties: boolean } };
      metabolomics: { [key: string]: { vals: number[]; empties: boolean } };
    },
    availableOmics: ['Transcriptomics ', 'Proteomics ', 'Metabolomics ', 'not related to specific omic '],
    layoutSettings: { 'Transcriptomics ': { attributes: [''], limits: [-1.3, 1.3] }, 'Proteomics ': { attributes: [''], limits: [0.8, 1.2] }, 'Metabolomics ': { attributes: [''], limits: [0.8, 1.2] }, 'not related to specific omic ': { attributes: [''], limits: [0, 0] } },
    sheetRules: [
      (value: string) => {
        const pattern = /^([0-9]*)$/
        return pattern.test(value) || 'Enter a number'
      }
    ]
  }),
  mounted () {
    this.layoutSettings['Transcriptomics '].attributes = this.allOmicLayoutAttributes
    this.layoutSettings['Proteomics '].attributes = this.allOmicLayoutAttributes
    this.layoutSettings['Metabolomics '].attributes = this.allOmicLayoutAttributes
    this.layoutSettings['not related to specific omic '].attributes = this.allNoneOmicAttributes
  },
  computed: {
    ...mapState({
      transcriptomicsTableHeaders: (state: any) =>
        state.transcriptomicsTableHeaders,
      proteomicsTableHeaders: (state: any) => state.proteomicsTableHeaders,
      metabolomicsTableHeaders: (state: any) => state.metabolomicsTableHeaders,
      transcriptomicsTableData: (state: any) => state.transcriptomicsTableData,
      proteomicsTableData: (state: any) => state.proteomicsTableData,
      metabolomicsTableData: (state: any) => state.metabolomicsTableData,
      overlay: (state: any) => state.overlay
    }),
    chosenOmics: {
      get: function () {
        const chosen = []
        if (
          this.recievedTranscriptomicsData &&
          this.transcriptomicsSymbolCol !== '' &&
          this.transcriptomicsValueCol !== ''
        ) { chosen.push('Transcriptomics') }
        if (
          this.recievedProteomicsData &&
          this.proteomicsSymbolCol !== '' &&
          this.proteomicsValueCol !== ''
        ) { chosen.push('Proteomics') }
        if (
          this.recievedMetabolomicsData &&
          this.metabolomicsSymbolCol !== '' &&
          this.metabolomicsValueCol !== ''
        ) { chosen.push('Metabolomics') }
        return chosen
      }
    },
    sliderTranscriptomics: {
      get: function () {
        const outObj: {
          [key: string]: {
            min: number;
            max: number;
            step: number;
            text: string;
          };
        } = {}
        const typedArrayData = this.transcriptomicsTableData as [
          { [key: string]: number }
        ]
        const typedArrayHeader = this.transcriptomicsTableHeaders as [
          { [key: string]: string }
        ]
        typedArrayHeader.forEach((element) => {
          if (element.value !== 'available') {
            const valArr = typedArrayData.map((elem) => elem[element.value])
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
              outObj[element.value] = {
                min: min,
                max: max,
                step: (Math.abs(min) + Math.abs(max)) / 100,
                text: element.value
              }
              if (
                !Object.keys(this.sliderVals.transcriptomics).includes(
                  element.value
                )
              ) {
                this.sliderVals.transcriptomics[element.value] = {
                  vals: [min, max],
                  empties: true
                }
              }
              console.log(element.value, this.sliderVals)
            }
          }
        })
        return outObj
      }
    },
    sliderProteomics: {
      get: function () {
        const outObj: {
          [key: string]: {
            min: number;
            max: number;
            step: number;
            text: string;
          };
        } = {}
        const typedArrayData = this.proteomicsTableData as [
          { [key: string]: number }
        ]
        const typedArrayHeader = this.proteomicsTableHeaders as [
          { [key: string]: string }
        ]

        typedArrayHeader.forEach((element) => {
          if (element.value !== 'available') {
            const valArr = typedArrayData.map((elem) => elem[element.value])
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
              outObj[element.value] = {
                min: min,
                max: max,
                step: (Math.abs(min) + Math.abs(max)) / 100,
                text: element.value
              }
              if (
                !Object.keys(this.sliderVals.proteomics).includes(element.value)
              ) {
                this.sliderVals.proteomics[element.value] = {
                  vals: [min, max],
                  empties: true
                }
              }
              console.log(element.value, this.sliderVals)
            }
          }
        })
        return outObj
      }
    },
    sliderMetabolomics: {
      get: function () {
        const outObj: {
          [key: string]: {
            min: number;
            max: number;
            step: number;
            text: string;
          };
        } = {}
        const typedArrayData = this.metabolomicsTableData as [
          { [key: string]: number }
        ]
        const typedArrayHeader = this.metabolomicsTableHeaders as [
          { [key: string]: string }
        ]

        typedArrayHeader.forEach((element) => {
          if (element.value !== 'available') {
            const valArr = typedArrayData.map((elem) => elem[element.value])
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
              outObj[element.value] = {
                min: min,
                max: max,
                step: (Math.abs(min) + Math.abs(max)) / 100,
                text: element.value
              }
              if (
                !Object.keys(this.sliderVals.metabolomics).includes(
                  element.value
                )
              ) {
                this.sliderVals.metabolomics[element.value] = {
                  vals: [min, max],
                  empties: true
                }
              }
              console.log(element.value, this.sliderVals)
            }
          }
        })
        return outObj
      }
    }
  },

  watch: {
    chosenOmics: function () {
      this.layoutOmics = this.chosenOmics.concat('not related to specific omic')
    },
    currentLayoutOmic: function () {
      // change dropdown list Attributes
      this.layoutAttributes = (this.currentLayoutOmic === 'not related to specific omic') ? this.allNoneOmicAttributes : this.allOmicLayoutAttributes
      this.chosenLayoutAttributes = this.layoutSettings[this.currentLayoutOmic + ' ' as keyof layoutSettings].attributes
      // console.log(typeof (this.layoutSettings))
      // change limits
      const limits = this.layoutSettings[this.currentLayoutOmic + ' ' as keyof layoutSettings].limits
      this.omicLimitMin = limits[0]
      this.omicLimitMax = limits[1]
    },
    omicLimitMin: function () {
      this.layoutSettings[this.currentLayoutOmic + ' ' as keyof layoutSettings].limits[0] = this.omicLimitMin
    },
    omicLimitMax: function () {
      this.layoutSettings[this.currentLayoutOmic + ' ' as keyof layoutSettings].limits[1] = this.omicLimitMax
    },
    chosenLayoutAttributes: function () {
      // save choosen Layout attribute for omic
      this.layoutSettings[this.currentLayoutOmic + ' ' as keyof layoutSettings].attributes = this.chosenLayoutAttributes
    },
    transcriptomicsSheetVal: function () {
      this.fetchTranscriptomicsTable(this.transcriptomicsFile)
    },
    proteomicsSheetVal: function () {
      this.fetchProteomicsTable(this.proteomicsFile)
    },
    metabolomicsSheetVal: function () {
      this.fetchMetabolomicsTable(this.metabolomicsFile)
    }
  },

  methods: {
    fetchTranscriptomicsTable (fileInput: File | null) {
      this.$store.dispatch('setTranscriptomicsTableHeaders', [])
      this.$store.dispatch('setTranscriptomicsTableData', [])
      this.$store.dispatch('setTranscriptomicsData', [])
      Vue.set(this.sliderVals, 'transcriptomics', {})
      if (fileInput !== null) {
        this.$store.dispatch('setOverlay', true)
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
          .then(() => this.$store.dispatch('setOverlay', false))
      } else {
        // more errorhandling?
        this.recievedTranscriptomicsData = false
        console.log('Transcriptomics file Cleared')
      }
    },

    fetchProteomicsTable (fileInput: File | null) {
      this.$store.dispatch('setProteomicsTableHeaders', [])
      this.$store.dispatch('setProteomicsTableData', [])
      this.$store.dispatch('setProteomicsData', [])
      Vue.set(this.sliderVals, 'proteomics', {})
      if (fileInput !== null) {
        this.$store.dispatch('setOverlay', true)
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
            this.$store.dispatch('setProteomicsData', responseContent.data)
            this.recievedProteomicsData = true
          })
          .then(() => this.$store.dispatch('setOverlay', false))
      } else {
        // more errorhandling?
        this.recievedProteomicsData = false
        console.log('Protfile Cleared')
      }
    },
    fetchMetabolomicsTable (fileInput: File | null) {
      this.$store.dispatch('setMetabolomicsTableHeaders', [])
      this.$store.dispatch('setMetabolomicsTableData', [])
      this.$store.dispatch('setMetabolomicsData', [])
      Vue.set(this.sliderVals, 'metabolomics', {})
      if (fileInput !== null) {
        this.$store.dispatch('setOverlay', true)
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
            this.$store.dispatch('setMetabolomicsData', responseContent.data)
            this.recievedMetabolomicsData = true
          })
          .then(() => this.$store.dispatch('setOverlay', false))
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
        sliderVals: this.sliderVals,
        layoutSettings: this.layoutSettings
      }
      fetch('/reactome_parsing', {
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
          this.$store.dispatch(
            'setUsedSymbolCols',
            dataContent.used_symbol_cols
          )
          this.$store.dispatch('setFCSReactome', dataContent.fcs)
        })
        .then(() => this.getReactomeData())
    },

    getReactomeData () {
      fetch('/reactome_overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => response.json())
        .then((dataContent) => {
          this.$store.dispatch('setOverviewData', dataContent.overviewData)
          this.$store.dispatch('setModuleAreas', dataContent.moduleAreas)
          this.$store.dispatch(
            'setPathwayLayoutingReactome',
            dataContent.pathwayLayouting
          )
          // this.$store.dispatch('setOverviewData', dataContent.overview_data)
        })
        .then(() => this.$store.dispatch('setOverlay', false))
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
        sliderVals: this.sliderVals,
        layoutSettings: this.layoutSettings
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
          this.$store.dispatch('setModuleAreas', dataContent.moduleAreas)
          this.$store.dispatch(
            'setPathayAmountDict',
            dataContent.pathways_amount_dict
          )
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
          this.$store.dispatch(
            'setUsedSymbolCols',
            dataContent.used_symbol_cols
          )
          this.$store.dispatch(
            'setPathwayLayoutingKegg',
            dataContent.pathwayLayouting
          )
        })
        .then((val) => {
          if (val) {
            alert(
              'Empty Data Selection! Adjust data source and/or filter settings'
            )
          }
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
