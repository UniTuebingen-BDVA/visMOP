import { baseNodeAttr, node, graphData } from '@/core/graphTypes';

type fa2LayoutParams = {
  iterations: number;
  weightShared: number;
  weightDefault: number;
  gravity: number;
  edgeWeightInfluence: number;
  scalingRatio: number;
  adjustSizes: boolean;
  outboundAttractionDistribution: boolean;
  barnesHut: boolean;
  linLog: boolean;
  strongGravity: boolean;
  slowDown: number;
  barnesHutTheta: number;
  clusterSizeScalingFactor: number;
};
/**
 * Type corresponding to the setting of one graph filter
 */
export type filterValues = {
  limits: {
    min: number;
    max: number;
  };
  value: {
    min: number;
    max: number;
  };
  filterActive: boolean;
  inside: boolean;
  disable: boolean;
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
 * Defines an overview Node
 */
type overviewNode = node & {
  attributes: overviewNodeAttr;
};

/**
 * Data needed for sigma to display the convex cluster hulls
 */
type additionalData = {
  clusterAreas: {
    hullPoints: { [key: number]: ConvexPolygon };
    clusterColors: { [key: number]: color };
  };
};

/**
 * Data decsribing the cluster hulls and their coloring
 */
type clusterData = {
  normalHullPoints: { [key: number]: ConvexPolygon };
  focusHullPoints: { [key: number]: ConvexPolygon };
  clusterColors: { [key: number]: color };
};
/**
 * Defines the overview Graph Data
 */
type overviewGraphData = graphData & {
  clusterData: clusterData;
  nodes: overviewNode[];
};
