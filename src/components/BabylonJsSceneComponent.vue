<template>
  <canvas ref="bjsCanvasRef" width="500" height="500" />
</template>

<script lang="ts" setup>
import { MarbleScene } from "../scenes/MarbleScene";
import { BusFactory } from "../bus/BusFactory";
import { onMounted, onUnmounted, ref, defineProps } from "vue";

defineProps({
  msg: String,
});

const bus = BusFactory.getBus();
const bjsCanvasRef = ref(null);
const myScene = new MarbleScene(bus);

onMounted(() => {
  const bjsCanvas = bjsCanvasRef.value;
  if (bjsCanvas) {
    myScene.createScene(bjsCanvas);
    myScene.registerBusEvents();
  }
});

onUnmounted(() => {
  myScene.unregisterBusEvents();
});
</script>
