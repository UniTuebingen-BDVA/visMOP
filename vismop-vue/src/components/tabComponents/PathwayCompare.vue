<template>
  <q-scroll-area style="height: 100%">
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
        <q-card
          :key="element.id"
          square
          flat
          bordered
          class="col-4 q-pa-sm draggable"
        >
          <div class="row items-center">
            <div class="col-4">
              <q-card-actions>
                <q-btn icon="mdi-close" @click="removeCard(element.pathway)">
                </q-btn>
              </q-card-actions>
            </div>
            <div class="col-8">
              <div>
                <a
                  class="doc-link"
                  :href="
                    'https://reactome.org/content/detail/' +
                    element.pathway.split('_')[0]
                  "
                  target="_blank"
                  rel="noopener"
                >
                  {{ element.pathway.split('_')[0] }}
                  <q-icon name="fa-solid fa-arrow-up-right-from-square" />
                </a>
              </div>
            </div>
          </div>
          <div class="row justify-center">
            <div class="positionCardTitle">
              {{
                pathwayLayouting.pathwayList.find(
                  (elem) => elem.value === element.pathway.split('_')[0]
                )?.title +
                ' Timepoint ' +
                element.pathway.split('_')[0]
              }}
            </div>
          </div>
          <div class="centeredGlyphs">
            <div :id="'glyph' + element.pathway"></div>
          </div>
          {{ appendGlyph(element.pathway) }}
          <!--as long as there are no more interesting data following section is not needed <q-card-section>
            <table>
              <div
                v-if="
                  glyphData[element.pathway]['transcriptomics']['available']
                "
              >
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
              </div>
              <div v-if="glyphData[element.pathway]['proteomics']['available']">
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
              </div>
              <div
                v-if="glyphData[element.pathway]['metabolomics']['available']"
              >
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
              </div>
            </table>
          </q-card-section> -->
        </q-card>
      </template>
    </Sortable>
  </q-scroll-area>
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
<style>
.positionCardTitle {
  height: 2.6em;
  min-height: 2.6em;
  max-height: 2.6em;
  overflow: hidden;
  pointer-events: auto;
}
.positionCardTitle:after {
  content: '';
  position: absolute;
  top: 4.4em;
  left: 0;
  height: 2.5em;
  width: 100%;
  background: linear-gradient(rgba(0, 0, 0, 0), #fff);
  pointer-events: auto;
}
.positionCardTitle:hover:after {
  background: rgba(0, 0, 0, 0);
}

@media (max-width: 1920px) {
  .positionCardTitle:after {
    top: 4.4em;
    height: 2.5em;
  }
}
@media (min-width: 1921px) {
  .positionCardTitle {
    font-size: 20px;
  }
  .positionCardTitle:after {
    top: 3.5em;
    height: 2.5em;
  }
  .doc-link {
    font-size: 20px;
  }
}

.positionCardTitle:hover {
  overflow: visible;
  z-index: 9999;
  background-color: white;
}
</style>
