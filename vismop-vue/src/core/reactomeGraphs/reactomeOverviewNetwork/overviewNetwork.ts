import { UndirectedGraph } from 'graphology';
import _, { random } from 'lodash';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import noverlap from 'graphology-layout-noverlap';
import Sigma from 'sigma';
import { baseNodeAttr, graphData } from '@/core/graphTypes';
//import getNodeProgramImage from 'sigma/rendering/webgl/programs/node.image';
import getNodeImageProgram from 'sigma/rendering/webgl/programs/node.combined';
import DashedEdgeProgram from '@/core/custom-nodes/dashed-edge-program';
import drawHover from '@/core/customHoverRenderer';
import { useMainStore } from '@/stores';
import { DEFAULT_SETTINGS } from 'sigma/settings';
import { bidirectional, edgePathFromNodePath } from 'graphology-shortest-path';
import { filterValues } from '../../generalTypes';
import { nodeReducer, edgeReducer } from './reducerFunctions';
import { resetZoom, zoomLod } from './camera';
import { filterElements, setAverageFilter } from './filter';
import ClusterHulls from '@/core/convexHullsForClusters';
import subgraph from 'graphology-operators/subgraph';
import circular from 'graphology-layout/circular';
import { assignLayout } from 'graphology-layout/utils';
import { nodeExtent } from 'graphology-metrics/graph/extent';
import { generateGlyphs } from '@/core/overviewGlyphs/moduleGlyphGenerator';

export default class overviewGraph {
  // constants
  static readonly DEFAULT_SIZE = 10;
  static readonly ROOT_DEFAULT_SIZE = 15;
  static readonly MODULE_DEFAULT_SIZE = 20;

  // data structures for reducers
  protected shortestPathClick: string[] = [];
  protected shortestPathNodes: string[] = [];
  protected shortestPathEdges: string[] = [];
  protected highlighedEdgesClick = new Set();
  protected highlighedNodesClick = new Set();
  //from events SIGMA2 example, initialze sets for highlight on hover:
  protected highlighedNodesHover = new Set();
  protected highlighedEdgesHover = new Set();
  protected highlightedCenterHover = '';
  protected currentPathway = '';
  protected pathwaysContainingIntersection: string[] = [];
  protected pathwaysContainingUnion: string[] = [];

  // renderer and camera
  protected renderer;
  protected camera;
  protected prevFrameZoom;
  protected graph;
  protected clusterAreas;
  protected lodRatio = 1.5;
  protected cancelCurrentAnimation: (() => void) | null = null;

  // filter
  protected filtersChanged = false;
  protected filterFuncTrans: (x: number) => boolean = (_x: number) => true;
  protected filterFuncProt: (x: number) => boolean = (_x: number) => true;
  protected filterFuncMeta: (x: number) => boolean = (_x: number) => true;
  protected averageFilter: {
    transcriptomics: filterValues;
    proteomics: filterValues;
    metabolomics: filterValues;
  } = {
    transcriptomics: {
      limits: {
        min: 0,
        max: 0,
      },
      value: {
        min: 0,
        max: 0,
      },
      filterActive: false,
      inside: false,
      disable: true,
    },
    proteomics: {
      limits: {
        min: 0,
        max: 0,
      },
      value: {
        min: 0,
        max: 0,
      },
      filterActive: false,
      inside: false,
      disable: true,
    },
    metabolomics: {
      limits: {
        min: 0,
        max: 0,
      },
      value: {
        min: 0,
        max: 0,
      },
      filterActive: false,
      inside: false,
      disable: true,
    },
  };

  constructor(containerID: string, graphData: graphData) {
    this.graph = UndirectedGraph.from(graphData);
    this.clusterAreas = graphData.clusterAreas;
    this.renderer = this.mainGraph(containerID);
    this.camera = this.renderer.getCamera();
    this.prevFrameZoom = this.camera.ratio;
    this.addModuleOverviewNodes();
    this.refreshCurrentPathway();
  }

  /**
   * Initializes the omics graph
   * @param {string} elemID
   * @param {graphData} graphData
   * @returns {Sigma} Sigma instance
   */
  mainGraph(elemID: string): Sigma {
    let clusterAreas:
      | [number[]]
      | [[number[]]]
      | undefined
      | { x: number; y: number }[][] = this.clusterAreas;
    if (typeof this.clusterAreas !== 'undefined') {
      console.log('YTPE', typeof this.clusterAreas[0][0]);
    }
    if (
      typeof this.clusterAreas !== 'undefined' &&
      typeof this.clusterAreas[0][0] != 'number'
    ) {
      const clusterHullsAdjustment = new ClusterHulls(this.graph, null, 60);
      const convexHulls = this.clusterAreas as [[number[]]];
      clusterAreas = clusterHullsAdjustment.adjust(convexHulls);
    }
    const additionalData = { clusterAreas: clusterAreas };

    const mainStore = useMainStore();
    // select target div and initialize graph
    const elem = document.getElementById(elemID) as HTMLElement;

    const inferredSettings = forceAtlas2.inferSettings(this.graph);
    // construct Sigma main instance
    const renderer = new Sigma(
      this.graph,
      elem,
      {
        nodeReducer: nodeReducer.bind(this),
        edgeReducer: edgeReducer.bind(this),
        zIndex: true, // enabling zIndex parameter
        renderLabels: true, // do not render labels w/o hover
        labelRenderedSizeThreshold: 20,
        edgeProgramClasses: {
          ...DEFAULT_SETTINGS.edgeProgramClasses,
          dashed: DashedEdgeProgram,
        },
        nodeProgramClasses: {
          ...DEFAULT_SETTINGS.nodeProgramClasses,
          image: getNodeImageProgram(),
        },
        hoverRenderer: drawHover,
        clusterVis: 'ConvexHull',
      },
      additionalData
    );
    console.log('Node Programs:');
    console.log(renderer.getSetting('nodeProgramClasses'));

    // To directly assign the positions to the nodes:
    const start = Date.now();
    // forceAtlas2.assign(this.graph, {
    //   iterations: 500,
    //   settings: inferredSettings,
    // });
    // noverlap.assign(this.graph);
    const duration = (Date.now() - start) / 1000;
    console.log(`layoutDuration: ${duration} S`);
    // const layout = new FA2Layout(graph, {settings: sensibleSettings });
    // layout.start();
    const rootSubgraph = subgraph(this.graph, function (_nodeID, attr) {
      return attr.isRoot;
    });
    const nodeXyExtent = nodeExtent(this.graph, ['x', 'y']);
    const width = nodeXyExtent['x'][1] - nodeXyExtent['x'][0];
    const center = (nodeXyExtent['x'][1] + nodeXyExtent['x'][0]) / 2;

    const rootPositions = circular(rootSubgraph, {
      scale: width,
      center: 1.0,
    });
    assignLayout(this.graph, rootPositions, { dimensions: ['x', 'y'] });

    this.graph.forEachNode((node, attributes) => {
      attributes.layoutX = attributes.x;
      attributes.layoutY = attributes.y;
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

    renderer.on('beforeRender', () => {
      zoomLod.bind(this)();
      filterElements.bind(this)();
    });

    renderer.on('leaveNode', ({ node }) => {
      console.log('Leaving:', node);

      this.highlighedNodesHover.clear();
      this.highlighedEdgesHover.clear();
      this.highlightedCenterHover = '';
      renderer.refresh();
    });

    renderer.on('clickNode', ({ node, event }) => {
      console.log('clicking Node: ', node);
      console.log('clicking event', event);
      if (event.original.ctrlKey) {
        mainStore.selectPathwayCompare([node]);
      } else if (event.original.altKey) {
        if (this.shortestPathClick.length === 2) this.shortestPathClick.pop();
        this.shortestPathClick.push(node);
        if (this.shortestPathClick.length === 2) {
          this.shortestPathNodes = bidirectional(
            this.graph,
            this.shortestPathClick[0],
            this.shortestPathClick[1]
          ) as string[];
          if (this.shortestPathNodes?.length > 0) {
            this.shortestPathEdges = edgePathFromNodePath(
              this.graph,
              this.shortestPathNodes as string[]
            );
            console.log('shortest Path edges', this.shortestPathEdges);
            mainStore.selectPathwayCompare(this.shortestPathNodes);
          } else {
            this.shortestPathClick = [];
          }
        }
      } else {
        this.shortestPathClick = [];
        this.shortestPathNodes = [];
        this.shortestPathEdges = [];
        this.highlighedEdgesClick.clear();
        this.highlighedNodesClick.clear();
        this.highlighedNodesClick = new Set(this.graph.neighbors(node));
        this.highlighedEdgesClick = new Set(this.graph.edges(node));
        mainStore.focusPathwayViaOverview(node);
      }
    });

    return renderer;
  }
  getModuleNodeIds() {
    const moduleNodeMapping: {
      [key: string]: { ids: string[]; pos: number[][] };
    } = {};
    this.graph.forEachNode((node, attr) => {
      if (!attr.isRoot) {
        // short circuit eval. to generate the corresponding entry
        !(attr.modNum in moduleNodeMapping) &&
          (moduleNodeMapping[attr.modNum] = { ids: [], pos: [] });
        moduleNodeMapping[attr.modNum].ids.push(attr.id);
        moduleNodeMapping[attr.modNum].pos.push([attr.x, attr.y]);
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
      const xPos = _.mean(moduleNodeMapping[key].pos.map((elem) => elem[0]));
      const yPos = _.mean(moduleNodeMapping[key].pos.map((elem) => elem[1]));
      const moduleNode: baseNodeAttr = {
        name: key,
        id: key,
        x: xPos,
        y: yPos,
        layoutX: xPos,
        layoutY: yPos,
        //x: _.mean(moduleNodeMapping[key].pos.map((elem) => elem[0])),
        //y: _.mean(moduleNodeMapping[key].pos.map((elem) => elem[1])),
        modNum: parseInt(key),
        isRoot: false,
        zIndex: 1,
        color: 'rgb(255,124,78)',
        size: 20,
        nodeType: 'moduleNode',
        nonHoverSize: 20,
        fixed: false,
        type: 'image',
        label: `Module: ${key}`,
        image: glyphs[key],
        imageLowRes: glyphs[key],
        imageHighRes: glyphs[key],
        imageLowZoom: glyphs[key],
        hidden: true,
      };

      this.graph.addNode(key, moduleNode);
    }
  }

  public resetZoom = resetZoom;
  public setAverageFilter = setAverageFilter;
  /**
   * Refresehes sets current pathway to the versionen selected in the store
   */
  public refreshCurrentPathway() {
    const mainStore = useMainStore();
    this.currentPathway = mainStore.pathwayDropdown.value;
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
