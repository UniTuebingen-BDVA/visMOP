import networkx as nx
from fa2 import ForceAtlas2
import time

def relayout(graph, init_pos):
    forceatlas2 = ForceAtlas2()
    pos = forceatlas2.forceatlas2_networkx_layout(graph, pos=init_pos,iterations=15)
    return pos

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
    pos = forceatlas2.forceatlas2_networkx_layout(G, pos=None,iterations=1)
    time3 = time.time()
    print("Spring Layouting took {:.3f} s".format((time3-time2)))
    pos_x = {}
    pos_y = {}
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
    divisor_x = abs(max_x) + abs(min_x)
    divisor_y = abs(max_y) + abs(min_y)

    pos_out = {k:((v[0] - min_x)/divisor_x,(v[1] - min_y)/divisor_y) for k, v in pos.items()}
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
