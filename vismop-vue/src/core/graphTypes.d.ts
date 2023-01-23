import { Attributes } from 'graphology-types';

/**
 * Set of attributes common to all edge types
 */
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

/**
 * Attributes common to all node types
 */
type baseNodeAttr = {
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

/**
 * attributes of a node in the overview graph
 */
type overviewNodeAttr = baseNodeAttr & {
  layoutX: number;
  layoutY: number;
  preFa2X: number;
  preFa2Y: number;
  yOnClusterFocus: number;
  xOnClusterFocus: number;
  clusterNum: number;
  isRoot: boolean;
  nodeType: 'root' | 'regular' | 'hierarchical' | 'cluster' | 'other';
  nonHoverSize: number;
  image: string;
  imageHighDetail: string;
  imageLowDetail: string;
  hidden: boolean;
  hierarchyHidden: boolean;
  filterHidden: boolean;
  zoomHidden: boolean;
  clusterHidden: boolean;
  clusterFixed: boolean;
  forceLabel: boolean;
  fcAverages: {
    transcriptomics: number;
    proteomics: number;
    metabolomics: number;
  };
  nodeState: {
    transcriptomics: { regulated: number; total: number };
    proteomics: { regulated: number; total: number };
    metabolomics: { regulated: number; total: number };
  };
  rootId: string;
  parents: string[];
  children: string[];
  subtreeIds: string[];
  visibleSubtree: boolean;
};
/**
 * Defines a node
 */
type node = {
  key: string;
  index: number;
  attributes: baseNodeAttr;
};

/**
 * Defines an overview Node
 */
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
 * Type defining the points of the convex hull describing the clusters boundary
 */
type hullPoints = number[][][];

/**
 * Data needed for sigma to display the convex cluster hulls
 */
type additionalData = {
  clusterAreas: {
    hullPoints: hullPoints;
    clusterColors: [number, number, number, number][];
  };
};

/**
 * Data decsribing the cluster hulls and their coloring
 */
type clusterData = {
  normalHullPoints: hullPoints;
  focusHullPoints: hullPoints;
  clusterColors: [number, number, number, number][];
};
/**
 * Defines the overview Graph Data
 */
type overviewGraphData = graphData & {
  clusterData: clusterData;
  nodes: overviewNode[];
};
