import * as _ from 'lodash';
import {
  edge,
  baseEdgeAttr,
  overviewNode,
  overviewGraphData,
} from '@/core/graphTypes';
import { reactomeEntry } from './reactomeTypes';
import { glyphData } from '../generalTypes';
import ClusterHulls from '@/core/layouting/convexHullsForClusters';
import OverviewGraph from './reactomeOverviewNetwork/overviewNetwork';
import { overviewColors } from '../colors';
import { useMainStore } from '@/stores';
import { ConvexPolygon } from '../layouting/ConvexPolygon';
/**
 * Function generating a graph representation of multiomics data, to be used with sigma and graphology
 * @param nodeData list of node data
 * @returns
 */
export function generateGraphData(
  nodeData: { [key: string]: reactomeEntry },
  glyphs: { [key: string]: string },
  glyphsHighres: { [key: string]: string },
  glyphsLowZoom: { [key: string]: string },
  glyphData: {
    [key: string]: glyphData;
  },
  rootIds: string[],
  moduleAreas: [number[]] = [[]],
  voronoiPolygons: {
    [key: number]: ConvexPolygon;
  },
  positionMapping: {
    [key: string]: {
      id: string;
      xInit: number;
      yInit: number;
      clusterIDx: number;
    };
  }
): overviewGraphData {
  const graph: overviewGraphData = {
    attributes: { name: 'BaseNetwork' },
    nodes: [],
    edges: [],
    clusterData: {
      normalHullPoints: [[[]]],
      focusHullPoints: [[[]]],
      clusterColors: [],
    },
    options: [],
  };
  const addedEdges: string[] = [];
  const addedNodes: string[] = [];
  function addEdge(source: string, target: string, type: string): void {
    const currentEdge = generateForceGraphEdge(source, target, type);
    if (
      !addedEdges.includes(currentEdge.key) &&
      !addedEdges.includes(`${currentEdge.target}+${currentEdge.source}`)
    ) {
      graph.edges.push(currentEdge);
      addedEdges.push(currentEdge.key);
    }
  }
  let index = 0;
  let maxModuleNum = 0;
  for (const entryKey in nodeData) {
    const entry = nodeData[entryKey];
    const name = entry.pathwayName;
    const id = entry.pathwayId ? entry.pathwayId : 'noID';
    const initPosX = positionMapping[id] ? positionMapping[id].xInit : 0;
    const initPosY = positionMapping[id] ? positionMapping[id].yInit : 0;
    const modNum = positionMapping[id] ? positionMapping[id].clusterIDx : 0;
    maxModuleNum = Math.max(maxModuleNum, modNum);
    const currentNode: overviewNode = {
      key: id,
      index: index,
      // label: "",
      attributes: {
        type: 'image',
        modNum: modNum,
        image: glyphs[id],
        imageLowRes: glyphs[id],
        imageHighRes: glyphsHighres[id],
        imageLowZoom: glyphsLowZoom[id],
        name: _.escape(name),
        id: id,
        hidden: !entry.isCentral,
        filterHidden: false,
        zoomHidden: false,
        moduleHidden: false,
        moduleFixed: false,
        hierarchyHidden: !entry.isCentral,
        color:
          entry.rootId === entry.pathwayId
            ? overviewColors.roots
            : overviewColors.default,
        label: `${_.escape(name)}`,
        forceLabel: !entry.isCentral,
        averageTranscriptomics: glyphData[id].transcriptomics.available
          ? glyphData[id].transcriptomics.meanFoldchange
          : NaN,
        averageProteomics: glyphData[id].proteomics.available
          ? glyphData[id].proteomics.meanFoldchange
          : NaN,
        averageMetabolomics: glyphData[id].metabolomics.available
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
        preFa2X: initPosX,
        preFa2Y: initPosY,
        xOnClusterFocus: 0,
        yOnClusterFocus: 0,
        rootId: entry.rootId,
        zIndex: 0,
        isRoot: entry.rootId === entry.pathwayId,
        parents: entry.parents.filter((value) => value in nodeData),
        children: entry.children.filter((value) => value in nodeData),
        subtreeIds: entry.subtreeIds.filter((value) => value in nodeData),
        visibleSubtree: true, //RODO sort this out in python
        nodeType:
          entry.rootId === entry.pathwayId
            ? 'root'
            : entry.isCentral
            ? 'regular'
            : entry.isOverview
            ? 'hierarchical'
            : 'other',
        size: !entry.isCentral
          ? OverviewGraph.ROOT_DEFAULT_SIZE
          : OverviewGraph.DEFAULT_SIZE,
        nonHoverSize: !entry.isCentral
          ? OverviewGraph.ROOT_DEFAULT_SIZE
          : OverviewGraph.DEFAULT_SIZE,
        fixed: false, // fixed property on nodes excludes nodes from layouting
      },
    };
    graph.nodes.push(currentNode);
    addedNodes.push(currentNode.key);
    // Root Edge
    if (!currentNode.attributes.isRoot) {
      const edgeType = determineEdgeType(
        entry.nodeType,
        nodeData[entry.rootId].nodeType
      );
      addEdge(entry.pathwayId, entry.rootId, edgeType);
    } // Hierarchical Edges:
    entry.parents.forEach((element) => {
      const parentNodeType = nodeData[element].nodeType;
      const ownNodeType = entry.nodeType;
      const edgeType = determineEdgeType(parentNodeType, ownNodeType);
      addEdge(element, entry.pathwayId, edgeType);
    });
    entry.subtreeIds.forEach((element) => {
      if (element in nodeData) {
        const childrenNodeType = nodeData[element].nodeType;
        const ownNodeType = entry.nodeType;
        const edgeType = determineEdgeType(childrenNodeType, ownNodeType);
        addEdge(entry.pathwayId, element, edgeType);
      }
    });

    if (useMainStore().amtTimepoints > 1) {
      const pathwayIdSplit = entry.pathwayId.split('_');
      const pathwayBaseId = pathwayIdSplit[0];
      const timePoint = pathwayIdSplit[1];

      if (parseInt(timePoint) == 0) {
        for (let idx = 0; idx < useMainStore().amtTimepoints - 1; idx++) {
          addEdge(
            pathwayBaseId + '_' + idx,
            pathwayBaseId + '_' + (idx + 1),
            'temporal'
          );
        }
      }
    }

    /*
    for (const [maplink] of Object.entries(entry.maplinks)) {
      if (!rootIds.includes(entry.pathwayId)) {
        for (const entryKey in nodeData) {
          const loopEntry = nodeData[entryKey];
          if (!rootIds.includes(loopEntry.pathwayId)) {
            if (loopEntry.subtreeIds.includes(maplink)) {
              addEdge(entry.pathwayId, loopEntry.pathwayId, 'maplink');
            }
          }
        }
      }
    } */
    index += 1;
  }
  const maxExt = 250;
  const clusterHullsAdjustment = new ClusterHulls(60);
  const clusterHulls = [] as number[][][];
  const focusClusterHulls = [] as number[][][];
  const clusterColors: [number, number, number, number][] = [];
  const firstNoneNoiseCluster = useMainStore().noiseClusterExists ? 1 : 0;
  // const totalNumHulls = moduleAreas.length;
  //let clusterNum = totalNumHulls == nodes_per_cluster.length ? 0 : -1;
  let clusterNum = 0;
  _.forEach(voronoiPolygons, (polygon) => {
    if (clusterNum > -1) {
      const hullAdjustment = clusterHullsAdjustment.adjustOneHull(
        polygon,
        maxExt
      );
      const greyValue = clusterNum >= firstNoneNoiseCluster ? 150 : 250;
      clusterColors.push([greyValue, greyValue, greyValue, 1.0]);
      clusterHulls.push(hullAdjustment.finalHullNodes);
      focusClusterHulls.push(hullAdjustment.focusHullPoints);
    }
    clusterNum += 1;
  });
  // if one wants to use rectangle use getRightResultFormForRectangle()

  graph.clusterData.normalHullPoints = clusterHulls;
  graph.clusterData.focusHullPoints = focusClusterHulls;
  graph.clusterData.clusterColors = clusterColors;

  //graph.nodes = norm_node_pos;

  return graph;
}

function determineEdgeType(
  type1: 'root' | 'regular' | 'hierarchical' | 'cluster' | 'other',
  type2: 'root' | 'regular' | 'hierarchical' | 'cluster' | 'other'
) {
  if (
    (type1 === 'root' && type2 === 'regular') ||
    (type1 === 'regular' && type2 === 'root')
  ) {
    return 'rootEdge';
  }
  if (
    (type1 === 'hierarchical' && type2 === 'regular') ||
    (type1 === 'regular' && type2 === 'hierarchical')
  ) {
    return 'hierarchicalRegular';
  }
  if (type1 === 'hierarchical' && type2 === 'hierarchical') {
    return 'hierarchicalHierachical';
  }
  if (
    (type1 === 'root' && type2 === 'hierarchical') ||
    (type1 === 'hierarchical' && type2 === 'root')
  ) {
    return 'rootHierarchical';
  } else return 'rootEdge';
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
  const entry1 = sourceID;
  const entry2 = targetID;
  const edge = {
    key: `${sourceID}+${targetID}`,
    source: entry1,
    target: entry2,
    undirected: true,
    attributes: {
      zIndex: 0,
      hidden: type === 'temporal' ? false : true,
      edgeType: type,
      hierarchyHidden: type === 'temporal' ? false : true,
      type: type === 'maplink' ? 'dashed' : 'line',
      color:
        type === 'maplink'
          ? overviewColors.edgeMaplink
          : overviewColors.edgeHierarchy,
    } as baseEdgeAttr,
  } as edge;
  return edge;
}
