import { UndirectedGraph } from 'graphology';
import Sigma from 'sigma';
import {
  additionalData,
  overviewGraphData,
  overviewNodeAttr,
} from '@/core/graphTypes';
//import getNodeProgramImage from 'sigma/rendering/webgl/programs/node.image';
import getNodeImageProgram from 'sigma/rendering/webgl/programs/node.combined';
import DashedEdgeProgram from '@/core/custom-nodes/dashed-edge-program';
import { drawHover, drawLabel } from '@/core/customLabelRenderer';
import { useMainStore } from '@/stores';
import { DEFAULT_SETTINGS } from 'sigma/settings';
import { animateNodes } from 'sigma/utils/animate';
import { bidirectional, edgePathFromNodePath } from 'graphology-shortest-path';
import { filterValues } from '../../generalTypes';
import { nodeReducer, edgeReducer } from './reducerFunctions';
import { resetZoom, zoomLod } from './camera';
import {
  filterElements,
  setAverageFilter,
  setRootNegativeFilter,
  setRootFilter,
} from './filter';
import subgraph from 'graphology-operators/subgraph';
import { assignLayout, LayoutMapping } from 'graphology-layout/utils';
import { nodeExtent } from 'graphology-metrics/graph/extent';
import { generateGlyphs } from '@/core/overviewGlyphs/moduleGlyphGenerator';
import orderedCircularLayout from '../orderedCircularLayout';
import fa2 from '../../layouting/modFa2/graphology-layout-forceatlas2.js';
import { overviewColors } from '@/core/colors';
import _ from 'lodash';
import { ConvexPolygon } from '@/core/layouting/ConvexPolygon';
import FilterData from './filterData';
import { Loading } from 'quasar';
import { PlainObject } from 'sigma/types';
import { vec2 } from 'gl-matrix';

export default class OverviewGraph {
  // constants
  static readonly DEFAULT_SIZE = 6;
  static readonly ROOT_DEFAULT_SIZE = 15;
  static readonly MODULE_DEFAULT_SIZE = 15;
  static readonly FOCUS_NODE_SIZE = 10;

  protected DEFAULT_SIZE = 6;
  protected ROOT_DEFAULT_SIZE = 15;
  protected MODULE_DEFAULT_SIZE = 15;
  protected FOCUS_NODE_SIZE = 10;

  // data structures for reducers
  protected shortestPathClick: string[] = [];
  protected shortestPathNodes: string[] = [];
  protected shortestPathEdges: string[] = [];
  protected highlightedEdgesClick = new Set();
  protected highlightedNodesClick = new Set();
  //from events SIGMA2 example, initialze sets for highlight on hover:
  protected highlighedNodesHover = new Set();
  protected highlighedEdgesHover = new Set();
  protected highlightedCenterHover = '';
  protected currentPathway = '';
  protected currentHierarchySelection = '';
  protected pathwaysContainingIntersection: string[] = [];
  protected pathwaysContainingUnion: string[] = [];
  protected hierarchyNodes: string[] = [];
  // renderer and camera
  protected renderer;
  protected camera;
  protected prevFrameZoom;
  protected graph;
  protected clusterData;
  protected graphWidth = 0;
  protected windowWidth = 1080;
  protected lodRatio = 1.3;
  protected lastClickedClusterNode = -1;
  protected additionalData!: additionalData;
  protected cancelCurrentAnimation: (() => void) | null = null;

  // filter
  protected filtersChanged = false;
  protected filterFuncNegativeRoot: (x: string) => boolean = (_x: string) =>
    true;
  protected filterFuncRoot: (x: string) => boolean = (_x: string) => true;
  protected filterFuncTrans: (x: number) => boolean = (_x: number) => true;
  protected filterFuncAmtAbsTrans: (x: number) => boolean = (_x: number) =>
    true;
  protected filterFuncAmtRelTrans: (x: number) => boolean = (_x: number) =>
    true;
  protected filterFuncProt: (x: number) => boolean = (_x: number) => true;
  protected filterFuncAmtAbsProt: (x: number) => boolean = (_x: number) => true;
  protected filterFuncAmtRelProt: (x: number) => boolean = (_x: number) => true;
  protected filterFuncMeta: (x: number) => boolean = (_x: number) => true;
  protected filterFuncAmtAbsMeta: (x: number) => boolean = (_x: number) => true;
  protected filterFuncAmtRelMeta: (x: number) => boolean = (_x: number) => true;
  protected filterFuncAmtRelSum: (x: number) => boolean = (_x: number) => true;
  protected filterFuncAmtAbsSum: (x: number) => boolean = (_x: number) => true;

  protected regulateFilterTrans = {
    relative: new FilterData(),
    absolute: new FilterData(),
  };
  protected regulateFilterProt = {
    relative: new FilterData(),
    absolute: new FilterData(),
  };
  protected regulateFilterMeta = {
    relative: new FilterData(),
    absolute: new FilterData(),
  };

  protected regulatedFilter = {
    relative: new FilterData(),
    absolute: new FilterData(),
  };
  protected averageFilter: {
    transcriptomics: filterValues;
    proteomics: filterValues;
    metabolomics: filterValues;
  } = {
    transcriptomics: new FilterData(),
    proteomics: new FilterData(),
    metabolomics: new FilterData(),
  };
  polygons: { [key: number]: ConvexPolygon };
  initialFa2Params: fa2LayoutParams;
  clusterWeights: number[];
  maxClusterWeight: number;
  clusterSizeScalingFactor: number;
  rootOrder: number;

  constructor(
    containerID: string,
    graphData: overviewGraphData,
    polygons: { [key: number]: ConvexPolygon },
    layoutParams: fa2LayoutParams,
    clusterWeights: number[],
    windowWidth: number
  ) {
    this.graph = UndirectedGraph.from(graphData);
    this.initialFa2Params = layoutParams;
    this.clusterData = graphData.clusterData;
    this.polygons = polygons;
    this.rootOrder = 0;
    this.clusterWeights = clusterWeights;
    this.clusterSizeScalingFactor = layoutParams.clusterSizeScalingFactor;
    this.maxClusterWeight = Math.max(...clusterWeights);
    this.renderer = this.mainGraph(containerID);
    this.camera = this.renderer.getCamera();
    this.prevFrameZoom = this.camera.ratio;
    this.addModuleOverviewNodes();
    this.calculateGraphWidth();
    this.layoutRoots();
    this.relayoutGraph(this.initialFa2Params);
    this.setSize(windowWidth);

    this.refreshCurrentPathway();
  }

  /**
   * Initializes the omics graph
   * @param {string} elemID
   * @returns {Sigma} Sigma instance
   */
  mainGraph(elemID: string): Sigma {
    this.additionalData = {
      clusterAreas: {
        hullPoints: this.clusterData.normalHullPoints,
        greyValues: this.clusterData.greyValues,
      },
    };

    const mainStore = useMainStore();
    // select target div and initialize graph
    const elem = document.getElementById(elemID) as HTMLElement;
    // construct Sigma main instance
    const renderer = new Sigma(
      this.graph,
      elem,
      {
        nodeReducer: nodeReducer.bind(this),
        edgeReducer: edgeReducer.bind(this),
        zIndex: true, // enabling zIndex parameter
        renderLabels: true, // do not render labels w/o hover
        labelRenderedSizeThreshold: 999999,
        edgeProgramClasses: {
          ...DEFAULT_SETTINGS.edgeProgramClasses,
          dashed: DashedEdgeProgram,
        },
        nodeProgramClasses: {
          ...DEFAULT_SETTINGS.nodeProgramClasses,
          image: getNodeImageProgram(),
        },
        hoverRenderer: drawHover,
        labelRenderer: drawLabel,
        getCameraSizeRatio: (x) => x,
        clusterVis: 'ConvexHull',
      },
      this.additionalData
    );
    renderer.on('beforeRender', () => {
      zoomLod.bind(this)();
      filterElements.bind(this)();
    });

    // TODO: from events example:
    renderer.on('enterNode', ({ node }) => {
      // console.log('Entering: ', node)
      this.highlighedNodesHover = new Set(this.graph.neighbors(node));
      this.highlighedNodesHover.add(node);
      this.highlightedCenterHover = node;
      this.highlighedEdgesHover = new Set(this.graph.edges(node));
      renderer.refresh();
    });

    renderer.on('leaveNode', () => {
      this.highlighedNodesHover.clear();
      this.highlighedEdgesHover.clear();
      this.highlightedCenterHover = '';
      renderer.refresh();
    });

    renderer.on('clickNode', ({ node, event }) => {
      if (this.graph.getNodeAttribute(node, 'nodeType') != 'moduleNode') {
        if (event.original.ctrlKey) {
          mainStore.selectPathwayCompare([node]);
        } else if (event.original.altKey) {
          // TODO Get working again
          // if (this.shortestPathClick.length === 2) this.shortestPathClick.pop();
          // this.shortestPathClick.push(node);
          // if (this.shortestPathClick.length === 2) {
          //   this.shortestPathNodes = bidirectional(
          //     this.graph,
          //     this.shortestPathClick[0],
          //     this.shortestPathClick[1]
          //   ) as string[];
          //   if (this.shortestPathNodes?.length > 0) {
          //     this.shortestPathEdges = edgePathFromNodePath(
          //       this.graph,
          //       this.shortestPathNodes as string[]
          //     );
          //     console.log('shortest Path edges', this.shortestPathEdges);
          //     mainStore.selectPathwayCompare(this.shortestPathNodes);
          //   } else {
          //     this.shortestPathClick = [];
          //   }
          // }
        } else {
          this.shortestPathClick = [];
          this.shortestPathNodes = [];
          this.shortestPathEdges = [];
          this.highlightedEdgesClick.clear();
          this.highlightedNodesClick.clear();
          this.highlightedNodesClick = new Set(this.graph.neighbors(node));
          this.highlightedEdgesClick = new Set(this.graph.edges(node));
          const nodeLabel = this.graph.getNodeAttribute(node, 'label');
          //this.getRoot(node);
          mainStore.focusPathwayViaOverview({ nodeID: node, label: nodeLabel });
          if (this.graph.getNodeAttribute(node, 'nodeType') != 'regular') {
            this.currentHierarchySelection = node;
            this.hierachyLayout(node);
          }
        }
      } else {
        const defocus = this.lastClickedClusterNode == parseInt(node);
        this.graph.forEachNode((_, attributes) => {
          if (
            !defocus &&
            attributes.id != node &&
            attributes.modNum == parseInt(node) &&
            !attributes.isRoot
          ) {
            attributes.x = attributes.xOnClusterFocus;
            attributes.y = attributes.yOnClusterFocus;
            attributes.moduleFixed = true;
            attributes.zoomHidden = false;
            attributes.size = this.FOCUS_NODE_SIZE; // size behavíour is strange!
            attributes.nonHoverSize = this.FOCUS_NODE_SIZE;
          } else if (!defocus && !attributes.isRoot) {
            attributes.x = attributes.xOnClusterFocus;
            attributes.y = attributes.yOnClusterFocus;
            if (attributes.id != node) {
              attributes.moduleHidden = true;
            } else {
              attributes.moduleFixed = true;
              attributes.zoomHidden = false;
            }
          } else if (!attributes.isRoot) {
            attributes.x = attributes.layoutX;
            attributes.y = attributes.layoutY;
            attributes.moduleFixed = false;
            attributes.moduleHidden = false;
            attributes.size = attributes.isRoot
              ? this.ROOT_DEFAULT_SIZE
              : attributes.nodeType == 'moduleNode'
              ? this.MODULE_DEFAULT_SIZE
              : this.DEFAULT_SIZE;
            attributes.nonHoverSize = attributes.isRoot
              ? this.ROOT_DEFAULT_SIZE
              : attributes.nodeType == 'moduleNode'
              ? this.MODULE_DEFAULT_SIZE
              : this.DEFAULT_SIZE;
          }
        });

        this.additionalData = defocus
          ? Object.assign(this.additionalData, {
              clusterAreas: {
                hullPoints: this.clusterData.normalHullPoints,
                greyValues: this.clusterData.greyValues,
              },
            })
          : Object.assign(this.additionalData, {
              clusterAreas: {
                hullPoints: [this.clusterData.focusHullPoints[parseInt(node)]],
                greyValues: [this.clusterData.greyValues[parseInt(node)]],
              },
            });
        this.lastClickedClusterNode = defocus ? -1 : parseInt(node);
      }
    });

    return renderer;
  }

  /**
   * clear selection of node
   */
  clearSelection() {
    this.highlightedEdgesClick.clear();
    this.highlightedNodesClick.clear();

    this.resetHierarchyNodes();
    this.hierarchyNodes = [];
    useMainStore().focusPathwayViaDropdown({ title: '', value: '', text: '' });
    this.renderer.refresh();
    this.currentHierarchySelection = '';
  }
  calculateGraphWidth() {
    const nodeXyExtent = nodeExtent(this.graph, ['x', 'y']);
    this.graphWidth = nodeXyExtent['x'][1] - nodeXyExtent['x'][0];
  }
  resetHierarchyNodes() {
    if (this.currentHierarchySelection) {
      const subPathwaysIds = this.graph.getNodeAttribute(
        this.currentHierarchySelection,
        'children'
      );
      const hierarchyNodes = this.hierarchyNodes;
      const subPathways = subgraph(this.graph, function (nodeID, attr) {
        return (
          hierarchyNodes.includes(nodeID) && attr.nodeType == 'hierarchical'
        );
      });
      const parentAttribs = this.graph.getNodeAttributes(
        this.currentHierarchySelection
      );

      const tarPositions: PlainObject<PlainObject<number>> = {};
      subPathways.forEachNode((node, _attributes) => {
        tarPositions[node] = {
          x: parentAttribs.x,
          y: parentAttribs.y,
        };
      });
      this.cancelCurrentAnimation = animateNodes(
        this.graph,
        tarPositions,
        {
          duration: 2000,
          easing: 'quadraticOut',
        },
        () => {
          subPathways.forEachNode((node, _attributes) => {
            this.graph.setNodeAttribute(node, 'hierarchyHidden', true);
            this.graph.setNodeAttribute(node, 'hidden', true);
          });
          this.graph.forEachEdge((edge, attributes) => {
            if (attributes.edgeType == 'hierarchical') {
              attributes.hierarchyHidden = true;
            } else {
              attributes.hierarchyHidden = false;
            }
          });
          this.layoutRoots(true);
        }
      );
    }
  }
  /**
   * Layouts roots as a circle
   */
  layoutRoots(animate = false) {
    // const center = (nodeXyExtent['x'][1] + nodeXyExtent['x'][0]) / 2;

    const rootSubgraph = subgraph(this.graph, function (_nodeID, attr) {
      return attr.isRoot;
    });
    this.rootOrder = rootSubgraph.order;
    rootSubgraph.forEachNode((node, _attributes) => {
      this.graph.setNodeAttribute(node, 'hierarchyHidden', false);
    });
    const rootPositions = orderedCircularLayout(rootSubgraph, {
      scale: this.graphWidth / 1.8,
      center: 0.5,
      startAngle: Math.PI / 2,
      minDivisions: 0,
    }) as LayoutMapping<{ [dimension: string]: number }>;
    if (animate) {
      this.cancelCurrentAnimation = animateNodes(this.graph, rootPositions, {
        duration: 2000,
        easing: 'quadraticOut',
      });
    } else {
      assignLayout(this.graph, rootPositions, { dimensions: ['x', 'y'] });
    }
  }

  hierachyLayout(tarNode: string) {
    const hierarchyNodes = this.hierarchyNodes;
    const rootSubgraph = subgraph(this.graph, function (nodeID, attr) {
      return attr.isRoot || hierarchyNodes.includes(nodeID);
    });
    if (!this.renderer.getCustomBBox())
      this.renderer.setCustomBBox(this.renderer.getBBox());
    const tarPositions: PlainObject<PlainObject<number>> = {};
    rootSubgraph.forEachNode((node, attributes) => {
      const fromCenter = vec2.sub(
        vec2.create(),
        vec2.fromValues(attributes.x, attributes.y),
        vec2.fromValues(0, 0)
      );
      const fromCenterNormalized = vec2.normalize(vec2.create(), fromCenter);
      tarPositions[node] = {
        x: fromCenter[0] + fromCenterNormalized[0] * this.graphWidth * 0.2, // change here to increase distance for non tar nodes
        y: fromCenter[1] + fromCenterNormalized[1] * this.graphWidth * 0.2,
      };
    });
    this.cancelCurrentAnimation = animateNodes(
      this.graph,
      tarPositions,
      {
        duration: 2000,
        easing: 'quadraticOut',
      },
      () => {
        const rootAttribs = this.graph.getNodeAttributes(
          this.graph.getNodeAttribute(tarNode, 'rootId')
        );
        const tarPositions: PlainObject<PlainObject<number>> = {};
        hierarchyNodes.forEach((node) => {
          if (node != tarNode) {
            tarPositions[node] = {
              x: rootAttribs.x, // change here to increase distance for non tar nodes
              y: rootAttribs.y,
            };
          }
          // rootSubgraph.forEachNode((node, _attributes) => {
          //   this.graph.setNodeAttribute(node, 'hierarchyHidden', false); //node != tarRoot);
          // });
        });

        this.cancelCurrentAnimation = animateNodes(
          this.graph,
          tarPositions,
          {
            duration: 500,
            easing: 'quadraticOut',
          },
          () => {
            hierarchyNodes.forEach((node) => {
              this.graph.setNodeAttribute(
                node,
                'hierarchyHidden',
                node != tarNode
              );
            });
            this.layoutSubpathways(tarNode);
          }
        );
      }
    );
  }
  layoutSubpathways(parentNode: string) {
    const subPathwaysIds = this.graph.getNodeAttribute(parentNode, 'children');
    this.hierarchyNodes.push(...subPathwaysIds);
    const subPathways = subgraph(this.graph, function (nodeID, attr) {
      return subPathwaysIds.includes(nodeID) && attr.nodeType == 'hierarchical';
    });
    const parentAttribs = this.graph.getNodeAttributes(parentNode);
    const divisions =
      subPathways.order < this.rootOrder ? this.rootOrder : subPathways.order;
    const angleOffset = ((subPathways.order - 1) / divisions) * Math.PI;
    const parentAngle = Math.atan2(parentAttribs.y, parentAttribs.x);

    subPathways.forEachNode((node, _attributes) => {
      this.graph.setNodeAttribute(node, 'x', parentAttribs.x);
      this.graph.setNodeAttribute(node, 'y', parentAttribs.y);
      this.graph.setNodeAttribute(node, 'hierarchyHidden', false);
      this.graph.setNodeAttribute(node, 'hidden', false);
    });
    this.renderer.refresh();

    const subPathwayPositions = orderedCircularLayout(subPathways, {
      scale: this.graphWidth / 1.8,
      center: 0.5,
      startAngle: parentAngle + angleOffset,
      minDivisions: this.rootOrder,
    }) as LayoutMapping<{ [dimension: string]: number }>;
    this.cancelCurrentAnimation = animateNodes(
      this.graph,
      subPathwayPositions,
      {
        duration: 2000,
        easing: 'quadraticOut',
      },
      () => {
        const centralNodes: string[] = [];
        subPathways.forEachNode((node, attributesNode) => {
          centralNodes.push(...attributesNode.children);
        });

        centralNodes.forEach((node) => {
          let hasHierarchicalEdge = false;
          this.graph.forEachEdge(node, (edge, attributes) => {
            if (attributes.edgeType == 'hierarchical') {
              attributes.hierarchyHidden = false;
              attributes.hidden = false;
              hasHierarchicalEdge = true;
            }
          });
          this.graph.forEachEdge(node, (edge, attributes) => {
            if (attributes.edgeType == 'rootEdge') {
              attributes.hierarchyHidden = hasHierarchicalEdge;
            }
          });
        });
      }
    );
  }

  /**
   * relayouts graph with the supplied FA2 settings, influencing the layouting inside the clusters themselves
   * @param layoutParams
   */
  relayoutGraph(
    //tarGraph: Sigma,
    layoutParams: {
      weightShared: number;
      weightDefault: number;
      gravity: number;
      edgeWeightInfluence: number;
      scalingRatio: number;
      iterations: number;
      adjustSizes: boolean;
      outboundAttractionDistribution: boolean;
      strongGravity: boolean;
      barnesHut: boolean;
      barnesHutTheta: number;
      slowDown: number;
      linLog: boolean;
      clusterSizeScalingFactor: number;
    }
  ) {
    const maxExt = 250;
    Object.keys(this.polygons).forEach((element) => {
      const polygonIdx = parseInt(element);
      const currentSubgraph = subgraph(this.graph, function (_nodeID, attr) {
        return (
          attr.modNum == polygonIdx &&
          attr.isRoot == false &&
          attr.nodeType == 'regular'
        );
      });
      currentSubgraph.clearEdges();
      currentSubgraph.forEachNode((node, attr) => {
        currentSubgraph.forEachNode((nodeInner, attrInner) => {
          if (node != nodeInner) {
            if (!currentSubgraph.hasEdge(node, nodeInner)) {
              currentSubgraph.addEdge(node, nodeInner, {
                weight:
                  attr.rootId == attrInner.rootId
                    ? layoutParams.weightShared
                    : layoutParams.weightDefault,
              });
            }
          }
        });
      });
      //causes cluster nodes to vanish
      // ALSO: clusternodes seem to be at the wrong position
      currentSubgraph.forEachNode((node, attributes) => {
        if (attributes.nodeType !== 'moduleNode') {
          attributes.x = attributes.preFa2X;
          attributes.y = attributes.preFa2Y;
          attributes.layoutX = attributes.preFa2X;
          attributes.layoutY = attributes.preFa2Y;
        }
      });
      const settings = fa2.inferSettings(currentSubgraph);
      const areaScaling =
        (this.clusterWeights[polygonIdx] / this.maxClusterWeight) *
        this.clusterSizeScalingFactor;
      console.log(areaScaling, this.clusterSizeScalingFactor);
      const currentPositions = fa2(
        currentSubgraph,
        {
          iterations: layoutParams.iterations,
          getEdgeWeight: 'weight',
          settings: {
            ...settings,
            linLogMode: layoutParams.linLog,
            barnesHutOptimize: layoutParams.barnesHut,
            barnesHutTheta: layoutParams.barnesHutTheta,
            slowDown: layoutParams.slowDown,
            strongGravityMode: layoutParams.strongGravity,
            gravity: layoutParams.gravity * areaScaling,
            edgeWeightInfluence: layoutParams.edgeWeightInfluence,
            scalingRatio:
              layoutParams.scalingRatio *
              (this.clusterSizeScalingFactor + 0.1 - areaScaling),
            adjustSizes: layoutParams.adjustSizes,
            outboundAttractionDistribution:
              layoutParams.outboundAttractionDistribution,
          },
        },
        this.polygons[polygonIdx]
      );
      assignLayout(this.graph, currentPositions, { dimensions: ['x', 'y'] });
      //this.cancelCurrentAnimation = animateNodes(this.graph, currentPositions, {
      // duration: 2000,
      //easing: 'quadraticOut',
      // });
    });
    this.graph.forEachNode((node, attributes) => {
      if (attributes.nodeType !== 'moduleNode') {
        attributes.layoutX = attributes.x;
        attributes.layoutY = attributes.y;
      }
    });
    Object.keys(this.polygons).forEach((element) => {
      const polygonIdx = parseInt(element);
      const currentPolygon = this.polygons[polygonIdx];

      const currentNodes = useMainStore().modules[polygonIdx];

      const polygonBB = currentPolygon.getBoundingBox();
      const minX = polygonBB.vertices[0][0];
      const minY = polygonBB.vertices[0][1];
      const minXY = Math.min(minX, minY);
      const maxX = polygonBB.vertices[2][0];
      const maxY = polygonBB.vertices[2][1];
      const maxXY = Math.min(maxX, maxY);

      currentNodes.forEach((node) => {
        const currAttribs = this.graph.getNodeAttributes(node);
        const centeredX = currAttribs.x - currentPolygon.getCenter()[0];
        const centeredY = currAttribs.y - currentPolygon.getCenter()[1];
        this.graph.setNodeAttribute(
          node,
          'xOnClusterFocus',
          (maxExt * centeredX) / (maxXY - minXY)
        );
        this.graph.setNodeAttribute(
          node,
          'yOnClusterFocus',
          (maxExt * centeredY) / (maxXY - minXY)
        );
      });
      this.graph.setNodeAttribute(
        polygonIdx,
        'xOnClusterFocus',
        (maxExt * (minX - currentPolygon.getCenter()[0])) / (maxXY - minXY)
      );
      this.graph.setNodeAttribute(
        polygonIdx,
        'yOnClusterFocus',
        (maxExt * (minY - currentPolygon.getCenter()[1])) / (maxXY - minXY)
      );
    });
  }

  getModuleNodeIds() {
    const moduleNodeMapping: {
      [key: string]: {
        ids: string[];
        pos: number[][];
        posOnClusterFocus: number[][];
      };
    } = {};
    this.graph.forEachNode((node, attr) => {
      if (!attr.isRoot) {
        // short circuit eval. to generate the corresponding entry
        !(attr.modNum in moduleNodeMapping) &&
          (moduleNodeMapping[attr.modNum] = {
            ids: [],
            pos: [],
            posOnClusterFocus: [],
          });
        moduleNodeMapping[attr.modNum].ids.push(attr.id);
        moduleNodeMapping[attr.modNum].pos.push([attr.x, attr.y]);
        moduleNodeMapping[attr.modNum].posOnClusterFocus.push([
          attr.xOnClusterFocus,
          attr.yOnClusterFocus,
        ]);
      }
    });
    return moduleNodeMapping;
  }

  addModuleOverviewNodes() {
    const mainStore = useMainStore();
    const moduleNodeMapping = this.getModuleNodeIds();
    const glyphs = generateGlyphs(mainStore.glyphData, 128, moduleNodeMapping);
    console.log('ModuleGlyphs', glyphs);
    for (const key in Object.keys(moduleNodeMapping)) {
      const xPos = this.polygons[key].getCenter()[0]; //_.mean(moduleNodeMapping[key].pos.map((elem) => elem[0]));
      const yPos = this.polygons[key].getCenter()[1]; //_.mean(moduleNodeMapping[key].pos.map((elem) => elem[1]));
      const moduleNode: overviewNodeAttr = {
        name: key,
        id: key,
        x: xPos,
        y: yPos,
        layoutX: xPos,
        layoutY: yPos,
        preFa2X: xPos,
        preFa2Y: yPos,
        xOnClusterFocus: -50,
        yOnClusterFocus: -50,
        modNum: parseInt(key),
        isRoot: false,
        zIndex: 1,
        color: overviewColors.modules,
        size: this.MODULE_DEFAULT_SIZE,
        nodeType: 'moduleNode',
        nonHoverSize: this.MODULE_DEFAULT_SIZE,
        fixed: false,
        up: { x: xPos, y: yPos, gamma: 0 },
        type: 'image',
        label: `Cluster: ${key}`,
        image: glyphs[key],
        imageLowRes: glyphs[key],
        imageHighRes: glyphs[key],
        imageLowZoom: glyphs[key],
        hidden: this.camera.ratio >= this.lodRatio ? false : true,
        hierarchyHidden: false,
        filterHidden: false,
        zoomHidden: this.camera.ratio >= this.lodRatio ? true : true,
        moduleHidden: false,
        moduleFixed: false,
        forceLabel: false,
        averageTranscriptomics: 0,
        averageProteomics: 0,
        averageMetabolomics: 0,
        transcriptomicsNodeState: { regulated: 0, total: 0 },
        proteomicsNodeState: { regulated: 0, total: 0 },
        metabolomicsNodeState: { regulated: 0, total: 0 },
        rootId: '',
        parents: [],
        children: [],
      };
      this.graph.addNode(key, moduleNode);
    }
  }

  setSize(windowWidth: number) {
    this.windowWidth = windowWidth;
    console.log('Window Size', windowWidth);
    if (windowWidth < 1000) {
      this.DEFAULT_SIZE = OverviewGraph.DEFAULT_SIZE * 0.7;
      this.ROOT_DEFAULT_SIZE = OverviewGraph.MODULE_DEFAULT_SIZE * 0.7;
      this.MODULE_DEFAULT_SIZE = OverviewGraph.MODULE_DEFAULT_SIZE * 0.7;
    } else if (windowWidth < 1950) {
      this.DEFAULT_SIZE = OverviewGraph.DEFAULT_SIZE * 1;
      this.ROOT_DEFAULT_SIZE = OverviewGraph.MODULE_DEFAULT_SIZE * 1;
      this.MODULE_DEFAULT_SIZE = OverviewGraph.MODULE_DEFAULT_SIZE * 1;
    } else {
      this.DEFAULT_SIZE = OverviewGraph.DEFAULT_SIZE * 2.5;
      this.ROOT_DEFAULT_SIZE = OverviewGraph.MODULE_DEFAULT_SIZE * 2.5;
      this.MODULE_DEFAULT_SIZE = OverviewGraph.MODULE_DEFAULT_SIZE * 2.5;
    }
    this.applySize();
  }

  applySize() {
    this.renderer.getGraph().forEachNode((node, attr) => {
      switch (attr.nodeType) {
        case 'regular':
          attr.size = this.DEFAULT_SIZE;
          attr.nonHoverSize = this.DEFAULT_SIZE;
          break;
        case 'root':
          attr.size = this.ROOT_DEFAULT_SIZE;
          attr.nonHoverSize = this.ROOT_DEFAULT_SIZE;
          break;
        case 'hierarchical':
          attr.size = this.ROOT_DEFAULT_SIZE;
          attr.nonHoverSize = this.ROOT_DEFAULT_SIZE;
          break;
        case 'moduleNode':
          attr.size = this.MODULE_DEFAULT_SIZE;
          attr.nonHoverSize = this.MODULE_DEFAULT_SIZE;
          break;
        default:
          attr.size = this.DEFAULT_SIZE;
          attr.nonHoverSize = this.DEFAULT_SIZE;
      }
    });
  }

  public resetZoom = resetZoom;
  public setAverageFilter = setAverageFilter;
  public setRootFilter = setRootFilter;
  public setRootNegativeFilter = setRootNegativeFilter;
  /**
   * Refresehes sets current pathway to the version selected in the store
   */
  public refreshCurrentPathway() {
    const mainStore = useMainStore();
    this.currentPathway = mainStore.pathwayDropdown.value;
    this.shortestPathClick = [];
    this.shortestPathNodes = [];
    this.shortestPathEdges = [];
    this.highlightedEdgesClick.clear();
    this.highlightedNodesClick.clear();
    if (this.currentPathway) {
      this.highlightedNodesClick = new Set(
        this.graph.neighbors(this.currentPathway)
      );
      this.highlightedEdgesClick = new Set(
        this.graph.edges(this.currentPathway)
      );
    }
    this.renderer.refresh();
  }

  /**
   * Kills the Graph instance
   */
  public killGraph() {
    this.renderer.kill();
  }

  /**
   * Sets Pathways containing an intersection of the selected entities of interest
   * @param val list of IDs defining the intersection
   */
  public setPathwaysContainingIntersecion(val: string[] = []) {
    this.pathwaysContainingIntersection = val;
    this.renderer.refresh();
  }

  /**
   * Sets Pathways containing an union of the selected entities of interest
   * @param val  lost of IDs defining the union
   */
  public setPathwaysContainingUnion(val: string[] = []) {
    this.pathwaysContainingUnion = val;
    this.renderer.refresh();
  }

  getRoot(reactomeID: string): void {
    Loading.show();
    fetch(`/get_root_search/${reactomeID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((content) => {
        console.log(content);
        Loading.hide();
      });
  }
}
