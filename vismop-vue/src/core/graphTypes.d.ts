import { Attributes } from 'graphology-types'
/**
 * Defines a set of edge attributes
 */
export interface edgeAttr extends Attributes {
  sourceColor: string;
  targetColor: string;
  z: number;
  fadeColor: string;
  nonFadeColor: string;
  type: string;
}
/**
 * Defines an edge
 */
export interface edge {
  key: string;
  source: string;
  target: string;
  attributes: Attributes;
}
/**
 * Defines a set of node attributes
 */
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
  label: string;
}
/**
 * Defines a node
 */
export interface node {
  key: string;
  attributes: Attributes;
}
/**
 * Defines a Graph Data object
 */
export interface graphData {
  attributes: { name: string };
  nodes: node[];
  edges: edge[];
}
export interface networkxNodeLink{
  graph: {identities: number[]};
  nodes: [{ [key: string]: string}];
  links: [{ [key: string]: string}];
}
/**
 * Defines a kegg relation
 */
export interface relation {
  relationID: string;
  source: string;
  target: string;
  relationType: string;
  edgeType: string;
}
/**
 * Defines an kegg entry
 */
export interface entry {
  name: string;
  entryType: string;
  keggID: string;
  isempty: boolean;
  initialPosX: number;
  initialPosY: number;
  outgoingEdges: relation[];
  outgoingOnceRemoved: relation[];
  trascriptomicsValue: number | string;
  proteomicsValue: number | string;
  metabolomicsValue: number | string;
  label: string;
  origPos: { [key: string]: number[] };
}
