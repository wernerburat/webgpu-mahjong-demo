<template>
  <div style="width: 100%; height: 40px">
    <input type="text" v-model="name" />
    <button @click="addMarble">Add marble</button>
    <button @click="clearMarbles">Remove marbles</button>
    <button @click="getMeshNames">Console.log scene mesh names</button>
    <br />
    SelectedMarbleName: {{ selectedMarbleNameLabel }}
  </div>
  <BabylonJsScene :scene="marbleScene" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BabylonJsScene from "../components/BabylonJsSceneComponent.vue";
import { MarbleSceneDirector } from "../director/MarbleSceneDirector";
import { MarbleScene } from "../scenes/MarbleScene";
import { BusFactory } from "../bus/BusFactory";

const bus = BusFactory.getBus();
const marbleScene = new MarbleScene(bus);

const sceneDirector = new MarbleSceneDirector();
const name = ref("");
const selectedMarbleNameLabel = computed(() => {
  return selectedMarbleName.value !== ""
    ? selectedMarbleName.value
    : "Click on a marble";
});

const selectedMarbleName = sceneDirector.useSelectedMarbleName();

const addMarble = async () => {
  void sceneDirector.addMarble(name.value);
};

const clearMarbles = async () => {
  void sceneDirector.clearMarbles();
};

const getMeshNames = async () => {
  const names = await sceneDirector.getMeshNames();
  console.log("Mesh names:", names);
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
./director/MarbleSceneDirector
