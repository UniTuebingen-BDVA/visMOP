<template>
  <div>
    <v-card>
      <v-row justify="space-between">
        <v-card-title>
          Network Graph
          <v-spacer></v-spacer>
        </v-card-title>
      </v-row>
      <v-row>
        <v-col cols="12" class="mb-2">
          <div :id="contextID" class="webglContainer"></div>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>



<script>
import { mapState } from "vuex";
import {
  mainGraph,
} from "@/assets/js/main_network.ts";
import { generateGraphData } from "@/assets/js/graphPreparation.ts";
export default {
  // name of the component
  name: "OverviewComponent",

  // data section of the Vue component. Access via this.<varName> .
  data: () => ({
    tableSearch: "",
    selectedTab: "transcriptomics",
    outstandingDraw: false,
  }),

  computed: {
    ...mapState({
      overviewData: (state) => state.overviewData,
      fcs: (state) => state.fcs,
      overlay: (state) => state.overlay,
    }),
  },
  watch: {
    overviewData: function () {
      if(this.isActive){
        console.log(this.contextID)
        this.drawNetwork()
      }else{
        console.log(this.contextID,"outstanding draw")
        this.outstandingDraw = true
      }
      
    },
    isActive: function(){
      console.log(this.contextID,"isActive: ", this.isActive, this.outstandingDraw)
      if(this.outstandingDraw){
        setTimeout(() => {
            this.drawNetwork()
        }, 1000)
        this.outstandingDraw = false;
        
      }
    },
  },

  mounted() {
    console.log("OVDATA", this.overviewData)
    if(this.overviewData){
      this.drawNetwork()
    }
  },
  props: ["contextID", "isActive"],
  methods: {
    drawNetwork(){
      const networkData = generateGraphData(this.overviewData, [0,0]);
      console.log("base dat", networkData);
      this.networkGraph = mainGraph(this.contextID, networkData);
    }
    }
  
};
</script>


