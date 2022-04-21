<template>
  <q-list nav class='q-pa-sm'>
    <q-select
      :options="targetDatabases"
      label="Target Database"
      v-model="targetDatabase"
      option-label="text"
      option-value="value"
      @update:model-value="setTargetDatabase"
    ></q-select>
    <q-select
      :options="targetOrganisms"
      label="Target Organism"
      v-model="targetOrganism"
      option-label="text"
      option-value="value"
    ></q-select>
      Selected Omics:
      {{ chosenOmics.length }}
    <!--
    <q-chip-group active-class="primary--text" column>
      <q-chip
        v-for="variable in chosenOmics"
        :key="variable"
      >
        {{ variable }}
      </q-chip>
    </q-chip-group>
    -->
    <q-list padding bordered class="rounded-borders">
      <q-expansion-item
        label = "Transcriptomics Data"
        header-class="bg-primary"
        group="omicsSelect"
      >
        <q-card>
          <q-card-section>
            <q-file
              v-on:update:modelValue="fetchTranscriptomicsTable"
              v-model="transcriptomicsFile"
              chips
              label=".xlsx File Input"
            ></q-file>

            <q-separator></q-separator>

            <q-input :rules="sheetRules" label="Sheet Number" :value="transcriptomicsSheetVal" v-model="transcriptomicsSheetVal" :disable="$q.loading.isActive"></q-input>

            <q-separator></q-separator>

            <q-select
              :options="transcriptomicsTableHeaders"
              v-model="transcriptomicsSymbolCol"
              option-label="label"
              option-value="name"
              label="Genesymbol Col."
            ></q-select>

            <q-separator></q-separator>

            <q-select
              :options="transcriptomicsTableHeaders"
              v-model="transcriptomicsValueCol"
              option-label="label"
              option-value="name"
              label="Value Col."
            ></q-select>
            <q-separator></q-separator>
            Input Filter:
            <div class="row"
              v-for="variable in sliderTranscriptomics"
              :key="variable.text"
            >
              <q-badge color="secondary">
                {{ variable.text }}
              </q-badge>
              <q-checkbox
                v-model="sliderVals.transcriptomics[variable.text].empties"
                :label="'Empties'"
              ></q-checkbox>
              <q-range
                v-model="sliderVals.transcriptomics[variable.text].vals"
                :max="variable.max"
                :min="variable.min"
                :step="variable.step"
                thumb-label
                persistent-hint
              >
              </q-range>
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-separator />

      <q-expansion-item
        label="Proteomics Data"
        group="omicsSelect"

      >
        <q-card>
          <q-card-section>

            <q-file
              v-on:update:modelValue="fetchProteomicsTable"
              v-model="proteomicsFile"
              chips
              label=".xlsx File Input"
            ></q-file>

            <q-separator></q-separator>

            <q-input :rules="sheetRules" label="Sheet Number" :value="proteomicsSheetVal" v-model="proteomicsSheetVal" :disable="$q.loading.isActive"></q-input>

            <q-separator></q-separator>

            <q-select
              :options="proteomicsTableHeaders"
              v-model="proteomicsSymbolCol"
              label="Symbol Col."
              option-label="label"
              option-value="name"
            ></q-select>

            <q-separator></q-separator>

            <q-select
              :options="proteomicsTableHeaders"
              v-model="proteomicsValueCol"
              option-label="label"
              option-value="name"
              label="Value Col."
            ></q-select>
            <q-separator></q-separator>
            Input Filter:
            <div class="row"
              v-for="variable in sliderProteomics"
              :key="variable.text"
            >
              <q-badge color="secondary">
                {{ variable.text }}
              </q-badge>
              <q-checkbox
                v-model="sliderVals.proteomics[variable.text].empties"
                :label="'Empties'"
              ></q-checkbox>
              <q-range
                v-model="sliderVals.proteomics[variable.text].vals"
                :max="variable.max"
                :min="variable.min"
                :step="variable.step"
                :hint="variable.text"
                thumb-label
                persistent-hint
              >
              </q-range>
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-separator />

      <q-expansion-item
        label="Metabolomics Data"
        group="omicsSelect"

      >
        <q-card>
          <q-card-section>
            <q-file
              v-on:update:modelValue="fetchMetabolomicsTable"
              v-model="metabolomicsFile"
              chips
              label=".xlsx File Input"
            ></q-file>

            <q-separator></q-separator>

            <q-input :rules="sheetRules" label="Sheet Number" :value="metabolomicsSheetVal" v-model="metabolomicsSheetVal" :disable="$q.loading.isActive"></q-input>

            <q-separator></q-separator>

            <q-select
              :options="metabolomicsTableHeaders"
              v-model="metabolomicsSymbolCol"
              option-label="label"
              option-value="name"
              label="Symbol Col."
            ></q-select>

            <q-separator></q-separator>

            <q-select
              :options="metabolomicsTableHeaders"
              v-model="metabolomicsValueCol"
              option-label="label"
              option-value="name"
              label="Value Col."
            ></q-select>
            <q-separator></q-separator>
            Input Filter:
            <div class="row"
              v-for="variable in sliderMetabolomics"
              :key="variable.text"
            >
              <q-badge color="secondary">
                {{ variable.text }}
              </q-badge>
              <q-checkbox
                v-model="sliderVals.metabolomics[variable.text].empties"
                :label="'Empties'"
              ></q-checkbox>
              <q-range
                v-model="sliderVals.metabolomics[variable.text].vals"
                :max="variable.max"
                :min="variable.min"
                :step="variable.step"
                :hint="variable.text"
                thumb-label
                persistent-hint
              >
              </q-range>
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-list>
    <q-btn v-on:click="dataQuery">Plot</q-btn>
  </q-list>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { useMainStore } from '@/stores'
import { useQuasar } from 'quasar'

interface Data{
  overlay: boolean,
  transcriptomicsFile: File | null,
  transcriptomicsSheetVal: string,
  transcriptomicsSymbolCol: {field: string, label: string, name: string, align: string},
  transcriptomicsValueCol: {field: string, label: string, name: string, align: string},
  recievedTranscriptomicsData: boolean,
  proteomicsFile: File | null,
  proteomicsSheetVal: string,
  proteomicsSymbolCol: {field: string, label: string, name: string, align: string},
  proteomicsValueCol: {field: string, label: string, name: string, align: string},
  recievedProteomicsData: boolean,
  metabolomicsFile: File | null,
  metabolomicsSheetVal: string,
  metabolomicsSymbolCol: {field: string, label: string, name: string, align: string},
  metabolomicsValueCol: {field: string, label: string, name: string, align: string},
  recievedMetabolomicsData: boolean,
  targetOrganisms: { text: string, value: string}[],
  targetOrganism: string,
  targetDatabases: { text: string, value: string}[],
  targetDatabase: string,
  reactomeLevelSelection: number,
  sliderVals: { transcriptomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}}, proteomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}}, metabolomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}} },
  sheetRules(value: string): boolean | string
}

export default {
  name: 'SideBar',
  components: {},

  data: () => ({
    $q :  useQuasar(),
    transcriptomicsFile: null,
    transcriptomicsSheetVal: '0',
    transcriptomicsSymbolCol: {field: '', label: '', name: '', align: ''},
    transcriptomicsValueCol: {field: '', label: '', name: '', align: ''},
    recievedTranscriptomicsData: false,
    proteomicsFile: null,
    proteomicsSheetVal: '0',
    proteomicsSymbolCol: {field: '', label: '', name: '', align: ''},
    proteomicsValueCol: {field: '', label: '', name: '', align: ''},
    recievedProteomicsData: false,
    metabolomicsFile: null,
    metabolomicsSheetVal: '0',
    metabolomicsSymbolCol: {field: '', label: '', name: '', align: ''},
    metabolomicsValueCol: {field: '', label: '', name: '', align: ''},
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
    sliderVals: { transcriptomics: {}, proteomics: {}, metabolomics: {} } as { transcriptomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}}, proteomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}}, metabolomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}} },
    sheetRules: [
      (value: string) => {
        const pattern = /^([0-9]*)$/
        return pattern.test(value) || 'Enter a number'
      }
    ]
  }),
  computed: {
    ...mapState( useMainStore,[
      'transcriptomicsTableHeaders',
      'proteomicsTableHeaders',
      'metabolomicsTableHeaders',
      'transcriptomicsTableData',
      'proteomicsTableData',
      'metabolomicsTableData',
    ]),
    chosenOmics(): string[] {
        const chosen = []
        if (this.recievedTranscriptomicsData) chosen.push('Transcriptomics')
        if (this.recievedProteomicsData) chosen.push('Proteomics')
        if (this.recievedMetabolomicsData) chosen.push('Metabolomics')
        return chosen
    },
    sliderTranscriptomics () {
        const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
        const typedArrayData = this.transcriptomicsTableData as [{[key: string]: number}]
        const typedArrayHeader = this.transcriptomicsTableHeaders
        typedArrayHeader.forEach(element => {
          if (element.field !== 'available') {
            const valArr = typedArrayData.map(elem => elem[element.field])
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
              console.log(element.field, numArr)
              const min = Math.floor(Math.min(...numArr))
              const max = Math.ceil(Math.max(...numArr))
              outObj[element.field] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.field }
              if (!Object.keys(this.sliderVals.transcriptomics).includes(element.field)) {
                this.sliderVals.transcriptomics[element.field] = { vals: {min: min, max: max}, empties: true }
              }
              console.log(element.field, this.sliderVals)
            }
          }
        })
        return outObj
    },
    sliderProteomics() {
      const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
      const typedArrayData = this.proteomicsTableData as [{[key: string]: number}]
      const typedArrayHeader = this.proteomicsTableHeaders
      console.log('proteomics sliders', typedArrayHeader)
      typedArrayHeader.forEach(element => {
        if (element.field !== 'available') {
          const valArr = typedArrayData.map(elem => elem[element.field])
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
            console.log(element.field, numArr)
            const min = Math.floor(Math.min(...numArr))
            const max = Math.ceil(Math.max(...numArr))
            outObj[element.field] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.field }
            if (!Object.keys(this.sliderVals.proteomics).includes(element.field)) {
              this.sliderVals.proteomics[element.field] = { vals: {min: min, max: max}, empties: true }
            }
            console.log(element.field, this.sliderVals)
          }
        }
      })
      return outObj
    },
    sliderMetabolomics() {
      const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
      const typedArrayData = this.metabolomicsTableData as [{[key: string]: number}]
      const typedArrayHeader = this.metabolomicsTableHeaders

      typedArrayHeader.forEach(element => {
        if (element.field !== 'available') {
          const valArr = typedArrayData.map(elem => elem[element.field])
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
            console.log(element.field, numArr)
            const min = Math.floor(Math.min(...numArr))
            const max = Math.ceil(Math.max(...numArr))
            outObj[element.field] = { min: min, max: max, step: (Math.abs(min) + Math.abs(max)) / 100, text: element.field }
            if (!Object.keys(this.sliderVals.metabolomics).includes(element.field)) {
              this.sliderVals.metabolomics[element.field] = { vals: {min: min, max: max}, empties: true }
            }
            console.log(element.field, this.sliderVals)
          }
        }
      })
      return outObj
    }
  },

  watch: {
    transcriptomicsSheetVal: function () { this.fetchTranscriptomicsTable(this.transcriptomicsFile) },
    proteomicsSheetVal: function () {console.log('FETCH'); this.fetchProteomicsTable(this.proteomicsFile) },
    metabolomicsSheetVal: function () { this.fetchMetabolomicsTable(this.metabolomicsFile) }
  },

  // functions to call on mount (after DOM etc. is built)
  mounted () {
    // this.$vuetify.theme.themes.light.primary = '#2196F3';
  },

  methods: {
    fetchTranscriptomicsTable (fileInput: File | null) {
      const mainStore = useMainStore()
      mainStore.setTranscriptomicsTableHeaders([])
      mainStore.setTranscriptomicsTableData([])
      this.sliderVals.transcriptomics = {}
      if (fileInput !== null) {
        this.$q.loading.show()
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
            mainStore.setTranscriptomicsTableHeaders(responseContent.header)
            mainStore.setTranscriptomicsTableData(responseContent.entries)
            this.recievedTranscriptomicsData = true
          })
          .then(() => (this.$q.loading.hide()))
      } else {
        // more errorhandling?
        this.recievedTranscriptomicsData = false
        console.log('Transcriptomics file Cleared')
      }
    },

    fetchProteomicsTable (fileInput: File | null) {
      const mainStore = useMainStore()

      mainStore.setProteomicsTableHeaders([])
      mainStore.setProteomicsTableData([])
      console.log('FETCH PROT')
      this.sliderVals.proteomics = {}
      if (fileInput !== null) {
        this.$q.loading.show()
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
            mainStore.setProteomicsTableHeaders(responseContent.header)
            mainStore.setProteomicsTableData(responseContent.entries)
            this.recievedProteomicsData = true
          })
          .then(() => (this.$q.loading.hide()))
      } else {
        // more errorhandling?
        this.recievedProteomicsData = false
        console.log('Protfile Cleared')
      }
    },
    fetchMetabolomicsTable (fileInput: File | null) {
      const mainStore = useMainStore()

      mainStore.setMetabolomicsTableHeaders([])
      mainStore.setMetabolomicsTableData([])
      this.sliderVals.metabolomics = {}
      if (fileInput !== null) {
        this.$q.loading.show()
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
            mainStore.setMetabolomicsTableHeaders(responseContent.header)
            mainStore.setMetabolomicsTableData(responseContent.entries)
            this.recievedMetabolomicsData = true
          })
          .then(() => (this.$q.loading.hide()))
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
      const mainStore = useMainStore()

      this.$q.loading.show()
      const payload = {
        targetOrganism: this.targetOrganism,
        transcriptomics: {
          recieved: this.recievedTranscriptomicsData,
          symbol: this.transcriptomicsSymbolCol.field,
          value: this.transcriptomicsValueCol.field
        },
        proteomics: {
          recieved: this.recievedProteomicsData,
          symbol: this.proteomicsSymbolCol.field,
          value: this.proteomicsValueCol.field
        },
        metabolomics: {
          recieved: this.recievedMetabolomicsData,
          symbol: this.metabolomicsSymbolCol.field,
          value: this.metabolomicsValueCol.field
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
          mainStore.setOmicsRecieved(dataContent.omicsRecieved)
          mainStore.setUsedSymbolCols(dataContent.used_symbol_cols)
          mainStore.setFCSReactome(dataContent.fcs)
        })
        .then(() => this.getReactomeData())
    },

    getReactomeData () {
      const mainStore = useMainStore()
      fetch('/reactome_overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then((response) => response.json())
        .then((dataContent) => {
          console.log('PATHWAYLAYOUTING', dataContent)
          mainStore.setOverviewData(dataContent.overviewData)
          mainStore.setPathwayLayoutingReactome(dataContent.pathwayLayouting)
        }).then(() => this.$q.loading.hide())
    },
    generateKGMLs () {
      const mainStore = useMainStore()

      console.log('sliderTest', this.sliderVals)
      this.$q.loading.show()
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
          mainStore.setOmicsRecieved(dataContent.omicsRecieved)
          mainStore.setPathayAmountDict(dataContent.pathways_amount_dict)
          mainStore.setOverviewData(dataContent.overview_data)
          mainStore.setGraphData(dataContent.main_data)
          mainStore.setFCS(dataContent.fcs)
          mainStore.setTranscriptomicsSymbolDict(dataContent.transcriptomics_symbol_dict)
          mainStore.setProteomicsSymbolDict(dataContent.proteomics_symbol_dict)
          mainStore.setUsedSymbolCols(dataContent.used_symbol_cols)
          mainStore.setPathwayLayoutingKegg(dataContent.pathwayLayouting)
        })
        .then((val) => {
          if (val) alert('Empty Data Selection! Adjust data source and/or filter settings')
          this.$q.loading.hide()
        })
    },
    setTargetDatabase (inputVal: {text: string, value: string}) {
      const mainStore = useMainStore()
      mainStore.setTargetDatabase(inputVal.value)
    }
  }
}
</script>
