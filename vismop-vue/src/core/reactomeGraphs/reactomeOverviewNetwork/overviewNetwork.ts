import Graph, { UndirectedGraph } from 'graphology';
import Sigma from 'sigma';
//import getNodeProgramImage from '@/core/custom-nodes/custom-image-node-program';
import getNodeProgramImage from 'sigma/rendering/programs/node-image';

import {
  fa2LayoutParams,
  overviewNodeAttr,
  overviewGraphData,
  additionalData,
} from '@/core/reactomeGraphs/reactomeOverviewNetwork/overviewTypes';
import { drawHover, drawLabel } from '@/core/customLabelRenderer';
import { useMainStore } from '@/stores';
import { DEFAULT_SETTINGS } from 'sigma/settings';
import { animateNodes } from 'sigma/utils/animate';
import { nodeReducer, edgeReducer } from './reducerFunctions';
import { resetZoom, zoomLod } from './camera';
import OverviewFilter from './filter';
import { dijkstra, edgePathFromNodePath } from 'graphology-shortest-path';
import { Attributes } from 'graphology-types';
import subgraph from 'graphology-operators/subgraph';
import { assignLayout, LayoutMapping } from 'graphology-layout/utils';
import { nodeExtent } from 'graphology-metrics/graph/extent';
import { generateGlyphs } from '@/core/overviewGlyphs/clusterGlyphGenerator';
import orderedCircularLayout from '../orderedCircularLayout';
import fa2 from '../../layouting/modFa2/graphology-layout-forceatlas2.js';
import { overviewColors } from '@/core/colors';
import { ConvexPolygon } from '@/core/layouting/ConvexPolygon';
import { Coordinates, PlainObject } from 'sigma/types';
import { vec2 } from 'gl-matrix';
import BezierEdgeProgram from '@/core/custom-nodes/bezier-curve-new-program';
import EdgeLineProgram from 'sigma/rendering/programs/edge-line';
import DontRender from '@/core/custom-nodes/dont-render-new';
import { createNormalizationFunction, graphExtent } from 'sigma/utils';
import { color } from '@/core/graphTypes';

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
  highlightedNodesHover = new Set();
  highlightedEdgesHover = new Set();
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
  showAllEdges = false;
  showBundling = true;
  prevFrameZoom;
  graph;
  clusterData;
  graphWidth = 0;
  lodRatio = 1.3;
  lastClickedClusterNode = -1;
  additionalData!: additionalData;
  polygonLayerID: string;
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
  currentlyRenderedPolygons: { [key: number]: ConvexPolygon };
  initialFa2Params: fa2LayoutParams;
  clusterWeights: number[];
  maxClusterWeight: number;
  clusterSizeScalingFactor: number;
  rootOrder: number;
  containerID: string;

  constructor(
    containerID: string,
    polygonLayerID: string,
    graphData: overviewGraphData,
    polygons: { [key: number]: ConvexPolygon },
    layoutParams: fa2LayoutParams,
    clusterWeights: number[]
  ) {
    console.log('GraphData:', graphData);
    this.polygonLayerID = polygonLayerID;
    this.containerID = containerID;
    this.graph = UndirectedGraph.from(graphData);
    this.initialFa2Params = layoutParams;
    this.clusterData = graphData.clusterData;
    this.polygons = polygons;
    this.currentlyRenderedPolygons = graphData.clusterData.normalHullPoints;
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
    //this.generateHelperEdges();
    this.generateBezierControlPoints();
    this.setSize();
    this.drawPolygons(
      polygonLayerID,
      containerID,
      graphData.clusterData.normalHullPoints,
      graphData.clusterData.clusterColors,
      true
    );

    this.refreshCurrentPathway();
  }

  /**
   * draw the polygons for the clusters in the overview graph
   * @param polygonLayerID
   * @param polygons
   * @param clusterColors
   *
   */
  drawPolygons(
    polygonLayerID: string,
    containerId: string,
    polygons: { [key: number]: ConvexPolygon },
    clusterColors: { [key: number]: color },
    init: boolean = false
  ) {
    const container = document.getElementById(containerId);
    if (init) {
      //append canvas to container
      const createdCanvas = document.createElement('canvas');
      createdCanvas?.setAttribute('id', polygonLayerID);
      createdCanvas?.setAttribute('style', 'position: absolute;');
      container?.insertBefore(createdCanvas, container.firstChild);
    }
    //select the canvas that is child of polygonLayerID
    const canvas: HTMLCanvasElement | undefined | null =
      container?.querySelector('#' + polygonLayerID);
    if (canvas) {
      canvas.setAttribute('width', container?.offsetWidth + 'px');
      canvas.setAttribute('height', container?.offsetHeight + 'px');
      canvas.style.width = container?.offsetWidth + 'px';
      canvas.style.height = container?.offsetHeight + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // draw polygons on the canvas
        const iterateKeys =
          this.lastClickedClusterNode == -1
            ? Object.keys(polygons)
            : [this.lastClickedClusterNode];
        iterateKeys.forEach((element) => {
          const polygonIdx = parseInt(String(element));
          const currentPolygon = polygons[polygonIdx];
          const polygonVertices = currentPolygon.verticesToArray();
          const currentColor = clusterColors[polygonIdx];
          ctx.fillStyle = `rgba(${currentColor[0]},${currentColor[1]},${currentColor[2]},${currentColor[3]})`;
          ctx.strokeStyle = `rgba(${currentColor[0]},${currentColor[1]},${currentColor[2]},${currentColor[3]})`;
          ctx.beginPath();
          const trafoCoord = this.renderer.graphToViewport({
            x: polygonVertices[0][0],
            y: polygonVertices[0][1],
          });
          ctx.moveTo(trafoCoord.x, trafoCoord.y);
          for (let i = 1; i < polygonVertices.length; i++) {
            const trafoCoord = this.renderer.graphToViewport({
              x: polygonVertices[i][0],
              y: polygonVertices[i][1],
            });
            ctx.lineTo(trafoCoord.x, trafoCoord.y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.fill();
        });
      }
    }
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
    const renderer = new Sigma(this.graph, elem, {
      nodeReducer: nodeReducer.bind(this),
      edgeReducer: edgeReducer.bind(this),
      zIndex: true, // enabling zIndex parameter
      renderLabels: true,
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 999999,
      edgeProgramClasses: {
        ...DEFAULT_SETTINGS.edgeProgramClasses,
        dashed: BezierEdgeProgram,
        line: BezierEdgeProgram,
        helper: DontRender,
      },
      nodeProgramClasses: {
        ...DEFAULT_SETTINGS.nodeProgramClasses,
        image: getNodeProgramImage(),
      },
      defaultDrawNodeHover: drawHover,
      defaultDrawNodeLabel: drawLabel,
    });
    renderer.on('beforeRender', () => {
      zoomLod.bind(this)();
      this.filter.filterElements();
    });
    renderer.on('afterRender', () => {
      this.drawPolygons(
        this.polygonLayerID,
        this.containerID,
        this.lastClickedClusterNode == -1
          ? this.clusterData.normalHullPoints
          : this.clusterData.focusHullPoints,
        this.clusterData.clusterColors
      );
    });
    renderer.on('clickStage', () => {
      console.log('clickStage');
    });
    //TODO: from events example:
    renderer.on('enterNode', ({ node }) => {
      console.log('Entering: ', node);
      this.highlightedNodesHover = new Set(this.graph.neighbors(node));
      this.highlightedNodesHover.add(node);
      this.highlightedCenterHover = node;
      this.highlightedEdgesHover = new Set(this.graph.edges(node));
      renderer.refresh();
    });

    renderer.on('leaveNode', () => {
      this.highlightedNodesHover.clear();
      this.highlightedEdgesHover.clear();
      this.highlightedCenterHover = '';
      renderer.refresh();
    });

    renderer.on('clickNode', ({ node, event }) => {
      console.log('clickNode', node, event);
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

  /**
   * Sets graphWidth to the different found in the nodes extent
   */
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

  /**
   * Pushes a node layer in the specified direction, either radially inwards or outwards
   * @param nodeLayer array of node ids for layer to be pushed
   * @param direction direction in which to push
   */
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

  /**
   * performs the complete hierarchy step out with a given target node.
   * moves the hierarchy level of the target node one step outwards displays the nodes one level further
   * into the hierarchy and animates the nodes by applying the animation and attribute stack
   * @param targetNode target for the hierarch step out
   */
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

  /**
   * performs the complete stepout of the hierarchy collapsing lower levels and moving in the remaining layer closer the the center.
   * Can be used with reset mode, collapsing to the initial state and in callback mode allowing additional functions to be executed after
   * the step in.
   * @param resetMode if reset mode should be triggered, returning the graph to its initial state
   * @param callbackMode if callback mode should be enaled, allowing the use of a callback function to be triggered after the stepout
   * @param callback  callback function to be called after the step out
   */
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

  /**
   * collapses the hierarchy for the target node an the given level.
   * @param targetNode target node to cllapse on
   * @param levelIdx index of current level
   */
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

  /**
   * layouts a hierarchy level after a step out.
   * @param targetNode parent node for which the subtree should be layout as a new hierarchy level
   * @param skipNode node id
   */
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
    this.setHierarchyEdgeAttributes(currentLevelGraph);
  }

  /**
   * sets the attributes of all edges to hierarchy hidden
   */
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

  /**
   * Finds the first visible node higher in the hierarchy from the given node and returns its ID
   * @param nodeID target node id for which to find the first visible parent
   * @returns node ID of the first visible node
   */
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

  /**
   * set the visibile subtree attribute for hierarchy and root nodes. this indicates if any of the child-nodes are visible in the graph
   */
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

  /**
   * traverses the subtree of a given node and return if any of its children are visible
   * @param nodeID  node id of node for which to traverse its subtree
   * @returns boolean indicating
   */
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

  /**
   * unhides edges of the now visible hierarcvhy nodes
   * @param graph
   */
  setHierarchyEdgeAttributes(graph: Graph) {
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

  /**
   * Applies the nodes attribute stack to the graph
   */
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

  /**
   * Applies the edge attribute stack to the graph
   */
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

  /**
   * Applies the animation stack to the graph
   * @param animationOptions options of the sigma animation function
   * @param callback callback to be executed after the animation has finished
   * @param callbackArgs arguments to be passed to the callback function
   */

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

  /**
   * Adds changes to a nodes attributes to the attribute stack
   * @param nodeID ID of the node
   * @param attrs attributes of the node
   */
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

  /**
   * Adds changes to an edges attributes to the attributes stack
   * @param edgeID ID of the edge
   * @param attrs attributes of the edge
   */
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

  /**
   * Function which is bound the the onclick event handler of node. Wraps the step in and outs
   * @param targetNode target node for which to execute the layouting
   */
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

      const currentNodes = useMainStore().clusterData.clusters[polygonIdx];

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
   * Adds cluster overview nodes to the graph, using data from the pina storage and from class functions
   */
  addClusterOverviewNodes() {
    const mainStore = useMainStore();
    const glyphs = generateGlyphs(
      mainStore.glyphData,
      mainStore.getTimeSeriesMode(),
      OverviewGraph.GLYPH_SIZE,
      mainStore.clusterData.clusters
    );
    for (const key in mainStore.clusterData.clusters) {
      const xPos = this.polygons[key].getCenter()[0]; //_.mean(clusterNodeMapping[key].pos.map((elem) => elem[0]));
      const yPos = this.polygons[key].getCenter()[1]; //_.mean(clusterNodeMapping[key].pos.map((elem) => elem[1]));
      const clusterNode: overviewNodeAttr = {
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
        fcAverages: {
          transcriptomics: 0,
          proteomics: 0,
          metabolomics: 0,
        },
        nodeState: {
          transcriptomics: { regulated: 0, total: 0 },
          proteomics: { regulated: 0, total: 0 },
          metabolomics: { regulated: 0, total: 0 },
        },
        rootId: '',
        parents: [],
        children: [],
        subtreeIds: [],
        visibleSubtree: true,
      };
      this.graph.addNode(key, clusterNode);
    }
  }

  /**
   * changes the default sizes depending on the supplied parameter
   */
  setSize() {
    const windowWidth =
      document.getElementById(this.containerID)?.offsetWidth || 0;
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

  /**
   * Applies node sizes to all nodes, depending on the type of node
   */
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

  /**
   * Function to reset the zoom level
   */
  public resetZoom = resetZoom;

  /**
   * Refresehes sets current pathway to the version selected in the store
   */
  public refreshCurrentPathway() {
    const mainStore = useMainStore();
    this.currentPathway = mainStore.selectedPathway;
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
  public refreshRenderer() {
    this.renderer.resize();
  }
  /**
   * Kills the Graph instance
   */
  public killGraph() {
    this.renderer.kill();
  }

  /**
   * Sets Pathways containing an intersection of the selected entities of interest
   * @param val array of IDs defining the intersection
   */
  public setPathwaysContainingIntersecion(val: string[] = []) {
    this.pathwaysContainingIntersection = val;
    this.renderer.refresh();
  }

  /**
   * Sets Pathways containing an union of the selected entities of interest
   * @param val array of IDs defining the union
   */
  public setPathwaysContainingUnion(val: string[] = []) {
    this.pathwaysContainingUnion = val;
    this.renderer.refresh();
  }

  setShowAllEdges(val: boolean) {
    this.showAllEdges = val;
    this.renderer.refresh();
  }
  getShowBundling() {
    return this.showBundling;
  }
  setShowBundling(val: boolean) {
    this.showBundling = val;

    const graph = this.renderer.getGraph();
    const edgeKeys = this.renderer.getGraph().edges();
    edgeKeys.forEach((key) => {
      graph.setEdgeAttribute(key, 'showBundling', val);
    });

    this.renderer.refresh();
  }

  // for each cluster:
  // picks the last node in the cluster,
  // makes a helper-edge between that node
  // and every other node in the cluster
  generateHelperEdges() {
    const graph = this.renderer.getGraph();
    const clusterData = useMainStore().clusterData.clusters;

    clusterData.forEach((currNodes) => {
      // todo: check if this really works
      const centerNode = currNodes.pop() as string;

      const subClusters: { [key: string]: string[] } = {};

      // find sub-clusters
      currNodes.forEach((node) => {
        if (subClusters[graph.getNodeAttribute(node, 'rootId')] === undefined) {
          subClusters[graph.getNodeAttribute(node, 'rootId')] = [];
        }
        subClusters[graph.getNodeAttribute(node, 'rootId')].push(node);
      });

      // in each sub-cluster
      Object.keys(subClusters).forEach((subClustersKey) => {
        const subCluster = subClusters[subClustersKey];
        const centerSubCluster = subCluster.pop() as string;

        // connect all nodes to the center
        subCluster.forEach((node) => {
          if (!graph.hasEdge(centerSubCluster, node)) {
            this.addHelperEdge(centerSubCluster, node);
          }
        });
      });
    });
  }

  dropHelperEdges() {
    const graph = this.renderer.getGraph();
    const edges = graph.edges();

    edges.forEach((edge) => {
      const type = graph.getEdgeAttribute(edge, 'type');
      if (type === 'helper') {
        graph.dropEdge(edge);
      }
    });
  }

  // generates a helper-edge that won't be rendered
  addHelperEdge(sourceID: string, targetID: string) {
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
        type: 'helper',
        color: 'rgba(0,0,0,0.0)',
      },
    };
    this.renderer
      .getGraph()
      .addEdgeWithKey(edge.key, edge.source, edge.target, edge.attributes);
  }

  // generates bezier control points based on the edge-path bundling algorithm
  generateBezierControlPoints(k = 2, d = 2) {
    console.log('generating bezier control points');
    this.generateHelperEdges();

    const graph = this.renderer.getGraph();
    const dijkstraGraph = graph.copy();
    const edgeKeys = this.renderer.getGraph().edges();
    const skip: {
      edgeKey: string;
      source: string;
      target: string;
      attributes: Attributes;
    }[] = [];

    edgeKeys.forEach((key) => {
      graph.setEdgeAttribute(key, 'bezeierControlPoints', []);
      const edgeAttribs = graph.getEdgeAttributes(key);

      graph.setEdgeAttribute(key, 'skip', false);
      graph.setEdgeAttribute(key, 'lock', false);

      // retriving & calculating necessary data
      const source = edgeAttribs.source;
      const target = edgeAttribs.target;

      const sx = graph.getNodeAttribute(source, 'x');
      const sy = graph.getNodeAttribute(source, 'y');

      const tx = graph.getNodeAttribute(target, 'x');
      const ty = graph.getNodeAttribute(target, 'y');

      const dx = tx - sx;
      const dy = ty - sy;
      const len = (dx * dx + dy * dy) ** (1 / 2);

      graph.setEdgeAttribute(key, 'len', len);
      graph.setEdgeAttribute(key, 'weight', len ** d);
    });

    edgeKeys.sort(
      (a, b) =>
        graph.getEdgeAttribute(b, 'weight') -
        graph.getEdgeAttribute(a, 'weight')
    ); // sorting edgeKeys by weight descending

    edgeKeys.forEach((edgeKey) => {
      const t0 = performance.now();
      const edge = graph.getEdgeAttributes(edgeKey);
      if (edge.lock) {
        return;
      }
      graph.setEdgeAttribute(edgeKey, 'skip', true);

      const source = edge.source;
      const target = edge.target;

      skip.push({
        edgeKey: edgeKey,
        source: source,
        target: target,
        attributes: graph.getEdgeAttributes(edgeKey),
      });
      dijkstraGraph.dropEdge(edgeKey);
      const t1 = performance.now();
      // skip.forEach((edgeDict) => {
      //   graph.dropEdge(edgeDict.edgeKey);
      // });
      const t2 = performance.now();
      const nodePath = dijkstra.bidirectional(
        dijkstraGraph,
        source,
        target,
        'weight'
      );
      const t3 = performance.now();
      // restore edges dropped for skip
      // skip.forEach((edgeDict) => {
      //   graph.addEdgeWithKey(
      //     edgeDict.edgeKey,
      //     edgeDict.source,
      //     edgeDict.target,
      //     edgeDict.attributes
      //   );
      // });
      const t4 = performance.now();
      let path = null;
      if (nodePath != null) {
        path = edgePathFromNodePath(graph, nodePath);
      }

      if (path === null) {
        graph.setEdgeAttribute(edgeKey, 'skip', false);
        skip.pop();
        dijkstraGraph.addEdgeWithKey(
          edgeKey,
          source,
          target,
          graph.getEdgeAttributes(edgeKey)
        );
        return;
      } else if (this.pathLength(path) > k * edge.len) {
        graph.setEdgeAttribute(edgeKey, 'skip', false);
        skip.pop();
        dijkstraGraph.addEdgeWithKey(
          edgeKey,
          source,
          target,
          graph.getEdgeAttributes(edgeKey)
        );
        return;
      }

      path.forEach((pathEdge) => {
        graph.setEdgeAttribute(pathEdge, 'lock', true);
      });
      const t5 = performance.now();
      const nodeExtent = graphExtent(graph);
      const normalizationFunction = createNormalizationFunction(nodeExtent);

      // get vertecies of path
      const vertices: number[] = [];
      nodePath.forEach((pathNode) => {
        const norm_xy: Coordinates = {
          x: graph.getNodeAttribute(pathNode, 'x'),
          y: graph.getNodeAttribute(pathNode, 'y'),
        };
        normalizationFunction.applyTo(norm_xy);
        vertices.push(norm_xy.x, norm_xy.y);
      });
      const t6 = performance.now();
      graph.setEdgeAttribute(edgeKey, 'bezeierControlPoints', vertices);
      // console.log(
      //   `edge ${edgeKey} took ${
      //     t6 - t0
      //   }ms to calculate bezier control points with subtimings of
      //   ${t1 - t0}ms for skip
      //   ${t2 - t1}ms for drop
      //   ${t3 - t2}ms for dijkstra
      //   ${t4 - t3}ms for restore
      //   ${t5 - t4}ms for lock
      //   ${t6 - t5}ms for vertices
      //   `
      // );
    });

    this.dropHelperEdges();
  }

  pathLength(path: string[]): number {
    let path_len = 0;
    path.forEach((edgeKey) => {
      path_len += this.renderer.getGraph().getEdgeAttribute(edgeKey, 'len');
    });
    return path_len;
  }
}
