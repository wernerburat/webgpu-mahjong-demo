<template>
  <div>
    <label>
      Dithering:
      <input type="range" v-model="ditheringValue" min="0" max="100" step="1" />
    </label>
    <!-- Add other controls as needed -->
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { useShaderStore } from "../stores/shaderStore";

const shaderStore = useShaderStore();

// Using v-model for two-way data binding on the input.
// Initialize with current value from the store.
const ditheringValue = ref(shaderStore.getParameterValue("dithering"));

// Watch for local changes and update the store accordingly.
watch(ditheringValue, (newValue) => {
  shaderStore.setParameterValue("dithering", newValue);
});

// You can also listen to other props passed down or emit events
// to the parent component if required.
</script>

<style scoped>
/* Add styles for your controls here */
</style>
