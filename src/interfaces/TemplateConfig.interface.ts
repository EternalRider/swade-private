export interface TemplateConfig {
  button: foundry.applications.ui.SceneControls.Tool;
  shape: foundry.data.BaseShapeData<
    foundry.data.CircleShapeData.Schema |
    foundry.data.LineShapeData.Schema | 
    foundry.data.ConeShapeData.Schema
  > & { type: keyof foundry.data.BaseShapeData.Types };
}
