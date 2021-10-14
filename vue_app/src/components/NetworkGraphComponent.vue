<template>
  <v-container fluid>
    <v-row>
      <v-col cols="3" class="mb-2" id="inputTable">
        <div>
          <v-card>
            <v-card-title>
              Data
              <v-spacer></v-spacer>
              <v-text-field
                v-model="tableSearch"
                append-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
            </v-card-title>

            <v-tabs
              v-model="selectedTab"
              background-color="blue lighten-2"
              dark
              center-active
              next-icon="mdi-arrow-right-bold-box-outline"
              prev-icon="mdi-arrow-left-bold-box-outline"
              show-arrows
            >
              <v-tabs-slider color="indigo darken-4"></v-tabs-slider>
              <v-tab href="#transcriptomics">Transcriptomics</v-tab>
              <v-tab href="#proteome">Proteomics</v-tab>
              <v-tab href="#metabol">Metabolomics</v-tab>
            </v-tabs>

            <v-tabs-items :value="selectedTab">
              <v-tab-item value="transcriptomics">
                <v-data-table
                  dense
                  :headers="transcriptomicsTableHeaders"
                  :items="transcriptomicsTableData"
                  :items-per-page="5"
                  :search="tableSearch"
                  class="elevation-1"
                  id="transcriptomics"
                  @click:row="focusNodeTranscriptomics"
                ></v-data-table>
              </v-tab-item>

              <v-tab-item value="proteome">
                <v-data-table
                  dense
                  :headers="proteomicsTableHeaders"
                  :items="proteomicsTableData"
                  :items-per-page="5"
                  :search="tableSearch"
                  class="elevation-1"
                  id="proteomicsTable"
                  @click:row="focusNodeProteomics"
                ></v-data-table>
              </v-tab-item>

              <v-tab-item value="metabol">
                <v-card-text>Extension for Metabolomics Data</v-card-text>
              </v-tab-item>
            </v-tabs-items>
          </v-card>
        </div>
      </v-col>

      <v-col cols="7" class="mb-2">
        <v-card>
          <v-card-title>
            Network Graph
            <v-spacer></v-spacer>
          </v-card-title>
          <v-row>
            <v-col cols="12" class="mb-2">
              <div id="networkGraph"></div>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
      <v-col cols = "2" class="mb-2">
        <v-overflow-btn
        :items="pathwayLayouting.pathway_list"
        v-on:change="selectPathway"
        v-on:click:clear="clearPathway"
        editable
        clearable
        label="Focus Pathway"
        hide-details
        overflow
      ></v-overflow-btn>
      </v-col>
    </v-row>
    <div class="text-center">
      <v-overlay :value="overlay">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
      </v-overlay>
    </div>
  </v-container>
</template>



<script>
import { mapState } from "vuex";
import { mainGraph, panToNode, layoutToPathway, relaxLayout } from "@/assets/js/main_network.ts";
import { generateGraphData } from "@/assets/js/graphPreparation.ts";
export default {
  // name of the component
  name: "NetworkGraphComponent",

  // data section of the Vue component. Access via this.<varName> .
  data: () => ({
    tableSearch: "",
    selectedTab: "transcriptomics"
  }),

  computed: {
    ...mapState({
      transcriptomicsTableHeaders: state => state.transcriptomicsTableHeaders,
      transcriptomicsTableData: state => state.transcriptomicsTableData,
      proteomicsTableHeaders: state => state.proteomicsTableHeaders,
      proteomicsTableData: state => state.proteomicsTableData,
      graphData: state => state.graphData,
      fcs: state => state.fcs,
      transcriptomicsSymbolDict: state => state.transcriptomicsSymbolDict,
      proteomicsSymbolDict: state => state.proteomicsSymbolDict,
      usedSymbolCols: state => state.usedSymbolCols,
      overlay: state => state.overlay,
      pathwayLayouting: state => state.pathwayLayouting
    }),
  },
  watch: {
    graphData: function(){
      const fcExtents = this.calculateCombinedExtent()
      const networkData = generateGraphData(this.graphData, fcExtents);
      console.log("base dat", networkData)
      this.networkGraph = mainGraph("networkGraph", networkData);

    }
  },

  mounted() {
  },

  methods: {
    focusNodeTranscriptomics(row){
      let symbol = row[this.usedSymbolCols["transcriptomics"]]
      console.log("Symbol", symbol)
      console.log("dict", this.transcriptomicsSymbolDict)
      let keggID = this.transcriptomicsSymbolDict[symbol]
      console.log("ID", keggID)
      panToNode(this.networkGraph, keggID)
    },
    focusNodeProteomics(row){
      let symbol = row[this.usedSymbolCols["proteomics"]]
      let keggID = this.proteomicsSymbolDict[symbol]
      panToNode(this.networkGraph, keggID)
    },
    selectPathway(key){
      if(key){
        let nodeList = this.pathwayLayouting.pathway_node_dictionary[key]
        layoutToPathway(this.networkGraph, key , nodeList)
      }
      
    },
    clearPathway(){
      relaxLayout(this.networkGraph)
    },
    // basic GET request using fetch
    calculateCombinedExtent() {
      console.log("fcs", this.fcs)
      let fcsNum = []
      this.fcs.forEach(element => {
        if(!(typeof element.transcriptomics === "string")){
          fcsNum.push(element.transcriptomics)
        }
         if(!(typeof element.proteomics === "string")){
          fcsNum.push(element.proteomics)
        }
      });
      let fcs_asc = fcsNum.sort((a, b) => a - b);

      // https://stackoverflow.com/a/55297611
      const quantile = (arr, q) => {
        const pos = (arr.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base]);
        } else {
          return arr[base];
        }
      };

      let minVal5 = quantile(fcs_asc, 0.05);
      let maxVal95 = quantile(fcs_asc, 0.95);
      return [minVal5, maxVal95];
    },
  },
};
</script>


