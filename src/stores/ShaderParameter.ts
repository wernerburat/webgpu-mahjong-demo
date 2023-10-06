export abstract class ShaderParameter<T> {
  abstract name: string;

  value: T;

  constructor() {
    this.value = this.getDefaultValue();
  }

  protected abstract getDefaultValue(): T;

  setValue(newValue: T): void {
    this.value = newValue;
  }

  getValue(): T {
    return this.value;
  }
}
