<template>
  <div>
    <q-card class="inputTable">
      <div>
        <div class="row" align="center">
          <div class="col-5">Selected Nodes</div>
          <div class="col-7">
            <q-input
              v-model="tableSearch"
              class="pt-0"
              append-icon="fa-solid fa-magnifying-glass"
              label="Search"
              single-line
              hide-details
            ></q-input>
          </div>
        </div>
      </div>

      <q-table
        id="selectedNodes"
        dense
        :columns="selectedNodesHeader"
        :rows="clickedNodes"
        :filter="tableSearch"
      >
        <!-- TODO NOT WORKING YET -->
        <template #body-cell-fcTranscript="props">
          <q-td :props="props">
            <q-badge
              :style="`background-color:${fcScales.transcriptomics(
                props.value
              )}`"
              dark
            >
              {{ parseFloat(props.value).toFixed(3) }}
            </q-badge>
          </q-td>
        </template>
        <template #body-cell-fcProt="props">
          <q-td :props="props">
            <q-badge
              :style="`background-color:${fcScales.proteomics(props.value)}`"
              dark
            >
              {{ parseFloat(props.value).toFixed(3) }}
            </q-badge>
          </q-td>
        </template>
        <template #body-cell-delete="props">
          <q-td :props="props">
            <q-btn
              dark
              left
              color="red"
              icon="mdi-close"
              @click="deleteRow(props.row.id)"
            >
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ColType } from '@/core/generalTypes';
import { useMainStore } from '@/stores';
import { computed, Ref, ref } from 'vue';

// data section of the Vue component. Access via this.<varName> .
const mainStore = useMainStore();

const tableSearch = ref('');
const selectedNodesHeader: Ref<ColType[]> = ref([
  { name: 'id', label: 'ID', align: 'left', field: 'id' },
  { name: 'name', label: 'Name', align: 'left', field: 'name' },
  {
    name: 'fcTranscript',
    label: 'FC Trans.',
    align: 'left',
    field: 'fcTranscript',
  },
  { name: 'fcProt', label: 'FC Prot', align: 'left', field: 'fcProt' },
  { name: 'delete', label: '', align: 'left', field: 'delete' },
] as ColType[]);

const clickedNodes = computed(() => mainStore.clickedNodes);
const fcScales = computed(() => mainStore.fcScales);

const deleteRow = (val: string) => {
  mainStore.removeClickedNode(val);
};
</script>
