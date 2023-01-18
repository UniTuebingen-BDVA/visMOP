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
  startAngle?: number;
  minDivisions?: number;
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
  startAngle: 0,
  minDivisions: 0,
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
  const startAngle = options.startAngle;
  const minDivisions = options.minDivisions;

  const { amtTimePoints, nodeKeysInOrder } = generateTimepointCircles(graph);
  const nodePerTimepoint = graph.order / amtTimePoints;

  const offset = (center - 0.5) * scale;
  const l = graph.order < minDivisions ? minDivisions : nodePerTimepoint;

  const x = dimensions[0];
  const y = dimensions[1];

  function assignPosition(
    i: number,
    target: {
      [dimension: string]: number;
    }
  ) {
    const additionalOffset = Math.floor(i / nodePerTimepoint) * (scale / 4);
    console.log('additional layout factor', additionalOffset);

    const angle = (Math.PI * 2 * -i) / l + startAngle;
    target[x] = (scale * 1.1 + additionalOffset) * Math.cos(angle) + offset;
    target[y] = (scale * 1.1 + additionalOffset) * Math.sin(angle) + offset;

    //= scale * Math.cos(((-i + l / 4) * tau) / l) + offset;
    //= scale * Math.sin(((-i + l / 4) * tau) / l) + offset;

    return target;
  }

  let i = 0;

  if (!assignFuncAvailable) {
    const positions: LayoutMapping = {};

    nodeKeysInOrder.forEach(function (node) {
      positions[node] = assignPosition(i++, {});
    });

    return positions;
  }

  graph.updateEachNodeAttributes(
    function (_, attr) {
      attr = assignPosition(i++, attr);
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

const orderedCircularLayout: ICircularLayout = Object.assign(
  genericCircularLayout.bind({}, false),
  { assign: genericCircularLayout.bind({}, true) }
);
export default orderedCircularLayout;

function generateTimepointCircles(graph: Graph): {
  amtTimePoints: number;
  nodeKeysInOrder: string[];
} {
  const idsByTimepoint: { [key: string]: string[] } = {};
  const nodeIds = graph.nodes();
  nodeIds.forEach((node) => {
    const timepoint = node.split('_')[1];
    idsByTimepoint[timepoint]
      ? idsByTimepoint[timepoint].push(node)
      : (idsByTimepoint[timepoint] = [node]);
  });
  let outArray: string[] = [];
  const sortedKeys = Object.keys(idsByTimepoint).sort((a, b) =>
    a.localeCompare(b)
  );

  sortedKeys.forEach((key) => {
    const sortedNodes = idsByTimepoint[key].sort((a, b) => {
      return String(graph.getNodeAttributes(a).label).localeCompare(
        graph.getNodeAttributes(b).label
      );
    });
    outArray = [...outArray, ...sortedNodes];
  });

  return { amtTimePoints: sortedKeys.length, nodeKeysInOrder: outArray };
}
