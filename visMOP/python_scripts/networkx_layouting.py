import networkx as nx
from fa2 import ForceAtlas2
import time

def relayout(graph, init_pos):
    forceatlas2 = ForceAtlas2()
    pos = forceatlas2.forceatlas2_networkx_layout(graph, pos=init_pos,iterations=250, edgeWeightInfluence=1)
    return pos

def get_networkx_with_edge_weights(node_dict, pathway_info_dict, stringGraph):
    startTime = time.time()
    G = nx.Graph(node_dict)
    for u,v,d in G.edges(data=True):
        d['weight'] = calculate_edge_weight(pathway_info_dict[u],pathway_info_dict[v], stringGraph) 
    endTime = time.time()
    print("calculate edge weigts took {:.3f} s".format((endTime-startTime)))
    return G
    
#'prot_in_pathway_StringIds','all_brite_ids', 'KO_level_1', 'KO_other_level', 'lowest_level', 'other_ontologys'
def calculate_edge_weight(pathway1, pathway2, stringGraph):
    proteins_p1 = pathway1['prot_in_pathway_StringIds']
    proteins_p2 = pathway2['prot_in_pathway_StringIds']
    total_score = 1
    
    if len(proteins_p1) > 0:
        interactingProt_prot1 = {}
        for prot in proteins_p1:
            interactingProt_prot1.update({edgeProts[1]:edgeProts[2]['weight'] for edgeProts in stringGraph.filtered_graph.edges(prot, data=True)})
        interactingProt_prot2 = list(set(interactingProt_prot1.keys()) & set(proteins_p2))
        if len(interactingProt_prot2) > 0:
            all_interaction_scores = [interactingProt_prot1.get(key) for key in interactingProt_prot2]
            print(sum(all_interaction_scores))
            total_score = sum(all_interaction_scores) 
    return total_score

def force_dir_layout(graph):
    forceatlas2 = ForceAtlas2(edgeWeightInfluence=1.0)
    pos = forceatlas2.forceatlas2_networkx_layout(graph, pos=None, iterations=250)
    pos_out = {k:[v[0], v[1]] for k, v in pos.items()}
    return pos_out

def get_spring_layout_pos(node_dict, init_scale= 20000):
    """ calculates spring layout from NetworkX as a initials starting point for live-layouting
    
    Args:
        node_dict: dictionary containing nodes (their entries indicating edges)
        init_scale: scale to apply to the positions

    Returns:
        pos: dictionary of positions for each node

    """
    time1 = time.time()
    G = nx.Graph(node_dict)
    print("Graph has {} Nodes and {} Edges (Bidirectional Edges counted once)".format(G.number_of_nodes(), G.number_of_edges()))
    time2 = time.time()
    print("NX Graphparsing took {:.3f} s".format((time2-time1)))
    #pos = nx.spring_layout(G, weight=None, scale=init_scale)
    forceatlas2 = ForceAtlas2()
    pos = forceatlas2.forceatlas2_networkx_layout(G, pos=None,iterations=250)
    time3 = time.time()
    print("Spring Layouting took {:.3f} s".format((time3-time2)))
    # pos_x = {}
    # pos_y = {}
    #for key, value in pos.items():
    #    G.nodes[key].update({'viz':{'position':{'x' : value[0], 'y' : value[1]}}})

    #nx.set_node_attributes(G, pos_x, 'X')
    #nx.set_node_attributes(G, pos_y, 'Y')
    ##nx.readwrite.gexf.write_gexf(G, "gexf_test.gexf")
    x_vals = [val[0] for key, val in pos.items()]
    y_vals = [val[1] for key, val in pos.items()]
    min_x = min(x_vals)
    max_x = max(x_vals)
    min_y = min(y_vals)
    max_y = max(y_vals)
    divisor_x = max_x + min_x
    divisor_y = max_y + min_y

    pos_out = {k:[v[0], v[1]] for k, v in pos.items()}
    return pos_out

def add_initial_positions(positions,nodes):
    #TODO seems like it works inplace
    """ Adds positions calculated with networkX to nodes

    Args:
        postions: dict of positions as calculated by "get_spring_layout_pos()"
        nodes: dict of nodes 
    Return:
        nodes: dict of nodes, initial positions added

    """

    for k, v in positions.items():

        nodes[k]["initialPosX"] = v[0]
        nodes[k]["initialPosY"] = v[1]


    return nodes
