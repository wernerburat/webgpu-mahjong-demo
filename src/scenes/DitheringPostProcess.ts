import { Camera, PostProcess, Texture, WebGPUEngine } from "@babylonjs/core";

export class DitheringPostProcess extends PostProcess {
  public ditherScale: number = 100.0; // Set default value

  constructor(camera: Camera, engine: WebGPUEngine) {
    super(
      "dithering",
      "dithering",
      ["ditherScale"],
      null,
      1.0,
      camera,
      Texture.BILINEAR_SAMPLINGMODE,
      engine,
      true
    );

    this.onApplyObservable.add((effect) => {
      effect.setFloat("ditherScale", this.ditherScale);
    });
  }
}
