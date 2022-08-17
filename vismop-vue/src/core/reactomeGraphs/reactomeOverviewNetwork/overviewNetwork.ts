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
import { bidirectional, edgePathFromNodePath } from 'graphology-shortest-path';
import { filterValues } from '../../generalTypes';
import { nodeReducer, edgeReducer } from './reducerFunctions';
import { resetZoom, zoomLod } from './camera';
import { filterElements, setAverageFilter, setRootFilter } from './filter';
import subgraph from 'graphology-operators/subgraph';
import { assignLayout, LayoutMapping } from 'graphology-layout/utils';
import { nodeExtent } from 'graphology-metrics/graph/extent';
import { generateGlyphs } from '@/core/overviewGlyphs/moduleGlyphGenerator';
import orderedCircularLayout from '../orderedCircularLayout';
import { overviewColors } from '@/core/colors';
import _ from 'lodash';

export default class overviewGraph {
  // constants
  static readonly DEFAULT_SIZE = 8;
  static readonly ROOT_DEFAULT_SIZE = 20;
  static readonly MODULE_DEFAULT_SIZE = 20;
  static readonly FOCUS_NODE_SIZE = 15;

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
  protected clusterData;
  protected lodRatio = 1;
  protected lastClickedClusterNode = -1;
  protected additionalData!: additionalData;
  protected cancelCurrentAnimation: (() => void) | null = null;

  // filter
  protected filtersChanged = false;
  protected filterFuncRoot: (x: string) => boolean = (_x: string) => true;
  protected filterFuncTrans: (x: number) => boolean = (_x: number) => true;
  protected filterFuncProt: (x: number) => boolean = (_x: number) => true;
  protected filterFuncMeta: (x: number) => boolean = (_x: number) => true;
  protected filterFuncSumRegulatedRelative: (x: number) => boolean = (
    _x: number
  ) => true;
  protected filterFuncSumRegulatedAbsolute: (x: number) => boolean = (
    _x: number
  ) => true;

  protected regulatedFilter: {
    relative: filterValues;
    absolute: filterValues;
  } = {
    relative: {
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
    absolute: {
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

  constructor(containerID: string, graphData: overviewGraphData) {
    this.graph = UndirectedGraph.from(graphData);
    this.clusterData = graphData.clusterData;
    this.renderer = this.mainGraph(containerID);
    this.camera = this.renderer.getCamera();
    this.prevFrameZoom = this.camera.ratio;
    this.addModuleOverviewNodes();
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
    const rootSubgraph = subgraph(this.graph, function (_nodeID, attr) {
      return attr.isRoot;
    });
    const nodeXyExtent = nodeExtent(this.graph, ['x', 'y']);
    const width = nodeXyExtent['x'][1] - nodeXyExtent['x'][0];
    // const center = (nodeXyExtent['x'][1] + nodeXyExtent['x'][0]) / 2;

    const rootPositions = orderedCircularLayout(rootSubgraph, {
      scale: width,
      center: 1.0,
    }) as LayoutMapping<{ [dimension: string]: number }>;
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

    renderer.on('leaveNode', () => {
      this.highlighedNodesHover.clear();
      this.highlighedEdgesHover.clear();
      this.highlightedCenterHover = '';
      renderer.refresh();
    });

    renderer.on('clickNode', ({ node, event }) => {
      console.log('clicking Node: ', node);
      console.log('clicking event', event);

      if (this.graph.getNodeAttribute(node, 'nodeType') != 'moduleNode') {
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
          const nodeLabel = this.graph.getNodeAttribute(node, 'label');
          mainStore.focusPathwayViaOverview({ nodeID: node, label: nodeLabel });
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
            attributes.size = overviewGraph.FOCUS_NODE_SIZE;
            attributes.nonHoverSize = overviewGraph.FOCUS_NODE_SIZE;
          } else if (!defocus && !attributes.isRoot) {
            attributes.x = 0;
            attributes.y = 0;
            if (attributes.id != node) {
              attributes.moduleHidden = true;
            } else {
              attributes.moduleFixed = true;
              attributes.zoomHidden = false;
            }
          } else {
            attributes.x = attributes.layoutX;
            attributes.y = attributes.layoutY;
            attributes.moduleFixed = false;
            attributes.moduleHidden = false;
            attributes.size = overviewGraph.DEFAULT_SIZE;
            attributes.nonHoverSize = overviewGraph.DEFAULT_SIZE;
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
      const xPos = _.mean(moduleNodeMapping[key].pos.map((elem) => elem[0]));
      const yPos = _.mean(moduleNodeMapping[key].pos.map((elem) => elem[1]));
      const moduleNode: overviewNodeAttr = {
        name: key,
        id: key,
        x: xPos,
        y: yPos,
        layoutX: xPos,
        layoutY: yPos,
        xOnClusterFocus: _.mean(
          moduleNodeMapping[key].posOnClusterFocus.map((elem) => elem[0])
        ),
        yOnClusterFocus: _.mean(
          moduleNodeMapping[key].posOnClusterFocus.map((elem) => elem[1])
        ),
        //x: _.mean(moduleNodeMapping[key].pos.map((elem) => elem[0])),
        //y: _.mean(moduleNodeMapping[key].pos.map((elem) => elem[1])),
        modNum: parseInt(key),
        isRoot: false,
        zIndex: 1,
        color: overviewColors.modules,
        size: overviewGraph.MODULE_DEFAULT_SIZE,
        nodeType: 'moduleNode',
        nonHoverSize: overviewGraph.MODULE_DEFAULT_SIZE,
        fixed: false,
        up: { x: xPos, y: yPos, gamma: 0 },
        type: 'image',
        label: `Cluster: ${key}`,
        image: glyphs[key],
        imageLowRes: glyphs[key],
        imageHighRes: glyphs[key],
        imageLowZoom: glyphs[key],
        hidden: this.camera.ratio >= this.lodRatio ? true : false,
        filterHidden: false,
        zoomHidden: this.camera.ratio >= this.lodRatio ? true : false,
        moduleHidden: false,
        moduleFixed: false,
      };
      this.graph.addNode(key, moduleNode);
    }
  }

  public resetZoom = resetZoom;
  public setAverageFilter = setAverageFilter;
  public setRootFilter = setRootFilter;
  /**
   * Refresehes sets current pathway to the version selected in the store
   */
  public refreshCurrentPathway() {
    const mainStore = useMainStore();
    this.currentPathway = mainStore.pathwayDropdown.value;
    this.shortestPathClick = [];
    this.shortestPathNodes = [];
    this.shortestPathEdges = [];
    this.highlighedEdgesClick.clear();
    this.highlighedNodesClick.clear();
    if (this.currentPathway) {
      this.highlighedNodesClick = new Set(
        this.graph.neighbors(this.currentPathway)
      );
      this.highlighedEdgesClick = new Set(
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
