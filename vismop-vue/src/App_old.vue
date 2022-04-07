<template>
  <div>
    <v-navigation-drawer
      app
      v-model="drawer"
      :expand-on-hover="sideBarExpand"
      :rail="sideBarExpand"
      color="primary"
      dense
      width="512"
      id="ddd"
      hide-overlay
      temporary
      permanent
      absolute
    >
      <q-item class="px-2">
        <q-btn
          elevation="2"
          fab
          small
          @click="sideBarExpand = !sideBarExpand"
        >
          <v-app-bar-naq-icon></v-app-bar-naq-icon>
        </q-btn>

        <div class="d-flex align-center">
          <q-img
            class="mr-2"
            contain
            :src="svgIcon"
            width="40"
          />
          <span class="mr-2">visMOP</span>
        </div>
      </q-item>
      <q-list dense>
        <q-item>
            <SideBar></SideBar>
        </q-item>
      </q-list>
    </v-navigation-drawer>
    <v-app-bar app color="primary" dark>
      <div class="d-flex align-center pl-12">
        <q-img
          class="mr-2"
          contain
          :src="svgIcon"
          width="40"
        />
        <span class="mr-2">VisMOP</span>
      </div>
      <q-separator></q-separator>
      <v-dialog
      v-model="infoDialog"
      width="500"
      >
        <template v-slot:activator="{ on, attrs }">
          <q-btn
              v-bind="attrs"
              v-on="on"
              color="primary"
              
          >
            About
          </q-btn>
        </template>

        <q-card>
          <div>
            Interaction Network
            <q-separator></q-separator>
            <q-card-actions>
              <q-separator></q-separator>
              <q-icon
                  @click="infoDialog = false"
              >
                mdi-close-box
              </q-icon>
            </q-card-actions>

          </div>

          <q-card-text>
            DISCLAIMER: Your data gets cached on this server! DO NOT USE for unanonymized data!!!
            For research use only. See <a href="https://www.kegg.jp/kegg/legal.html" target="_blank">KEGG</a> for more info.<br>
            Using Data from<br>
            KEGG: <a href="https://www.kegg.jp/" target="_blank">KEGG</a> <br>
            Uniprot: <a href="https://www.uniprot.org/" target="_blank">UniProt</a><br>
            STRING: <a href="https://string-db.org/" target="_blank">STRING</a>
          </q-card-text>

        </q-card>
      </v-dialog>
    </v-app-bar>

    <div class="pl-12">
      <MainPage />
    </div>
  </div>
</template>
<script lang="ts">
import MainPage from './components/MainPage.vue'
import SideBar from './components/Sidebar.vue'
import svgIcon from './assets/vmod_icon.svg'
export default {
  name: 'App',

  components: {
    MainPage,
    SideBar
  },
  data: () => ({
    drawer: true,
    navbarKey: true,
    infoDialog: false,
    svgIcon: svgIcon,
  }),
  methods: {

  },
  computed: {
    sideBarExpand: {
      get (): boolean {
        console.log(this.drawer)
        return this.$store.state.sideBarExpand
      },
      set (val: boolean) {
        this.$store.dispatch('setSideBarExpand', val)
      }
    }
  }
}
</script>
