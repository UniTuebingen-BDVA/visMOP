<template>
  <q-layout view="hHh lpR fFf">

    <q-header reveal elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          <q-avatar>
            <q-img
                class="mr-2"
                contain
                :src="svgIcon"
                width="40"
            />
          </q-avatar>
          Title
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" side="left" overlay bordered>
      <SideBar></SideBar>
    </q-drawer>

    <q-page-container>
      <MainPage></MainPage>
    </q-page-container>

  </q-layout>
</template>

<script>
import { ref } from 'vue'
import svgIcon from './assets/vmod_icon.svg'

export default {
  setup () {
    const leftDrawerOpen = ref(false)
    return {
      leftDrawerOpen,
      svgIcon,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  }
}
</script>