import * as _ from 'lodash';
import {
  node,
  edge,
  graphData,
  baseNodeAttr,
  baseEdgeAttr,
} from '@/core/graphTypes';
import { pfsPrime_modules } from '@/core/noverlap_pfsp_module';
// import { vpsc } from '@/core/noverlap_vpsc'
import { reactomeEntry } from './reactomeTypes';
import { glyphData } from '../generalTypes';
import hull from 'hull.js';
import ClusterHulls from '@/core/convexHullsForClusters';
import { getRightResultFormForRectangle } from '@/core/convexHullsForClusters';
import overviewGraph from './reactomeOverviewNetwork/overviewNetwork';
/**
 * Function generating a graph representation of multiomics data, to be used with sigma and graphology
 * @param nodeList list of node data
 * @returns
 */
export function generateGraphData(
  nodeList: reactomeEntry[],
  glyphs: { [key: string]: string },
  glyphsHighres: { [key: string]: string },
  glyphsLowZoom: { [key: string]: string },
  glyphData: {
    [key: string]: glyphData;
  },
  rootIds: string[],
  moduleAreas: [number[]] = [[]]
): graphData {
  const graph = {
    attributes: { name: 'BaseNetwork' },
    nodes: [],
    edges: [],
    clusterAreas: {
      normalHullPoints: { hullPoints: [[[]]], greyValues: [] },
      focusHullPoints: [[[]]],
    },
    options: [],
  } as graphData;
  const addedEdges: string[] = [];
  let index = 0;
  let maxModuleNum = 0;
  for (const entryKey in nodeList) {
    const entry = nodeList[entryKey];
    const name = entry.pathwayName;
    const id = entry.pathwayId;
    const initPosX = entry.initialPosX;
    const initPosY = entry.initialPosY;
    const modNum = entry.moduleNum;
    maxModuleNum = Math.max(maxModuleNum, modNum);
    const currentNode = {
      key: id,
      index: index,
      // label: "",
      attributes: {
        entryType: 'temp',
        type: 'image',
        modNum: modNum,
        image: glyphs[id],
        imageLowRes: glyphs[id],
        imageHighRes: glyphsHighres[id],
        imageLowZoom: glyphsLowZoom[id],
        name: _.escape(name),
        id: id,
        hidden: false,
        filterHidden: false,
        zoomHidden: false,
        moduleHidden: false,
        moduleFixed: false,
        color: entry.rootId === entry.pathwayId ? '#FF99FF' : '#FFFFFF',
        label: `${_.escape(name)}`,
        forceLabel: entry.rootId === entry.pathwayId ? true : false,
        averageTranscriptomics: glyphData[id].transcriptomics.available
          ? glyphData[id].transcriptomics.meanFoldchange
          : NaN,
        averageProteomics: glyphData[id].proteomics.available
          ? glyphData[id].proteomics.meanFoldchange
          : NaN,
        averageMetabolonmics: glyphData[id].metabolomics.available
          ? glyphData[id].metabolomics.meanFoldchange
          : NaN,
        transcriptomicsNodeState: glyphData[id].transcriptomics.available
          ? glyphData[id].transcriptomics.nodeState
          : { regulated: 0, total: 0 },
        proteomicsNodeState: glyphData[id].proteomics.available
          ? glyphData[id].proteomics.nodeState
          : { regulated: 0, total: 0 },
        metabolomicsNodeState: glyphData[id].metabolomics.available
          ? glyphData[id].metabolomics.nodeState
          : { regulated: 0, total: 0 },
        x: initPosX, // Math.random() * 20,
        y: initPosY,
        up: { x: initPosX, y: initPosY, gamma: 0 },
        layoutX: initPosX,
        layoutY: initPosX,
        xOnClusterFocus: 0,
        yOnClusterFocus: 0,
        rootId: entry.rootId,
        zIndex: 0,
        isRoot: entry.rootId === entry.pathwayId,
        nodeType: entry.rootId === entry.pathwayId ? 'root' : 'regular',
        size:
          entry.rootId === entry.pathwayId
            ? overviewGraph.ROOT_DEFAULT_SIZE
            : overviewGraph.DEFAULT_SIZE,
        nonHoverSize:
          entry.rootId === entry.pathwayId
            ? overviewGraph.ROOT_DEFAULT_SIZE
            : overviewGraph.DEFAULT_SIZE,
        fixed: false, // fixed property on nodes excludes nodes from layouting
      } as baseNodeAttr,
    } as node;
    graph.nodes.push(currentNode);
    const currentEdge = generateForceGraphEdge(
      entry.rootId,
      entry.pathwayId,
      'hierarchical'
    );
    if (
      !addedEdges.includes(currentEdge.key) &&
      !addedEdges.includes(`${currentEdge.target}+${currentEdge.source}`)
    ) {
      graph.edges.push(currentEdge);
      addedEdges.push(currentEdge.key);
    }
    for (const [maplink, value] of Object.entries(entry.maplinks)) {
      if (!rootIds.includes(entry.pathwayId)) {
        for (const entryKey in nodeList) {
          const loopEntry = nodeList[entryKey];
          if (!rootIds.includes(loopEntry.pathwayId)) {
            if (loopEntry.subtreeIds.includes(maplink)) {
              const currentEdge = generateForceGraphEdge(
                entry.pathwayId,
                loopEntry.pathwayId,
                'maplink'
              );
              if (
                !addedEdges.includes(currentEdge.key) &&
                !addedEdges.includes(
                  `${currentEdge.target}+${currentEdge.source}`
                )
              ) {
                graph.edges.push(currentEdge);
                addedEdges.push(currentEdge.key);
              }
            }
          }
        }
      }
    }
    index += 1;
  }
  const withNoiseCluster = moduleAreas[0].length != 0;
  if (!withNoiseCluster) {
    moduleAreas.shift();
  }
  const nodes_per_cluster = pfsPrime_modules(
    graph.nodes,
    maxModuleNum,
    moduleAreas
  );
  let norm_node_pos = nodes_per_cluster[nodes_per_cluster.length - 1] as node[]; // already add superpathways as they are not part of the convex hull
  nodes_per_cluster.pop();
  const max_ext = 20;
  const clusterHullsAdjustment = new ClusterHulls(60);
  const clusterHulls = [] as number[][][];
  const focusClusterHulls = [] as number[][][];
  const greyValues = [] as number[];
  const firstNoneNoiseCluster = withNoiseCluster ? 1 : 0;

  const totalNumHulls = moduleAreas.length;
  let clusterNum = totalNumHulls == nodes_per_cluster.length ? 0 : -1;
  _.forEach(nodes_per_cluster, (nodes) => {
    const clusterHullPoints = hull(
      nodes.map((o) => [o.attributes.x, o.attributes.y]),
      Infinity
    ) as [[number, number]];
    if (clusterNum > -1) {
      const hullAdjustment = clusterHullsAdjustment.adjustOneHull(
        clusterHullPoints,
        clusterNum,
        firstNoneNoiseCluster,
        max_ext,
        totalNumHulls
      );

      greyValues.push(hullAdjustment.greyVal);
      clusterHulls.push(hullAdjustment.finalHullNodes);
      focusClusterHulls.push(hullAdjustment.focusHullPoints);
      const focusNormalizeParameter = hullAdjustment.focusNormalizeParameter;

      _.forEach(nodes, (node) => {
        const centeredX = node.attributes.x - focusNormalizeParameter.meanX;
        const centeredY = node.attributes.y - focusNormalizeParameter.meanY;
        node.attributes.xOnClusterFocus =
          (max_ext * (centeredX - focusNormalizeParameter.minCentered)) /
          (focusNormalizeParameter.maxCentered -
            focusNormalizeParameter.minCentered);
        node.attributes.yOnClusterFocus =
          (max_ext * (centeredY - focusNormalizeParameter.minCentered)) /
          (focusNormalizeParameter.maxCentered -
            focusNormalizeParameter.minCentered);
      });
    }
    norm_node_pos = norm_node_pos.concat(nodes);
    clusterNum += 1;
  });
  // if one wants to use rectangle use getRightResultFormForRectangle()

  graph.clusterAreas = {
    normalHullPoints: { hullPoints: clusterHulls, greyValues: greyValues },
    focusHullPoints: focusClusterHulls,
  };

  graph.nodes = norm_node_pos;

  return graph;
}

/**
 * Parses a graph relation into an edge representation
 * @param {relation} relation object
 * @returns {edge}, edge object
 */
function generateForceGraphEdge(
  sourceID: string,
  targetID: string,
  type: string
): edge {
  const edgeColors: { [key: string]: string } = {
    hierarchy: 'rgba(60,60,60,0.0)',
    maplink: 'rgba(60,60,60,0.0)',
  };

  const entry1 = sourceID;
  const entry2 = targetID;
  const edge = {
    key: `${sourceID}+${targetID}`,
    source: entry1,
    target: entry2,
    undirected: true,
    attributes: {
      zIndex: 0,
      hidden: true,
      type: type === 'maplink' ? 'dashed' : 'line',
      color: type === 'maplink' ? edgeColors.maplink : edgeColors.hierarchy,
    } as baseEdgeAttr,
  } as edge;
  return edge;
}
