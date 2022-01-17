import networkx as nx
from fa2 import ForceAtlas2
import time

def relayout(graph, init_pos):
    forceatlas2 = ForceAtlas2()
    pos = forceatlas2.forceatlas2_networkx_layout(graph, pos=init_pos, iterations=250)
    return pos

def get_networkx_with_edge_weights_all_nodes_connected(pathway_info_dict, stringGraph):
    stringGraph.filter_by_confidence(900)
    startTime = time.time()
    
    nodes_done = []
    node_names = []
    brite_scores = []
    interaction_scores = []
    for nodeA in pathway_info_dict.keys():
        nodes_done.append(nodeA) 
        for nodeB in pathway_info_dict.keys():
            if nodeB not in nodes_done:
                brite_score, interaction_score = calculate_edge_weight(pathway_info_dict[nodeA],pathway_info_dict[nodeB], stringGraph)
                brite_scores.append(brite_score)
                interaction_scores.append(interaction_score)
                node_names.append((nodeA,nodeB)) 

    min_val_brite, min_val_interaction = min(brite_scores), min(interaction_scores)
    max_val_brite, max_val_interaction= max(brite_scores), max(interaction_scores)
    total_scores = [normalize_in_range(brite_score, min_val_brite, max_val_brite,[0,1]) + normalize_in_range(interaction_score,min_val_interaction, max_val_interaction,[0,1]) for brite_score, interaction_score in zip(brite_scores, interaction_scores)]
      
    min_val_total = min(total_scores)
    max_val_total = max(total_scores)
    G = nx.Graph()
    # G.add_nodes_from(list(pathway_info_dict.keys()))
    for nodes, w in zip(node_names, total_scores):
       norm_w = normalize_in_range(w, min_val_total, max_val_total, [0,10])
       G.add_edge(nodes[0], nodes[1], weight=norm_w) 
    endTime = time.time()
    print("calculate edge weigts took {:.3f} s".format((endTime-startTime)))
    return G


def get_networkx_with_edge_weights(node_dict, pathway_info_dict, stringGraph):
    stringGraph.filter_by_confidence(900)
    startTime = time.time()
    G = nx.Graph(node_dict)
    brite_scores = []
    interaction_scores = []
    for u,v,d in G.edges(data=True):
        brite_score, interaction_score = calculate_edge_weight(pathway_info_dict[u],pathway_info_dict[v], stringGraph) 
        brite_scores.append(brite_score)
        interaction_scores.append(interaction_score)
    min_val_brite, min_val_interaction = min(brite_scores), min(interaction_scores)
    max_val_brite, max_val_interaction= max(brite_scores), max(interaction_scores)
    print(len(brite_scores), len(interaction_scores))
    # norm_brite_score = [normalize_in_range(interaction_score,min_val_interaction, max_val_interaction,[0,10]) for brite_score in brite_scores]
    total_scores = [normalize_in_range(brite_score, min_val_brite, max_val_brite,[0,1]) + normalize_in_range(interaction_score,min_val_interaction, max_val_interaction,[0,1]) for brite_score, interaction_score in zip(brite_scores, interaction_scores)]
    min_val_total = min(total_scores)
    max_val_total = max(total_scores)
    total_scores_norm = [normalize_in_range(total_score, min_val_total, max_val_total,[0,10]) for total_score in total_scores]
    for pos,(u,v,d) in enumerate(G.edges(data=True)):
        d['weight'] = total_scores_norm[pos]
    
    endTime = time.time()
    print("calculate edge weigts took {:.3f} s".format((endTime-startTime)))
    return G
def normalize_in_range(val, min_val, max_val, val_space):
    numerator = (val_space[1]-val_space[0]) * (val-min_val)
    devisor = max_val - min_val
    return numerator/devisor + val_space[0]  
# brite_hier_superheadings, brite_hier_subcategories, brite_hier_proteinIDs
def calculate_edge_weight(pathway1, pathway2, stringGraph):
    proteins_p1 = pathway1['StringIds']
    proteins_p2 = pathway2['StringIds']
    
    brite_score = 0
    for importance, brite_hier_level in enumerate(['brite_hier_superheadings', 'brite_hier_subcategories', 'brite_hier_proteinIDs']):
        if len(pathway1[brite_hier_level])>0 and len(pathway2[brite_hier_level])>0:
            val_ratio_path_1 = sorted([val/pathway1['numEntries'] for val in pathway1[brite_hier_level].values()])
            val_ratio_path_2 = sorted([val/pathway2['numEntries'] for val in pathway2[brite_hier_level].values()])
            for brite_hier_name, val in pathway1[brite_hier_level].items():
                if brite_hier_name in pathway2[brite_hier_level].keys():
                    brite_score+=1*(importance+1)
                    if val in val_ratio_path_2:
                        val_pos_p1 = val_ratio_path_1.index(val)
                        val_pos_p2 = val_ratio_path_2.index(val)
                        if val_pos_p1 == val_pos_p2 and val_pos_p1<4 and val_pos_p2<4:
                            brite_score+=2*(importance+1)
    interaction_score = 0
    if len(proteins_p1) > 0:
        interactingProt_prot1 = {}
        for prot in proteins_p1:
            interactingProt_prot1.update({edgeProts[1]:edgeProts[2]['weight'] for edgeProts in stringGraph.filtered_graph.edges(prot, data=True)})
        interactingProt_prot2 = list(set(interactingProt_prot1.keys()) & set(proteins_p2))
        if len(interactingProt_prot2) > 0:
            all_interaction_scores = [interactingProt_prot1.get(key) for key in interactingProt_prot2]
            interaction_score = sum(all_interaction_scores)

    return brite_score,interaction_score

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
