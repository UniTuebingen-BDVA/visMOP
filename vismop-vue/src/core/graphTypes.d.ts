import { Attributes } from 'graphology-types'

export interface edgeAttr extends Attributes {
  sourceColor: string;
  targetColor: string;
  z: number;
  fadeColor: string;
  nonFadeColor: string;
  type: string;
}

export interface edge {
  key: string;
  source: string;
  target: string;
  attributes: Attributes;
}
export interface nodeAttr extends Attributes {
  name: string;
  x: number;
  y: number;
  z: number;
  initialX: number;
  initialY: number;
  origPos: { [key: string]: number[] };
  color: string;
  secondaryColor: string;
  outlineColor: string;
  nonFadeColor: string;
  nonFadeColorSecondary: string;
  fadeColor: string;
  fadeColorSecondary: string;
  size: number;
  fixed: boolean;
  type: string;
}
export interface node {
  key: string;
  attributes: Attributes;
}
export interface graphData {
  attributes: { name: string };
  nodes: node[];
  edges: edge[];
}
export interface relation {
  relationID: string;
  source: string;
  target: string;
  relationType: string;
  edgeType: string;
}
export interface entry {
  name: string;
  entryType: string;
  keggID: string;
  isempty: boolean;
  initialPosX: number;
  initialPosY: number;
  outgoingEdges: relation[];
  trascriptomicsValue: number | string;
  proteomicsValue: number | string;
  label: string;
  origPos: { [key: string]: number[] };
}
