/* eslint-disable @typescript-eslint/naming-convention */
//@ts-nocheck
export default class InfraVisionFilter extends AbstractBaseFilter {
  static override defaultUniforms = {
    threshold: 0.5,
    alphaThreshold: 0.1,
  };

  static override fragmentShader = `
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform float threshold;
  uniform float alphaThreshold;

  #define C_RED vec4(1.0, 0.0, 0.0, 1.0)
  #define C_YELLOW vec4(1.0, 1.0, 0.0, 1.0)
  #define C_BLUE vec4(0.0, 0.0, 1.0, 1.0)

  void main(void) {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    float luminance = dot(vec3(0.30, 0.59, 0.11), texColor.rgb);
    if ( texColor.a > alphaThreshold ) {
      gl_FragColor = (luminance < threshold) ? mix(C_BLUE, C_YELLOW, luminance * 2.0 ) : mix(C_YELLOW, C_RED, (luminance - 0.5) * 2.0);
      gl_FragColor.rgb *= 0.1 + 0.25 + 0.75 * pow( 16.0 * vTextureCoord.x * vTextureCoord.y * (1.0 - vTextureCoord.x) * (1.0 - vTextureCoord.y), 0.15 );
    } else {
      gl_FragColor = vec4(0.0);
    }
  }`;
}
