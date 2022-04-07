<template>
  <v-app>
    <v-navigation-drawer
      app
      v-model="drawer"
      :expand-on-hover="sideBarExpand"
      color="primary"
      dense
      width="512"
      id="ddd"
      hide-overlay
      temporary
      permanent
      absolute
    >
      <v-list-item class="px-2">
        <v-btn
          elevation="2"
          fab
          small
          @click.stop="sideBarExpand = !sideBarExpand"
        >
          <v-app-bar-nav-icon></v-app-bar-nav-icon>
        </v-btn>

        <div class="d-flex align-center">
          <v-img
            class="shrink mr-2"
            contain
            :src="svgIcon"
            width="40"
          />

          <span class="mr-2">visMOP</span>
        </div>
      </v-list-item>
      <v-list dense>
        <v-list-item>
          <v-list-item-icon>
            <p></p>
          </v-list-item-icon>
          <v-list-item-content>
            <SideBar></SideBar>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-app-bar app color="primary" dark>
      <div class="d-flex align-center pl-12">
        <v-img
          class="shrink mr-2"
          contain
          :src="svgIcon"
          width="40"
        />

        <span class="mr-2">VisMOP</span>
      </div>
      <v-spacer></v-spacer>
      <v-dialog
      v-model="infoDialog"
      width="500"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
              v-bind="attrs"
              v-on="on"
              color="primary"
              
          >
            About
          </v-btn>
        </template>

        <v-card>
          <v-card-title>
            Interaction Network
            <v-spacer></v-spacer>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-icon
                  @click="infoDialog = false"
              >
                mdi-close-box
              </v-icon>
            </v-card-actions>

          </v-card-title>

          <v-card-text>
            DISCLAIMER: Your data gets cached on this server! DO NOT USE for unanonymized data!!!
            For research use only. See <a href="https://www.kegg.jp/kegg/legal.html" target="_blank">KEGG</a> for more info.<br>
            Using Data from<br>
            KEGG: <a href="https://www.kegg.jp/" target="_blank">KEGG</a> <br>
            Uniprot: <a href="https://www.uniprot.org/" target="_blank">UniProt</a><br>
            STRING: <a href="https://string-db.org/" target="_blank">STRING</a>
          </v-card-text>

        </v-card>
      </v-dialog>
    </v-app-bar>

    <v-main class="pl-12">
      <MainPage />
    </v-main>
  </v-app>
</template>
<script lang="ts">
import MainPage from './components/MainPage.vue'
import SideBar from './components/Sidebar.vue'
import svgIcon from './assets/vmod_icon.svg'
import { defineComponent } from 'vue'
import vue from 'vue'
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
    svgIcon: svgIcon
  }),
  methods: {

  },
  computed: {
    sideBarExpand: {
      get (this): boolean {
        console.log(this.drawer)
        return this.$store.state.sideBarExpand
      },
      set (this, val: boolean) {
        this.$store.dispatch('setSideBarExpand', val)
      }
    }
  }
}
</script>
<style>
@import "./css/networkGraph.css";
</style>
