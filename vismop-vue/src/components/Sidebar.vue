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
    <q-list bordered class="rounded-borders">
      <q-expansion-item
        label = "Transcriptomics Data"
        header-class="bg-primary text-white"
        expand-icon-class="text-white"
        group="omicsSelect"
        icon="svguse:/icons/RNA.svg#rna|0 0 9 9"
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
              <q-badge color="primary">
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
        header-class="bg-primary text-white"
        expand-icon-class="text-white"
        icon="svguse:/icons/Prots.svg#prots|0 0 9 9"
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
              <q-badge color="primary">
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
        header-class="bg-primary text-white"
        expand-icon-class="text-white"
        icon="svguse:/icons/Metabolites.svg#metabolites|0 0 9 9"

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
              <q-badge color="primary">
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

<script setup lang="ts">
  import { ColType } from '@/core/generalTypes'
  import { useMainStore } from '@/stores'
  import { useQuasar } from 'quasar'
  import { ref, Ref, computed, watch, onMounted } from 'vue'
  import prot from '@/assets/icons/Prots.svg?raw'
  import trans from '@/assets/icons/RNA.svg?raw'
  import metabolomics from '@/assets/icons/Metabolites.svg?raw'
  const mainStore = useMainStore()
  
  const $q = useQuasar()
  const transcriptomicsFile: Ref<File | null> = ref(null)
  const transcriptomicsSheetVal = ref('0')
  const transcriptomicsSymbolCol: Ref<ColType> = ref({name:'', label:'', field:'', align: undefined})
  const transcriptomicsValueCol: Ref<ColType> = ref({field: '', label: '', name: '', align: undefined})
  const recievedTranscriptomicsData = ref(false)
  const proteomicsFile: Ref<File | null> = ref(null)
  const proteomicsSheetVal = ref('0')
  const proteomicsSymbolCol: Ref<ColType> = ref({field: '', label: '', name: '', align: undefined})
  const proteomicsValueCol: Ref<ColType> = ref({field: '', label: '', name: '', align: undefined})
  const recievedProteomicsData = ref(false)
  const metabolomicsFile: Ref<File | null> = ref(null)
  const metabolomicsSheetVal = ref('0')
  const metabolomicsSymbolCol: Ref<ColType> = ref({field: '', label: '', name: '', align: undefined})
  const metabolomicsValueCol: Ref<ColType> = ref({field: '', label: '', name: '', align: undefined})
  const recievedMetabolomicsData = ref(false)
  const targetOrganisms = ref([
      { text: 'Mouse', value: 'mmu' },
      { text: 'Human', value: 'hsa' }
    ])
  const targetOrganism = ref({ text: 'Mouse', value: 'mmu' })
  const targetDatabases = ref([
      { text: 'Reactome', value: 'reactome' },
      { text: 'KEGG', value: 'kegg' }
    ])
  const targetDatabase = ref({ text: 'Reactome', value: 'reactome' })
  const reactomeLevelSelection = ref(1)
  const sliderVals = ref({ transcriptomics: {}, proteomics: {}, metabolomics: {} } as { transcriptomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}}, proteomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}}, metabolomics: {[key: string]: {vals: {min: number, max: number}, empties: boolean}} })
  const sheetRules = ref([
      (value: string) => {
        const pattern = /^([0-9]*)$/
        return pattern.test(value) || 'Enter a number'
      }
    ])
  
  const transcriptomicsTableHeaders = computed(() => mainStore.transcriptomicsTableHeaders)
  const proteomicsTableHeaders = computed(() => mainStore.proteomicsTableHeaders)
  const metabolomicsTableHeaders = computed(() => mainStore.metabolomicsTableHeaders)
  const transcriptomicsTableData = computed(() => mainStore.transcriptomicsTableData)
  const proteomicsTableData = computed(() => mainStore.proteomicsTableData)
  const metabolomicsTableData = computed(() => mainStore.metabolomicsTableData)

  const chosenOmics = computed((): string[] => {
      const chosen = []
      if (recievedTranscriptomicsData) chosen.push('Transcriptomics')
      if (recievedProteomicsData) chosen.push('Proteomics')
      if (recievedMetabolomicsData) chosen.push('Metabolomics')
      return chosen
    })
  const sliderTranscriptomics = computed(() => {
    const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
    const typedArrayData = transcriptomicsTableData.value
    const typedArrayHeader = transcriptomicsTableHeaders.value
    typedArrayHeader.forEach(element => {
      if ((element.field !== 'available') && (typeof element.field === 'string')) {
        const valArr = typedArrayData.map(elem => (typeof element.field === 'string') ? elem[element.field]: '')
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
          if (!Object.keys(sliderVals.value.transcriptomics).includes(element.field)) {
            sliderVals.value.transcriptomics[element.field] = { vals: {min: min, max: max}, empties: true }
          }
        }
      }
    })
    return outObj
  })

  const sliderProteomics = computed(() => {
    const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
    const typedArrayData = proteomicsTableData.value
    const typedArrayHeader = proteomicsTableHeaders.value
    console.log('proteomics sliders', typedArrayHeader)
    typedArrayHeader.forEach(element => {
      if ((element.field !== 'available') && (typeof element.field === 'string')) {
        const valArr = typedArrayData.map(elem => (typeof element.field === 'string') ? elem[element.field]: '')
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
          if (!Object.keys(sliderVals.value.proteomics).includes(element.field)) {
            sliderVals.value.proteomics[element.field] = { vals: {min: min, max: max}, empties: true }
          }
        }
      }
    })
    return outObj
  })

  const sliderMetabolomics = computed(() => {
    const outObj: { [key: string]: {min: number, max: number, step: number, text: string} } = {}
    const typedArrayData = metabolomicsTableData.value
    const typedArrayHeader = metabolomicsTableHeaders.value

    typedArrayHeader.forEach(element => {
      if ((element.field !== 'available') && (typeof element.field === 'string')) {
          const valArr = typedArrayData.map(elem => (typeof element.field === 'string') ?  elem[element.field] : '')
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
            if (!Object.keys(sliderVals.value.metabolomics).includes(element.field)) {
              sliderVals.value.metabolomics[element.field] = { vals: {min: min, max: max}, empties: true }
            }
          }
        }
      })
      return outObj
    })

  watch(transcriptomicsSheetVal, () => { fetchTranscriptomicsTable(transcriptomicsFile.value) })
  watch(proteomicsSheetVal, () => { fetchProteomicsTable(proteomicsFile.value) })
  watch(metabolomicsSheetVal, () => { fetchMetabolomicsTable(metabolomicsFile.value) })

  const fetchTranscriptomicsTable  = (fileInput: File | null) => {
      mainStore.setTranscriptomicsTableHeaders([])
      mainStore.setTranscriptomicsTableData([])
      sliderVals.value.transcriptomics = {}
      if (fileInput !== null) {
        $q.loading.show()
        const formData = new FormData()
        formData.append('dataTable', fileInput)
        formData.append('sheetNumber', transcriptomicsSheetVal.value)
        fetch('/transcriptomics_table', {
          method: 'POST',
          headers: {},
          body: formData
        })
          .then((response) => response.json())
          .then((responseContent) => {
            mainStore.setTranscriptomicsTableHeaders(responseContent.header)
            mainStore.setTranscriptomicsTableData(responseContent.entries)
            recievedTranscriptomicsData.value = true
          })
          .then(() => ($q.loading.hide()))
      } else {
        // more errorhandling?
        recievedTranscriptomicsData.value = false
        console.log('Transcriptomics file Cleared')
      }
    }

  const fetchProteomicsTable = (fileInput: File | null) => {
    const mainStore = useMainStore()

    mainStore.setProteomicsTableHeaders([])
    mainStore.setProteomicsTableData([])
    console.log('FETCH PROT')
    sliderVals.value.proteomics = {}
    if (fileInput !== null) {
      $q.loading.show()
      const formData = new FormData()
      formData.append('dataTable', fileInput)
      formData.append('sheetNumber', proteomicsSheetVal.value)

      fetch('/proteomics_table', {
        method: 'POST',
        headers: {},
        body: formData

      })
        .then((response) => response.json())

        .then((responseContent) => {
          mainStore.setProteomicsTableHeaders(responseContent.header)
          mainStore.setProteomicsTableData(responseContent.entries)
          recievedProteomicsData.value = true
        })
        .then(() => ($q.loading.hide()))
    } else {
      // more errorhandling?
      recievedProteomicsData.value = false
      console.log('Protfile Cleared')
    }
  }
  const fetchMetabolomicsTable = (fileInput: File | null) => {
      const mainStore = useMainStore()

      mainStore.setMetabolomicsTableHeaders([])
      mainStore.setMetabolomicsTableData([])
      sliderVals.value.metabolomics = {}
      if (fileInput !== null) {
        $q.loading.show()
        const formData = new FormData()
        formData.append('dataTable', fileInput)
        formData.append('sheetNumber', metabolomicsSheetVal.value)

        fetch('/metabolomics_table', {
          method: 'POST',
          headers: {},
          body: formData
        })
          .then((response) => response.json())

          .then((responseContent) => {
            mainStore.setMetabolomicsTableHeaders(responseContent.header)
            mainStore.setMetabolomicsTableData(responseContent.entries)
            recievedMetabolomicsData.value = true
          })
          .then(() => ($q.loading.hide()))
      } else {
        // more errorhandling?
        recievedMetabolomicsData.value = false
        console.log('Metabol. file Cleared')
      }
    }

  const dataQuery = () => {
      if (targetDatabase.value.value === 'kegg') {
        generateKGMLs()
      } else if (targetDatabase.value.value === 'reactome') {
        queryReactome()
      }
    }

  const queryReactome = () => {
      const mainStore = useMainStore()

      $q.loading.show()
      const payload = {
        targetOrganism: targetOrganism.value,
        transcriptomics: {
          recieved: recievedTranscriptomicsData.value,
          symbol: transcriptomicsSymbolCol.value.field,
          value: transcriptomicsValueCol.value.field
        },
        proteomics: {
          recieved: recievedProteomicsData.value,
          symbol: proteomicsSymbolCol.value.field,
          value: proteomicsValueCol.value.field
        },
        metabolomics: {
          recieved: recievedMetabolomicsData.value,
          symbol: metabolomicsSymbolCol.value.field,
          value: metabolomicsValueCol.value.field
        },
        sliderVals: sliderVals.value
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
        .then(() => getReactomeData())
    }

  const getReactomeData = () => {
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
        }).then(() => $q.loading.hide())
    }
  const generateKGMLs = () => {
      console.log('sliderTest', sliderVals.value)
      $q.loading.show()
      const payload = {
        targetOrganism: targetOrganism.value,
        transcriptomics: {
          recieved: recievedTranscriptomicsData.value,
          symbol: transcriptomicsSymbolCol.value.field,
          value: transcriptomicsValueCol.value.field
        },
        proteomics: {
          recieved: recievedProteomicsData.value,
          symbol: proteomicsSymbolCol.value.field,
          value: proteomicsValueCol.value.field
        },
        metabolomics: {
          recieved: recievedMetabolomicsData.value,
          symbol: metabolomicsSymbolCol.value.field,
          value: metabolomicsValueCol.value.field
        },
        sliderVals: sliderVals.value
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
          $q.loading.hide()
        })
    }
  const setTargetDatabase = (inputVal: {text: string, value: string}) => {
      mainStore.setTargetDatabase(inputVal.value)
    }
</script>
