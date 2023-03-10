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
import { min, over } from 'lodash';
import { generateModuleGlyphData } from '../overviewGlyphs/moduleGlyphGenerator';
import { to } from 'mathjs';

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
  let index = 0;
  let maxModuleNum = 0;
  for (const entryKey in nodeList) {
    const entry = nodeList[entryKey];
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
        hidden: false,
        filterHidden: false,
        zoomHidden: false,
        moduleHidden: false,
        moduleFixed: false,
        color:
          entry.rootId === entry.pathwayId
            ? overviewColors.roots
            : overviewColors.default,
        label: `${_.escape(name)}`,
        forceLabel: entry.rootId === entry.pathwayId ? true : false,
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
        nodeType: entry.rootId === entry.pathwayId ? 'root' : 'regular',
        size:
          entry.rootId === entry.pathwayId
            ? OverviewGraph.ROOT_DEFAULT_SIZE
            : OverviewGraph.DEFAULT_SIZE,
        nonHoverSize:
          entry.rootId === entry.pathwayId
            ? OverviewGraph.ROOT_DEFAULT_SIZE
            : OverviewGraph.DEFAULT_SIZE,
        fixed: false, // fixed property on nodes excludes nodes from layouting
      },
    };
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
    for (const [maplink] of Object.entries(entry.maplinks)) {
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

  type color = [number, number, number, number];

  const maxExt = 250;
  const clusterHullsAdjustment = new ClusterHulls(60);
  const clusterHulls = [] as number[][][];
  const focusClusterHulls = [] as number[][][];
  const clusterColors = [] as color[];
  const firstNoneNoiseCluster = useMainStore().noiseClusterExists ? 1 : 0;
  // const totalNumHulls = moduleAreas.length;
  //let clusterNum = totalNumHulls == nodes_per_cluster.length ? 0 : -1;

  
  const mainStore = useMainStore();
  const clusterNodeMapping = mainStore.modules;
  const clusterGlyphs = generateModuleGlyphData(mainStore.glyphData, clusterNodeMapping);
  const noiseClusterGreyValue = 250;
  const maxBrightnessVoronoiColors = 230;

  // Takes: clusterNum, omicType
  // Returns: color of that omic type for the cluster
  function clusterOmicsToColor(clusterNum: number, omicType: "transcriptomics" | "proteomics" | "metabolomics") {
    const clusterMeanFoldchange = clusterGlyphs[clusterNum][omicType].meanFoldchange;

    if(Number.isNaN(clusterMeanFoldchange)) return [127, 127, 127, 1] as color;

    const clusterColor = mainStore.fcScales[omicType](clusterMeanFoldchange).replaceAll(/rgb\(|\)/gm, '').split(',');
    return [parseInt(clusterColor[0]), parseInt(clusterColor[1]), parseInt(clusterColor[2]), 1.0] as color;
  }

  function mixOmicsColors(omicColors: color[]) {
    const len = omicColors.length;
    const outColor = [0,0,0,0] as color;
    omicColors.forEach(color => {
      outColor[0] += color[0] / len;
      outColor[1] += color[1] / len;
      outColor[2] += color[2] / len;
      outColor[3] += color[3] / len;
    });
    return outColor;
  }

  function lightenValue(x: number, minBrightness = 120, maxBrightness = 255): number {
    return minBrightness + (maxBrightness - minBrightness) / 255 * x;
  }
  function lightenColor(color: color): color {
    const threshold = maxBrightnessVoronoiColors;
    const total =  color[0] + color[1] + color[2];

    const new_color = [lightenValue(color[0]), lightenValue(color[1]), lightenValue(color[2]), color[3]] as color;
    if (total > 3 * threshold) {
      return [threshold, threshold, threshold, 1] as color;
    }
    return new_color;
  }


  let clusterNum = 0;
  Object.keys(voronoiPolygons).forEach(polygonKey=> {
    const polygon = voronoiPolygons[parseInt(polygonKey)];
    if (clusterNum > -1) {
      const hullAdjustment = clusterHullsAdjustment.adjustOneHull(
        polygon,
        maxExt
      );
      const omicsRecieved = mainStore.omicsRecieved;
      const omicColors : color[]= [];

      if (clusterNum >= firstNoneNoiseCluster) {
        Object.keys(omicsRecieved).forEach( omic => {
          if(omicsRecieved[omic]) {
            omicColors.push(clusterOmicsToColor(clusterNum, omic));
          }
        });

        const clusterColor = mixOmicsColors(omicColors);
        const lighterColor = lightenColor(clusterColor);
        clusterColors.push(lighterColor);
      } else {
        clusterColors.push([noiseClusterGreyValue, noiseClusterGreyValue, noiseClusterGreyValue, 1.0]);
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
      hidden: true,
      type: type === 'maplink' ? 'dashed' : 'line',
      color:
        type === 'maplink'
          ? overviewColors.edgeMaplink
          : overviewColors.edgeHierarchy,
    } as baseEdgeAttr,
  } as edge;
  return edge;
}
