<template>
  <div class="menu">
    <button @click="marbles">Marbles</button>
    <button @click="mahjong">Mahjong</button>
    <button @click="secret">Secret</button>
  </div>
  <Marbles v-if="showMarbles"></Marbles>
  <Mahjong v-if="showMahjong"></Mahjong>
  <Secret v-if="showSecret"></Secret>
</template>

<script setup lang="ts">
import Marbles from "./views/MarblesView.vue";
import Mahjong from "./views/MahjongView.vue";
import Secret from "./views/SecretView.vue";

import { ref } from "vue";

const showMarbles = ref(false);
const showMahjong = ref(true);
const showSecret = ref(false);

const marbles = () => {
  showMarbles.value = true;
  showMahjong.value = false;
  showSecret.value = false;
};

const mahjong = () => {
  showMarbles.value = false;
  showMahjong.value = true;
  showSecret.value = false;
};

const secret = () => {
  showMarbles.value = false;
  showMahjong.value = false;
  showSecret.value = true;
};
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.menu {
  width: 100%;
  height: 40px;
  margin-bottom: 20px;
}

button {
  background-color: #4caf50;
  border: none;
  color: white;
  padding: 15px 32px;
}

button:hover {
  background-color: #3e8e41;
  cursor: pointer;
}
</style>
