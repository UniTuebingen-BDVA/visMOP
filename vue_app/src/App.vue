<template>
  <v-app>
    <v-navigation-drawer
      app
      v-model="drawer"
      :expand-on-hover="sideBarExpand"
      color="primary"
      dense
      width=512
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
          :src="require('./assets/vmod_icon.svg')"
          transition="scale-transition"
          width="40"
        />

        <span class="mr-2">SAMPLE APP</span>
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
    <v-app-bar
      app
      color="primary"
      dark
    >
      <div class="d-flex align-center pl-12">
        <v-img
          class="shrink mr-2"
          contain
          :src="require('./assets/vmod_icon.svg')"
          transition="scale-transition"
          width="40"
        />

        <span class="mr-2">VisMOP</span>
      </div>

    </v-app-bar>

    <v-main class="pl-12">
      <MainPage/>
    </v-main>

  </v-app>
</template>

<script>
import { mapState } from "vuex";

import MainPage from "./components/MainPage.vue"
import SideBar from './components/Sidebar'
export default {
  name: 'App',

  components: {
    MainPage,
    SideBar
  },


  data: () => ({
    drawer: true,
    navbarKey: true,
    dialog : false,
  }),
  computed: {
    ...mapState({
    }),
  sideBarExpand:{
    get(){return this.$store.state.sideBarExpand},
    set(val){this.$store.commit("setSideBarExpand", val)}
  } 

  },
};


</script>
<style>
@import 'assets/css/networkGraph.css';
</style>