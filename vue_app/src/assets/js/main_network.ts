import {MultiGraph} from "graphology";
import Graph from "graphology";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma"
import { graphData, nodeAttr } from './graphTypes';
import CustomNodeProgram from "./custom-nodes/custom-node-program";
import arrowProgram from "sigma/rendering/webgl/programs/edge.arrow"
import { Attributes, EdgeKey, NodeKey } from "graphology-types";
import drawHover from "./customHoverRenderer";
import { animateNodes } from "sigma/utils/animate";
import { PlainObject } from "sigma/types";

export function mainGraph(elemID: string, data: graphData): Sigma {
    console.log(data)
    const elem = document.getElementById(elemID) as HTMLElement;
    const graph = MultiGraph.from(data)
    console.log("NODES",graph.nodes())
    const inferredSettings = forceAtlas2.inferSettings(graph);

    //from events example:
    let highlighedNodes = new Set();
    let highlighedEdges = new Set();
    
    const nodeReducer = (node: NodeKey, data: Attributes) => {
      if (highlighedNodes.has(node)) return { ...data, color: "#f00", zIndex: 1 };
    
      return data;
    };
    
    const edgeReducer = (edge: EdgeKey, data: Attributes) => {
      if (highlighedEdges.has(edge)) return { ...data, color: "#f00", zIndex: 1 };
    
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
        edgeProgramClasses:{},
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
    panZoomToTarget(renderer, renderer.getNodeDisplayData(nodeKey) as { x: number; y: number })
}

function panZoomToTarget(renderer: Sigma, target: {x: number; y:number}){
    renderer.getCamera().animate({...target, ratio:0.05}, {
        easing: "linear",
        duration: 500,
      });
}

export function layoutToPathway(renderer: Sigma, pathway: string, nodeIDs: string[]){
    const graph = renderer.getGraph()
    const inferredSettings = forceAtlas2.inferSettings(graph);

    const center_pos = get_pathway_center_pos(graph, nodeIDs)
    const center_x = center_pos["x"]
    const center_y = center_pos["y"]
    //panZoomToTarget(renderer, {x: center_x, y: center_y})
    const newPosisitons: PlainObject<PlainObject<number>> = {};
    graph.forEachNode((nodeID,attributes)=>{
        if(nodeIDs.includes(nodeID)){
            attributes.fixed =  true
            //attributes.x= center_x + (attributes.origPos[pathway][0] - 0.5) * 250
            //attributes.y= center_y + (attributes.origPos[pathway][1] - 0.5) * 250
            attributes.color = attributes.nonFadeColor
            attributes.secondaryColor = attributes.nonFadeColorSecondary
            attributes.z = 2
            newPosisitons[nodeID] = {
                x: center_x + (attributes.origPos[pathway][0] - 0.5) * 250,
                y: center_y + (attributes.origPos[pathway][1] - 0.5) * 250
            }
        }
        else{
            attributes.fixed =  false,
            attributes.color = attributes.fadeColor
            attributes.secondaryColor = attributes.fadeColorSecondary
            attributes.z = 1
        }
    })
    graph.forEachEdge((edge, attributes, source, target) => {
        if(!(nodeIDs.includes(source))){
            attributes.color = attributes.fadeColor
            attributes.z = 0

        }
        else{
            attributes.color = attributes.nonFadeColor
            attributes.z = 2

        }
    })    
    
    animateNodes(graph, newPosisitons, { duration: 2000 },()=>{
        //TODO not yet handling if other animation/layouting is in progess
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
        attributes.color = attributes.nonFadeColor
        attributes.secondaryColor = attributes.nonFadeColorSecondary
        attributes.z = 1

    })
    graph.forEachEdge((edge, attributes) => {
            attributes.color = attributes.nonFadeColor
            attributes.z = 2
    })
    const fa2Layout  =  new FA2Layout(graph, {settings:inferredSettings})
        //TODO not yet handling if other animation/layouting is in progess
        fa2Layout.start()
        setTimeout(() => {
            fa2Layout.kill()
        }, 5000);   
}

function get_pathway_center_pos(graph: Graph, nodeIDs: string[]){
    let sum_x = 0
    let sum_y = 0
    let num_entries = 0

    nodeIDs.forEach(nodeID => {
        const nodeAttrib = graph.getNodeAttributes(nodeID)
        num_entries +=1
        sum_x += nodeAttrib["x"]
        sum_y += nodeAttrib["y"]
    });

   
    return {x: sum_x/num_entries, y: sum_y/num_entries }
  }