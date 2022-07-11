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
    clusterAreas: [[]],
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
        color: entry.rootId === entry.pathwayId ? '#FF99FF' : '#FFFFFF',
        label: `${_.escape(name)}`,
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
        x: initPosX,
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
        size: entry.rootId === entry.pathwayId ? 12 : 7,
        nonHoverSize: entry.rootId === entry.pathwayId ? 12 : 7,
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
  let withNoiseCluster = moduleAreas[0].length != 0

  let norm_node_pos = [] as node[];
  const hull_points: [[number[]]] = [[[]]];
  const nodes_per_cluster = pfsPrime_modules(
    graph.nodes,
    maxModuleNum,
    moduleAreas
  );
  let max_ext = 18

  _.forEach(nodes_per_cluster, (nodes) => {
    const clusterHullPoints = hull(
      nodes.map((o) => [o.attributes.x, o.attributes.y]),
      10
    ) as [[number, number]];
    hull_points.push(clusterHullPoints);
    norm_node_pos = norm_node_pos.concat(nodes);
    let XYVals = { x: nodes.map(o => o.attributes.x), y: nodes.map(o => o.attributes.y)}
    // let min_x = Math.min(...XYVals.x)
    // let min_y = Math.min(...XYVals.y)
    // let max_x = Math.max(...XYVals.x)
    // let max_y = Math.max(...XYVals.y)
    let minPos = Math.min(...XYVals.x, ...XYVals.y)
    let maxPos = Math.max(...XYVals.x, ...XYVals.y)
  

    _.forEach(nodes, (node) => {
    node.attributes.xOnClusterFocus = max_ext * (node.attributes.x - minPos) / (maxPos - minPos) +1
    node.attributes.yOnClusterFocus = max_ext * (node.attributes.y - minPos) / (maxPos - minPos) +1

    });
  });

  if (withNoiseCluster){hull_points.shift();}
  graph.clusterAreas = hull_points;
  // graph.clusterAreas = moduleAreas;

  graph.nodes = norm_node_pos;

  return graph;
}

/**
 * Parses a kegg relation into an edge representation
 * @param {relation} relation object
 * @returns {edge}, edge object
 */
function generateForceGraphEdge(
  sourceID: string,
  targetID: string,
  type: string
): edge {
  const edgeColors: { [key: string]: string } = {
    hierarchy: 'rgba(60,60,60,0.1)',
    maplink: 'rgba(60,60,60,0.1)',
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
      type: type === 'maplink' ? 'dashed' : 'line',
      color: type === 'maplink' ? edgeColors.maplink : edgeColors.hierarchy,
    } as baseEdgeAttr,
  } as edge;
  return edge;
}
