/**
 * Graphology ForceAtlas2 Layout
 * ==============================
 *
 * Library endpoint.
 */
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
import { isGraph, createEdgeWeightGetter } from 'graphology';
import iterate from './iterate.js';
import helpers from 'graphology-layout-forceatlas2/helpers';
import DEFAULT_SETTINGS from 'graphology-layout-forceatlas2/defaults';

/**
 * Asbtract function used to run a certain number of iterations.
 *
 * @param  {boolean}       assign          - Whether to assign positions.
 * @param  {Graph}         graph           - Target graph.
 * @param  {object|number} params          - If number, params.iterations, else:
 * @param  {function}        getWeight     - Edge weight getter function.
 * @param  {number}          iterations    - Number of iterations.
 * @param  {function|null}   outputReducer - A node reducer
 * @param  {object}          [settings]    - Settings.
 * @return {object|undefined}
 */
function abstractSynchronousLayout(assign, graph, params, boundingPoly) {
  if (!isGraph(graph))
    throw new Error(
      'graphology-layout-forceatlas2: the given graph is not a valid graphology instance.'
    );

  if (typeof params === 'number') params = { iterations: params };

  var iterations = params.iterations;

  if (typeof iterations !== 'number')
    throw new Error(
      'graphology-layout-forceatlas2: invalid number of iterations.'
    );

  if (iterations <= 0)
    throw new Error(
      'graphology-layout-forceatlas2: you should provide a positive number of iterations.'
    );

  var getEdgeWeight = createEdgeWeightGetter(params.getEdgeWeight).fromEntry;

  var outputReducer =
    typeof params.outputReducer === 'function' ? params.outputReducer : null;

  // Validating settings
  var settings = helpers.assign({}, DEFAULT_SETTINGS, params.settings);
  var validationError = helpers.validateSettings(settings);

  if (validationError)
    throw new Error(
      'graphology-layout-forceatlas2: ' + validationError.message
    );

  // Building matrices
  var matrices = helpers.graphToByteArrays(graph, getEdgeWeight);

  var i;

  // Iterating
  for (i = 0; i < iterations; i++)
    iterate(settings, matrices.nodes, matrices.edges, boundingPoly);

  // Applying
  if (assign) {
    helpers.assignLayoutChanges(graph, matrices.nodes, outputReducer);
    return;
  }

  return helpers.collectLayoutChanges(graph, matrices.nodes);
}

/**
 * Function returning sane layout settings for the given graph.
 *
 * @param  {Graph|number} graph - Target graph or graph order.
 * @return {object}
 */
function inferSettings(graph) {
  var order = typeof graph === 'number' ? graph : graph.order;

  return {
    barnesHutOptimize: order > 2000,
    strongGravityMode: true,
    gravity: 0.05,
    scalingRatio: 10,
    slowDown: 1 + Math.log(order),
  };
}

/**
 * Exporting.
 */
var synchronousLayout = abstractSynchronousLayout.bind(null, false);
synchronousLayout.assign = abstractSynchronousLayout.bind(null, true);
synchronousLayout.inferSettings = inferSettings;

module.exports = synchronousLayout;
