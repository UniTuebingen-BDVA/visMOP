
<template>
        <div>
          <q-card class="inputTable">
            <div>
              <div class="row" align="center">
                 <div class="col-5">Selected Nodes</div>
                <div class="col-7">
                  <q-input
                    class="pt-0"
                    v-model="tableSearch"
                    append-icon="mdi-magnify"
                    label="Search"
                    single-line
                    hide-details
                  ></q-input>
                </div>
              </div>
            </div>

            <q-table
              dense
              :headers="selectedNodesHeader"
              :items="clickedNodes"
              :items-per-page="5"
              :search="tableSearch"
              class="elevation-1 scrollableTable"
              id="selectedNodes"
            >
              <template v-slot:[`item.fcTranscript`]="{ item }">
                <q-chip :color="fcScales.transcriptomics(item.fcTranscript)" dark>
                  {{ parseFloat(item.fcTranscript).toFixed(3) }}
                </q-chip>
              </template>
              <template v-slot:[`item.fcProt`]="{ item }">
                <q-chip :color="fcScales.proteomics(item.fcProt)" dark>
                  {{ parseFloat(item.fcProt).toFixed(3) }}
                </q-chip>
              </template>
              <template v-slot:[`item.delete`]="{ item }">
                <q-icon dark left color="red" @click="deleteRow(item.id)">
                  mdi-close
                </q-icon>
              </template>
            </q-table>
          </q-card>
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
