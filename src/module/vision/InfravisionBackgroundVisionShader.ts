export class InfravisionBackgroundVisionShader
  extends foundry.canvas.rendering.shaders.AmplificationBackgroundVisionShader
{
  static COLOR_TINT = [0.25, 0.41, 0.88];

  /** @inheritdoc */

  static override defaultUniforms = {
    ...super.defaultUniforms,
    colorTint: this.COLOR_TINT,
  };
}
