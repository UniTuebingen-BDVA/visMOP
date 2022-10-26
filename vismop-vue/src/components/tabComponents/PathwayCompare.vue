<template>
  <div>
    <div>
      <div class="row" align="center">
        <div class="col-5">Selected Nodes</div>
      </div>
    </div>
    <q-scroll-area style="height: 70vh">
      <div>
        <Sortable
          :list="pathwayCompare"
          item-key="id"
          :options="options"
          tag="div"
          class="row"
          align="center"
          @end="(event) => resortPathway(event)"
        >
          <!-- v-for="pathway in pathwayCompare" -->
          <template #item="{ element }">
            <q-card :key="element.id" class="col-4 q-pa-sm draggable">
              <div class="row">
                <q-card-actions>
                  <q-btn icon="mdi-close" @click="removeCard(element.pathway)">
                  </q-btn>
                </q-card-actions>
                <div>
                  {{
                    pathwayLayouting.pathwayList.find(
                      (elem) => elem.value === element.pathway
                    )?.value
                  }}
                </div>
              </div>
              <q-card-section class="positionCardTitle">
                {{
                  pathwayLayouting.pathwayList.find(
                    (elem) => elem.value === element.pathway
                  )?.title
                }}
              </q-card-section>
              <div class="centeredGlyphs">
                <div :id="'glyph' + element.pathway"></div>
              </div>
              {{ appendGlyph(element.pathway) }}
              <q-card-section>
                <table>
                  <tr>
                    <td>Transcriptomics:</td>
                    <td>
                      {{
                        glyphData[element.pathway]['transcriptomics'][
                          'nodeState'
                        ]['regulated']
                      }}
                      of
                      {{
                        glyphData[element.pathway]['transcriptomics'][
                          'nodeState'
                        ]['total']
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td>Avg. FC:</td>
                    <td>
                      {{
                        glyphData[element.pathway]['transcriptomics'][
                          'meanFoldchange'
                        ].toFixed(3)
                      }}
                    </td>
                  </tr>

                  <tr>
                    <td>Proteomics:</td>
                    <td>
                      {{
                        glyphData[element.pathway]['proteomics']['nodeState'][
                          'regulated'
                        ]
                      }}
                      of
                      {{
                        glyphData[element.pathway]['proteomics']['nodeState'][
                          'total'
                        ]
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td>Avg. FC:</td>
                    <td>
                      {{
                        glyphData[element.pathway]['proteomics'][
                          'meanFoldchange'
                        ].toFixed(3)
                      }}
                    </td>
                  </tr>

                  <tr>
                    <td>Metabolomics:</td>
                    <td>
                      {{
                        glyphData[element.pathway]['metabolomics']['nodeState'][
                          'regulated'
                        ]
                      }}
                      of
                      {{
                        glyphData[element.pathway]['metabolomics']['nodeState'][
                          'total'
                        ]
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td>Avg. FC:</td>
                    <td>
                      {{
                        glyphData[element.pathway]['metabolomics'][
                          'meanFoldchange'
                        ].toFixed(3)
                      }}
                    </td>
                  </tr>
                </table>
              </q-card-section>
            </q-card>
          </template>
        </Sortable>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { useMainStore } from '@/stores';
import { computed, nextTick, watch } from 'vue';
import { Sortable } from 'sortablejs-vue3';

const mainStore = useMainStore();

const pathwayCompare = computed(() => mainStore.pathwayCompare);
const glyphData = computed(() => mainStore.glyphData);
const pathwayLayouting = computed(() => mainStore.pathwayLayouting);
const glyphs = computed(() => mainStore.glyphs);

const options = {
  animation: 150,
};

const resortPathway = (event: { oldIndex: number; newIndex: number }) => {
  mainStore.resortPathwayCompare(event.oldIndex, event.newIndex);
};

const removeCard = (val: string) => {
  mainStore.removePathwayCompare(val);
};
const appendGlyph = (pathway: string) => {
  nextTick(() => {
    d3.select(`#glyph${pathway}`).append(() => glyphs.value.svg[pathway]);
  });
};
</script>
