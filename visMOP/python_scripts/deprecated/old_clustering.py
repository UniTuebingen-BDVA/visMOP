from functools import partial
import pickle
import random
from statistics import mean
import pandas as pd
import numpy as np
import math
import networkx as nx
import time

# import matplotlib.pyplot as plt
from multiprocessing import Pool

from cmath import inf
import scipy
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from umap import UMAP
from sklearn.cluster import OPTICS, KMeans
from collections import Counter, defaultdict
from itertools import combinations
from scipy.spatial import distance
from copy import deepcopy
from sklearn import metrics
from visMOP.python_scripts.deprecated.forceDir_layouting import (
    get_adjusted_force_dir_node_pos,
)
from visMOP.python_scripts.networkx_layouting import generate_networkx_dict
from multiprocessing import Process
import pandas as pd


def getClusterLayout(
    omics_recieved,
    layout_targets,
    up_down_reg_limits,
    data_col_used,
    statistic_data_complete,
    pathway_connection_dict,
    reactome_roots={},
    pathways_root_names={},
):
    up_down_reg_means = {
        o: mean(limits) for o, limits in zip(["t", "p", "m"], up_down_reg_limits)
    }

    omics_names = ["t", "p", "m"]
    stat_value_names = [
        "num values",
        "mean exp (high ",
        "% vals (higher ",
        "mean exp(lower ",
        "% vals (lower ",
        "% Reg (",
        "% Unreg (",
        "% p with val",
    ]
    # for diagramms
    complete_stat_names = []
    for omic, omic_r, limits in zip(omics_names, omics_recieved, up_down_reg_limits):
        if omic_r:
            for pos, stat in enumerate(stat_value_names):
                next_col_name = omic + "_" + stat
                if pos in [1, 2]:  #
                    next_col_name += str(limits[1]) + ")"
                elif pos in [3, 4]:  #
                    next_col_name += str(limits[0]) + ")"
                elif pos in [5, 6]:  #
                    next_col_name += str(limits) + ")"
                complete_stat_names.append(next_col_name)
    complete_stat_names += ["pathway size"]
    statistic_data_user = statistic_data_complete.iloc[:, data_col_used]
    statistic_data_complete.columns = complete_stat_names
    try:
        cluster_layout = Cluster_layout(
            statistic_data_user,
            layout_targets,
            pathway_connection_dict,
            up_down_reg_means,
            reactome_roots,
            pathways_root_names,
        )
    except ValueError as e:
        print("LayoutError", e)
        return -1, -1
    return (
        cluster_layout.clusters,
        cluster_layout.clusters_center,
        cluster_layout.noise_cluster_exists,
    )


def get_layout_settings(settings, omics_recieved):
    possible_omic_attributes = [
        "Number of values",
        "Mean expression above limit",
        "% values above limit",
        "Mean expression below limit ",
        "% values below limit ",
        "% regulated",
        "% unregulated",
        "% with measured value",
    ]
    possible_no_omic_attributes = ["% values measured over all omics"]
    attributes = []
    limits = []
    # print(settings.items())
    omics_recieved.append(True)
    for recieved, (omic, layout_settings) in zip(omics_recieved, settings.items()):
        omic_limits = [float(i) for i in layout_settings["limits"]]
        limits.append(omic_limits)
        if recieved and omic != "not related to specific omic ":
            attribute_boolean = [
                (
                    (layout_settings["attributes"] is not None)
                    and att in layout_settings["attributes"]
                )
                for att in possible_omic_attributes
            ]
            attributes += attribute_boolean

        elif recieved:
            attribute_boolean = [
                att in layout_settings["attributes"]
                for att in possible_no_omic_attributes
            ]
            attributes += attribute_boolean
    return {"attributes": attributes, "limits": limits}


def timepoint_analysis(input_lists):
    in_same_cluster = []
    in_different_cluster = []

    for cluster in input_lists:
        cleaned_cluster = [elem.split("_")[0] for elem in cluster]
        series = pd.Series(cleaned_cluster)
        duplicate_mask = series.duplicated(keep=False)
        duplicates = series[duplicate_mask]
        non_duplicates = series[~duplicate_mask]
        in_same_cluster.extend(list(duplicates))
        in_different_cluster.extend(list(non_duplicates))

    in_same_cluster = list(set(in_same_cluster))
    in_different_cluster = list(set(in_different_cluster))
    print("Stayed in Same Cluster: ", in_same_cluster)
    print("In Different Cluster: ", in_different_cluster)
    print(
        "Swap Percentage: ",
        len(in_different_cluster) / (len(in_different_cluster) + len(in_same_cluster)),
    )


def most_frequent(List):
    maximum = max(set(List), key=List.count)
    return maximum


def get_area_size(area, get_side_ratio_ok=False, l_max=1):
    """determine the area given array of min and max x and y positions

    Args:
        area: [x_min, x_max, y_min, y_max ]
        get_smallest_side: boolean to deterine whether to return legth of smallest side

    """

    x_side = area[1] - area[0]
    y_side = area[3] - area[2]
    area_size = x_side * y_side
    if not get_side_ratio_ok:
        return area_size
    min_side = normalize_val_in_range(min(x_side, y_side), 0, l_max, [0, 1])
    return area_size, min_side


def get_min_max_side(area, l_max):

    x_side = area[1] - area[0]
    y_side = area[3] - area[2]

    min_side = normalize_val_in_range(min(x_side, y_side), 0, l_max, [0, 1])
    max_side = normalize_val_in_range(max(x_side, y_side), 0, l_max, [0, 1])

    return min_side, max_side


def get_sorted_list_by_list_B_sorting_order(list_to_sort, sorting_list, reverse=False):
    """return list in order of the sorted version of another list

    Args:
    list_to_sort: List one wants to get sorted
    sorting_list: List you want to sort and order by
    reverse: ascending (False) or descending (True) sorting order

    """
    sorted_list = [
        element
        for _, element in sorted(zip(sorting_list, list_to_sort), reverse=reverse)
    ]
    return sorted_list


def cluster_center_in_area(cluster_center, area):
    """Determine if the cluster center lies in area
    Args:
       cluster_center: [x_pos, y_pos]
       area: [x_min, x_max, y_min, y_max ]
    """
    in_area = (
        area[0] <= cluster_center[0] <= area[1]
        and area[2] <= cluster_center[1] <= area[3]
    )
    return in_area


def normalize_val_in_range(val, min_val, max_val, val_space):
    """normalize Value in range

    Args:
        val: value to normalize
        min_val: minimal value in original value space
        max_val: maximal value in original value space
        val_space: Value space in which to normalise

    """
    numerator = (val_space[1] - val_space[0]) * (val - min_val)
    devisor = max_val - min_val
    if devisor == 0:
        return val_space[0]
    return numerator / devisor + val_space[0]


def normalize_value_list_in_range(points_pos, norm_range):
    # Transpose_list_ to that we have a list for each coordinate_dimension
    points_pos_per_dim = list(map(list, zip(*points_pos)))
    vals_all_axis = []
    for pos_in_dim in points_pos_per_dim:
        org_min, org_max = min(pos_in_dim), max(pos_in_dim)
        norm_vals = [
            normalize_val_in_range(val, org_min, org_max, norm_range)
            for val in pos_in_dim
        ]
        vals_all_axis.append(norm_vals)
    # Transpose_list back that we have again alls dim pos per point
    vals_all_axis_per_point = list(map(list, zip(*vals_all_axis)))
    return vals_all_axis_per_point


def normalize_2D_node_pos_in_range(node_positions, x_y_ranges, with_cluster_num=False):
    """normalize all node positions in area

    Args:
        node_positions: original node positions
        x_y_ranges: Value spaces in which to normalise
        with_cluster_num: add cluster number to result

    """

    x_vals = [val[0] for _, val in node_positions.items()]
    y_vals = [val[1] for _, val in node_positions.items()]
    x_mean = mean(x_vals)
    y_mean = mean(x_vals)
    x_centered = [x - x_mean for x in x_vals]
    y_centered = [y - y_mean for y in y_vals]
    min_centered = min(x_centered + y_centered)
    max_centered = max(x_centered + y_centered)

    if with_cluster_num:
        adjusted_node_positions = {
            node: [
                normalize_val_in_range(
                    x_centered[pos],
                    min_centered,
                    max_centered,
                    [x_y_ranges[0], x_y_ranges[1]],
                ),
                normalize_val_in_range(
                    y_centered[pos],
                    min_centered,
                    max_centered,
                    [x_y_ranges[2], x_y_ranges[3]],
                ),
                xy[2],
            ]
            for pos, (node, xy) in enumerate(node_positions.items())
        }
    else:
        adjusted_node_positions = {
            node: [
                normalize_val_in_range(
                    x_centered[pos],
                    min_centered,
                    max_centered,
                    [x_y_ranges[0], x_y_ranges[1]],
                ),
                normalize_val_in_range(
                    y_centered[pos],
                    min_centered,
                    max_centered,
                    [x_y_ranges[2], x_y_ranges[3]],
                ),
            ]
            for pos, (node, _) in enumerate(node_positions.items())
        }
    return adjusted_node_positions


class Cluster_layout:
    def __init__(
        self,
        data_table,
        layout_targets,
        graph_dict,
        up_down_reg_means,
        reactome_roots,
        pathways_root_names,
        node_size=2,
    ):
        self.pool_size = 8

        data_table.sort_index(inplace=True)
        print("cols", data_table.columns)
        startTime = time.time()
        networkx_adjacency_dict, networkx_attribute_dict = generate_networkx_dict(
            graph_dict
        )
        reactome_root_ids = list(reactome_roots.keys())
        self.greatest_dist_in_initial_layout = None
        self.dist_sim_threshold = 0.2
        self.reactome_roots = reactome_roots

        # drop reatcome root ids so that thex are not used for calculating missing values and clusters
        self.data_table = data_table.drop(reactome_root_ids)
        self.data_table = data_table.loc[layout_targets]
        self.full_graph = nx.Graph(networkx_adjacency_dict)
        nx.set_node_attributes(self.full_graph, networkx_attribute_dict)

        self.half_node_size = node_size / 2
        self.cluster_nodes_num = []
        self.clusters_area = []
        self.noise_cluster_exists = False

        print("Calculating cluster layout...")
        try:
            self.data_table_scaled_filled = StandardScaler().fit_transform(
                self.fill_missing_values_with_neighbor_mean(
                    graph_dict, up_down_reg_means, reactome_root_ids
                )
            )
        except ValueError as e:
            raise ValueError
        print("Scaled input data")
        self.initial_node_pos, _ = self.get_initial_node_pos()
        print("initial node positions calculated")
        self.l_max = 0

        (
            self.clusters,
            self.num_cluster,
            self.positions_dict_clustering,
        ) = self.get_cluster()
        cluster_length = [len(x) for x in self.clusters]
        self.cluster_node_nums = [len(cluster) for cluster in self.clusters]
        total_num_nodes = sum(self.cluster_node_nums)
        self.node_num_ratio = [
            node_num / total_num_nodes for node_num in self.cluster_node_nums
        ]

        # set AN_RATIO and MIN_SIDE_RATIO depending on number of Clusters
        self.AN_RATIO = 0.32 if self.num_cluster > 10 else 0.2
        self.MIN_SIDE_T = 0.12 if self.num_cluster > 10 else 0.2
        self.num_best_dist_loops = 500 if self.num_cluster > 10 else 1500
        self.num_cost_min_loops = 0 if self.num_cluster > 10 else 5

        # for each cluster idenify all positions where rel. distances to it are given
        self.p_f_m = defaultdict(list)
        for i in range(self.num_cluster):
            pos_m = []
            for j in range(i + 1, self.num_cluster):
                pos = self.num_cluster * i + j - ((i + 2) * (i + 1)) // 2
                pos_m.append(pos)
                self.p_f_m[j].append(pos)
            self.p_f_m[i] += pos_m

        initial_clusters_center = self.get_cluster_centers(self.initial_node_pos)
        self.clusters_center = initial_clusters_center
        self.weights = self.getClustersWeights()

        self.relative_distances = self.getRealtiveDistancesBetweenClusters(
            self.get_cluster_centers(self.positions_dict_clustering)
        )
        print("Clusters identified")
        # outcommented for test of voronoi layout
        # self.area_num_node_ratio_Pool()
        print(cluster_length)
        print("Relative distances between clusters and cluster weights calculated")
        # outcommented for test of voronoi layout
        # self.final_node_pos = self.getNodePositions(pathways_root_names)
        print("final node positions identified")
        endTime = time.time()
        # self.get_stats()
        # self.get_stat_plots()
        print(
            "Time for Cluster Layout calculation {:.3f} s".format((endTime - startTime))
        )

    def area_num_node_ratio_Pool(self):
        self.min_nn_ratios = [
            nn_r - self.AN_RATIO * nn_r for nn_r in self.node_num_ratio
        ]
        try:
            np.random.seed()
            self.clusters_area, initial_area_side_ratio = self.getSizeOfClustersRegion(
                self.clusters_center
            )

            nn_a_comp = [
                a_r >= (nn_r - self.AN_RATIO * nn_r) and min_side >= self.MIN_SIDE_T
                for nn_r, [a_r, min_side] in zip(
                    self.node_num_ratio, initial_area_side_ratio
                )
            ]
            found_ideal = True if sum(nn_a_comp) == len(nn_a_comp) else False
            (
                init_area_comp,
                num_area_w_greater_diff,
                init_min_side_comp,
                num_side_smaller,
            ) = self.calc_com_values(self.min_nn_ratios, initial_area_side_ratio, 0)
            initial_cost = self.evaluteCostFunction(self.clusters_center)
        except:
            found_ideal = False
            init_area_comp, init_min_side_comp, initial_cost = inf, inf, inf
            num_area_w_greater_diff, num_side_smaller = (
                self.num_cluster,
                self.num_cluster,
            )
        if not found_ideal:
            pool = Pool(self.pool_size)
            self.MAX_RUNS_PER_PROCESS = 15
            multiple_results = []
            simplified_func = partial(
                self.area_num_node_ratio_optFunc,
                area_comp=init_area_comp,
                num_area_w_greater_diff=num_area_w_greater_diff,
                num_side_smaller=num_side_smaller,
                diff_min_side_to_success=init_min_side_comp,
                clusters_area=self.clusters_area,
                initial_cost=initial_cost,
            )
            for result in pool.imap_unordered(
                simplified_func, [self.clusters_center] * self.pool_size
            ):
                if result:  # first to succeed:
                    if result[0]:
                        print("POOL OPTI DONE ", result[3])
                        found_ideal = True
                        self.clusters_area = result[3]
                        smallest_area_diff = result[1]
                        smalles_min_side_diff = result[2]
                        C_cost_best = result[4]
                        break
                    else:
                        multiple_results.append(result)
            pool.terminate()  # kill all remaining tasks
            # Wait for all processes to end:
            pool.join()
            # success, area_comp, diff_min_side_to_success, clusters_area
        # with open('cluster_areas_03.pkl', "rb") as f:
        #     self.clusters_area = pickle.load(f)

        if not found_ideal:
            smallest_area_diff = np.Infinity
            smalles_min_side_diff = np.Infinity
            C_cost_best = np.Infinity
            for result in multiple_results:
                if (result[1] < smallest_area_diff) or (
                    (
                        result[1] == smallest_area_diff - result[1] <= 0.01
                        or (abs(result[1] - smallest_area_diff) < 0.01)
                    )
                    and result[2] < smalles_min_side_diff
                ):
                    smallest_area_diff = result[1]
                    smalles_min_side_diff = result[2]
                    self.clusters_area = result[3]
                    C_cost_best = result[4]
            print("suboptimal solution found: ")
            print("area_side_ratio", self.clusters_area)
            print(
                "min_side/max side",
                [get_min_max_side(area, self.l_max) for area in self.clusters_area],
            )
            print("node_num_ratio", self.node_num_ratio)

        print("Cluster sizes identified")
        print("smallest_area_diff:", init_area_comp)
        print("smalles_min_side_diff: ", init_min_side_comp)
        print("innitial_rel_dist", self.relative_distances)
        print("initial_cost: ", initial_cost)
        print("self.node_num_ratio", self.node_num_ratio)
        print("initial_area_side_ratio", initial_area_side_ratio)
        print(
            "min_side",
            [get_area_size(ma, True, self.l_max)[1] for ma in self.clusters_area],
        )

    def area_num_node_ratio_optFunc(
        self,
        initial_clusters_center,
        area_comp,
        num_area_w_greater_diff,
        num_side_smaller,
        diff_min_side_to_success,
        clusters_area,
        initial_cost,
    ):
        np.random.seed()
        runs = 0
        total_num_runs = 0
        success = False
        clusters_center = initial_clusters_center
        runtime_threshold_MS = 0
        prev_best_cost_C = initial_cost
        min_nn_ratios = self.min_nn_ratios
        found_better = 0
        while not success and total_num_runs <= self.MAX_RUNS_PER_PROCESS:
            best_cost_C, cluster_center = self.getClusterPos(
                clusters_center, prev_best_cost_C
            )
            try:
                new_clusters_area, new_area_side_ratio = self.getSizeOfClustersRegion(
                    cluster_center
                )
                nn_a_comp = [
                    a_r >= min_nn_ratio
                    and min_side >= (self.MIN_SIDE_T - runtime_threshold_MS)
                    for min_nn_ratio, (a_r, min_side) in zip(
                        min_nn_ratios, new_area_side_ratio
                    )
                ]

                success = True if sum(nn_a_comp) == len(nn_a_comp) else False
                if success:
                    clusters_area = new_clusters_area
                    area_comp = 0
                    diff_min_side_to_success = 0
                elif runs == self.MAX_RUNS_PER_PROCESS / 2:
                    runs = 0
                    # start at random new position
                    cluster_center = np.random.uniform(0, 1, (self.num_cluster, 2))
                    prev_best_cost_C = None
                else:
                    (
                        new_area_comp,
                        new_num_area_w_greater_diff,
                        new_diff_min_side_to_success,
                        new_num_side_smaller,
                    ) = self.calc_com_values(
                        min_nn_ratios, new_area_side_ratio, runtime_threshold_MS
                    )
                    area_better = (
                        new_area_comp <= area_comp
                        and new_num_area_w_greater_diff <= num_area_w_greater_diff
                    )
                    area_sim = (
                        new_diff_min_side_to_success <= diff_min_side_to_success
                        or new_area_comp <= 0.01
                    ) and (new_num_area_w_greater_diff <= num_area_w_greater_diff)
                    min_side_better = (
                        area_sim and new_num_side_smaller <= num_side_smaller
                    )
                    max_side_not_whole_side = (
                        sum(
                            [
                                not (max_s < 0.99 or max_s > 0.99 and min_s > 0.25)
                                for min_s, max_s in [
                                    get_min_max_side(area, self.l_max)
                                    for area in new_clusters_area
                                ]
                            ]
                        )
                        == 0
                    )
                    if (
                        area_better
                        or (
                            (abs(new_area_comp - area_comp) <= 0.01) and min_side_better
                        )
                    ) and max_side_not_whole_side:  #  and best_cost_C < prev_best_cost_C):
                        found_better += 1
                        area_comp = new_area_comp
                        diff_min_side_to_success = new_diff_min_side_to_success
                        clusters_area = new_clusters_area
                        num_area_w_greater_diff = new_num_area_w_greater_diff
                        num_side_smaller = new_num_side_smaller
                        prev_best_cost_C = best_cost_C
                    # else:
                    #     if max_side_not_whole_side and not area_better and (abs(new_area_comp - area_comp) <= 0.01) and new_num_side_smaller <= num_side_smaller:
                    #         print(area_sim)

                    runs += 1
                if total_num_runs == self.MAX_RUNS_PER_PROCESS / 2:
                    min_nn_ratios = [
                        nn_r - (self.AN_RATIO + 0.05) * nn_r
                        for nn_r in self.node_num_ratio
                    ]
                    runtime_threshold_MS = 0.01
                total_num_runs += 1

            except IndexError:
                cluster_pairs = combinations(range(len(clusters_center)), 2)
                cluster_dists = {
                    m_p: sum(
                        [
                            abs(clusters_center[m_p[0]][0] - clusters_center[m_p[1]][0])
                            > 0.0001,
                            abs(clusters_center[m_p[0]][1] - clusters_center[m_p[1]][1])
                            > 0.0001,
                        ]
                    )
                    for m_p in cluster_pairs
                }
                none_correct_dists = list(
                    sum(
                        [
                            m_p
                            for m_p, corr_dist in cluster_dists.items()
                            if corr_dist < 2
                        ],
                        (),
                    )
                )
                # makes sure that there is enough space too find a area for each cluster in divideSpaceForTwoClusters()

                print(
                    "no possible area divide found with number of none correct distances",
                    none_correct_dists,
                )
                pass

        print("C_cost =", self.evaluteCostFunction(cluster_center))
        print("better Solutions found", found_better)

        return (
            success,
            area_comp,
            diff_min_side_to_success,
            clusters_area,
            self.evaluteCostFunction(cluster_center),
        )

    def calc_com_values(self, min_nn_ratios, new_area_side_ratio, runtime_threshold_MS):
        area_diff_to_success = [
            min_nn_ratio - a_r
            for min_nn_ratio, (a_r, _) in zip(min_nn_ratios, new_area_side_ratio)
            if min_nn_ratio > a_r
        ]
        new_area_comp = sum(area_diff_to_success)
        new_num_area_w_greater_diff = sum(
            [diff >= 0.08 for diff in area_diff_to_success]
        )
        min_side_diff_to_success = [
            (self.MIN_SIDE_T - runtime_threshold_MS) - min_side
            for _, min_side in new_area_side_ratio
            if (self.MIN_SIDE_T - runtime_threshold_MS) > min_side
        ]
        new_diff_min_side_to_success = sum(min_side_diff_to_success)
        new_num_side_smaller = sum([diff >= 0.02 for diff in min_side_diff_to_success])
        return (
            new_area_comp,
            new_num_area_w_greater_diff,
            new_diff_min_side_to_success,
            new_num_side_smaller,
        )

    # default values per omic and pos
    def fill_missing_values_with_neighbor_mean(
        self, graph_dict, default_means, root_ids
    ):
        node_names = list(self.data_table.index)
        new_data = {}
        default_val_0 = ["num values", "pathway size", "%"]
        for node_name in node_names:
            new_node_vec = []
            for ind, val in zip(
                list(self.data_table.columns), self.data_table.loc[node_name]
            ):
                default_val = (
                    0 if any(s in ind for s in default_val_0) else default_means[ind[0]]
                )
                new_val = val
                if math.isnan(val):
                    # get Neighbor for nodes
                    neighbor_nodes = graph_dict[node_name]["outgoingEdges"]
                    node_vals_not_none = 0
                    calc_node_val = 0
                    for node_info in neighbor_nodes:
                        neighbor_name = node_info["target"]
                        if graph_dict[neighbor_name]["isCentral"]:
                            neighbor_val = self.data_table.loc[neighbor_name][ind]
                            if (
                                not math.isnan(neighbor_val)
                                and neighbor_name not in root_ids
                            ):
                                calc_node_val += neighbor_val
                                node_vals_not_none += 1
                    new_val = (
                        calc_node_val / node_vals_not_none
                        if node_vals_not_none != 0
                        else default_val
                    )
                new_node_vec.append(new_val)
            new_data[node_name] = new_node_vec

        new_data_table = pd.DataFrame.from_dict(new_data, orient="index")
        return new_data_table

    # for clustering higer n_components and n_neighbors and lower min_dist
    def get_umap_layout_pos(
        self, n_components=2, n_neighbors=5, min_dist=0.1, norm_lower=0, norm_upper=1
    ):
        """Performs UMAP on scaled data returns new normalizied in [0,1] n-D Positions in node dict and postion list of lists

        Args:
            n_components: number components
            n_neigherbors: Parameter for UMAP
            min_dist: Parameter for UMAP
        """
        new_pos = UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            # random_state=10,
        ).fit_transform(self.data_table_scaled_filled)
        new_pos_norm = normalize_value_list_in_range(new_pos, [norm_lower, norm_upper])
        pos_norm_dic = {
            node_name: row
            for row, node_name in zip(new_pos_norm, list(self.data_table.index))
        }
        return pos_norm_dic, new_pos_norm

    def get_cluster_for_min_sample(self, min_samples, data):
        optics = OPTICS(min_samples=min_samples)
        optics_fit = optics.fit(data)

        clustering_labels = optics_fit.labels_
        # for calculation of the sillouette value exclude random cluster

        rand_cl_pos = [i for i, x in enumerate(clustering_labels) if x == -1]
        data_for_sil = data
        clustering_labels_for_sil = clustering_labels
        if len(rand_cl_pos) != 0 and max(clustering_labels) > 1:
            data_for_sil = np.delete(data, rand_cl_pos, axis=0)
            clustering_labels_for_sil = [x for x in clustering_labels if x != -1]

        ss = metrics.silhouette_score(
            data_for_sil, clustering_labels_for_sil, metric="euclidean"
        )
        # print("Reached End of Pool func. ",min_samples, max(clustering_labels) + 2, ss)

        # print(min_samples, max(clustering_labels) + 2, ss)
        return ss, clustering_labels

    def get_cluster(self):
        """
        get clusters
        sort nodes, so that nodes in same Clusteres are together
        return list of list with one list for every cluster
        """
        num_features = len(self.data_table_scaled_filled[0])
        num_pathways = len(self.data_table_scaled_filled)
        if num_features > 2:
            n_comp = min(math.ceil(num_features / 2), 10)
            n_neighbors = 5 if num_pathways < 100 else 10 if num_pathways < 200 else 15
            positions_dict, position_list = self.get_umap_layout_pos(
                n_components=n_comp,
                n_neighbors=n_neighbors,
                min_dist=0,
                norm_lower=-125,
                norm_upper=125,
            )
        else:
            position_list = self.data_table_scaled_filled
            positions_dict = {
                node_name: row
                for row, node_name in zip(position_list, list(self.data_table.index))
            }
        pool = Pool(self.pool_size)
        simplified_func = partial(self.get_cluster_for_min_sample, data=position_list)
        clustering_labels = None
        ss = -1
        for result in pool.imap_unordered(
            simplified_func,
            range(
                math.floor(max(4, num_pathways / 80)),
                math.floor(max(4, num_pathways / 80)) + self.pool_size,
            ),
        ):
            if result:
                # print('ss', result[0])
                if result[0] > ss:
                    ss = result[0]
                    clustering_labels = result[1]
        pool.close()
        pool.join()
        self.noise_cluster_exists = -1 in clustering_labels

        ordered_nodes = get_sorted_list_by_list_B_sorting_order(
            self.data_table.index, clustering_labels
        )
        nums_in_cl = list(dict(sorted(Counter(clustering_labels).items())).values())
        split_array = [sum(nums_in_cl[: i + 1]) for i, _ in enumerate(nums_in_cl)]
        cl_list = np.split(ordered_nodes, split_array)[:-1]

        return cl_list, max(clustering_labels) + 2, positions_dict

    def get_initial_node_pos(self):
        """Get node positions using dimensionality reduction drm

        Args:
            drm: dimensionality reduction method

        """
        node_pos_dic, node_pos_list = self.get_umap_layout_pos()
        return node_pos_dic, node_pos_list

    def getClustersWeights(self):
        """returns weights between all cluster-pairs equal to the number of nodes sharing edges between the"""
        num_clusters = len(self.clusters)
        weights = np.zeros((num_clusters, num_clusters))
        for cluster_pair in combinations(range(len(self.clusters)), 2):
            num_edges = sum(
                [
                    self.full_graph.has_edge(n_1, n_2)
                    for n_1 in self.clusters[cluster_pair[0]]
                    for n_2 in self.clusters[cluster_pair[1]]
                ]
            )
            weights[cluster_pair[0], cluster_pair[1]] = num_edges
        return weights

    def get_cluster_centers(self, node_pos):
        """for every cluster get cluster center defined as the median position of all nodes in cluster

        Args:
            node_pos: Node Positions per pathway
        """
        cluster_centers = [
            [node_pos[pathway] for pathway in cluster] for cluster in self.clusters
        ]
        cluster_centers = [
            list(map(list, zip(*cluster_coords))) for cluster_coords in cluster_centers
        ]
        cluster_centers_med = []
        for cluster_coords in cluster_centers:
            c_f_m = []
            for pos_per_dim in cluster_coords:
                c_f_m.append(np.median(pos_per_dim))
            cluster_centers_med.append(c_f_m)

        # cluster_centers = [[np.median(cluster_coords[0]),np.median(cluster_coords[1])] for cluster_coords in cluster_centers]
        return cluster_centers_med

    def getRealtiveDistancesBetweenClusters(self, cur_cluster_centers):
        """
        1. get median node positions of all clusters using UMAP
        2. calculated  Manhattan distance between all clusters
        3. calculated distances as multiple of the distance between the node pair
            that has the smallest distance in the initial UMAP layout
        """
        all_vecs = [
            cur_cluster_centers[cluster] for cluster in range(len(self.clusters))
        ]

        all_distances = distance.pdist(all_vecs, "cityblock")
        if self.greatest_dist_in_initial_layout is None:
            self.greatest_dist_in_initial_layout = np.max(all_distances)

        max_distance = self.greatest_dist_in_initial_layout
        relative_distances = [dist / max_distance for dist in all_distances]

        return relative_distances

    def evaluateRelativDistanceSimilarity(self, original, new, dist_sim_threshold=0.1):
        """evaluate if clusters have the same realtive distance as in the original clustering layout"""

        distance_similarities = [
            (rd_org - dist_sim_threshold) <= rd_new <= (rd_org + dist_sim_threshold)
            for rd_org, rd_new in zip(original, new)
        ]

        distance_similarities = [
            ds if m not in self.p_f_m[0] else True
            for m, ds in enumerate(distance_similarities)
        ]

        dist_sim_sum = sum(distance_similarities)
        possibleLayout = dist_sim_sum == len(distance_similarities)
        return possibleLayout, distance_similarities

    def evaluteCostFunction(self, cur_cluster_centers):
        """
        Parameter: Weight of cluster h and k w(h,k), Manhattan distance between cluster h and k d(h,k)
        C = sum over (w(h,k) * d(h,k))
        """
        num_clusters = len(self.clusters)
        distances = np.zeros((num_clusters, num_clusters))
        for cluster_pair in combinations(range(len(self.clusters)), 2):
            distances[cluster_pair[0], cluster_pair[1]] = distance.cityblock(
                cur_cluster_centers[cluster_pair[0]],
                cur_cluster_centers[cluster_pair[1]],
            )

        C = sum(
            sum([np.array(w) * np.array(d) for w, d in zip(self.weights, distances)])
        )

        return C

    def getClusterPos(self, clusters_center, prev_best_C):
        """
        1. getClustersWeights
        2. getSizeOfClustersRegion
        3. initial cluster layout R given bei umap or pca
        4. repeat x times
            4.1 repeat until a positioning found which satifies the condition that clusters don't overlap and relative distances are the same
                4.1.1 randomly move clusters R1
            4.2 partly optimize R1
            4.3 R = R1 if C1 < C
        5. return R
        """
        internal_clusters_center = clusters_center
        best_C = (
            self.evaluteCostFunction(internal_clusters_center)
            if prev_best_C is None
            else prev_best_C
        )
        iter_num = 0
        possibleLayout_found = False

        while iter_num <= self.num_cost_min_loops and not possibleLayout_found:
            new_cluster_centers = self.find_layout_with_best_possible_rel_dists(
                internal_clusters_center
            )
            new_C = self.evaluteCostFunction(new_cluster_centers)
            if new_C < best_C or (
                iter_num == self.num_cost_min_loops and not possibleLayout_found
            ):
                possibleLayout_found = True
                internal_clusters_center = new_cluster_centers
                best_C = new_C
            iter_num += 1
        return best_C, internal_clusters_center

    def find_layout_with_best_possible_rel_dists(self, clusters_center):
        distance_similarities = [0] * len(self.relative_distances)
        cur_cluster_center = clusters_center
        run = 0
        found_better_possible_center = False
        found_perfect_center = False
        while run <= self.num_best_dist_loops and not found_perfect_center:
            new_cluster_centers = [
                self.getNewClusterCenter(
                    cluster_center,
                    mn,
                    sum(distance_similarities[p] for p in self.p_f_m[mn]),
                )
                for mn, cluster_center in enumerate(cur_cluster_center)
            ]
            new_rel_distances = self.getRealtiveDistancesBetweenClusters(
                new_cluster_centers
            )

            (
                found_perfect_center,
                distance_similarities_new,
            ) = self.evaluateRelativDistanceSimilarity(
                self.relative_distances, new_rel_distances, self.dist_sim_threshold
            )
            if sum(distance_similarities_new) > sum(distance_similarities):
                distance_similarities = distance_similarities_new
                cur_cluster_center = new_cluster_centers
                found_better_possible_center = True
            elif run == self.num_best_dist_loops and not found_better_possible_center:
                cur_cluster_center = new_cluster_centers
            run += 1

        return cur_cluster_center

    def getNewClusterCenter(
        self, cluster_center, cluster_num, distance_similarities_value
    ):
        # je mehr die distancen stimmen desto weniger wahrscheinlich wird das cluster center erschoben
        dist_bonus = (
            distance_similarities_value / (self.num_cluster) - 0.2
            if cluster_num != 0
            else 0
        )
        change_pos = np.random.binomial(1, max(0.1, min(1, 0.1 + dist_bonus))) == 0
        new_center = cluster_center
        if change_pos:
            # max movement in neg/ pos x direction: m_c[0] - 0.1 / 1-m_c[0] -0.1
            for coord in [0, 1]:
                new_center[coord] = np.random.uniform(0.1, 0.95)
        return new_center

    def getSizeOfClustersRegion(self, cluster_center):
        """
        calculate For dir for cluster
        get max nodes in vertical and horizontal position
        """

        l_max = 20 * math.sqrt(max(self.cluster_node_nums))
        self.l_max = l_max

        new_centers = [
            [cluster_center[0] * l_max, cluster_center[1] * l_max]
            for cluster_center in cluster_center
        ]

        cluster_id_sorted_by_num_nodes = [
            x
            for _, x in sorted(
                zip(self.cluster_node_nums, list(range(len(self.cluster_node_nums)))),
                reverse=True,
            )
        ]

        cluster_regions = self.divideSpaceForTwoClusters(
            new_centers,
            # cluster_x_y_distances,
            [0, l_max, 0, l_max],
            list(range(self.num_cluster)),
            sum(self.cluster_node_nums),
            cluster_id_sorted_by_num_nodes,
        )
        area_list = [[]] * self.num_cluster
        for (area, cluster_num) in cluster_regions:
            area_list[cluster_num] = area

        final_area_size = [get_area_size(area, True, l_max) for area in area_list]
        total_area = sum([size for size, _ in final_area_size])

        area_side_ratio = [
            [area / total_area, min_side] for area, min_side in final_area_size
        ]

        return area_list, area_side_ratio

    def divideSpaceForTwoClusters(
        self,
        cluster_centers,
        area_to_divide,
        clusters_in_area,
        total_sum_nodes_in_area,
        cluster_id_sorted_by_num_nodes,
    ):
        if len(clusters_in_area) == 0:
            print(
                "############################################## I SHOULD NOT BE #####################################"
            )
            print(clusters_in_area)
        if len(clusters_in_area) == 1:
            return [[area_to_divide, clusters_in_area[0]]]

        cluster_pair = []
        for cluster in cluster_id_sorted_by_num_nodes:
            if cluster in clusters_in_area:
                cluster_pair.append(cluster)
                if len(cluster_pair) == 2:
                    break

        cluster_1 = cluster_pair[0]
        cluster_2 = cluster_pair[1]

        max_dist = max(
            abs(
                cluster_centers[cluster_pair[0]][0]
                - cluster_centers[cluster_pair[1]][0]
            ),
            abs(
                cluster_centers[cluster_pair[0]][1]
                - cluster_centers[cluster_pair[1]][1]
            ),
        )
        # max dist is on x axis
        x_dist = cluster_centers[cluster_1][0] - cluster_centers[cluster_2][0]
        y_dist = cluster_centers[cluster_1][1] - cluster_centers[cluster_2][1]
        area_1 = deepcopy(area_to_divide)
        area_2 = deepcopy(area_to_divide)
        if 0.9 < abs(x_dist) / abs(y_dist) < 1.1:
            max_dist = abs(x_dist) if np.random.binomial(1, 0.5) else abs(y_dist)
        # change x coord
        if max_dist == abs(x_dist):
            cluster_1_area_pos_to_ad, cluster_2_area_pos_to_ad, min_border_pos = (
                [1, 0, cluster_centers[cluster_1][0]]
                if x_dist < 0
                else [0, 1, cluster_centers[cluster_2][0]]
            )
        # change y coord
        else:
            y_dist = cluster_centers[cluster_1][1] - cluster_centers[cluster_2][1]
            cluster_1_area_pos_to_ad, cluster_2_area_pos_to_ad, min_border_pos = (
                [3, 2, cluster_centers[cluster_1][1]]
                if y_dist < 0
                else [2, 3, cluster_centers[cluster_2][1]]
            )

        (
            area_1_best,
            area_2_best,
            clusters_in_area_1_best,
            num_nodes_area_2,
            num_nodes_area_1_best,
            num_nodes_area_2_best,
            score_min,
        ) = [[], [], [], [], 0, 0, inf]
        area_t_d_size = get_area_size(area_to_divide)
        for abst in np.arange(0.0005, max_dist - 0.0005, 0.001):
            area_1[cluster_1_area_pos_to_ad] = min_border_pos + abst
            area_2[cluster_2_area_pos_to_ad] = min_border_pos + abst
            clusters_in_area_1 = [
                cluster
                for cluster in clusters_in_area
                if cluster_center_in_area(cluster_centers[cluster], area_1)
            ]
            num_nodes_area_1 = sum(
                [self.cluster_node_nums[cluster] for cluster in clusters_in_area_1]
            )
            num_nodes_area_2 = total_sum_nodes_in_area - num_nodes_area_1
            # score = abs(self.get_area_size(area_1)*num_nodes_area_2/total_sum_nodes_in_area -
            #             self.get_area_size(area_2)*num_nodes_area_1/total_sum_nodes_in_area)

            score = max(
                0,
                abs(
                    get_area_size(area_1) / area_t_d_size
                    - num_nodes_area_1 / total_sum_nodes_in_area
                ),
            ) + max(
                0,
                abs(
                    get_area_size(area_2) / area_t_d_size
                    - num_nodes_area_2 / total_sum_nodes_in_area
                ),
            )

            if score < score_min:
                score_min = score
                clusters_in_area_1_best = deepcopy(clusters_in_area_1)
                clusters_in_area_2_best = [
                    cluster
                    for cluster in clusters_in_area
                    if cluster not in clusters_in_area_1_best
                ]

                area_1_best = deepcopy(area_1)
                area_2_best = deepcopy(area_2)
                num_nodes_area_1_best = deepcopy(num_nodes_area_1)
                num_nodes_area_2_best = deepcopy(num_nodes_area_2)

        return self.divideSpaceForTwoClusters(
            cluster_centers,
            # deepcopy(cluster_ia_x_y_distances),
            area_1_best,
            clusters_in_area_1_best,
            num_nodes_area_1_best,
            cluster_id_sorted_by_num_nodes,
        ) + self.divideSpaceForTwoClusters(
            cluster_centers,
            # deepcopy(cluster_ia_x_y_distances),
            area_2_best,
            clusters_in_area_2_best,
            num_nodes_area_2_best,
            cluster_id_sorted_by_num_nodes,
        )

    def getNodePositions(self, pathways_root_names):
        """
        1. for all clusters
            1.1 get force directed layout
            1.2. adjust position to cluster Region coordinates
        2. return node positions
        """
        node_positions = {}
        total_num_nodes = len(list(self.data_table.index))
        # with open('cluster_areas_03.pkl', "rb") as f:
        #     self.clusters_area = pickle.load(f)
        for cluster_num, (cluster, cluster_area) in enumerate(
            zip(self.clusters, self.clusters_area)
        ):
            sub_graph = self.full_graph.subgraph(cluster)
            print("cluster", cluster_area)
            cluster_node_positions = get_adjusted_force_dir_node_pos(
                sub_graph,
                cluster_num,
                pathways_root_names,
                total_num_nodes,
                self.l_max,
                cluster_area,
            )
            adjusted_node_positions = normalize_2D_node_pos_in_range(
                cluster_node_positions, cluster_area, True
            )

            node_positions = {**node_positions, **adjusted_node_positions}

        return node_positions

    def get_final_node_positions(self):
        max_ext = 20
        node_positions = normalize_2D_node_pos_in_range(
            self.final_node_pos, [0, max_ext, 0, max_ext], True
        )
        cluster_dic = {
            pathway: cluster_num
            for cluster_num, cluster in enumerate(self.clusters)
            for pathway in cluster
        }
        for root, subpathways in self.reactome_roots.items():
            try:
                maj_cluster_num = most_frequent(
                    [
                        cluster_dic[pathway]
                        for pathway in subpathways
                        if pathway in cluster_dic.keys()
                    ]
                )
            except:
                print(
                    "{} Is a Root with associated measurements NOT in subpathways".format(
                        root
                    )
                )
                maj_cluster_num = -1
            node_positions[root] = [0, 0, maj_cluster_num]

        return node_positions

    def get_cluster_areas(self):
        max_ext = 20

        flatten_list = list(map(list, zip(*self.clusters_area)))

        min_x, max_x = [min(flatten_list[0]), max(flatten_list[1])]
        min_y, max_y = [min(flatten_list[2]), max(flatten_list[3])]
        norm_areas = [] if self.noise_cluster_exists else [[]]
        for cluster in self.clusters_area:
            norm_area = [
                normalize_val_in_range(cluster[0], min_x, max_x, [0, max_ext]),
                normalize_val_in_range(cluster[1], min_x, max_x, [0, max_ext]),
                normalize_val_in_range(cluster[2], min_y, max_y, [0, max_ext]),
                normalize_val_in_range(cluster[3], min_y, max_y, [0, max_ext]),
            ]
            norm_areas.append(norm_area)

        return norm_areas
