<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          <q-avatar>
            <q-img class="mr-2" contain :src="svgIcon" width="40" />
          </q-avatar>
          VisMOP
        </q-toolbar-title>
        v0.1.1a
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      side="left"
      overlay
      bordered
      :width="500"
    >
      <side-bar></side-bar>
    </q-drawer>

    <q-page-container class="limitToViewport">
      <main-page></main-page>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { ref } from 'vue';
import svgIcon from './assets/vmod_icon.svg';

export default {
  setup() {
    const leftDrawerOpen = ref(false);
    return {
      leftDrawerOpen,
      svgIcon,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value;
      },
    };
  },
};
</script>
<style>
@import './css/networkGraph.css';
@import './css/general.css';

.limitToViewport {
  max-height: 100vh;
  height: 100vh;
  min-height: 100vh;
}
</style>
