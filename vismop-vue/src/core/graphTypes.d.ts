import { Attributes } from 'graphology-types';
/**
 * Defines a set of edge attributes
 */
export interface fadeEdgeAttr extends Attributes {
  sourceColor: string;
  targetColor: string;
  zIndex: number;
  fadeColor: string;
  nonFadeColor: string;
  type: string;
}

export interface baseEdgeAttr extends Attributes {
  type: string;
  zIndex: number;
  color: string;
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
export interface baseNodeAttr extends Attributes {
  name: string;
  x: number;
  y: number;
  zIndex: number;
  color: string;
  size: number;
  fixed: boolean;
  type: string;
  label: string;
}

export interface detailNodeAttr extends baseNodeAttr {
  origPos: { [key: string]: number[] };

  secondaryColor: string;
  outlineColor: string;
  nonFadeColor: string;
  nonFadeColorSecondary: string;
  fadeColor: string;
  fadeColorSecondary: string;
  initialX: number;
  initialY: number;
}

export interface baseNodeAttr extends Attributes {
  name: string;
  x: number;
  y: number;
  modNum?: number;
  up: upDatedPos;
  zIndex: number;
  color: string;
  size: number;
  fixed: boolean;
  type: string;
  label: string;
}

export interface CartesianVector {
  x: number;
  y: number;
}
/**
 * Defines a updated node position
 */
export interface upDatedPos {
  x: number;
  y: number;
  gamma: number;
}

/**
 * Defines a node
 */
export interface node {
  key: string;
  index: number;
  attributes: Attributes;
}
/**
 * Defines a Graph Data object
 */
export interface graphData {
  attributes: { [name: string]: string };
  nodes: node[];
  edges: edge[];
  clusterAreas?: [number[]] | [[number[]]] ;
  options: unkown;
}
export interface networkxNodeLink {
  graph: { identities: number[] };
  nodes: [{ [key: string]: string }];
  links: [{ [key: string]: string }];
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
  moduleNum: any;
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
