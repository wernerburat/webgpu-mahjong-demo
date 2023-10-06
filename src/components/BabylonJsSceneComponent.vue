<template>
  <canvas ref="bjsCanvasRef" />
  <div class="shader-controls">
    <ShaderControls />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, defineProps } from "vue";
import { BabylonManager } from "../manager/BabylonManager";
import ShaderControls from "./ShaderControls.vue";

const props = defineProps({
  scene: {
    type: Object,
    required: true,
  },
});

const bjsCanvasRef = ref(null);
let babylonManager: BabylonManager;

onMounted(async () => {
  if (bjsCanvasRef.value) {
    babylonManager = new BabylonManager(bjsCanvasRef.value);
    await babylonManager.initialize(props.scene);
    console.log("manager initialized");
  }
});

onUnmounted(() => {
  console.log("unmounteds");
  babylonManager?.dispose();
  props.scene.unregisterBusEvents();
});
</script>

<style scoped>
canvas {
  width: 90%;
  height: 90%;
  overflow: hidden;
}
</style>
