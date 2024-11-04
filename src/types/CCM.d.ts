import type { CONST } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client-esm/client.d.mts';

interface CCMConfig {
    from: Cards;
    to: Cards;
}

export interface CCMGridConfig extends CCMConfig {
  rows: number;
  columns: number;
}

export interface CCMTriangleConfig extends CCMConfig {
    base: number;
}

export interface CCMGridOptions {
  how?: CONST.CARD_DRAW_MODES; // Value from CONST.CARD_DRAW_MODES
  updateData?: object;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  offsetX?: number;
  offsetY?: number;
  sceneId?: number;
}

export interface CCMTriangleOptions extends CCMGridOptions {
    direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}

declare global {
    const ccm: {
        api: {
            grid(config: CCMGridConfig, options?: CCMGridOptions): Promise<Card.ConfiguredInstance[]>;
            triangle(config: CCMTriangleConfig, options?: CCMTriangleOptions): Promise<Card.ConfiguredInstance[]>;
        }
    } | undefined;
}