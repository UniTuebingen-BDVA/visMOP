import * as _ from 'lodash';
import {
  node,
  edge,
  graphData,
  baseNodeAttr,
  baseEdgeAttr,
} from '@/core/graphTypes';
import { reactomeEntry } from './reactomeTypes';
import { glyphData } from '../generalTypes';

/**
 * Function generating a graph representation of multiomics data, to be used with sigma and graphology
 * @param nodeList list of node data
 * @returns
 */
export function generateGraphData(
  nodeList: reactomeEntry[],
  glyphs: { [key: string]: string },
  glyphsHighres: { [key: string]: string },
  glyphData: {
    [key: string]: glyphData;
  },
  rootIds: string[]
): graphData {
  const graph = {
    attributes: { name: 'BaseNetwork' },
    nodes: [],
    edges: [],
    options: [],
  } as graphData;
  const addedEdges: string[] = [];
  for (const entryKey in nodeList) {
    const entry = nodeList[entryKey];
    const name = entry.pathwayName;
    const id = entry.pathwayId;
    const initPosX = Math.random() * 100;
    const initPosY = Math.random() * 100;
    const currentNode = {
      key: id,
      // label: "",
      attributes: {
        entryType: 'temp',
        type: 'image',
        image: glyphs[id],
        imageLowRes: glyphs[id],
        imageHighRes: glyphsHighres[id],
        name: _.escape(name),
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
        x: initPosX,
        y: initPosY,
        layoutX: 0,
        layoutY: 0,
        rootId: entry.rootId,
        zIndex: 1,
        isRoot: entry.rootId === entry.pathwayId,
        size: entry.rootId === entry.pathwayId ? 15 : 10,
        nonHoverSize: entry.rootId === entry.pathwayId ? 15 : 10,
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
    for (const maplink in entry.maplinks) {
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
  }
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
    hierarchy: '#999999',
    maplink: 'rgba(0.2,0.2,0.2,1.0)',
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
