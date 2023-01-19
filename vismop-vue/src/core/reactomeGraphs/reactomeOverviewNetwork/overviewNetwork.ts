import Graph, { UndirectedGraph } from 'graphology';
import Sigma from 'sigma';
import {
  additionalData,
  overviewGraphData,
  overviewNodeAttr,
} from '@/core/graphTypes';
import getNodeProgramImage from '@/core/custom-nodes/custom-image-node-program';
//import getNodeImageProgram from 'sigma/rendering/webgl/programs/node.combined';
import DashedEdgeProgram from '@/core/custom-nodes/dashed-edge-program';
import { drawHover, drawLabel } from '@/core/customLabelRenderer';
import { useMainStore } from '@/stores';
import { DEFAULT_SETTINGS } from 'sigma/settings';
import { animateNodes } from 'sigma/utils/animate';
import { nodeReducer, edgeReducer } from './reducerFunctions';
import { resetZoom, zoomLod } from './camera';
import OverviewFilter from './filter';
import subgraph from 'graphology-operators/subgraph';
import { assignLayout, LayoutMapping } from 'graphology-layout/utils';
import { nodeExtent } from 'graphology-metrics/graph/extent';
import { generateGlyphs } from '@/core/overviewGlyphs/clusterGlyphGenerator';
import orderedCircularLayout from '../orderedCircularLayout';
import fa2 from '../../layouting/modFa2/graphology-layout-forceatlas2.js';
import { overviewColors } from '@/core/colors';
import { ConvexPolygon } from '@/core/layouting/ConvexPolygon';
import { PlainObject } from 'sigma/types';
import { vec2 } from 'gl-matrix';
export default class OverviewGraph {
  // constants
  static readonly DEFAULT_SIZE = 6;
  static readonly ROOT_DEFAULT_SIZE = 15;
  static readonly CLUSTER_DEFAULT_SIZE = 15;
  static readonly FOCUS_NODE_SIZE = 10;
  static readonly GLYPH_SIZE = 64;
  static readonly CLUSTER_EXTENT = 400;

  protected DEFAULT_SIZE = 6;
  protected ROOT_DEFAULT_SIZE = 15;
  protected CLUSTER_DEFAULT_SIZE = 15;
  protected FOCUS_NODE_SIZE = 10;

  // data structures for reducers
  highlightedEdgesClick = new Set();
  highlightedNodesClick = new Set();
  //from events SIGMA2 example, initialze sets for highlight on hover:
  highlighedNodesHover = new Set();
  highlighedEdgesHover = new Set();
  highlightedCenterHover = '';
  currentPathway = '';
  hierarchyClickStack: string[] = [];
  pathwaysContainingIntersection: string[] = [];
  pathwaysContainingUnion: string[] = [];
  hierarchyNodes: string[] = [];
  hierarchyLevels: { [key: number]: string[] } = {};
  // renderer and camera
  renderer;
  camera;
  prevFrameZoom;
  graph;
  clusterData;
  graphWidth = 0;
  windowWidth = 1080;
  lodRatio = 1.3;
  lastClickedClusterNode = -1;
  additionalData!: additionalData;
  animationStack: PlainObject<PlainObject<number>> = {};
  nodeAttributeStack: {
    [key: string]: { [key: string]: string | number | boolean };
  } = {};
  edgeAttributeStack: {
    [key: string]: { [key: string]: string | number | boolean };
  } = {};
  cancelCurrentAnimation: (() => void) | null = null;

  // filter

  filter = new OverviewFilter(this);

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
    this.addClusterOverviewNodes();
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
        clusterColors: this.clusterData.clusterColors,
      },
    };
    console.log('addData', this.additionalData);
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
          image: getNodeProgramImage(),
        },
        hoverRenderer: drawHover,
        labelRenderer: drawLabel,
        getCameraSizeRatio: (x) => Math.pow(x, 0.7),
        clusterVis: 'ConvexHull',
      },
      this.additionalData
    );
    renderer.on('beforeRender', () => {
      zoomLod.bind(this)();
      this.filter.filterElements();
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
      if (this.graph.getNodeAttribute(node, 'nodeType') != 'cluster') {
        if (event.original.ctrlKey) {
          mainStore.selectPathwayCompare([node]);
        } else if (event.original.altKey) {
          this.highlightedEdgesClick.clear();
          this.highlightedNodesClick.clear();
          this.highlightedNodesClick = new Set(this.graph.neighbors(node));
          this.highlightedEdgesClick = new Set(this.graph.edges(node));
          const nodeLabel = this.graph.getNodeAttribute(node, 'label');
          mainStore.focusPathwayViaOverview({ nodeID: node, label: nodeLabel });
        } else {
          if (this.graph.getNodeAttribute(node, 'nodeType') != 'regular') {
            this.hierarchyLayoutClickfunc(node);
          }
        }
      } else {
        const defocus = this.lastClickedClusterNode == parseInt(node);
        this.graph.forEachNode((_, attributes) => {
          if (
            !defocus &&
            attributes.id != node &&
            attributes.clusterNum == parseInt(node) &&
            !attributes.isRoot
          ) {
            attributes.x = attributes.xOnClusterFocus;
            attributes.y = attributes.yOnClusterFocus;
            attributes.clusterFixed = true;
            attributes.zoomHidden = false;
            attributes.size = this.FOCUS_NODE_SIZE; // size behavíour is strange!
            attributes.nonHoverSize = this.FOCUS_NODE_SIZE;
          } else if (!defocus && !attributes.isRoot) {
            attributes.x = attributes.xOnClusterFocus;
            attributes.y = attributes.yOnClusterFocus;
            if (attributes.id != node) {
              attributes.clusterHidden = true;
            } else {
              attributes.clusterFixed = true;
              attributes.zoomHidden = false;
            }
          } else if (!attributes.isRoot) {
            attributes.x = attributes.layoutX;
            attributes.y = attributes.layoutY;
            attributes.clusterFixed = false;
            attributes.clusterHidden = false;
            attributes.size = attributes.isRoot
              ? this.ROOT_DEFAULT_SIZE
              : attributes.nodeType == 'cluster'
              ? this.CLUSTER_DEFAULT_SIZE
              : this.DEFAULT_SIZE;
            attributes.nonHoverSize = attributes.isRoot
              ? this.ROOT_DEFAULT_SIZE
              : attributes.nodeType == 'cluster'
              ? this.CLUSTER_DEFAULT_SIZE
              : this.DEFAULT_SIZE;
          }
        });

        this.additionalData = defocus
          ? Object.assign(this.additionalData, {
              clusterAreas: {
                hullPoints: this.clusterData.normalHullPoints,
                clusterColors: this.clusterData.clusterColors,
              },
            })
          : Object.assign(this.additionalData, {
              clusterAreas: {
                hullPoints: [this.clusterData.focusHullPoints[parseInt(node)]],
                clusterColors: [this.clusterData.clusterColors[parseInt(node)]],
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

    this.hierarchyStepIn(true);
    this.hierarchyNodes = [];
    useMainStore().focusPathwayViaDropdown({ title: '', value: '', text: '' });
    this.renderer.refresh();
    //this.hierarchyClickStack = [];
  }
  calculateGraphWidth() {
    const nodeXyExtent = nodeExtent(this.graph, ['x', 'y']);
    this.graphWidth = nodeXyExtent['x'][1] - nodeXyExtent['x'][0];
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

  pushNodeLayer(nodeLayer: string[], direction: 'in' | 'out') {
    const layerSubgraph = subgraph(this.graph, (nodeID, attr) => {
      return (
        attr.nodeType != 'regular' &&
        attr.nodeType != 'other' &&
        (attr.isRoot || nodeLayer.includes(nodeID))
      );
    });
    if (!this.renderer.getCustomBBox())
      this.renderer.setCustomBBox(this.renderer.getBBox());
    layerSubgraph.forEachNode((node, attributes) => {
      const fromCenter = vec2.sub(
        vec2.create(),
        vec2.fromValues(attributes.x, attributes.y),
        vec2.fromValues(0, 0)
      );
      const fromCenterNormalized = vec2.normalize(vec2.create(), fromCenter);
      const xOffset = fromCenterNormalized[0] * this.graphWidth * 0.2;
      const yOffset = fromCenterNormalized[1] * this.graphWidth * 0.2;
      this.animationStack[node] = {
        x:
          direction == 'out'
            ? fromCenter[0] + xOffset
            : fromCenter[0] - xOffset, // change here to increase distance for non tar nodes
        y:
          direction == 'out'
            ? fromCenter[1] + yOffset
            : fromCenter[1] - yOffset,
      };
    });
  }

  hierarchyStepOut(targetNode: string) {
    const subPathwaysIds = this.graph.getNodeAttribute(targetNode, 'children');
    // check if any upcoming nodes are hierarchy nodes
    let anyHierarchyNodes = false;
    subPathwaysIds.forEach((node) => {
      const nodeType = this.graph.getNodeAttribute(node, 'nodeType');
      if (nodeType == 'hierarchical') anyHierarchyNodes = true;
    });
    if (anyHierarchyNodes) {
      if (Object.keys(this.hierarchyLevels).length == 0) {
        this.hierarchyLevels[0] = [targetNode];
      }
      const currentLevels = Object.keys(this.hierarchyLevels).length;
      this.hierarchyLevels[currentLevels] = subPathwaysIds;
      for (
        let idx = 0;
        idx < Object.keys(this.hierarchyLevels).length - 1;
        idx++
      ) {
        const currentLevel = this.hierarchyLevels[idx];
        this.pushNodeLayer(currentLevel, 'out');
      }
      this.layoutNewHierarchyLevel(targetNode);
      this.applyNodeAttributeStack();
      this.applyEdgeAttributeStack();
      this.applyAnimationStack(undefined, () => {
        this.collapseHierarchyLevel(
          this.graph.getNodeAttribute(targetNode, 'rootId'),
          Object.keys(this.hierarchyLevels).length - 2
        );
        this.applyAnimationStack(undefined, () => {
          this.applyNodeAttributeStack();
        });
      });
    }
  }

  hierarchyStepIn(
    resetMode = false,
    callbackMode = false,
    callback?: () => void
  ) {
    const collapseTarget = this.hierarchyClickStack.pop();

    if (collapseTarget) {
      this.collapseHierarchyLevel(
        collapseTarget,
        Object.keys(this.hierarchyLevels).length - 1
      );
      this.applyAnimationStack(
        resetMode ? { duration: 500 } : undefined,
        () => {
          this.applyNodeAttributeStack();
          for (
            let idx = 0;
            idx < Object.keys(this.hierarchyLevels).length - 1;
            idx++
          ) {
            const currentLevel = this.hierarchyLevels[idx];
            this.pushNodeLayer(currentLevel, 'in');
          }
          delete this.hierarchyLevels[
            Object.keys(this.hierarchyLevels).length - 1
          ];
          if (Object.keys(this.hierarchyLevels).length == 1) {
            delete this.hierarchyLevels[0];
          }
          if (Object.keys(this.hierarchyLevels).length > 1) {
            this.layoutNewHierarchyLevel(
              this.hierarchyClickStack[this.hierarchyClickStack.length - 1],
              collapseTarget
            );
          } else {
            this.resetHierarchyHidden();
            this.hierarchyLevels = {};
            this.hierarchyClickStack = [];
          }
          this.applyNodeAttributeStack();
          this.applyEdgeAttributeStack();
          this.applyAnimationStack(
            resetMode ? { duration: 500 } : undefined,
            resetMode
              ? this.hierarchyStepIn
              : callbackMode
              ? callback
              : undefined,
            resetMode
              ? [this.hierarchyClickStack.length > 0, callbackMode, callback]
              : [undefined]
          );
        }
      );
    } else if (callbackMode) {
      if (callback) callback();
    }
  }

  collapseHierarchyLevel(targetNode: string, levelIdx: number) {
    const currentLevel = this.hierarchyLevels[levelIdx];
    const lastClickedNode =
      this.hierarchyClickStack[this.hierarchyClickStack.length - 1];
    const currentLevelGraph = subgraph(this.graph, function (nodeID, attr) {
      return (
        currentLevel.includes(nodeID) &&
        attr.nodeType == 'hierarchical' &&
        nodeID != lastClickedNode
      );
    });
    const targetAttribs = this.graph.getNodeAttributes(targetNode);
    currentLevelGraph.forEachNode((node) => {
      this.animationStack[node] = {
        x: targetAttribs.x, // change here to increase distance for non tar nodes
        y: targetAttribs.y,
      };
      this.addNodeAttributeStack(node, { hierarchyHidden: true, hidden: true });
    });
  }

  layoutNewHierarchyLevel(targetNode: string, skipNode = '') {
    /**
     * Calculate the position of the nodes in the hierarchy
     */
    const currentLevel =
      this.hierarchyLevels[Object.keys(this.hierarchyLevels).length - 1];
    const currentLevelGraph = subgraph(this.graph, function (nodeID, attr) {
      return currentLevel.includes(nodeID) && attr.nodeType == 'hierarchical';
    });
    const parentAttribs = this.graph.getNodeAttributes(targetNode);
    const divisions =
      currentLevelGraph.order < this.rootOrder
        ? this.rootOrder
        : currentLevelGraph.order;
    const angleOffset = ((currentLevelGraph.order - 1) / divisions) * Math.PI;
    const parentAngle = Math.atan2(parentAttribs.y, parentAttribs.x);

    currentLevelGraph.forEachNode((node, _attributes) => {
      if (node != skipNode) {
        const nodeNewAttrs = {
          x: parentAttribs.x,
          y: parentAttribs.y,
          hierarchyHidden: false,
          hidden: false,
        };
        this.addNodeAttributeStack(node, nodeNewAttrs);
      }
    });
    this.renderer.refresh();
    this.applyNodeAttributeStack();

    const currentLevelPositions = orderedCircularLayout(currentLevelGraph, {
      scale: this.graphWidth / 1.8,
      center: 0.5,
      startAngle: parentAngle + angleOffset,
      minDivisions: this.rootOrder,
    }) as LayoutMapping<{ [dimension: string]: number }>;
    this.animationStack = { ...this.animationStack, ...currentLevelPositions };
    this.hierarchyEdgeAttributes(currentLevelGraph);
  }

  //TODO: broken! e.g. wrong edge types
  resetHierarchyHidden() {
    this.graph.forEachEdge((edge, attributes) => {
      this.addEdgeAttributeStack(edge, {
        hierarchyHidden: true,
        hidden: true,
      });
    });
    this.applyEdgeAttributeStack();
  }

  getVisibleParent(nodeID: string): string {
    let currentParentNode = this.graph.getNodeAttribute(nodeID, 'parents')[0];
    let notFoundVisibleParent = true;
    while (notFoundVisibleParent) {
      const parentHidden = this.graph.getNodeAttribute(
        currentParentNode,
        'hidden'
      );
      const parentHierarchyHidden = this.graph.getNodeAttribute(
        currentParentNode,
        'hierarchyHidden'
      );
      if (!parentHidden || !parentHierarchyHidden) {
        notFoundVisibleParent = false;
      } else {
        currentParentNode = this.graph.getNodeAttribute(
          currentParentNode,
          'parents'
        )[0];
      }
    }
    return currentParentNode;
  }

  setVisibleSubtree(): void {
    const nonRegularNodes: string[] = [];
    this.graph.forEachNode((node) => {
      const nodeType = this.graph.getNodeAttribute(node, 'nodeType');
      if (nodeType === 'root' || nodeType == 'hierarchical') {
        nonRegularNodes.push(node);
      }
    });
    nonRegularNodes.forEach((node) => {
      const visibleSubtree = this.hasVisibleSubtreeNodes(node);
      if (!visibleSubtree) {
        this.addNodeAttributeStack(node, {
          visibleSubtree: false,
        });
      }
    });
    this.applyNodeAttributeStack();
  }

  hasVisibleSubtreeNodes(nodeID: string): boolean {
    const subtreeIds = [
      ...this.graph
        .getNodeAttribute(nodeID, 'subtreeIds')
        .filter((item) => item !== nodeID),
    ];
    const visibleNodeFound = subtreeIds.some((node) => {
      const currentAttributes = this.graph.getNodeAttributes(node);
      return !(
        currentAttributes.filterHidden ||
        currentAttributes.zoomHidden ||
        currentAttributes.clusterHidden ||
        currentAttributes.hierarchyHidden
      );
    });
    return visibleNodeFound;
  }

  hierarchyEdgeAttributes(graph: Graph) {
    //this.resetHierarchyHidden();
    // hide rootRegular edges which are there as
    const checkNodes: string[] = [];
    const clickedNode =
      this.hierarchyClickStack[this.hierarchyClickStack.length - 1];
    checkNodes.push(
      ...this.graph
        .getNodeAttribute(clickedNode, 'subtreeIds')
        .filter((item) => item !== clickedNode)
    );
    checkNodes.forEach((node) => {
      const visibleParentNode = this.getVisibleParent(node);
      this.graph.findUndirectedEdge(node, (edge, attr, source, target) => {
        if (source == visibleParentNode || target == visibleParentNode) {
          const edgeAttribs = {
            hierarchyHidden: false,
            hidden: false,
          };
          this.addEdgeAttributeStack(edge, edgeAttribs);
        }
      });
    });
  }

  applyNodeAttributeStack() {
    const nodeKeys = Object.keys(this.nodeAttributeStack);
    nodeKeys.forEach((node) => {
      this.graph.updateNodeAttributes(node, (attr) => {
        return {
          ...attr,
          ...this.nodeAttributeStack[node],
        };
      });
    });
    this.nodeAttributeStack = {};
  }

  applyEdgeAttributeStack() {
    const edgeKeys = Object.keys(this.edgeAttributeStack);
    edgeKeys.forEach((edge) => {
      this.graph.updateEdgeAttributes(edge, (attr) => {
        return {
          ...attr,
          ...this.edgeAttributeStack[edge],
        };
      });
    });
    this.edgeAttributeStack = {};
  }

  applyAnimationStack(
    animationOptions?: { [key: string]: string | number | boolean },
    callback?: (...args: any[]) => void,
    callbackArgs: any[] = []
  ) {
    this.cancelCurrentAnimation = animateNodes(
      this.graph,
      this.animationStack,
      { duration: 1000, easing: 'quadraticOut', ...animationOptions },
      () => {
        this.animationStack = {};
        callback?.call(this, ...callbackArgs);
      }
    );
  }

  addNodeAttributeStack(
    nodeID: string,
    attrs: { [key: string]: string | number | boolean }
  ): void {
    if (Object.prototype.hasOwnProperty.call(this.nodeAttributeStack, nodeID)) {
      this.nodeAttributeStack[nodeID] = {
        ...this.nodeAttributeStack[nodeID],
        ...attrs,
      };
    } else {
      this.nodeAttributeStack[nodeID] = attrs;
    }
  }

  addEdgeAttributeStack(
    edgeID: string,
    attrs: { [key: string]: string | number | boolean }
  ): void {
    if (Object.prototype.hasOwnProperty.call(this.edgeAttributeStack, edgeID)) {
      this.edgeAttributeStack[edgeID] = {
        ...this.edgeAttributeStack[edgeID],
        ...attrs,
      };
    } else {
      this.edgeAttributeStack[edgeID] = attrs;
    }
  }

  hierarchyLayoutClickfunc(targetNode: string) {
    // if we click the root node when the hierarchy is partly built, we take a step back in the hierarchy
    if (
      Object.keys(this.hierarchyLevels).length > 0 &&
      targetNode == this.hierarchyLevels[0][0]
    ) {
      this.hierarchyStepIn();
    } else {
      // reset the hierarchy if the clicked node is a root node other than the current root node
      // if targetNode is a root node and not the current root node
      const targetNodeType = this.graph.getNodeAttribute(
        targetNode,
        'nodeType'
      );
      if (
        Object.keys(this.hierarchyLevels).length > 0 &&
        targetNodeType == 'root' &&
        targetNode != this.hierarchyLevels[0][0]
      ) {
        this.hierarchyStepIn(true, true, () => {
          this.hierarchyClickStack.push(targetNode);
          this.hierarchyStepOut(targetNode);
        });
      } else {
        this.hierarchyClickStack.push(targetNode);
        this.hierarchyStepOut(targetNode);
      }
    }
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
    Object.keys(this.polygons).forEach((element) => {
      const polygonIdx = parseInt(element);
      const currentSubgraph = subgraph(this.graph, function (_nodeID, attr) {
        return (
          attr.clusterNum == polygonIdx &&
          attr.isRoot == false &&
          attr.nodeType == 'regular'
        );
      });
      currentSubgraph.clearEdges();
      currentSubgraph.forEachNode((node, attr) => {
        currentSubgraph.forEachNode((nodeInner, attrInner) => {
          if (node != nodeInner) {
            const splitOuter = attr.rootId.split('_')[0];
            const splitInner = attrInner.rootId.split('_')[0];
            if (!currentSubgraph.hasEdge(node, nodeInner)) {
              currentSubgraph.addEdge(node, nodeInner, {
                weight:
                  splitOuter == splitInner
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
        if (attributes.nodeType !== 'cluster') {
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
      if (attributes.nodeType !== 'cluster') {
        attributes.layoutX = attributes.x;
        attributes.layoutY = attributes.y;
      }
    });

    Object.keys(this.polygons).forEach((element) => {
      const polygonIdx = parseInt(element);
      const currentPolygon = this.polygons[polygonIdx];

      const currentNodes = useMainStore().clusters[polygonIdx];

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
          (OverviewGraph.CLUSTER_EXTENT * centeredX) / (maxXY - minXY)
        );
        this.graph.setNodeAttribute(
          node,
          'yOnClusterFocus',
          (OverviewGraph.CLUSTER_EXTENT * centeredY) / (maxXY - minXY)
        );
      });
      this.graph.setNodeAttribute(
        polygonIdx,
        'xOnClusterFocus',
        (OverviewGraph.CLUSTER_EXTENT *
          (minX - currentPolygon.getCenter()[0])) /
          (maxXY - minXY)
      );
      this.graph.setNodeAttribute(
        polygonIdx,
        'yOnClusterFocus',
        (OverviewGraph.CLUSTER_EXTENT *
          (minY - currentPolygon.getCenter()[1])) /
          (maxXY - minXY)
      );
    });
  }

  /**
   * generate a mapping of clusters to nodes
   * @returns
   */
  getClusterNodeIds() {
    const clusterNodeMapping: {
      [key: string]: {
        ids: string[];
        pos: number[][];
        posOnClusterFocus: number[][];
      };
    } = {};
    this.graph.forEachNode((node, attr) => {
      if (!attr.isRoot) {
        // short circuit eval. to generate the corresponding entry
        !(attr.clusterNum in clusterNodeMapping) &&
          (clusterNodeMapping[attr.clusterNum] = {
            ids: [],
            pos: [],
            posOnClusterFocus: [],
          });
        clusterNodeMapping[attr.clusterNum].ids.push(attr.id);
        clusterNodeMapping[attr.clusterNum].pos.push([attr.x, attr.y]);
        clusterNodeMapping[attr.clusterNum].posOnClusterFocus.push([
          attr.xOnClusterFocus,
          attr.yOnClusterFocus,
        ]);
      }
    });
    return clusterNodeMapping;
  }

  /**
   * Adds cluster overview nodes to the graph, using data from the pina storage and from class functions
   */
  addClusterOverviewNodes() {
    const mainStore = useMainStore();
    const clusterNodeMapping = this.getClusterNodeIds();
    const glyphs = generateGlyphs(
      mainStore.glyphData,
      OverviewGraph.GLYPH_SIZE,
      clusterNodeMapping
    );
    for (const key in Object.keys(clusterNodeMapping)) {
      const xPos = this.polygons[key].getCenter()[0]; //_.mean(clusterNodeMapping[key].pos.map((elem) => elem[0]));
      const yPos = this.polygons[key].getCenter()[1]; //_.mean(clusterNodeMapping[key].pos.map((elem) => elem[1]));
      const clusterNode: overviewNodeAttr = {
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
        clusterNum: parseInt(key),
        isRoot: false,
        zIndex: 1,
        color: overviewColors.clusters,
        size: this.CLUSTER_DEFAULT_SIZE,
        nodeType: 'cluster',
        nonHoverSize: this.CLUSTER_DEFAULT_SIZE,
        fixed: false,
        up: { x: xPos, y: yPos, gamma: 0 },
        type: 'image',
        label: `Cluster: ${key}`,
        image: glyphs[key],
        imageHighDetail: glyphs[key],
        imageLowDetail: glyphs[key],
        hidden: this.camera.ratio >= this.lodRatio ? false : true,
        hierarchyHidden: false,
        filterHidden: false,
        zoomHidden: this.camera.ratio >= this.lodRatio ? true : true,
        clusterHidden: false,
        clusterFixed: false,
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
        subtreeIds: [],
        visibleSubtree: true,
      };
      this.graph.addNode(key, clusterNode);
    }
  }

  setSize(windowWidth: number) {
    this.windowWidth = windowWidth;
    console.log('Window Size', windowWidth);
    if (windowWidth < 1000) {
      this.DEFAULT_SIZE = OverviewGraph.DEFAULT_SIZE * 0.7;
      this.ROOT_DEFAULT_SIZE = OverviewGraph.CLUSTER_DEFAULT_SIZE * 0.7;
      this.CLUSTER_DEFAULT_SIZE = OverviewGraph.CLUSTER_DEFAULT_SIZE * 0.7;
    } else if (windowWidth < 1950) {
      this.DEFAULT_SIZE = OverviewGraph.DEFAULT_SIZE * 1;
      this.ROOT_DEFAULT_SIZE = OverviewGraph.CLUSTER_DEFAULT_SIZE * 1;
      this.CLUSTER_DEFAULT_SIZE = OverviewGraph.CLUSTER_DEFAULT_SIZE * 1;
    } else {
      this.DEFAULT_SIZE = OverviewGraph.DEFAULT_SIZE * 2.5;
      this.ROOT_DEFAULT_SIZE = OverviewGraph.CLUSTER_DEFAULT_SIZE * 2.5;
      this.CLUSTER_DEFAULT_SIZE = OverviewGraph.CLUSTER_DEFAULT_SIZE * 2.5;
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
        case 'cluster':
          attr.size = this.CLUSTER_DEFAULT_SIZE;
          attr.nonHoverSize = this.CLUSTER_DEFAULT_SIZE;
          break;
        default:
          attr.size = this.DEFAULT_SIZE;
          attr.nonHoverSize = this.DEFAULT_SIZE;
      }
    });
  }

  public resetZoom = resetZoom;

  /**
   * Refresehes sets current pathway to the version selected in the store
   */
  public refreshCurrentPathway() {
    const mainStore = useMainStore();
    this.currentPathway = mainStore.pathwayDropdown.value;
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
}
