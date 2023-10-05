<template>
  <canvas ref="bjsCanvasRef" />
</template>

<script lang="ts" setup>
import HavokPhysics from "@babylonjs/havok";

import { MarbleScene } from "../scenes/MarbleScene";
import { MahjongScene } from "../scenes/MahjongScene";
import { SecretScene } from "../scenes/SecretScene";
import { onMounted, onUnmounted, ref, defineProps } from "vue";
import { WebGPUEngine, HavokPlugin } from "@babylonjs/core";

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
    engine.initAsync().then(async () => {
      const havokInstance = await HavokPhysics();
      const hk = new HavokPlugin(true, havokInstance);
      props.scene.createScene(engine, bjsCanvas, hk);
    });
  }
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
