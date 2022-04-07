
<template>
        <div>
          <v-card class="inputTable">
            <v-card-title>
              <v-row align="center">
                 <v-col cols="5">Selected Nodes</v-col>
                <v-col cols="7">
                  <v-text-field
                    class="pt-0"
                    v-model="tableSearch"
                    append-icon="mdi-magnify"
                    label="Search"
                    single-line
                    hide-details
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-card-title>

            <v-data-table
              dense
              :headers="selectedNodesHeader"
              :items="clickedNodes"
              :items-per-page="5"
              :search="tableSearch"
              class="elevation-1 scrollableTable"
              id="selectedNodes"
            >
              <template v-slot:[`item.fcTranscript`]="{ item }">
                <v-chip :color="fcScales.transcriptomics(item.fcTranscript)" dark>
                  {{ parseFloat(item.fcTranscript).toFixed(3) }}
                </v-chip>
              </template>
              <template v-slot:[`item.fcProt`]="{ item }">
                <v-chip :color="fcScales.proteomics(item.fcProt)" dark>
                  {{ parseFloat(item.fcProt).toFixed(3) }}
                </v-chip>
              </template>
              <template v-slot:[`item.delete`]="{ item }">
                <v-icon dark left color="red" @click="deleteRow(item.id)">
                  mdi-close
                </v-icon>
              </template>
            </v-data-table>
          </v-card>
        </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import { defineComponent } from 'vue'
import vue from 'vue'


interface Data {
  tableSearch: string;
  selectedNodesHeader: {value: string; text: string}[]
}

export default {
  // name of the component
  name: 'InteractionGraphTable',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    selectedNodesHeader: [
      { value: 'id', text: 'ID' },
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
      fcScales: (state: any) => state.fcScales

    })
  },
  // watch: {},
  // mounted () {},
  methods: {
    deleteRow (val: string) {
      this.$store.dispatch('removeClickedNode', val)
    }
  }
}
</script>
