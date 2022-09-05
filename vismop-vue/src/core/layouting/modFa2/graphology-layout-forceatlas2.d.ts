/*
The MIT License (MIT)

Copyright (c) 2016-2021 Guillaume Plique (Yomguithereal)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import Graph, { Attributes, EdgeMapper } from 'graphology-types';
import ConvexPolygon from '../ConvexPolygon';

type LayoutMapping = { [key: string]: { x: number; y: number } };

export type ForceAtlas2Settings = {
  linLogMode?: boolean;
  outboundAttractionDistribution?: boolean;
  adjustSizes?: boolean;
  edgeWeightInfluence?: number;
  scalingRatio?: number;
  strongGravityMode?: boolean;
  gravity?: number;
  slowDown?: number;
  barnesHutOptimize?: boolean;
  barnesHutTheta?: number;
};

export type ForceAtlas2LayoutParameters<
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
> = {
  settings?: ForceAtlas2Settings;
  getEdgeWeight?:
    | keyof EdgeAttributes
    | EdgeMapper<number, NodeAttributes, EdgeAttributes>
    | null;
  outputReducer?: (key: string, attributes: any) => any;
};

export interface ForceAtlas2SynchronousLayoutParameters<
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
> extends ForceAtlas2LayoutParameters<NodeAttributes, EdgeAttributes> {
  iterations: number;
}

interface IForceAtlas2Layout {
  (
    graph: Graph,
    iterations: number,
    boundingPoly: ConvexPolygon
  ): LayoutMapping;
  <
    NodeAttributes extends Attributes = Attributes,
    EdgeAttributes extends Attributes = Attributes
  >(
    graph: Graph,
    params: ForceAtlas2SynchronousLayoutParameters<
      NodeAttributes,
      EdgeAttributes
    >,
    boundingPoly: ConvexPolygon
  ): LayoutMapping;

  assign(graph: Graph, iterations: number): void;
  assign<
    NodeAttributes extends Attributes = Attributes,
    EdgeAttributes extends Attributes = Attributes
  >(
    graph: Graph,
    params: ForceAtlas2SynchronousLayoutParameters<
      NodeAttributes,
      EdgeAttributes
    >
  ): void;

  inferSettings(order: number): ForceAtlas2Settings;
  inferSettings(graph: Graph): ForceAtlas2Settings;
}

declare const forceAtlas2: IForceAtlas2Layout;

export default forceAtlas2;
