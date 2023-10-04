<template>
  <div style="width: 100%; height: 40px"></div>
  <BabylonJsScene :scene="secretScene" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BabylonJsScene from "../components/BabylonJsSceneComponent.vue";
import { SecretSceneDirector } from "../director/SecretSceneDirector";
import { SecretScene } from "../scenes/SecretScene";
import { BusFactory } from "../bus/BusFactory";

const bus = BusFactory.getBus();
const secretScene = new SecretScene(bus);
const sceneDirector = new SecretSceneDirector();
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
