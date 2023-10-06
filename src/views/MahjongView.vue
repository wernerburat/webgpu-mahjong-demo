<template>
  <BabylonJsScene :scene="mahjongScene" />
  <div v-if="showMenu" class="mah-menu">
    <input type="text" v-model="tile" />
    <button @click="addTile">Add tile</button>
  </div>
  <div v-if="hi" class="container">
    <div class="big-button" @click="spawnAllTiles">
      <marquee>Spawn</marquee>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import BabylonJsScene from "../components/BabylonJsSceneComponent.vue";
import { MahjongSceneDirector } from "../director/MahjongSceneDirector";
import { MahjongScene } from "../scenes/MahjongScene";
import { BusFactory } from "../bus/BusFactory";

const showMenu = ref(false);
const hi = ref(false);

const bus = BusFactory.getBus();
const mahjongScene = new MahjongScene(bus);

const sceneDirector = new MahjongSceneDirector();
const tile = ref(0);

const addTile = async () => {
  void sceneDirector.addTile(tile.value);
};

const spawnAllTiles = async () => {
  void sceneDirector.spawnAllTiles();
  hi.value = false;
};

onMounted(() => {
  // keyboard listen to
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      showMenu.value = !showMenu.value;
    }
  });
});
</script>

<style scoped>
.container {
  position: absolute;
  display: flex;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.big-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;

  /* gradient */
  background: linear-gradient(to right, #fda085, #f6d365);

  /* border radius */
  border-radius: 10px;

  /* animations */
  animation: pulse 2s infinite ease-in-out;
  /* setup for hover */
  transition: 0.2s ease-in-out;

  /* font */
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1rem;
}

/* On hover: glow*/
.big-button:hover {
  filter: saturate(250%);
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

marquee {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 100%;
  font-size: 2rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.4rem;
  color: #fff;
}
</style>
