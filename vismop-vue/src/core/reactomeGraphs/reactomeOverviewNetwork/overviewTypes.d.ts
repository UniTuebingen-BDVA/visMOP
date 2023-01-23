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
