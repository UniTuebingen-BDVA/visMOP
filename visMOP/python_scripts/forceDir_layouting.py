from visMOP.python_scripts.deDal_layouting import normalize_in_range
import networkx as nx
from fa2 import ForceAtlas2

# import matplotlib.pyplot as plt
# import matplotlib
import time

# with all edges
def get_adjusted_force_dir_node_pos(
    G, mod_num, pathways_root_ids, total_num_nodes, l_max, extent
):
    # num_root_ids_per_pathway = [len(root_ids) for root_ids in pathways_root_ids]
    # min_num_root_ids_per_pathway, max_num_root_ids_per_pathway = (min(num_root_ids_per_pathway), max(num_root_ids_per_pathway))
    matplotlib.use("agg")
    G_with_weights = nx.Graph()
    nodes = list(G.nodes())
    size_dict = {key: {"size": l_max / 20} for key in nodes}
    num_nodes = len(nodes)
    node_ratio = num_nodes / total_num_nodes + 0.3
    add_for_medium_cluster = 2 if node_ratio < 0.4 else 0
    attractive_weight = (1 - node_ratio) * 10 + add_for_medium_cluster
    repulsive_force_par = node_ratio * 15
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            # num_similar_root = sum([1 if root_id_patway1 in pathways_root_ids[nodes[j]] else 0 for root_id_patway1 in pathways_root_ids[nodes[i]]])
            # num_similar_root_norm = (num_similar_root - min_num_root_ids_per_pathway) / (max_num_root_ids_per_pathway - min_num_root_ids_per_pathway) +1
            w = (
                attractive_weight
                if pathways_root_ids[nodes[i]] == pathways_root_ids[nodes[j]]
                else 1
            )
            G_with_weights.add_edge(nodes[i], nodes[j], weight=w)
    nx.set_node_attributes(G_with_weights, size_dict)
    pos, pos_out = get_pos_in_force_dir_layout(
        G_with_weights, mod_num, 2, repulsive_force_par, extent
    )
    # nx.draw(G, pos=pos)
    # plt.savefig("test2_" + str(mod_num) + ".png", dpi=300)
    # plt.close()
    return pos_out


def get_pos_in_force_dir_layout(
    graph, mod_num=0, ewi=1, repulsivForceScaler=2, extent=[]
):
    """
    forceatlas2 = ForceAtlas2(
        edgeWeightInfluence=ewi,
        scalingRatio=repulsivForceScaler,
        outboundAttractionDistribution=False,
        verbose=False,
    )
    pos = forceatlas2.forceatlas2_networkx_layout(graph, pos=None, iterations=2000)
    """
    centered_extents = []
    avg_x_extent = 0
    avg_y_extent = 0
    if len(extent) > 0:
        avg_x_extent = (extent[0] + extent[1]) / 2
        avg_y_extent = (extent[2] + extent[3]) / 2

        centered_extents = [
            extent[0] - avg_x_extent,
            extent[1] - avg_x_extent,
            extent[2] - avg_y_extent,
            extent[3] - avg_y_extent,
        ]

    pos = nx.forceatlas2_layout(
        graph,
        pos=None,
        n_iter=2000,
        edge_weight_influence=True,
        strong_gravity=False,
        adjust_sizes=True,
        extents=centered_extents,
    )
    pos_out = {
        k: [v[0] + avg_x_extent, v[1] + avg_y_extent, mod_num] for k, v in pos.items()
    }
    return pos, pos_out
