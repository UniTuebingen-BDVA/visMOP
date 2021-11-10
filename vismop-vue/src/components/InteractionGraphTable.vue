
<template>
        <div>
          <v-card>
            <v-card-title>
              <v-row>
                 <v-col cols="12">Selected Nodes</v-col>
              </v-row>
              <v-row>
                  <v-col cols="4">
                    <v-btn v-on:click="queryEgoGraphs">Plot</v-btn>
                  </v-col>
                <v-col cols="8">
                  <v-slider
                    thumb-label
                    v-model="stringSlider"
                    min=400
                    max=1000
                    hide-details=""
                  > </v-slider>
                </v-col>
              </v-row>
              <v-text-field
                v-model="tableSearch"
                append-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
            </v-card-title>

            <v-data-table
              dense
              :headers="selectedNodesHeader"
              :items="clickedNodes"
              :items-per-page="5"
              :search="tableSearch"
              class="elevation-1"
              id="selectedNodes"
            >
              <template v-slot:[`item.fcTranscript`]="{ item }">
                <v-chip :color="fcScale(item.fcTranscript)" dark>
                  {{ parseFloat(item.fcTranscript).toFixed(3) }}
                </v-chip>
              </template>
              <template v-slot:[`item.fcProt`]="{ item }">
                <v-chip :color="fcScale(item.fcProt)" dark>
                  {{ parseFloat(item.fcProt).toFixed(3) }}
                </v-chip>
              </template>
              <template v-slot:[`item.delete`]="{ item }">
                <v-icon dark left color="red" @click="deleteRow(item.id)">
                  mdi-cancel
                </v-icon>
              </template>
            </v-data-table>
          </v-card>
        </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import Vue from 'vue'

interface Data {
  stringSlider: number;
  tableSearch: string;
  selectedNodesHeader: {value: string; text: string}[]
}

export default Vue.extend({
  // name of the component
  name: 'InteractionGraphTable',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    stringSlider: 900,
    tableSearch: '',
    selectedNodesHeader: [
      { value: 'id', text: 'Kegg ID' },
      { value: 'name', text: 'Name' },
      { value: 'fcTranscript', text: 'FC Trans.' },
      { value: 'fcProt', text: 'FC Prot' },
      { value: 'delete', text: '' }
    ]

  }),

  computed: {
    ...mapState({
      clickedNodes: (state: any) => state.clickedNodes,
      overlay: (state: any) => state.overlay,
      fcScale: (state: any) => state.fcScale

    })
  },
  // watch: {},
  // mounted () {},
  methods: {
    deleteRow (val: string) {
      this.$store.dispatch('removeClickedNode', val)
    },
    queryEgoGraphs () {
      this.$store.dispatch('queryEgoGraps', this.stringSlider)
    }
  }
})
</script>
