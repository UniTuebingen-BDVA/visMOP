import {MultiGraph} from "graphology";
import Graph from "graphology";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma"
import { graphData, nodeAttr } from './graphTypes';
import CustomNodeProgram from "./custom-nodes/custom-node-program";
import CustomEdgeProgram from "./custom-nodes/colorfade-edge-program"
import arrowProgram from "sigma/rendering/webgl/programs/edge.arrow"
import { Attributes, EdgeKey, NodeKey } from "graphology-types";
import drawHover from "./customHoverRenderer";
import { animateNodes } from "sigma/utils/animate";
import { PlainObject } from "sigma/types";

export function mainGraph(elemID: string, graphData: graphData): Sigma {
    console.log(graphData)
    const elem = document.getElementById(elemID) as HTMLElement;
    const graph = MultiGraph.from(graphData)
    console.log("NODES",graph.nodes())
    
    const inferredSettings = forceAtlas2.inferSettings(graph);

    //from events example:
    let highlighedNodes = new Set();
    let highlighedEdges = new Set();
    
    const nodeReducer = (node: NodeKey, data: Attributes) => {
      if (highlighedNodes.has(node)){
        return (data.type == "splitSquares")
            ? { ...data, outlineColor: "rgba(255,0,0,1.0)", zIndex: 1 }
            : { ...data, color: "rgba(255,0,0,1.0)", zIndex: 1 }
        
      }
    
      return data;
    };
    
    const edgeReducer = (edge: EdgeKey, data: Attributes) => {
      if (highlighedEdges.has(edge)) return { ...data, sourceColor: "rgba(255,0,0,1.0)", targetColor: "rgba(255,0,0,1.0)",zIndex: 1 };
    
      return data;
    };
    //end example

    const renderer = new Sigma(graph, elem,{
        nodeReducer: nodeReducer,
        edgeReducer: edgeReducer,
        zIndex: true,
        renderLabels: false,
        nodeProgramClasses:{
            splitSquares: CustomNodeProgram
        },
        edgeProgramClasses:{
            fadeColor: CustomEdgeProgram
        },
        hoverRenderer: drawHover,
    });
    console.log(`Node Programs:`)
    console.log(renderer.getSetting("nodeProgramClasses"))

    // To directly assign the positions to the nodes:
    const start = Date.now()
    forceAtlas2.assign(graph,{iterations:500 , settings: inferredSettings});
    const duration = (Date.now() - start)/1000
    console.log(`layoutDuration: ${duration} S`)
    //const layout = new FA2Layout(graph, {settings: sensibleSettings });
    //layout.start();
    
    //TODO: from events example:
    renderer.on("enterNode", ({ node }) => {
        console.log("Entering: ", node);
        highlighedNodes = new Set(graph.neighbors(node));
        highlighedNodes.add(node);
      
        highlighedEdges = new Set(graph.edges(node));
      
        renderer.refresh();
      });
      
      renderer.on("leaveNode", ({ node }) => {
        console.log("Leaving:", node);
      
        highlighedNodes.clear();
        highlighedEdges.clear();
      
        renderer.refresh();
      });



    return renderer
}

export function panToNode(renderer: Sigma, nodeKey: string){
    console.log("pantestNode",{...renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }, ratio: 0.05})
    panZoomToTarget(renderer, {...renderer.getNodeDisplayData(nodeKey) as { x: number; y: number }, ratio: 0.05})
}

function panZoomToTarget(renderer: Sigma, target: {x: number; y:number, ratio:number}){
    console.log("pantest",target)
    renderer.getCamera().animate(target, {
        easing: "linear",
        duration: 1000,
      });
}

export function layoutToPathway(renderer: Sigma, pathway: string, nodeIDs: string[]){
    const fadeGray = "rgba(30,30,30,0.2)"
    const graph = renderer.getGraph()
    const inferredSettings = forceAtlas2.inferSettings(graph);
    
    const cameraCenterPos = get_pathway_center_pos(renderer, graph, nodeIDs, "camera")
    const graphCenterPos = renderer.viewportToGraph(get_pathway_center_pos(renderer, graph, nodeIDs, "graph"))
    const center_x = graphCenterPos["x"]
    const center_y = graphCenterPos["y"]
    const layoutScaling = 250
    const newPosisitons: PlainObject<PlainObject<number>> = {};
    graph.forEachNode((nodeID,attributes )=>{
        if(nodeIDs.includes(nodeID)){
            attributes.fixed =  true
            //attributes.x= center_x + (attributes.origPos[pathway][0] - 0.5) * 250
            //attributes.y= center_y + (attributes.origPos[pathway][1] - 0.5) * 250
            attributes.color = attributes.nonFadeColor as string
            attributes.secondaryColor = attributes.nonFadeColorSecondary as string
            attributes.outlineColor = "rgba(30,30,30,1.0)"
            attributes.z = 2
            const origPos = attributes.origPos as {[key: string]: [number,number]};
            newPosisitons[nodeID] = {
                x: center_x + (origPos[pathway][0] - 0.5)*layoutScaling,
                y: center_y + (origPos[pathway][1] - 0.5)*layoutScaling
            }
        }
        else{
            attributes.fixed =  false,
            attributes.color = attributes.fadeColor as string
            attributes.secondaryColor = attributes.fadeColorSecondary as string
            attributes.outlineColor = fadeGray as string
            attributes.z = 1
        }
    })
    graph.forEachEdge((edge, attributes, source, target) => {
        if(!(nodeIDs.includes(source) || nodeIDs.includes(target))){
            attributes.sourceColor = attributes.fadeColor as string
            attributes.targetColor = attributes.fadeColor as string
            attributes.z = 0

        }
        else if(!(nodeIDs.includes(source))){
            attributes.sourceColor = attributes.fadeColor as string
            attributes.z = 0
        }
        else if(!(nodeIDs.includes(target))){
            attributes.targetColor = attributes.fadeColor as string
            attributes.z = 0
        }
        else{
            attributes.sourceColor = attributes.nonFadeColor as string
            attributes.targetColor = attributes.nonFadeColor as string

            attributes.z = 2

        }
    })    
    
    animateNodes(graph, newPosisitons, { duration: 2000 },()=>{
        //TODO not yet handling if other animation/layouting is in progess
        panZoomToTarget(renderer,{...cameraCenterPos,"ratio": 0.2})
        const fa2Layout  =  new FA2Layout(graph, {settings:inferredSettings})
        fa2Layout.start()
        setTimeout(() => {
            fa2Layout.kill()
        }, 5000);
    })
    
    //forceAtlas2.assign(graph,{iterations:40 , settings: inferredSettings});
}

export function relaxLayout(renderer: Sigma){
    const graph = renderer.getGraph()
    const inferredSettings = forceAtlas2.inferSettings(graph);

    graph.forEachNode((nodeID,attributes)=>{
        attributes.fixed =  false,
        attributes.color = attributes.nonFadeColor as string
        attributes.secondaryColor = attributes.nonFadeColorSecondary as string
        attributes.z = 1

    })
    graph.forEachEdge((edge, attributes) => {
            attributes.sourceColor = attributes.nonFadeColor as string
            attributes.targetColor = attributes.nonFadeColor as string
            attributes.z = 2
    })
    const fa2Layout  =  new FA2Layout(graph, {settings:inferredSettings})
        //TODO not yet handling if other animation/layouting is in progess
        fa2Layout.start()
        setTimeout(() => {
            fa2Layout.kill()
        }, 5000);   
}
/**
 * 
 * @param renderer 
 * @param graph 
 * @param nodeIDs 
 * @param type camera needs display data instead of graph data (im not 100% sure why....)
 * @returns 
 */
function get_pathway_center_pos(renderer: Sigma, graph: Graph, nodeIDs: string[], type: "graph"|"camera"){
    let sum_x = 0
    let sum_y = 0
    let num_entries = 0

    nodeIDs.forEach(nodeID => {
        let nodeAttrib
        if (type === "graph")
        {nodeAttrib = renderer.graphToViewport(Object.assign({}, graph.getNodeAttributes(nodeID)) as { x: number; y: number })}
        else{
        nodeAttrib = Object.assign({}, renderer.getNodeDisplayData(nodeID)) as { x: number; y: number }
        }
        num_entries +=1
        sum_x += nodeAttrib["x"]
        sum_y += nodeAttrib["y"]
    });

   
    return {x: sum_x/num_entries, y: sum_y/num_entries }
  }