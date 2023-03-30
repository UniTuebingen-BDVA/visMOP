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
 * Defines a node
 */
type node = {
  key: string;
  index: number;
  attributes: baseNodeAttr;
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
 * defines a colors object
 * @example  [255, 255, 255, 1.0]
 */
type color = [number, number, number, number];
