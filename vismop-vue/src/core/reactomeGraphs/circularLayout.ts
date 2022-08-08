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

export type CircularLayoutOptions = {
  dimensions?: string[];
  center?: number;
  scale?: number;
};

type LayoutMapping = { [node: string]: { [dimension: string]: number } };

import Graph from 'graphology';
/**
 * Graphology Circular Layout
 * ===========================
 *
 * Layout arranging the nodes in a circle.
 */
import resolveDefaults from 'graphology-utils/defaults';
import isGraph from 'graphology-utils/is-graph';

/**
 * Default options.
 */
const DEFAULTS = {
  dimensions: ['x', 'y'],
  center: 0.5,
  scale: 1,
};

/**
 * Abstract function running the layout.
 *
 * @param  {Graph}    graph          - Target  graph.
 * @param  {object}   [options]      - Options:
 * @param  {object}     [attributes] - Attributes names to map.
 * @param  {number}     [center]     - Center of the layout.
 * @param  {number}     [scale]      - Scale of the layout.
 * @return {object}                  - The positions by node.
 */
function genericCircularLayout(
  assignFuncAvailable: boolean,
  graph: Graph,
  options?: CircularLayoutOptions
): LayoutMapping | void {
  if (!isGraph(graph))
    throw new Error(
      'graphology-layout/circle: the given graph is not a valid graphology instance.'
    );

  options = resolveDefaults(options, DEFAULTS);
  const dimensions = options.dimensions;

  if (!Array.isArray(dimensions) || dimensions.length !== 2)
    throw new Error('graphology-layout/circle: given dimensions are invalid.');

  const center = options.center;
  const scale = options.scale;
  const tau = Math.PI * 2;

  const offset = (center - 0.5) * scale;
  const l = graph.order;

  const x = dimensions[0];
  const y = dimensions[1];

  function assignPosition(
    i: number,
    target: {
      [dimension: string]: number;
    }
  ) {
    target[x] = scale * Math.cos((i * tau) / l) + offset;
    target[y] = scale * Math.sin((i * tau) / l) + offset;

    return target;
  }

  let i = 0;

  if (!assignFuncAvailable) {
    const positions: LayoutMapping = {};

    const sortedNodes = graph
      .nodes()
      .sort((a, b) => {
        return String(graph.getNodeAttributes(a).label).localeCompare(
          graph.getNodeAttributes(b).label
        );
      })
      .reverse();
    sortedNodes.forEach(function (node) {
      positions[node] = assignPosition(i++, {});
    });

    return positions;
  }

  graph.updateEachNodeAttributes(
    function (_, attr) {
      assignPosition(i++, attr);
      return attr;
    },
    {
      attributes: dimensions,
    }
  );
}
interface ICircularLayout {
  (graph: Graph, options?: CircularLayoutOptions): LayoutMapping | void;
  assign(graph: Graph, options?: CircularLayoutOptions): void;
}

const circularLayout: ICircularLayout = Object.assign(
  genericCircularLayout.bind({}, false),
  { assign: genericCircularLayout.bind({}, true) }
);
export default circularLayout;
