import { TOKEN_DISPOSITIONS } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/constants.mjs';

export interface AuraData {
  /** Is the aura enabled? */
  enabled: boolean;
  /** Radius of the aura, in grid squares. */
  radius: number;
  /** Color of the aura */
  color: string | number;
  /** Alpha level if the aura */
  alpha: number;
  /** Is the aura constrained by walls? */
  walls: boolean;
  /** what kind of Tokens is this aura visible to */
  visibleTo: TOKEN_DISPOSITIONS[];
}
