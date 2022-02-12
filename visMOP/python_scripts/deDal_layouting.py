from networkx.algorithms.assortativity import neighbor_degree
from numpy.core.fromnumeric import mean
import networkx as nx
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import math
from scipy.sparse.linalg import eigs
import umap
import pandas as pd
import matplotlib.pyplot as plt


# substract row mean and column mean and add the global mean to each table entry
def double_centring(data_table):
    global_mean = mean(data_table.values)
    row_means = data_table.mean(axis=0) + global_mean
    col_means = data_table.mean(axis=1)

    data_table = data_table.sub(row_means, axis=1)
    data_table = data_table.sub(col_means, axis=0)

    return data_table

def NetworkSmoothing(graph, data_tabel, eigenvec_matrix):
    num_of_connected_components = nx.number_connected_components(graph)
    node_names = list(data_tabel.index)
    num_nodes_in_graph = len(graph.nodes)
    k = num_nodes_in_graph/2  # num_ofEigenvec_to_spanSubspan
    smoothingFactor = 1 - (k-(num_of_connected_components+2)) / \
        (num_nodes_in_graph-(num_of_connected_components+2))
    print('smootingFoctor', smoothingFactor)
    num_vars = int((num_of_connected_components + 2) + (smoothingFactor *
                                                        (num_nodes_in_graph-(num_of_connected_components + 2))*0.5))
    if num_vars > num_nodes_in_graph:
        num_vars = num_nodes_in_graph
    # if EVM not defined calculate it
    if eigenvec_matrix is None:
        # weight: edge data key used to provide each value in the matrix. If None, then each edge has weight 1.
        la_placian_matrix = nx.laplacian_matrix(
            graph, nodelist=node_names, weight=None).asfptype()
        _, eigenvec_matrix = eigs(
            la_placian_matrix.toarray(), k=len(data_tabel.index))
        eigenvec_matrix = eigenvec_matrix.transpose()
        print(eigenvec_matrix.shape)

    # project multi-D pathway vectors (stats data) into the subspace spanned by the first smallest k eigenvectors of the graph’s Laplacian
    # falls ein Wert für einen Pathway nicht da ist den mean von den Nachbarn nehmen? --> project vector on Graph
    for col_num in range(len(data_tabel.columns)):
        vec = data_tabel.iloc[:, col_num]
        data_tabel.iloc[:, col_num] = project_vector_on_first_components_of_a_basis(
            vec, eigenvec_matrix, num_vars, 0)
    return data_tabel


def project_vector_on_first_components_of_a_basis(vec, basis, num_of_first_vectors, start_from):
    res = np.zeros(len(vec))
    proj = []
    nbasis = np.apply_along_axis(lambda x: x/np.linalg.norm(x), 1, basis)
    for i in range(num_of_first_vectors):
        proj.append(np.dot(vec, nbasis[i]))
    for i in range(start_from, num_of_first_vectors):
        res += nbasis[i]*proj[i]
    return res


def fill_missing_values_with_neighbor_mean(graph_dict, data_table, recieved_omics, defaul_means, numValsPerOmic): # defold values per omic and pos
    defaul_means_rec_omic = [default_mean for (default_mean, recieved) in zip(defaul_means, recieved_omics) if recieved]
    node_names = list(data_table.index)
    new_data = {}
    for node_name in node_names:
        new_node_vec = []
        for pos, val in enumerate(data_table.loc[node_name]):
            default_val = 0 if pos % 1 !=0 or pos % 2 !=0 or pos//numValsPerOmic>len(defaul_means_rec_omic)-1 else defaul_means_rec_omic[pos//numValsPerOmic]
            new_val = val
            if math.isnan(val):
                # get Neighbor for nodes
                neighbor_nodes = graph_dict[node_name]['outgoingEdges']
                node_vals_not_none = 0
                calc_node_val = 0
                for node_info in neighbor_nodes:
                    neighbor_name = node_info['target']
                    neighbor_val = data_table.loc[neighbor_name][pos]
                    if not math.isnan(neighbor_val):
                        calc_node_val += neighbor_val
                        node_vals_not_none += 1
                new_val = calc_node_val/node_vals_not_none if node_vals_not_none != 0 else default_val
            new_node_vec.append(new_val)
        new_data[node_name] = new_node_vec

    new_data_table = pd.DataFrame.from_dict(new_data, orient='index')

    return new_data_table


def get_pca_layout_pos(data_table):
    pca = PCA(n_components=2)
    new_pos = pca.fit_transform(data_table)
    
    explained_variation = pca.explained_variance_ratio_
    print("Variance explained by PC1 = " + str(explained_variation[0]))
    print("Variance explained by PC2 = " + str(explained_variation[1]))
    # pca.calcDispersionsRelative?
    pos_dic_pca = {node_name: row for row, node_name in zip(
        new_pos, list(data_table.index))}
    norm_vals_dict = normalize_all_x_y_to_ndc(pos_dic_pca, [-1,1])
                    
    return new_pos, norm_vals_dict


def convert_each_feature_into_z_scores(data_table):
    # Standardize features by removing the mean and scaling to unit variance.
    return StandardScaler().fit_transform(data_table)


def get_umap_layout_pos(data_table):
    new_pos = umap.UMAP().fit_transform(data_table)
    pos_dic = {node_name: row for row, node_name in zip(
        new_pos, list(data_table.index))}
    norm_vals_dict = normalize_all_x_y_to_ndc(pos_dic, [-1,1])
    return new_pos, norm_vals_dict

def normalize_all_x_y_to_ndc(pos_per_node, val_space):
    x_vals = [val[0] for key, val in pos_per_node.items()]
    y_vals = [val[1] for key, val in pos_per_node.items()]
    min_x, max_x, min_y, max_y = min(x_vals), max(x_vals), min(y_vals), max(y_vals)

    norm_vals = {node: [normalize_in_range(xy[0], min_x, max_x, val_space), normalize_in_range(
        xy[1], min_y, max_y, val_space)] for node, xy in pos_per_node.items()}
    return norm_vals

def normalize_in_range(val, min_val, max_val, val_space):
    numerator = (val_space[1]-val_space[0]) * (val-min_val)
    devisor = max_val - min_val 
    if devisor == 0:
        return val_space[0] 
    return numerator/devisor + val_space[0]

def morph_layouts(xy_1, xy_2, percentage):
    new_xy = {node: coordinate_in_morphed_graph(
        xy_1[node], xy_2[node], percentage) for node in list(xy_1.keys())}
    return new_xy

def coordinate_in_morphed_graph(xy_1, xy_2, percentage):
    x1, y1, x2, y2 = xy_1[0], xy_1[1], xy_2[0], xy_2[1]
    
    x_morphed = percentage * x2 + (1-percentage)*x1
    y_morphed = percentage * y2 + (1-percentage)*y1

    return [x_morphed, y_morphed]

def rotate_to_ref(pos_to_rot, ref_pos):
    node_list = pos_to_rot.keys()
    best_eudistSum = {}
    best_eudistSum = math.inf
    best_rot_mir_xy = []
    best_r = 0
    for r in range(360):
        eudistSum_no_mirror, eudistSum_mirror_x, eudistSum_miror_y, eudistSum4_mirror_xy = 0, 0, 0, 0
        no_m_xy, mx_xy, my_xy, mxy_xy = {}, {}, {}, {}
        for node in node_list:
            x_to_rot = pos_to_rot[node][0]
            y_to_rot = pos_to_rot[node][1]
            x_ref = ref_pos[node][0]
            y_ref = ref_pos[node][1]

            # convert degree to radians
            r_rad = math.radians(r)

            # m0 - no reflection
            rx = x_to_rot*math.cos(r_rad)-y_to_rot*math.sin(r_rad)
            ry = x_to_rot*math.sin(r_rad)+y_to_rot*math.cos(r_rad)
            eudistSum_no_mirror += edist(x_ref, y_ref, rx, ry)
            no_m_xy[node] = [rx, ry]

            # mx - reflexion x
            rx_mx = rx
            ry_mx = -ry
            eudistSum_mirror_x += edist(x_ref, y_ref, rx_mx, ry_mx)
            mx_xy[node] = [rx_mx, ry_mx]

            # mx - reflexion y
            rx_my = -rx
            ry_my = ry
            eudistSum_miror_y += edist(x_ref, y_ref, rx_my, ry_my)
            my_xy[node] = [rx_my, ry_my]

            # mxy - center symmetry
            rx_mxy = -rx
            ry_mxy = -ry
            eudistSum4_mirror_xy += edist(x_ref, y_ref, rx_mxy, ry_mxy)
            mxy_xy[node] = [rx_mxy, ry_mxy]
        for eudistSum, xy_vals in zip([eudistSum_no_mirror, eudistSum_mirror_x, eudistSum_miror_y, eudistSum4_mirror_xy], [no_m_xy, mx_xy, my_xy, mxy_xy]):
            if eudistSum < best_eudistSum:
                best_eudistSum = eudistSum
                best_rot_mir_xy = xy_vals
                best_r = r
    best_rot_mir_xy_nor = normalize_all_x_y_to_ndc(best_rot_mir_xy, [-1,1])    
    print('best_eudistSum', best_eudistSum, best_r)
    return best_rot_mir_xy_nor


def edist(x1, y1, x2, y2):
    return np.linalg.norm(np.array([x1, y1])-np.array([x2, y2]))




# def coordinate_in_morphed_graph(xy_1, xy_2, percentage):
#     x1, y1, x2, y2 = xy_1[0], xy_1[1], xy_2[0], xy_2[1]
#     e_dist_sq = math.pow(edist(x1, y1, x2, y2), 2)

#     z = math.pow(percentage, 2) * e_dist_sq
#     z1 = math.pow(1-percentage, 2) * e_dist_sq

#     f = -(2*x1 - 2*x2)
#     h = -(math.pow(x2, 2)) - math.pow(x1, 2) + math.pow(y2, 2) - math.pow(y1, 2) - z + z1
#     e = 2*y1 - 2*y2

#     a = math.pow(e, 2) + math.pow(f, 2)
#     b = -2*math.pow(e, 2)*x2-2*e*f*y2+2*f*h
#     # c = math.pow(e,2) * math.pow(x2,2) + math.pow(h,2) -2*e*h*y2+ math.pow(e,2) * math.pow(y2,2) -math.pow(e,2)*z

#     # delta = math.pow(b) -4*a*c
#     x_morphed = -b/(2*a)
#     y_morphed = f*(x_morphed + h) / e

#     return [x_morphed, y_morphed]

