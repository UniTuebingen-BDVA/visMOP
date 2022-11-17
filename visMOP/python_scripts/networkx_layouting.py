import networkx as nx
import time


def generate_networkx_dict(global_nodes):
    """generates a networkX-style network dictionary from a dict of nodes

    Args:
        global_nodes: dictionary of nodes

    Returns:
        out_dict: networkX-style network dictionary

    """
    adjacency_dict = {}
    attribute_dict = {}

    for key, entry in global_nodes.items():
        adj_node = {}
        attr_node = {"size": 20}
        for out_edge in entry["outgoingEdges"]:
            adj_node[out_edge["target"]] = {}

        try:
            for test_edge in entry["outgoingOnceRemoved"]:
                adj_node[test_edge["target"]] = {}
        except:
            pass
        attribute_dict[key] = attr_node
        adjacency_dict[key] = adj_node

    return adjacency_dict, attribute_dict

def get_spring_layout_pos(node_dict, init_scale=20000):
    """calculates spring layout from NetworkX as a initials starting point for live-layouting

    Args:
        node_dict: dictionary containing nodes (their entries indicating edges)
        init_scale: scale to apply to the positions

    Returns:
        pos: dictionary of positions for each node

    """
    time1 = time.time()
    G = nx.Graph(node_dict)
    print(
        "Graph has {} Nodes and {} Edges (Bidirectional Edges counted once)".format(
            G.number_of_nodes(), G.number_of_edges()
        )
    )
    time2 = time.time()
    print("NX Graphparsing took {:.3f} s".format((time2 - time1)))
    forceatlas2 = ForceAtlas2()
    pos = forceatlas2.forceatlas2_networkx_layout(G, pos=None, iterations=1)
    time3 = time.time()
    print("Spring Layouting took {:.3f} s".format((time3 - time2)))

    x_vals = [val[0] for key, val in pos.items()]
    y_vals = [val[1] for key, val in pos.items()]
    min_x = min(x_vals)
    max_x = max(x_vals)
    min_y = min(y_vals)
    max_y = max(y_vals)
    divisor_x = max_x + min_x
    divisor_y = max_y + min_y

    pos_out = {
        k: ((v[0] - min_x) / divisor_x, (v[1] - min_y) / divisor_y)
        for k, v in pos.items()
    }
    return pos_out


def add_initial_positions(positions, nodes):
    # TODO seems like it works inplace
    """Adds positions calculated with networkX to nodes

    Args:
        postions: dict of positions as calculated by "get_spring_layout_pos()"
        nodes: dict of nodes
    Return:
        nodes: dict of nodes, initial positions added

    """

    for k, v in positions.items():

        nodes[k]["initialPosX"] = v[0]
        nodes[k]["initialPosY"] = v[1]
        nodes[k]["moduleNum"] = v[2]

    return nodes
