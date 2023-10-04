<template>
  <canvas ref="bjsCanvasRef" width="500" height="500" />
</template>

<script lang="ts" setup>
import { MarbleScene } from "../scenes/MarbleScene";
import { MahjongScene } from "../scenes/MahjongScene";
import { SecretScene } from "../scenes/SecretScene";
import { onMounted, onUnmounted, ref, defineProps } from "vue";

const props = defineProps({
  scene: {
    type: MarbleScene || MahjongScene || SecretScene,
    required: true,
  },
});

const bjsCanvasRef = ref(null);

onMounted(() => {
  const bjsCanvas = bjsCanvasRef.value;
  if (bjsCanvas) {
    props.scene.createScene(bjsCanvas);
    props.scene.registerBusEvents();
  }
});

onUnmounted(() => {
  props.scene.unregisterBusEvents();
});
</script>
