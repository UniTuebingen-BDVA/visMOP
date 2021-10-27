<template>
  <v-list nav dense>
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
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header> Proteomics Data </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-file-input
            v-on:change="fetchProteomicsTable"
            chips
            label=".xlsx Protein Input"
          ></v-file-input>

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
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-btn v-on:click="generateKGMLs">Plot</v-btn>
  </v-list>
</template>

<script>
import { mapState } from 'vuex'
import Vue from 'vue'

export default Vue.extend({
  name: 'SideBar',
  components: {},

  data: () => ({
    transcriptomicsSymbolCol: '',
    transcriptomicsValueCol: '',
    recievedTranscriptomicsData: false,
    proteomicsSymbolCol: '',
    proteomicsValueCol: '',
    recievedProteomicsData: false
  }),
  computed: {
    ...mapState({
      transcriptomicsTableHeaders: (state) => state.transcriptomicsTableHeaders,
      proteomicsTableHeaders: (state) => state.proteomicsTableHeaders
    })
  },

  watch: {},

  // functions to call on mount (after DOM etc. is built)
  mounted () {
    // this.$vuetify.theme.themes.light.primary = '#2196F3';
  },

  // methods of this vue component access via this.<funcName>
  methods: {
    fetchTranscriptomicsTable (fileInput) {
      if (typeof fileInput !== 'undefined') {
        this.overlay = true
        const formData = new FormData()
        formData.append('dataTable', fileInput)
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

    fetchProteomicsTable (fileInput) {
      if (typeof fileInput !== 'undefined') {
        this.overlay = true
        const protData = new FormData()
        protData.append('proteinDat', fileInput)

        fetch('/proteomics_table', {
          method: 'POST',
          headers: {
            // 'Content-Type': 'file'
          },
          body: protData
        })
          .then((response) => response.json())

          .then((responseContent) => {
            this.$store.dispatch(
              'setProteomicsTableHeaders',
              responseContent.protein_table.header
            )
            this.$store.dispatch(
              'setProteomicsTableData',
              responseContent.protein_table.entries
            )
            this.$store.dispatch(
              'setProteomicsData',
              responseContent.protein_dat
            )
            this.recievedProteomicsData = true
            // this.proteinDat = responseContent.protein_dat;
            // this.protPandasJSON = JSON.parse(
            //  responseContent.protein_table["data"]
            // );
            // this.stringDBDat = responseContent.interaction_dict;
          })
          .then(() => (this.overlay = false))
      } else {
        alert('Malformed File!!!')
      }
    },
    generateKGMLs () {
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
        }
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
            dataContent.pathway_layouting
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
