import networkx as nx
import gzip
from fa2 import ForceAtlas2

import matplotlib.pyplot as plt
import timeit
class StringGraph:
    """ class representing the string database"""

    def __init__(self, file_path):
        self.db_path = file_path
        self.completeGraph = None 
        self.filteredGraph = None
        self.egoGraphs = {}
       
        #todo read compressed file
        with gzip.open(file_path, "rt") as f:
            lines = []
            for line in f:
                if(line[0] != 'p'):
                    splitline = line.split(" ")
                    if int(splitline[2]) > 400:
                        lines.append(line)
            print(len(lines))
            self.completeGraph = nx.parse_edgelist(lines, create_using=nx.Graph,comments="protein1", data=(("weight", int),))
        self.current_confidence = 700
        self.filter_by_confidence(700)
        print("completeGraph",nx.info(self.completeGraph))

    def filter_by_confidence(self, weight_threshold):
        self.current_confidence = weight_threshold
        copy_graph = self.completeGraph.copy()
        edges_to_remove = [(source,target) for source, target, weight in copy_graph.edges(data="weight") if weight < weight_threshold]
        copy_graph.remove_edges_from(edges_to_remove)
        self.filteredGraph = copy_graph
    # todo:  "multiego graph"-> two or more ego graphs and their union compose --> networkx compose()
    # shortest path
    def query_ego_graph(self, node, radius):
        #need to filter by weight before computing ego graph
        
        ego_graph = nx.ego_graph(self.filteredGraph, node, undirected=False , radius=radius)
        nx.set_node_attributes(ego_graph, {node : '#ff0000'}, 'color' )
        #nx.draw(ego_graph); plt.savefig("test.png")
        print("egoGraph: {} with CenterNode: {}".format(nx.info(ego_graph), node))
        #print(list(ego_graph.edges(data=True))[0])
        self.egoGraphs[node] = ego_graph

    def get_merged_egoGraph(self):
        composed_graph = nx.compose_all(list(self.egoGraphs.values()))
        return nx.node_link_data(composed_graph, attrs=dict(source='source', target='target', name='key', key='entryKey', link='links'))

    def print_info(self):
        print("completeGraph",nx.info(self.completeGraph))
        print("FilterGraph: ",nx.info(self.filteredGraph))
        with open('out.txt', 'w') as f:
            print('FilteredVerbatim:', list(self.filteredGraph.edges(data="weight")) , file=f)