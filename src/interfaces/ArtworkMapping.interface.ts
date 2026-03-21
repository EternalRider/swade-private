export interface ArtworkMapping {
  actor: string;
  token: string | TokenMapping;
}

interface TokenMapping {
  img: string;
  scale: number;
}

export type ArtworkMappingFile = Record<Compendium, Record<Id, ArtworkMapping>>;

type Compendium = string;
type Id = string;
