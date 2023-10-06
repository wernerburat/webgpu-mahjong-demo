import { ShaderParameter } from "../ShaderParameter";

export class DitheringParameter extends ShaderParameter<number> {
  name = "dithering";
  protected getDefaultValue(): number {
    console.log("value");
    return 42;
  }
}
