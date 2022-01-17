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
                        :color="active ? 'primary' : 'grey lighten-1'"
                        class="ma-4"
                        height="90%"
                        width="180"
                        >
                        <v-card-actions>
                            <v-btn
                                class="mx-2 expandButton"
                                dark
                                small
                                @click="removeCard(pathway)"
                            ><v-icon>mdi-close</v-icon></v-btn>
                        </v-card-actions>
                        <v-card-title>
                            {{ pathwayLayouting.pathwayList.find(elem => elem.value === pathway).value }}
                        </v-card-title>
                        <v-card-subtitle>
                            {{ pathwayLayouting.pathwayList.find(elem => elem.value === pathway).title }}
                        </v-card-subtitle>
                        <v-card-text>
                          <table>

                          <tr> <td>Transcriptomics:</td> </tr>
                          <tr> <td>Total Nodes:</td> <td>{{ glyphData[pathway]["transcriptomics"]["nodeState"]["total"] }}</td> </tr>
                          <tr> <td>Regulated Nodes:</td> <td>{{ glyphData[pathway]["transcriptomics"]["nodeState"]["regulated"] }}</td> </tr>

                          <tr> <td>Proteomics:</td> </tr>
                          <tr> <td>Total Nodes:</td> <td>{{ glyphData[pathway]["proteomics"]["nodeState"]["total"] }}</td> </tr>
                          <tr> <td>Regulated Nodes:</td> <td>{{ glyphData[pathway]["proteomics"]["nodeState"]["regulated"] }}</td> </tr>

                          <tr> <td>Metabolomics:</td> </tr>
                          <tr> <td>Total Nodes:</td> <td>{{ glyphData[pathway]["metabolomics"]["nodeState"]["total"] }}</td> </tr>
                          <tr> <td>Regulated Nodes:</td> <td>{{ glyphData[pathway]["metabolomics"]["nodeState"]["regulated"] }}</td> </tr>
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

interface Data {
  tableSearch: string;
  model: null;
  test: string[]
}

export default Vue.extend({
  // name of the component
  name: 'PathwayCompare',

  // data section of the Vue component. Access via this.<varName> .
  data: (): Data => ({
    tableSearch: '',
    model: null,
    test: ['a', 'b', 'c']
  }),

  computed: {
    ...mapState({
      pathwayCompare: (state: any) => state.pathwayCompare,
      overlay: (state: any) => state.overlay,
      glyphData: (state: any) => state.glyphData,
      pathwayLayouting: (state: any) => state.pathwayLayouting
    })
  },
  // watch: {},
  // mounted () {},
  methods: {
    removeCard (val: string) {
      console.log('remove Card', val)
      this.$store.dispatch('removePathwayCompare', val)
    }
  }
})
</script>
