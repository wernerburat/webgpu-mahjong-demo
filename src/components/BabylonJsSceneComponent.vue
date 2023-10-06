<template>
  <canvas ref="bjsCanvasRef" />
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, defineProps } from "vue";
import { BabylonManager } from "../manager/BabylonManager";

const props = defineProps({
  scene: {
    type: Object,
    required: true,
  },
});

const bjsCanvasRef = ref(null);
let babylonManager: BabylonManager;

onMounted(() => {
  babylonManager = new BabylonManager(bjsCanvasRef.value!);
  babylonManager.initialize(props.scene);
});

onUnmounted(() => {
  props.scene.unregisterBusEvents();
});
</script>

<style scoped>
canvas {
  width: 90%;
  height: 90%;
  overflow: hidden;

  /*center the canvas*/
}
</style>
