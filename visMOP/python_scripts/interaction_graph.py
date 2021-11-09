import networkx as nx
import gzip
from fa2 import ForceAtlas2

import matplotlib.pyplot as plt
import timeit
class StringGraph:
    """ class representing the string database"""

    def __init__(self, file_path):
        self.db_path = file_path
        self.complete_graph = None 
        self.filtered_graph = None
        self.ego_graphs = {}
       
        #todo read compressed file
        with gzip.open(file_path, "rt") as f:
            lines = []
            for line in f:
                if(line[0] != 'p'):
                    splitline = line.split(" ")
                    if int(splitline[2]) > 400:
                        lines.append(line)
            print(len(lines))
            self.complete_graph = nx.parse_edgelist(lines, create_using=nx.Graph,comments="protein1", data=(("weight", int),))
        self.current_confidence = 900
        self.filter_by_confidence(900)
        print("completeGraph",nx.info(self.complete_graph))

    def filter_by_confidence(self, weight_threshold):
        self.current_confidence = weight_threshold
        copy_graph = self.complete_graph.copy()
        edges_to_remove = [(source,target) for source, target, weight in copy_graph.edges(data="weight") if weight < weight_threshold]
        copy_graph.remove_edges_from(edges_to_remove)
        self.filtered_graph = copy_graph
    # todo:  "multiego graph"-> two or more ego graphs and their union compose --> networkx compose()
    # shortest path
    def query_ego_graph(self, node, radius):
        #need to filter by weight before computing ego graph
        
        ego_graph = nx.ego_graph(self.filtered_graph, node, undirected=False , radius=radius)
        nx.set_node_attributes(ego_graph, {node : '#ff0000'}, 'color' )
        nx.set_node_attributes(ego_graph, {node : 5}, 'size' )
        edges_to_update = {(u[0],u[1]): "solid" for u in ego_graph.edges if (u[0] == node or u[1] == node)}
        print("edge to update", edges_to_update)
        nx.set_edge_attributes(ego_graph, edges_to_update, 'edgeType')

        #nx.draw(ego_graph); plt.savefig("test.png")
        print("egoGraph: {} with CenterNode: {}".format(nx.info(ego_graph), node))
        #print(list(ego_graph.edges(data=True))[0])
        self.ego_graphs[node] = ego_graph

    def clear_ego_graphs(self):
        self.ego_graphs = {}

    def get_merged_egoGraph(self):
        composed_graph = nx.compose_all(list(self.ego_graphs.values()))
        return nx.node_link_data(composed_graph, attrs=dict(source='source', target='target', name='key', key='entryKey', link='links'))

    def print_info(self):
        print("completeGraph",nx.info(self.complete_graph))
        print("FilterGraph: ",nx.info(self.filtered_graph))
        with open('out.txt', 'w') as f:
            print('FilteredVerbatim:', list(self.filtered_graph.edges(data="weight")) , file=f)