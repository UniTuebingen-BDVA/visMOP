import { Attributes } from 'graphology-types';
/**
 * Defines a set of edge attributes
 */
type fadeEdgeAttr = Attributes & {
  sourceColor: string;
  targetColor: string;
  zIndex: number;
  fadeColor: string;
  nonFadeColor: string;
  type: string;
};

type baseEdgeAttr = Attributes & {
  type: string;
  zIndex: number;
  color: string;
};

/**
 * Defines an edge
 */
type edge = {
  key: string;
  source: string;
  target: string;
  attributes: Attributes;
};

type detailNodeAttr = baseNodeAttr & {
  origPos: { [key: string]: number[] };
  secondaryColor: string;
  outlineColor: string;
  nonFadeColor: string;
  nonFadeColorSecondary: string;
  fadeColor: string;
  fadeColorSecondary: string;
  initialX: number;
  initialY: number;
};

type baseNodeAttr = Attributes & {
  name: string;
  id: string;
  x: number;
  y: number;
  zIndex: number;
  color: string;
  size: number;
  fixed: boolean;
  type: string;
  label: string;
};

type overviewNodeAttr = baseNodeAttr & {
  yOnClusterFocus: number;
  xOnClusterFocus: number;
  modNum: number;
  up: upDatedPos;
  isRoot: boolean;
  nodeType: string;
};

type CartesianVector = {
  x: number;
  y: number;
};
/**
 * Defines a updated node position
 */
type upDatedPos = {
  x: number;
  y: number;
  gamma: number;
};

/**
 * Defines a node
 */
type node = {
  key: string;
  index: number;
  attributes: baseNodeAttr;
};

type overviewNode = node & {
  attributes: overviewNodeAttr;
};

/**
 * Defines a Graph Data object
 */
type graphData = {
  attributes: { [name: string]: string };
  nodes: node[];
  edges: edge[];

  options: unkown;
};

/**
 * Defines overview Graph Data
 */
type overviewGraphData = graphData & {
  nodes: overviewNode[];
  clusterAreas: {
    normalHullPoints: { hullPoints: number[][][]; greyValues: number[] };
    focusHullPoints: number[][][];
  };
};

type networkxNode = {
  labelName: string;
  key: string;
  egoNode: string;
  size: number;
  identity: string;
};
type networkxNodeLink = {
  graph: { identities: number[] };
  nodes: networkxNode[];
  links: [{ [key: string]: string }];
};
/**
 * Defines a graph relation
 */
type relation = {
  relationID: string;
  source: string;
  target: string;
  relationType: string;
  edgeType: string;
};
/**
 * Defines an graph entry
 */
type entry = {
  // seems Deprecated
  moduleNum: number;
  name: string;
  entryType: string;
  entryID: string;
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
};
