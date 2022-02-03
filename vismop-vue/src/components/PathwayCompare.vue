<template>
        <div>
          <v-card>
            <v-card-title>
              <v-row align="center">
                 <v-col cols="5">Selected Nodes</v-col>
              </v-row>
            </v-card-title>
            <v-slide-group
                v-model="model"
                show-arrows=""
            >
                <v-slide-item
                    v-for="pathway in pathwayCompare"
                    :key="pathway"
                    v-slot="{ active }"
                    >
                    <v-card
                        :color="active ? 'primary' : 'grey lighten-4'"
                        class="ma-1"
                        height="95%"
                        width="220"
                        >
                        <v-row>
                          <v-card-actions>
                              <v-btn
                                  fab
                                  class="mx-2 expandButton"
                                  dark
                                  small
                                  @click="removeCard(pathway)"
                              ><v-icon>mdi-close</v-icon></v-btn>
                          </v-card-actions>
                          <v-card-title >
                              {{ pathwayLayouting.pathwayList.find(elem => elem.value === pathway).value }}
                          </v-card-title>
                        </v-row>
                        <v-card-subtitle class="positionCardTitle">
                            {{ pathwayLayouting.pathwayList.find(elem => elem.value === pathway).title }}
                        </v-card-subtitle>
                        <div class="centeredGlyphs">
                          <div :id="'glyph'+pathway"> </div>
                        </div>
                        {{ appendGlyph(pathway) }}
                        <v-card-text>
                          <table>
                          <tr> <td>Transcriptomics:</td> <td> {{ glyphData[pathway]["transcriptomics"]["nodeState"]["regulated"] }} of {{ glyphData[pathway]["transcriptomics"]["nodeState"]["total"] }}</td> </tr>
                          <tr> <td>Avg. FC:</td> <td>{{ glyphData[pathway]["transcriptomics"]["meanFoldchange"].toFixed(3) }}</td> </tr>

                          <tr> <td>Proteomics:</td> <td> {{ glyphData[pathway]["proteomics"]["nodeState"]["regulated"] }} of {{ glyphData[pathway]["proteomics"]["nodeState"]["total"] }}</td> </tr>
                          <tr> <td>Avg. FC:</td> <td>{{ glyphData[pathway]["proteomics"]["meanFoldchange"].toFixed(3) }}</td> </tr>

                          <tr> <td>Metabolomics:</td> <td> {{ glyphData[pathway]["metabolomics"]["nodeState"]["regulated"] }} of {{ glyphData[pathway]["metabolomics"]["nodeState"]["total"] }}</td> </tr>
                          <tr> <td>Avg. FC:</td> <td>{{ glyphData[pathway]["metabolomics"]["meanFoldchange"].toFixed(3) }}</td> </tr>
                          </table>
                        </v-card-text>
                    </v-card>
                </v-slide-item>
            </v-slide-group>
          </v-card>
        </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import Vue from 'vue'
import * as d3 from 'd3'

interface Data {
  tableSearch: string;
  model: null;
}

export default Vue.extend({
  // name of the component
  name: 'PathwayCompare',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    model: null
  }),

  computed: {
    ...mapState({
      pathwayCompare: (state: any) => state.pathwayCompare,
      overlay: (state: any) => state.overlay,
      glyphData: (state: any) => state.glyphData,
      pathwayLayouting: (state: any) => state.pathwayLayouting,
      glyphs: (state: any) => state.glyphs
    })
  },
  // watch: {},
  // mounted () {},
  methods: {
    removeCard (val: string) {
      console.log('remove Card', val)
      this.$store.dispatch('removePathwayCompare', val)
    },
    appendGlyph (pathway: string) {
      this.$nextTick(() => {
        d3.select(`#glyph${pathway}`).append(() => this.glyphs.svg[pathway])
      })
    }
  }
})
</script>
