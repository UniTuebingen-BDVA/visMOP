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

type baseNodeAttr = {
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
  layoutX: number;
  layoutY: number;
  preFa2X: number;
  preFa2Y: number;
  yOnClusterFocus: number;
  xOnClusterFocus: number;
  modNum: number;
  up: upDatedPos;
  isRoot: boolean;
  nodeType: string;
  nonHoverSize: number;
  image: string;
  imageLowRes: string;
  imageHighRes: string;
  imageLowZoom: string;
  hidden: boolean;
  hierarchyHidden: boolean;
  filterHidden: boolean;
  zoomHidden: boolean;
  moduleHidden: boolean;
  moduleFixed: boolean;
  forceLabel: boolean;
  averageTranscriptomics: number;
  averageProteomics: number;
  averageMetabolomics: number;
  transcriptomicsNodeState: { regulated: number; total: number };
  proteomicsNodeState: { regulated: number; total: number };
  metabolomicsNodeState: { regulated: number; total: number };
  rootId: string;
  parents: string[];
  children: string[];
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

type hullPoints = number[][][];

type additionalData = {
  clusterAreas: {
    hullPoints: hullPoints;
    greyValues: number[];
  };
};

type clusterData = {
  normalHullPoints: hullPoints;
  focusHullPoints: hullPoints;
  greyValues: number[];
};
/**
 * Defines overview Graph Data
 */
type overviewGraphData = graphData & {
  clusterData: clusterData;
  nodes: overviewNode[];
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
