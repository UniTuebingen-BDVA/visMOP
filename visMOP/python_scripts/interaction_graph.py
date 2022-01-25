import networkx as nx
import gzip
from fa2 import ForceAtlas2

import timeit
class StringGraph:
    """ class representing the string database"""

    def __init__(self, file_path):
        self.db_path = file_path
        self.complete_graph = None 
        self.filtered_graph = None
        self.ego_graphs = {}
        self.name_dict = None
        #todo read compressed file
        with gzip.open(file_path, "rt") as f:
            lines = []
            for line in f:
                if(line[0] != 'p'):
                    splitline = line.split(" ")
                    if int(splitline[2]) > 400:
                        lines.append(line)
            self.complete_graph = nx.parse_edgelist(lines, create_using=nx.Graph,comments="protein1", data=(("weight", int),))
        self.current_confidence = 900
        self.filter_by_confidence(900)
        print("completeGraph",nx.info(self.complete_graph))
        print("completeGraph",nx.info(self.complete_graph))
        print(self.complete_graph.edges('10090.ENSMUSP00000137402', data=True))
        print({edgeProts[1]:edgeProts[2]['weight'] for edgeProts in self.complete_graph.edges('10090.ENSMUSP00000137402', data=True)})

    def set_string_name_dict(self, val):
        self.name_dict = val
    def filter_by_confidence(self, weight_threshold):
        self.current_confidence = weight_threshold
        copy_graph = self.complete_graph.copy()
        edges_to_remove = [(source,target) for source, target, weight in copy_graph.edges(data="weight") if weight < weight_threshold]
        copy_graph.remove_edges_from(edges_to_remove)
        self.filtered_graph = copy_graph
    # todo:  "multiego graph"-> two or more ego graphs and their union compose --> networkx compose()
    # shortest path
    def query_ego_graph(self, node, ego_index, radius):
        
        ego_graph = nx.ego_graph(self.filtered_graph, node, undirected=False , radius=radius)

        nodes_to_update = { node: self.name_dict[node] for node in ego_graph.nodes if node in self.name_dict}
        nx.set_node_attributes(ego_graph, nodes_to_update, 'labelName')
        nx.set_node_attributes(ego_graph, {node : '#ff0000'}, 'color' )
        nx.set_node_attributes(ego_graph, {node : 8}, 'size' )
        nx.set_node_attributes(ego_graph, {node : ego_index}, 'egoNode' )
        #edges_to_update = {(u[0],u[1]): "solid" for u in ego_graph.edges if (u[0] == node or u[1] == node)}
        edges_to_update = {(u[0],u[1]): ego_index for u in ego_graph.edges if (u[0] == node or u[1] == node)}

        #nx.set_edge_attributes(ego_graph, edges_to_update, 'edgeType')
        nx.set_edge_attributes(ego_graph, edges_to_update, 'egoEdge')
        ego_graph.graph["egoNodeID"] = node
        #nx.draw(ego_graph); plt.savefig("test.png")
        print("egoGraph: {} with CenterNode: {}".format(nx.info(ego_graph), node))
        #print(list(ego_graph.edges(data=True))[0])
        self.ego_graphs[node] = ego_graph

    def clear_ego_graphs(self):
        self.ego_graphs = {}

    def get_merged_egoGraph(self):
        composed_graph = nx.compose_all(list(self.ego_graphs.values()))
        """
        intersections = nx.intersection_all(list(self.ego_graphs.values()))
        intersection_node_dicts  = {k: 'rgba(30,200,30,1.0)' for k in intersections.nodes}
        intersection_edge_dicts  = {k: 'rgba(30,200,30,1.0)' for k in intersections.edges}
        nx.set_node_attributes(composed_graph, intersection_node_dicts, 'color' )
        nx.set_edge_attributes(composed_graph, intersection_edge_dicts, 'color')
        """
        egoID_identity = {egoID: idx for idx, egoID in enumerate(list(self.ego_graphs.keys()))}
        identity_egoID = {idx: egoID for idx, egoID in enumerate(list(self.ego_graphs.keys()))}

        composed_graph.graph["egoID_identity"] = egoID_identity
        composed_graph.graph["identity_egoID"] = identity_egoID
        composed_graph.graph["identities"] = list(range(len(list(self.ego_graphs.values()))))
        print("completeGraph", nx.info(composed_graph))
        intersections_node = self.calculate_intersections_nodes(composed_graph)
        intersections_edge = self.calculate_intersections_edges(composed_graph)
        shared_ego_edges = self.calculate_ego_ego_edges(composed_graph)
        nx.set_node_attributes(composed_graph, intersections_node,'identity')
        nx.set_edge_attributes(composed_graph, intersections_edge,'identity')
        nx.set_edge_attributes(composed_graph, shared_ego_edges,'egoEgoEdge')

        #print(composed_graph.nodes(data="identity"))
        #print(len(composed_graph.nodes(data="identity")))
        #print(len(composed_graph.nodes()))
        #print(composed_graph.edges(data="identity"))
        #print(len(composed_graph.edges(data="identity")))
        #print(len(composed_graph.edges()))
        #print(composed_graph.edges(data="egoEgoEdge"))

        return nx.node_link_data(composed_graph, attrs=dict(source='source', target='target', name='key', key='entryKey', link='links'))

    def calculate_intersections_nodes(self, graph):
        identity_per_node = {}
        graphs = self.ego_graphs.values()
        for node in graph.nodes:
            identity_this_node = []
            for i,graphElem in enumerate(graphs):
                if node in graphElem.nodes:
                    identity_this_node.append(i)
            identity_per_node[node] = ";".join(map(str,identity_this_node))

        return identity_per_node

    def calculate_intersections_edges(self, graph):
        identity_per_edge = {}
        graphs = self.ego_graphs.values()
        for edge in graph.edges:
            identity_this_edge = []
            for i,graph in enumerate(graphs):
                if edge in graph.edges:
                    identity_this_edge.append(i)
            identity_per_edge[edge] = ";".join(map(str,identity_this_edge))

        return identity_per_edge

    def calculate_ego_ego_edges(self, graph):
        # TODO not working yet
        ego_edges_color = {}
        egoIDs = graph.graph["egoID_identity"].keys()
        for edge in graph.edges:
            if((edge[0] in egoIDs) and (edge[1] in egoIDs)):
                #print("egoegoedge", edge)
                ego_edges_color[edge]= [graph.graph["egoID_identity"][edge[0]],graph.graph["egoID_identity"][edge[1]] ]
        #print("egoegoedgecolors", ego_edges_color)
        return ego_edges_color
    def print_info(self):
        print("completeGraph",nx.info(self.complete_graph))
        print("FilterGraph: ",nx.info(self.filtered_graph))
        with open('out.txt', 'w') as f:
            print('FilteredVerbatim:', list(self.filtered_graph.edges(data="weight")) , file=f)