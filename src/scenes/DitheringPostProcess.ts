import { Camera, PostProcess, Texture, WebGPUEngine } from "@babylonjs/core";
import { watch } from "vue";
import { useShaderStore } from "../stores/shaderStore"; // Adjust the path if needed

export class DitheringPostProcess extends PostProcess {
  ditherScale: number = 1.0;

  constructor(camera: Camera, engine: WebGPUEngine) {
    super(
      "dithering",
      "dithering",
      ["ditherScale"], // The list of uniforms
      null,
      1.0,
      camera,
      Texture.BILINEAR_SAMPLINGMODE,
      engine,
      true
    );

    // Initialize with value from the store
    //this.ditherScale = this.shaderStore.getParameterValue("dithering") || 100.0;
    this.ditherScale = 1.0;

    this.onApplyObservable.add((effect) => {
      effect.setFloat("ditherScale", this.ditherScale);
    });
  }
}
