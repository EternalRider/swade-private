export class InfravisionBackgroundVisionShader extends AmplificationBackgroundVisionShader {
  static COLOR_TINT = [0.25, 0.41, 0.88];

  /** @inheritdoc */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static override defaultUniforms = {
    ...super.defaultUniforms,
    colorTint: this.COLOR_TINT,
  };
}
