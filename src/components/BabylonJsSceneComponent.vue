<template>
  <canvas ref="bjsCanvasRef" width="500" height="500" />
</template>

<script lang="ts" setup>
import { MarbleScene } from "../scenes/MarbleScene";
import { MahjongScene } from "../scenes/MahjongScene";
import { SecretScene } from "../scenes/SecretScene";
import { onMounted, onUnmounted, ref, defineProps } from "vue";
import { WebGPUEngine } from "@babylonjs/core";

const props = defineProps({
  scene: {
    type: MahjongScene || MarbleScene || SecretScene,
    required: true,
  },
});

const bjsCanvasRef = ref(null);

onMounted(() => {
  props.scene.registerBusEvents();
  const engine = new WebGPUEngine(bjsCanvasRef.value!);
  const bjsCanvas = bjsCanvasRef.value;
  if (bjsCanvas) {
    engine.initAsync().then(() => {
      props.scene.createScene(engine, bjsCanvas);
    });
  }
});

onUnmounted(() => {
  props.scene.unregisterBusEvents();
});
</script>
