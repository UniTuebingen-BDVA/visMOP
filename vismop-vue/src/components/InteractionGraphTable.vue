
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
              :columns="selectedNodesHeader"
              :rows="clickedNodes"
              :filter="tableSearch"
              id="selectedNodes"
            >
              <!-- TODO NOT WORKING YET -->
              <template v-slot:body-cell-fcTranscript="row">
                <q-chip :color="fcScales.transcriptomics(row.fcTranscript)" dark>
                  {{ parseFloat(row.fcTranscript).toFixed(3) }}
                </q-chip>
              </template>
              <template v-slot:body-cell-fcProt="row">
                <q-chip :color="fcScales.proteomics(row.fcProt)" dark>
                  {{ parseFloat(row.fcProt).toFixed(3) }}
                </q-chip>
              </template>
              <template v-slot:body-cell-delete="row">
                <q-btn dark left color="red" icon="mdi-close" @click="deleteRow(row.id)">
                </q-btn>
              </template>
            </q-table>
          </q-card>
        </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { useMainStore } from '@/stores'


interface Data {
  tableSearch: string;
  selectedNodesHeader: {name: string; label: string, align: string, field: string}[]
}

export default {
  // name of the component
  name: 'InteractionGraphTable',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    selectedNodesHeader: [
      { name: 'id', label: 'ID', align: 'left', field: 'id' },
      { name: 'name', label: 'Name', align: 'left', field: 'name'},
      { name: 'fcTranscript', label: 'FC Trans.', align: 'left', field: 'fcTranscript'},
      { name: 'fcProt', label: 'FC Prot', align: 'left', field: 'fcProt'},
      { name: 'delete', label: '', align: 'left', field: 'delete' }
    ]

  }),

  computed: {
    ...mapState(useMainStore,{
      clickedNodes: (state: any) => state.clickedNodes,
      fcScales: (state: any) => state.fcScales

    })
  },
  // watch: {},
  // mounted () {},
  methods: {
    deleteRow (val: string) {
      const mainStore = useMainStore()
      mainStore.removeClickedNode(val)
    }
  }
}
</script>
