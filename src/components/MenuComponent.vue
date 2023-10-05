<template>
  <div id="game-menu" :data-display="display">
    <slot></slot>
    <div v-for="item in collectedMenuItems" :key="item.id">
      <component :is="item.component" v-bind="item.props"></component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, onMounted } from "vue";

const display = ref(false);
const toggleDisplay = () => {
  display.value = !display.value;
};

// Listen for events from the keyboard on mount
onMounted(() => {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleDisplay();
    }
  });
});
</script>

<style scoped>
#game-menu {
  width: 250px; /* or your preferred width */
  height: 100%; /* full height */
  position: fixed;
  top: 0;
  left: -250px; /* off screen */
  transition: left 0.5s; /* sliding transition */
  background-color: #333; /* any color you prefer */
}

#game-menu[data-display="true"] {
  left: 0; /* bring it on screen */
}
</style>
