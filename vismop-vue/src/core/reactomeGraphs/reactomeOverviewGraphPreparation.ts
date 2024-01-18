import * as _ from 'lodash';
import { edge, baseEdgeAttr, color } from '@/core/graphTypes';
import {
  overviewGraphData,
  overviewNode,
} from '@/core/reactomeGraphs/reactomeOverviewNetwork/overviewTypes';
import { reactomeEntry, glyphData } from './reactomeTypes';
import ClusterHulls from '@/core/layouting/convexHullsForClusters';
import OverviewGraph from './reactomeOverviewNetwork/overviewNetwork';
import { overviewColors } from '../colors';
import { useMainStore } from '@/stores';
import { ConvexPolygon } from '../layouting/ConvexPolygon';
import { generateClusterGlyphData } from '@/core/overviewGlyphs/clusterGlyphGenerator';
/**
 * Function generating a graph representation of multiomics data, to be used with sigma and graphology
 * @param nodeData list of node data
 * @returns
 */
export function generateGraphData(
  nodeData: { [key: string]: reactomeEntry },
  glyphHighDetail: { [key: string]: string },
  glyphsLowDetail: { [key: string]: string },
  glyphData: {
    [key: string]: glyphData;
  },
  rootIds: string[],
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
  let maxClusterNum = 0;
  for (const entryKey in nodeData) {
    const entry = nodeData[entryKey];
    const name = entry.pathwayName;
    const id = entry.pathwayId ? entry.pathwayId : 'noID';
    const initPosX = positionMapping[id] ? positionMapping[id].xInit : 0;
    const initPosY = positionMapping[id] ? positionMapping[id].yInit : 0;
    const clusterNum = positionMapping[id] ? positionMapping[id].clusterIDx : 0;
    maxClusterNum = Math.max(maxClusterNum, clusterNum);
    const currentNode: overviewNode = {
      key: id,
      index: index,
      // label: "",
      attributes: {
        type: 'image',
        clusterNum: clusterNum,
        image: glyphHighDetail[id],
        imageHighDetail: glyphHighDetail[id],
        imageLowDetail: glyphsLowDetail[id],
        id: id,
        hidden: !entry.isCentral,
        filterHidden: false,
        zoomHidden: false,
        clusterHidden: false,
        clusterFixed: false,
        hierarchyHidden: !entry.isCentral,
        color:
          entry.rootId === entry.pathwayId
            ? overviewColors.roots
            : overviewColors.default,
        label: _.escape(name),
        forceLabel: !entry.isCentral,
        fcAverages: {
          transcriptomics: glyphData[id].transcriptomics.available
            ? glyphData[id].transcriptomics.meanMeasure
            : NaN,
          proteomics: glyphData[id].proteomics.available
            ? glyphData[id].proteomics.meanMeasure
            : NaN,
          metabolomics: glyphData[id].metabolomics.available
            ? glyphData[id].metabolomics.meanMeasure
            : NaN,
        },
        nodeState: {
          transcriptomics: glyphData[id].transcriptomics.available
            ? glyphData[id].transcriptomics.nodeState
            : { regulated: 0, total: 0 },
          proteomics: glyphData[id].proteomics.available
            ? glyphData[id].proteomics.nodeState
            : { regulated: 0, total: 0 },
          metabolomics: glyphData[id].metabolomics.available
            ? glyphData[id].metabolomics.nodeState
            : { regulated: 0, total: 0 },
        },
        x: initPosX, // Math.random() * 20,
        y: initPosY,
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
  const clusterHullsAdjustment = new ClusterHulls(60);
  const clusterHulls = [] as number[][][];
  const focusClusterHulls = [] as number[][][];
  const clusterColors: color[] = [];
  const firstNoneNoiseCluster = useMainStore().clusterData.noiseClusterExists
    ? 1
    : 0;

  const mainStore = useMainStore();
  const clusterNodeMapping = mainStore.clusterData.clusters;
  const clusterGlyphs = generateClusterGlyphData(
    mainStore.glyphData,
    clusterNodeMapping
  );
  const noiseClusterGreyValue = 250;
  const maxBrightnessVoronoiColors = 230;

  // Takes: clusterNum, omicType
  // Returns: color of that omic type for the cluster
  function clusterOmicsToColor(
    clusterNum: number,
    omicType: 'transcriptomics' | 'proteomics' | 'metabolomics'
  ): color {
    // TODO: This is a hack to get the color scale for the current measurement type
    const targetMeasurement = 'fc';
    const colorScales =
      targetMeasurement === 'fc'
        ? mainStore.fcColorScales
        : mainStore.slopeColorScales;
    const clusterMeanMeasure = clusterGlyphs[clusterNum][omicType].meanMeasure;

    if (Number.isNaN(clusterMeanMeasure)) return [127, 127, 127, 1];

    const clusterColor = colorScales[omicType](clusterMeanMeasure)
      .replaceAll(/rgb\(|\)/gm, '')
      .split(',');
    return [
      parseInt(clusterColor[0]),
      parseInt(clusterColor[1]),
      parseInt(clusterColor[2]),
      1.0,
    ];
  }

  function mixOmicsColors(omicColors: color[]): color {
    const len = omicColors.length;
    const outColor: color = [0, 0, 0, 0];
    omicColors.forEach((color) => {
      outColor[0] += color[0] / len;
      outColor[1] += color[1] / len;
      outColor[2] += color[2] / len;
      outColor[3] += color[3] / len;
    });
    return outColor;
  }

  function lightenValue(
    x: number,
    minBrightness = 120,
    maxBrightness = 255
  ): number {
    return minBrightness + ((maxBrightness - minBrightness) / 255) * x;
  }
  function lightenColor(color: color): color {
    const threshold = maxBrightnessVoronoiColors;
    const total = color[0] + color[1] + color[2];

    const new_color: color = [
      lightenValue(color[0]),
      lightenValue(color[1]),
      lightenValue(color[2]),
      color[3],
    ];
    if (total > 3 * threshold) {
      return [threshold, threshold, threshold, 1];
    }
    return new_color;
  }
  // const totalNumHulls = clusterAreas.length;
  //let clusterNum = totalNumHulls == nodes_per_cluster.length ? 0 : -1;
  let clusterNum = 0;
  Object.keys(voronoiPolygons).forEach((polygonKey) => {
    const polygon = voronoiPolygons[parseInt(polygonKey)];
    if (clusterNum > -1) {
      const hullAdjustment = clusterHullsAdjustment.adjustOneHull(
        polygon,
        OverviewGraph.CLUSTER_EXTENT
      );
      const omicsRecieved = mainStore.omicsRecieved;
      const omicColors: color[] = [];

      if (clusterNum >= firstNoneNoiseCluster) {
        for (const [omic, omicsVal] of Object.entries(omicsRecieved) as [
          'transcriptomics' | 'proteomics' | 'metabolomics',
          boolean,
        ][]) {
          if (omicsVal) {
            omicColors.push(clusterOmicsToColor(clusterNum, omic));
          }
        }

        const clusterColor = mixOmicsColors(omicColors);
        const lighterColor = lightenColor(clusterColor);
        clusterColors.push(lighterColor);
      } else {
        clusterColors.push([
          noiseClusterGreyValue,
          noiseClusterGreyValue,
          noiseClusterGreyValue,
          1.0,
        ]);
      }
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

/**
 * Determines the type of edge depending on the type of the source and target nodes
 * @param type1 type of node one
 * @param type2 type of node 2
 * @returns
 */
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
      weight: 0,
      len: 0,
      lock: false,
      skip: false,
      source: entry1,
      target: entry2,
      bezeierControlPoints: [],
      showBundling: true,
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
