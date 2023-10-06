// BabylonManager.ts
import { WebGPUEngine, HavokPlugin } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";

export class BabylonManager {
  private engine?: WebGPUEngine;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize(sceneClass: any) {
    this.engine = new WebGPUEngine(this.canvas);
    await this.engine.initAsync().then(async () => {
      const havokInstance = await HavokPhysics();
      const hk = new HavokPlugin(true, havokInstance);
      sceneClass.createScene(this.engine, this.canvas, hk);
      sceneClass.registerBusEvents();
    });
  }

  dispose() {
    if (this.engine) {
      this.engine.dispose();
      this.engine = undefined;
    }
  }
}
