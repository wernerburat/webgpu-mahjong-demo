<template>
  <div style="width: 100%; height: 40px">
    <input type="text" v-model="name" />
    <button @click="addTile">Add tile</button>
  </div>
  <BabylonJsScene :scene="mahjongScene" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import BabylonJsScene from "../components/BabylonJsSceneComponent.vue";
import { MahjongSceneDirector } from "../director/MahjongSceneDirector";
import { MahjongScene } from "../scenes/MahjongScene";
import { BusFactory } from "../bus/BusFactory";

const bus = BusFactory.getBus();
const mahjongScene = new MahjongScene(bus);

const sceneDirector = new MahjongSceneDirector();
const name = ref("");

const addTile = async () => {
  void sceneDirector.addTile();
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
