import { defineStore } from "pinia";
import { ref, Ref } from "vue";
import { ShaderParameter } from "./ShaderParameter";
import * as ShaderParameters from "./Parameters/"; // This imports all classes from the folder

type ShaderParametersType = {
  [key: string]: new () => ShaderParameter<any>;
};

export const useShaderStore = defineStore("shader", () => {
  const shader: Ref<string> = ref("");

  const TypedShaderParameters: ShaderParametersType = ShaderParameters;

  // Automatically map and instantiate shader parameter classes
  const parameters: { [key: string]: ShaderParameter<any> } = {};
  for (const key in TypedShaderParameters) {
    if (
      Object.getPrototypeOf(TypedShaderParameters[key].prototype) ===
      ShaderParameter.prototype
    ) {
      parameters[key] = new TypedShaderParameters[key]();
    }
  }

  return {
    shader,
    parameters,

    // Getter for a specific parameter value
    getParameterValue: (paramName: string) => {
      return parameters[paramName]?.getValue();
    },

    // Setter for a specific parameter value
    setParameterValue: (paramName: string, value: any) => {
      parameters[paramName]?.setValue(value);
    },
  };
});
