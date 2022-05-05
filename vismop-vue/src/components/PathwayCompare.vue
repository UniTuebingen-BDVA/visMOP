<template>
  <div>
    <div>
      <div class="row" align="center">
        <div class="col-5">Selected Nodes</div>
      </div>
    </div>
    <q-scroll-area style="height: 70vh">
      <div class="row" align="center">
        <q-card
          v-for="pathway in pathwayCompare"
          :key="pathway"
          class="col-4 q-pa-sm"
        >
          <div class="row">
            <q-card-actions>
              <q-btn icon="mdi-close" @click="removeCard(pathway)"> </q-btn>
            </q-card-actions>
            <div>
              {{
                pathwayLayouting.pathwayList.find(
                  (elem) => elem.value === pathway
                ).value
              }}
            </div>
          </div>
          <q-card-section class="positionCardTitle">
            {{
              pathwayLayouting.pathwayList.find(
                (elem) => elem.value === pathway
              ).title
            }}
          </q-card-section>
          <div class="centeredGlyphs">
            <div :id="'glyph' + pathway"></div>
          </div>
          {{ appendGlyph(pathway) }}
          <q-card-section>
            <table>
              <tr>
                <td>Transcriptomics:</td>
                <td>
                  {{
                    glyphData[pathway]['transcriptomics']['nodeState'][
                      'regulated'
                    ]
                  }}
                  of
                  {{
                    glyphData[pathway]['transcriptomics']['nodeState']['total']
                  }}
                </td>
              </tr>
              <tr>
                <td>Avg. FC:</td>
                <td>
                  {{
                    glyphData[pathway]['transcriptomics'][
                      'meanFoldchange'
                    ].toFixed(3)
                  }}
                </td>
              </tr>

              <tr>
                <td>Proteomics:</td>
                <td>
                  {{
                    glyphData[pathway]['proteomics']['nodeState']['regulated']
                  }}
                  of
                  {{ glyphData[pathway]['proteomics']['nodeState']['total'] }}
                </td>
              </tr>
              <tr>
                <td>Avg. FC:</td>
                <td>
                  {{
                    glyphData[pathway]['proteomics']['meanFoldchange'].toFixed(
                      3
                    )
                  }}
                </td>
              </tr>

              <tr>
                <td>Metabolomics:</td>
                <td>
                  {{
                    glyphData[pathway]['metabolomics']['nodeState']['regulated']
                  }}
                  of
                  {{ glyphData[pathway]['metabolomics']['nodeState']['total'] }}
                </td>
              </tr>
              <tr>
                <td>Avg. FC:</td>
                <td>
                  {{
                    glyphData[pathway]['metabolomics'][
                      'meanFoldchange'
                    ].toFixed(3)
                  }}
                </td>
              </tr>
            </table>
          </q-card-section>
        </q-card>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { useMainStore } from '@/stores';
import { computed, nextTick } from 'vue';

const mainStore = useMainStore();

const pathwayCompare = computed(() => mainStore.pathwayCompare);
const glyphData = computed(() => mainStore.glyphData);
const pathwayLayouting = computed(() => mainStore.pathwayLayouting);
const glyphs = computed(() => mainStore.glyphs);

const removeCard = (val: string) => {
  mainStore.removePathwayCompare(val);
};
const appendGlyph = (pathway: string) => {
  nextTick(() => {
    d3.select(`#glyph${pathway}`).append(() => glyphs.value.svg[pathway]);
  });
};
</script>
