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
from visMOP.python_scripts.forceDir_layouting import get_adjusted_force_dir_node_pos
from visMOP.python_scripts.kegg_parsing import generate_networkx_dict
from multiprocessing import Process


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


def mod_center_in_area(mod_center, area):
    """Determine if the module center lies in area
    Args:
       mod_center: [x_pos, y_pos]
       area: [x_min, x_max, y_min, y_max ]
    """
    in_area = (
        area[0] <= mod_center[0] <= area[1] and area[2] <= mod_center[1] <= area[3]
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


def normalize_2D_node_pos_in_range(node_positions, x_y_ranges, with_mod_num=False):
    """normalize all node positions in area

    Args:
        node_positions: original node positions
        x_y_ranges: Value spaces in which to normalise
        with_mod_num: add module number to result

    """

    x_vals = [val[0] for _, val in node_positions.items()]
    y_vals = [val[1] for _, val in node_positions.items()]
    x_mean = mean(x_vals)
    y_mean = mean(x_vals)
    x_centered = [x - x_mean for x in x_vals]
    y_centered = [y - y_mean for y in y_vals]
    min_centered = min(x_centered + y_centered)
    max_centered = max(x_centered + y_centered)

    if with_mod_num:
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


class Module_layout:
    def __init__(
        self,
        data_table,
        graph_dict,
        up_down_reg_means,
        reactome_roots,
        pathways_root_names,
        drm="umap",
        node_size=2,
    ):
        self.pool_size = 8

        data_table.sort_index(inplace=True)
        print("cols", data_table.columns)
        startTime = time.time()
        networkx_dict = generate_networkx_dict(graph_dict)
        reactome_root_ids = list(reactome_roots.keys())
        self.greatest_dist_in_initial_layout = None
        self.dist_sim_threshold = 0.2
        self.reactome_roots = reactome_roots

        # drop reatcome root ids so that thex are not used for calculating missing values and clusters
        self.data_table = data_table.drop(reactome_root_ids)
        self.full_graph = nx.Graph(networkx_dict)

        self.half_node_size = node_size / 2
        self.module_nodes_num = []
        self.noise_cluster_exists = False

        print("Calculating module layout...")
        try:
            self.data_table_scaled_filled = StandardScaler().fit_transform(
                self.fill_missing_values_with_neighbor_mean(
                    graph_dict, up_down_reg_means, reactome_root_ids
                )
            )
        except ValueError as e:
            raise ValueError
        print("Scaled input data")
        self.initial_node_pos, _ = self.get_initial_node_pos(drm)
        print("initial node positions calculated")
        self.l_max = 0

        (
            self.modules,
            self.num_cluster,
            self.positions_dict_clustering,
        ) = self.get_cluster()
        mod_length = [len(x) for x in self.modules]
        self.module_node_nums = [len(module) for module in self.modules]
        total_num_nodes = sum(self.module_node_nums)
        self.node_num_ratio = [
            node_num / total_num_nodes for node_num in self.module_node_nums
        ]

        # set AN_RATIO and MIN_SIDE_RATIO depending on number of Clusters
        self.AN_RATIO = 0.32 if self.num_cluster > 10 else 0.2
        self.MIN_SIDE_T = 0.12 if self.num_cluster > 10 else 0.2
        self.num_best_dist_loops = 500 if self.num_cluster > 10 else 1500
        self.num_cost_min_loops = 0 if self.num_cluster > 10 else 5

        # for each module idenify all positions where rel. distances to it are given
        self.p_f_m = defaultdict(list)
        for i in range(self.num_cluster):
            pos_m = []
            for j in range(i + 1, self.num_cluster):
                pos = self.num_cluster * i + j - ((i + 2) * (i + 1)) // 2
                pos_m.append(pos)
                self.p_f_m[j].append(pos)
            self.p_f_m[i] += pos_m

        # self.add_reactome_roots_to_modules(reactome_roots)
        initial_modules_center = self.get_module_centers(self.initial_node_pos)
        self.modules_center = initial_modules_center
        self.weights = self.getModulesWeights()

        self.relative_distances = self.getRealtiveDistancesBetweenModules(
            self.get_module_centers(self.positions_dict_clustering)
        )
        print("Clusters identified")
        self.area_num_node_ratio_Pool()
        print(mod_length)
        print("Relative distances between modules and module weights calculated")

        self.final_node_pos = self.getNodePositions(pathways_root_names)
        print("final node positions identified")
        endTime = time.time()
        # self.get_stats()
        # self.get_stat_plots()
        print(
            "Time for Module Layout calculation {:.3f} s".format((endTime - startTime))
        )

    def area_num_node_ratio_Pool(self):
        self.modules_area, initial_area_side_ratio = self.getSizeOfModulesRegion(
            self.modules_center
        )

        nn_a_comp = [
            a_r >= (nn_r - self.AN_RATIO * nn_r) and min_side >= self.MIN_SIDE_T
            for nn_r, [a_r, min_side] in zip(
                self.node_num_ratio, initial_area_side_ratio
            )
        ]
        found_ideal = True if sum(nn_a_comp) == len(nn_a_comp) else False
        self.min_nn_ratios = [
            nn_r - self.AN_RATIO * nn_r for nn_r in self.node_num_ratio
        ]
        (
            init_area_comp,
            num_area_w_greater_diff,
            init_diff_min_side_to_success,
            num_side_smaller,
        ) = self.calc_com_values(self.min_nn_ratios, initial_area_side_ratio, 0)
        initial_cost = self.evaluteCostFunction(self.modules_center)
        if not found_ideal:
            pool = Pool(self.pool_size)
            self.MAX_RUNS_PER_PROCESS = 15
            multiple_results = []
            simplified_func = partial(
                self.area_num_node_ratio_optFunc,
                area_comp=init_area_comp,
                num_area_w_greater_diff=num_area_w_greater_diff,
                num_side_smaller=num_side_smaller,
                diff_min_side_to_success=init_diff_min_side_to_success,
                modules_area=self.modules_area,
                initial_cost=initial_cost,
            )
            for result in pool.imap_unordered(
                simplified_func, [self.modules_center] * self.pool_size
            ):
                if result:  # first to succeed:
                    if result[0]:
                        print("POOL OPTI DONE ", result[3])
                        found_ideal = True
                        self.modules_area = result[3]
                        smallest_area_diff = result[1]
                        smalles_min_side_diff = result[2]
                        C_cost_best = result[4]
                        break
                    else:
                        multiple_results.append(result)
            pool.terminate()  # kill all remaining tasks
            # Wait for all processes to end:
            pool.join()
            # success, area_comp, diff_min_side_to_success, modules_area
        # with open('module_areas_03.pkl', "rb") as f:
        #     self.modules_area = pickle.load(f)

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
                    self.modules_area = result[3]
                    C_cost_best = result[4]
            print("suboptimal solution found: ")
            print("area_side_ratio", self.modules_area)
            print(
                "min_side/max side",
                [get_min_max_side(area, self.l_max) for area in self.modules_area],
            )
            print("node_num_ratio", self.node_num_ratio)

        # print("smallest_area_diff:", smallest_area_diff)
        # print("smalles_min_side_diff: ", smalles_min_side_diff)
        # print(self.l_max)
        # print('area/ side ratio / min_side', [get_area_size(ma, True, self.l_max) for ma in self.modules_area])
        # print("C_cost_best: ", C_cost_best)

        print("Module sizes identified")
        print("smallest_area_diff:", init_area_comp)
        print("smalles_min_side_diff: ", init_diff_min_side_to_success)
        print("innitial_rel_dist", self.relative_distances)
        print("initial_cost: ", initial_cost)
        print("self.node_num_ratio", self.node_num_ratio)
        print("initial_area_side_ratio", initial_area_side_ratio)
        print(
            "min_side",
            [get_area_size(ma, True, self.l_max)[1] for ma in self.modules_area],
        )

    def area_num_node_ratio_optFunc(
        self,
        initial_modules_center,
        area_comp,
        num_area_w_greater_diff,
        num_side_smaller,
        diff_min_side_to_success,
        modules_area,
        initial_cost,
    ):
        np.random.seed()
        runs = 0
        total_num_runs = 0
        success = False
        modules_center = initial_modules_center
        runtime_threshold_MS = 0
        prev_best_cost_C = initial_cost
        min_nn_ratios = self.min_nn_ratios
        found_better = 0
        while not success and total_num_runs <= self.MAX_RUNS_PER_PROCESS:
            best_cost_C, module_center = self.getModulePos(
                modules_center, prev_best_cost_C
            )
            try:
                new_modules_area, new_area_side_ratio = self.getSizeOfModulesRegion(
                    module_center
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
                    modules_area = new_modules_area
                    area_comp = 0
                    diff_min_side_to_success = 0
                elif runs == self.MAX_RUNS_PER_PROCESS / 2:
                    runs = 0
                    # start at random new position
                    module_center = np.random.uniform(0, 1, (self.num_cluster, 2))
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
                                    for area in new_modules_area
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
                        modules_area = new_modules_area
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
                mod_pairs = combinations(range(len(modules_center)), 2)
                mod_dists = {
                    m_p: sum(
                        [
                            abs(modules_center[m_p[0]][0] - modules_center[m_p[1]][0])
                            > 0.0001,
                            abs(modules_center[m_p[0]][1] - modules_center[m_p[1]][1])
                            > 0.0001,
                        ]
                    )
                    for m_p in mod_pairs
                }
                none_correct_dists = list(
                    sum(
                        [m_p for m_p, corr_dist in mod_dists.items() if corr_dist < 2],
                        (),
                    )
                )
                # makes sure that there is enough space too find a area for each module in divideSpaceForTwoModules()

                print(
                    "no possible area divide found with number of none correct distances",
                    none_correct_dists,
                )
                pass

        print("C_cost =", self.evaluteCostFunction(module_center))
        print("better Solutions found", found_better)

        return (
            success,
            area_comp,
            diff_min_side_to_success,
            modules_area,
            self.evaluteCostFunction(module_center),
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

    # defold values per omic and pos
    def fill_missing_values_with_neighbor_mean(
        self, graph_dict, defaul_means, root_ids
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
                    0 if any(s in ind for s in default_val_0) else defaul_means[ind[0]]
                )
                new_val = val
                if math.isnan(val):
                    # get Neighbor for nodes
                    neighbor_nodes = graph_dict[node_name]["outgoingEdges"]
                    node_vals_not_none = 0
                    calc_node_val = 0
                    for node_info in neighbor_nodes:
                        neighbor_name = node_info["target"]
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
    def get_umap_layout_pos(self, n_components=2, n_neighbors=5, min_dist=0.1):
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
        new_pos_norm = normalize_value_list_in_range(new_pos, [0, 1])
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
        get clusteres
        sort nodes, so that nodes in same Clusteres are together
        return list of list with one list for every cluster
        """
        num_features = len(self.data_table_scaled_filled[0])
        num_pathways = len(self.data_table_scaled_filled)
        if num_features > 2:
            n_comp = min(math.ceil(num_features / 2), 10)
            n_neighbors = 5 if num_pathways < 100 else 10 if num_pathways < 200 else 15
            positions_dict, position_list = self.get_umap_layout_pos(
                n_components=n_comp, n_neighbors=n_neighbors, min_dist=0
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
            simplified_func, range(4, 4 + self.pool_size)
        ):
            if result:
                # print('ss', result[0])
                if result[0] > ss:
                    ss = result[0]
                    clustering_labels = result[1]
        pool.close()
        pool.join()
        # a_file = open("clustering_labels_03.pkl", "wb")
        # pickle.dump([clustering_labels, positions_dict] , a_file)
        # a_file.close()
        # a_file = open("pos_dic_bad_cc_4.pkl", "wb")
        # pickle.dump(positions_dict , a_file)
        # with open('pos_dic_bad_cc_4.pkl', "rb") as f:
        #     positions_dict = pickle.load(f)
        # with open('clustering_labels_02.pkl', "rb") as f:
        #    clustering_labels, _ = pickle.load(f)
        # self.noise_cluster_exists = -1 in clustering_labels
        # print("best silhouette_score: ", ss)
        ordered_nodes = get_sorted_list_by_list_B_sorting_order(
            self.data_table.index, clustering_labels
        )
        nums_in_cl = list(dict(sorted(Counter(clustering_labels).items())).values())
        split_array = [sum(nums_in_cl[: i + 1]) for i, _ in enumerate(nums_in_cl)]
        cl_list = np.split(ordered_nodes, split_array)[:-1]

        return cl_list, max(clustering_labels) + 2, positions_dict

    def get_initial_node_pos(self, drm):
        """Get node positions using dimensionality reduction drm

        Args:
            drm: dimensionality reduction method

        """
        node_pos_dic, node_pos_list = (
            self.get_umap_layout_pos()
            if drm == "umap"
            else self.get_pca_layout_pos()[0]
        )
        return node_pos_dic, node_pos_list

    def getModulesWeights(self):
        """returns weights between all module-pairs equal to the number of nodes sharing edges between the"""
        num_modules = len(self.modules)
        weights = np.zeros((num_modules, num_modules))
        for module_pair in combinations(range(len(self.modules)), 2):
            num_edges = sum(
                [
                    self.full_graph.has_edge(n_1, n_2)
                    for n_1 in self.modules[module_pair[0]]
                    for n_2 in self.modules[module_pair[1]]
                ]
            )
            weights[module_pair[0], module_pair[1]] = num_edges
        return weights

    def get_module_centers(self, node_pos):
        """for every module get module center defined as the median position of all nodes in module

        Args:
            node_pos: Node Positions per pathway
        """
        module_centers = [
            [node_pos[pathway] for pathway in module] for module in self.modules
        ]
        module_centers = [
            list(map(list, zip(*module_coords))) for module_coords in module_centers
        ]
        module_centers_med = []
        for module_coords in module_centers:
            c_f_m = []
            for pos_per_dim in module_coords:
                c_f_m.append(np.median(pos_per_dim))
            module_centers_med.append(c_f_m)

        # module_centers = [[np.median(module_coords[0]),np.median(module_coords[1])] for module_coords in module_centers]
        return module_centers_med

    def getRealtiveDistancesBetweenModules(self, cur_module_centers):
        """
        1. get median node positions of all modules using UMAP
        2. calculated  Manhattan distance between all modules
        3. calculated distances as multiple of the distance between the node pair
            that has the smallest distance in the initial UMAP layout
        """
        all_vecs = [cur_module_centers[module] for module in range(len(self.modules))]

        all_distances = distance.pdist(all_vecs, "cityblock")
        if self.greatest_dist_in_initial_layout is None:
            self.greatest_dist_in_initial_layout = np.max(all_distances)

        max_distance = self.greatest_dist_in_initial_layout
        relative_distances = [dist / max_distance for dist in all_distances]

        return relative_distances

    def evaluateRelativDistanceSimilarity(self, original, new, dist_sim_threshold=0.1):
        """evaluate if modules have the same realtive distance as in the original clustering layout"""

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

    def evaluteCostFunction(self, cur_module_centers):
        """
        Parameter: Weight of module h and k w(h,k), Manhattan distance between module h and k d(h,k)
        C = sum over (w(h,k) * d(h,k))
        """
        num_modules = len(self.modules)
        distances = np.zeros((num_modules, num_modules))
        for module_pair in combinations(range(len(self.modules)), 2):
            distances[module_pair[0], module_pair[1]] = distance.cityblock(
                cur_module_centers[module_pair[0]], cur_module_centers[module_pair[1]]
            )

        C = sum(
            sum([np.array(w) * np.array(d) for w, d in zip(self.weights, distances)])
        )

        return C

    def getModulePos(self, modules_center, prev_best_C):
        """
        1. getModulesWeights
        2. getSizeOfModulesRegion
        3. initial module layout R given bei umap or pca
        4. repeat x times
            4.1 repeat until a positioning found which satifies the condition that modules don't overlap and relative distances are the same
                4.1.1 randomly move modules R1
            4.2 partly optimize R1
            4.3 R = R1 if C1 < C
        5. return R
        """
        internal_modules_center = modules_center
        best_C = (
            self.evaluteCostFunction(internal_modules_center)
            if prev_best_C is None
            else prev_best_C
        )
        iter_num = 0
        possibleLayout_found = False

        while iter_num <= self.num_cost_min_loops and not possibleLayout_found:
            new_module_centers = self.find_layout_with_best_possible_rel_dists(
                internal_modules_center
            )
            new_C = self.evaluteCostFunction(new_module_centers)
            if new_C < best_C or (
                iter_num == self.num_cost_min_loops and not possibleLayout_found
            ):
                possibleLayout_found = True
                internal_modules_center = new_module_centers
                best_C = new_C
            iter_num += 1
        return best_C, internal_modules_center

    def find_layout_with_best_possible_rel_dists(self, modules_center):
        distance_similarities = [0] * len(self.relative_distances)
        cur_mod_center = modules_center
        run = 0
        found_better_possible_center = False
        found_perfect_center = False
        while run <= self.num_best_dist_loops and not found_perfect_center:
            new_module_centers = [
                self.getNewModuleCenter(
                    module_center,
                    mn,
                    sum(distance_similarities[p] for p in self.p_f_m[mn]),
                )
                for mn, module_center in enumerate(cur_mod_center)
            ]
            new_rel_distances = self.getRealtiveDistancesBetweenModules(
                new_module_centers
            )

            (
                found_perfect_center,
                distance_similarities_new,
            ) = self.evaluateRelativDistanceSimilarity(
                self.relative_distances, new_rel_distances, self.dist_sim_threshold
            )
            if sum(distance_similarities_new) > sum(distance_similarities):
                distance_similarities = distance_similarities_new
                cur_mod_center = new_module_centers
                found_better_possible_center = True
            elif run == self.num_best_dist_loops and not found_better_possible_center:
                cur_mod_center = new_module_centers
            run += 1

        return cur_mod_center

    def getNewModuleCenter(self, module_center, mod_num, distance_similarities_value):
        # je mehr die distancen stimmen desto weniger wahrscheinlich wird das module center erschoben
        dist_bonus = (
            distance_similarities_value / (self.num_cluster) - 0.2
            if mod_num != 0
            else 0
        )
        change_pos = np.random.binomial(1, max(0.1, min(1, 0.1 + dist_bonus))) == 0
        new_center = module_center
        if change_pos:
            # max movement in neg/ pos x direction: m_c[0] - 0.1 / 1-m_c[0] -0.1
            for coord in [0, 1]:
                # move_in_neg_dir = np.random.binomial(1, 0.5) == 1
                # curve_half_width_neg = module_center[coord]
                # curve_half_width_pos = 1 - module_center[coord]
                # curve_half_width = curve_half_width_neg if (move_in_neg_dir and curve_half_width_neg > 0) or curve_half_width_pos <= 0 else curve_half_width_pos
                # normal_dist_vals = np.random.normal(0, curve_half_width/3, 501)
                new_center[coord] = np.random.uniform(0.1, 0.95)
                # shift_num_valid = False
                # while not shift_num_valid:
                #     shift_num = abs(normal_dist_vals[randint(0, 500)])
                #     shift_num_valid = shift_num != 0 and - curve_half_width <= shift_num <= curve_half_width
                # new_center[coord] = new_center[coord] - \
                #     shift_num if move_in_neg_dir else new_center[coord] + shift_num
        return new_center

    def getSizeOfModulesRegion(self, module_center):
        """
        calculate For dir for module
        get max nodes in vertical and horizontal position
        """

        l_max = 2 * math.sqrt(max(self.module_node_nums))
        self.l_max = l_max

        new_centers = [
            [mod_center[0] * l_max, mod_center[1] * l_max]
            for mod_center in module_center
        ]

        # module_x_y_distances = {
        #     max(
        #         abs(new_centers[m_p[0]][0] - new_centers[m_p[1]][0]),
        #         abs(new_centers[m_p[0]][1] - new_centers[m_p[1]][1]),
        #     ): m_p
        #     for m_p in combinations(range(len(new_centers)), 2)
        # }
        mod_id_sorted_by_num_nodes = [
            x
            for _, x in sorted(
                zip(self.module_node_nums, list(range(len(self.module_node_nums)))),
                reverse=True,
            )
        ]

        module_regions = self.divideSpaceForTwoModules(
            new_centers,
            # module_x_y_distances,
            [0, l_max, 0, l_max],
            list(range(self.num_cluster)),
            sum(self.module_node_nums),
            mod_id_sorted_by_num_nodes,
        )
        area_list = [[]] * self.num_cluster
        for (area, mod_num) in module_regions:
            area_list[mod_num] = area

        final_area_size = [get_area_size(area, True, l_max) for area in area_list]
        total_area = sum([size for size, _ in final_area_size])

        area_side_ratio = [
            [area / total_area, min_side] for area, min_side in final_area_size
        ]

        return area_list, area_side_ratio

    def divideSpaceForTwoModules(
        self,
        module_centers,
        # module_ia_x_y_distances,
        area_to_divide,
        modules_in_area,
        total_sum_nodes_in_area,
        mod_id_sorted_by_num_nodes,
    ):
        if len(modules_in_area) == 0:
            print(
                "############################################## I SHOULD NOT BE #####################################"
            )
            print(modules_in_area)
        if len(modules_in_area) == 1:
            return [[area_to_divide, modules_in_area[0]]]

        # get the two modules furthest away from each other

        # found_mod_pair = False
        # while not found_mod_pair:
        #     max_dist = max(module_ia_x_y_distances.keys())
        #     mod_pair = module_ia_x_y_distances[max_dist]
        #     found_mod_pair = set(mod_pair).issubset(modules_in_area)
        #     del module_ia_x_y_distances[max_dist]
        # else:
        mod_pair = []
        for mod in mod_id_sorted_by_num_nodes:
            if mod in modules_in_area:
                mod_pair.append(mod)
                if len(mod_pair) == 2:
                    break

        mod_1 = mod_pair[0]
        mod_2 = mod_pair[1]

        max_dist = max(
            abs(module_centers[mod_pair[0]][0] - module_centers[mod_pair[1]][0]),
            abs(module_centers[mod_pair[0]][1] - module_centers[mod_pair[1]][1]),
        )
        # max dist is on x axis
        x_dist = module_centers[mod_1][0] - module_centers[mod_2][0]
        y_dist = module_centers[mod_1][1] - module_centers[mod_2][1]
        area_1 = deepcopy(area_to_divide)
        area_2 = deepcopy(area_to_divide)
        if 0.9 < abs(x_dist) / abs(y_dist) < 1.1:
            max_dist = abs(x_dist) if np.random.binomial(1, 0.5) else abs(y_dist)
        # change x coord
        if max_dist == abs(x_dist):
            mod_1_area_pos_to_ad, mod_2_area_pos_to_ad, min_border_pos = (
                [1, 0, module_centers[mod_1][0]]
                if x_dist < 0
                else [0, 1, module_centers[mod_2][0]]
            )
        # change y coord
        else:
            y_dist = module_centers[mod_1][1] - module_centers[mod_2][1]
            mod_1_area_pos_to_ad, mod_2_area_pos_to_ad, min_border_pos = (
                [3, 2, module_centers[mod_1][1]]
                if y_dist < 0
                else [2, 3, module_centers[mod_2][1]]
            )

        (
            area_1_best,
            area_2_best,
            mods_in_area_1_best,
            num_nodes_area_2,
            num_nodes_area_1_best,
            num_nodes_area_2_best,
            score_min,
        ) = [[], [], [], [], 0, 0, inf]
        area_t_d_size = get_area_size(area_to_divide)
        for abst in np.arange(0.0005, max_dist - 0.0005, 0.001):
            area_1[mod_1_area_pos_to_ad] = min_border_pos + abst
            area_2[mod_2_area_pos_to_ad] = min_border_pos + abst
            mods_in_area_1 = [
                mod
                for mod in modules_in_area
                if mod_center_in_area(module_centers[mod], area_1)
            ]
            num_nodes_area_1 = sum(
                [self.module_node_nums[mod] for mod in mods_in_area_1]
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
                mods_in_area_1_best = deepcopy(mods_in_area_1)
                mods_in_area_2_best = [
                    mod for mod in modules_in_area if mod not in mods_in_area_1_best
                ]

                area_1_best = deepcopy(area_1)
                area_2_best = deepcopy(area_2)
                num_nodes_area_1_best = deepcopy(num_nodes_area_1)
                num_nodes_area_2_best = deepcopy(num_nodes_area_2)

        return self.divideSpaceForTwoModules(
            module_centers,
            # deepcopy(module_ia_x_y_distances),
            area_1_best,
            mods_in_area_1_best,
            num_nodes_area_1_best,
            mod_id_sorted_by_num_nodes,
        ) + self.divideSpaceForTwoModules(
            module_centers,
            # deepcopy(module_ia_x_y_distances),
            area_2_best,
            mods_in_area_2_best,
            num_nodes_area_2_best,
            mod_id_sorted_by_num_nodes,
        )

    def getNodePositions(self, pathways_root_names):
        """
        1. for all modules
            1.1 get force directed layout
            1.2. adjust position to module Region coordinates
        2. return node positions
        """
        node_positions = {}
        total_num_nodes = len(list(self.data_table.index))
        # with open('module_areas_03.pkl', "rb") as f:
        #     self.modules_area = pickle.load(f)
        for mod_num, (module, module_area) in enumerate(
            zip(self.modules, self.modules_area)
        ):
            sub_graph = self.full_graph.subgraph(module)
            module_node_positions = get_adjusted_force_dir_node_pos(
                sub_graph, mod_num, pathways_root_names, total_num_nodes
            )
            adjusted_node_positions = normalize_2D_node_pos_in_range(
                module_node_positions, module_area, True
            )

            node_positions = {**node_positions, **adjusted_node_positions}

        # for root, subpathways in reactome_roots.items():
        #     a_subpathways = [pathway for pathway in subpathways if pathway in node_positions.keys()]
        #     root_pos = [node_positions[subpathway] for subpathway in a_subpathways]
        #     # print(len(subpathways), len(a_subpathways))
        #     num_subpathways = len(a_subpathways)
        #     root_pos = [sum(subpathway_pos)/num_subpathways if pos!=2 else most_frequent(subpathway_pos) for pos, subpathway_pos in enumerate(zip(*root_pos))]
        #     node_positions[root] = root_pos

        return node_positions

    def get_final_node_positions(self):
        max_ext = 20
        node_positions = normalize_2D_node_pos_in_range(
            self.final_node_pos, [0, max_ext, 0, max_ext], True
        )
        mod_dic = {
            pathway: mod_num
            for mod_num, module in enumerate(self.modules)
            for pathway in module
        }
        for root, subpathways in self.reactome_roots.items():
            try:
                maj_mod_num = most_frequent(
                    [
                        mod_dic[pathway]
                        for pathway in subpathways
                        if pathway in mod_dic.keys()
                    ]
                )
            except:
                print(
                    "{} Is a Root with associated measurements NOT in subpathways".format(
                        root
                    )
                )
                maj_mod_num = -1
            node_positions[root] = [0, 0, maj_mod_num]

        return node_positions

    def get_module_areas(self):
        max_ext = 20

        flatten_list = list(map(list, zip(*self.modules_area)))

        min_x, max_x = [min(flatten_list[0]), max(flatten_list[1])]
        min_y, max_y = [min(flatten_list[2]), max(flatten_list[3])]
        norm_areas = [] if self.noise_cluster_exists else [[]]
        for mod in self.modules_area:
            norm_area = [
                normalize_val_in_range(mod[0], min_x, max_x, [0, max_ext]),
                normalize_val_in_range(mod[1], min_x, max_x, [0, max_ext]),
                normalize_val_in_range(mod[2], min_y, max_y, [0, max_ext]),
                normalize_val_in_range(mod[3], min_y, max_y, [0, max_ext]),
            ]
            norm_areas.append(norm_area)

        return norm_areas

    def get_stats(self):
        new_module_center = self.get_module_centers(self.final_node_pos)
        new_realtiv_dist = self.getRealtiveDistancesBetweenModules(new_module_center)
        _, distance_similarities = self.evaluateRelativDistanceSimilarity(
            self.relative_distances, new_realtiv_dist
        )
        final_area_size = [get_area_size(area) for area in self.modules_area]
        total_area = sum(final_area_size)
        area_nodes_ratio = [
            area / node_num
            for area, node_num in zip(final_area_size, self.module_nodes_num)
        ]
        node_num_ratio = [
            node_num / len(self.final_node_pos) for node_num in self.module_nodes_num
        ]
        area_ratio = [area / total_area for area in final_area_size]
        # print('old rel dist centers: ', ordered_org_rel_dist)
        # print('new rel dist centers: ', list(new_realtiv_dist.values()))
        # print('rel dis comparison: ', list(distance_similarities.values()))
        # print('num nodes in Module: ', self.module_nodes_num)
        # print("Node Num Ratio: ", node_num_ratio)
        # print("Area Size Ratio: ", area_ratio)
        # print("Area Num Nodes Ratio: ", area_nodes_ratio)
        # print('Areas: ', self.modules_area)

    # def get_stat_plots(self):
    #     df_imputed = pd.DataFrame(
    #         self.data_table_scaled_filled,
    #         columns=self.data_table.columns,
    #         index=self.data_table.index,
    #     )
    #     num_fig_cols = math.ceil(len(self.modules) / 2)
    #     # print(num_fig_cols)
    #     for col in df_imputed.columns:
    #         new_file_name = str(col) + "_stats.png"
    #         fig, ax = plt.subplots(nrows=2, ncols=num_fig_cols)
    #         fig.suptitle(col)
    #         for i, cluster_nodes in enumerate(self.modules):
    #             ax[i % 2, i // 2].hist(df_imputed.loc[cluster_nodes, col].values)
    #             ax[i % 2, i // 2].set_title("Cluster " + str(i))
    #             ax[i % 2, i // 2].set_ylabel("frequency")
    #         plt.savefig(new_file_name)
    #         plt.clf()


""" OLD """


def getSizeOfModulesRegion_old(self):
    """
    calculate For dir for module
    get max nodes in vertical and horizontal position
    """
    module_node_nums = [len(module) for module in self.modules]
    l_max = 2 * math.sqrt(max(module_node_nums))
    """
        # paper method
        set_areas = [[[mod_center[0]*l_max - math.sqrt(mod_l),mod_center[0]*l_max + math.sqrt(mod_l)], [mod_center[1]*l_max - math.sqrt(mod_l),mod_center[1]*l_max + math.sqrt(mod_l)]] for mod_center, mod_l in zip(self.modules_center,module_sizes)]
        """
    new_centers = [mod_center[0] * l_max for mod_center in self.modules_center]
    # sorting order ordering first by x and then by y
    sort_order = [
        pos
        for pos, _ in sorted(
            enumerate(new_centers),
            key=lambda en_coord: (en_coord[1][0], en_coord[1][1]),
        )
    ]
    new_centers_sorted = get_sorted_list_by_list_B_sorting_order(
        new_centers, sort_order
    )
    module_node_nums_sorted = get_sorted_list_by_list_B_sorting_order(
        module_node_nums, sort_order
    )

    # own technic
    # square: [x_min, x_max,  y_min, y_max]
    # start with module center with is nearest to 0/0
    total_area = [0, l_max, 0, l_max]
    set_areas = [total_area]
    mod_borders = {}
    for mod_wo_area_num, (mod_wo_area_center, mod_wo_area_size) in enumerate(
        zip(new_centers_sorted[1:], module_node_nums_sorted[1:])
    ):
        area_of_curr_mod = [total_area]
        new_mod_areas = []
        for mod_with_area_num, (
            mod_area,
            mod_with_area_center,
            mod_with_area_size,
        ) in enumerate(zip(set_areas, new_centers_sorted, module_node_nums_sorted)):
            if mod_center_in_area(mod_wo_area_center, mod_area):
                x_diff = mod_with_area_center[0] - mod_wo_area_center[0]
                y_diff = mod_with_area_center[1] - mod_wo_area_center[1]
                size_ratio = 1 - (
                    mod_with_area_size / (mod_with_area_size + mod_wo_area_size)
                )
                # adjust x coordinates of mod_area
                if abs(x_diff) > abs(y_diff):
                    mod_borders[(mod_wo_area_num, mod_with_area_num)] = "x"
                    if x_diff > 0:
                        border_x = mod_with_area_center[0] - x_diff * size_ratio
                        # adjust x_min of mod_with_area
                        mod_area[0] = (
                            border_x if border_x > mod_area[0] else mod_area[0]
                        )
                        # adjust x_max of curr mod_wo_area
                        area_of_curr_mod[1] = (
                            border_x
                            if border_x < area_of_curr_mod[1]
                            else area_of_curr_mod[1]
                        )
                    else:
                        # minus because X-diff is already negative
                        border_x = mod_with_area_center[0] - x_diff * size_ratio
                        # adjust x_max of mod_with_area
                        mod_area[1] = (
                            border_x if border_x < mod_area[1] else mod_area[1]
                        )
                        # adjust x_min of curr mod_wo_area
                        area_of_curr_mod[0] = (
                            border_x
                            if border_x > area_of_curr_mod[0]
                            else area_of_curr_mod[0]
                        )

                # adjust y coordinates of mod_area
                else:
                    mod_borders[(mod_wo_area_num, mod_with_area_num)] = "y"
                    if y_diff > 0:
                        border_y = mod_with_area_center[1] - y_diff * size_ratio
                        # adjust y_min of mod_with_area
                        mod_area[2] = (
                            border_y if border_y > mod_area[2] else mod_area[2]
                        )
                        # adjust y_max of curr mod_wo_area
                        area_of_curr_mod[3] = (
                            border_y
                            if border_y < area_of_curr_mod[3]
                            else area_of_curr_mod[3]
                        )
                    else:  # plus because X-diff is already negative
                        border_y = mod_with_area_center[1] - y_diff * size_ratio
                        # adjust y_max of mod_with_area
                        mod_area[3] = (
                            border_y if border_y < mod_area[3] else mod_area[3]
                        )
                        # adjust y_min of curr mod_wo_area
                        area_of_curr_mod[2] = (
                            border_y
                            if border_y > area_of_curr_mod[2]
                            else area_of_curr_mod[2]
                        )
            new_mod_areas.append(mod_area)
        new_mod_areas.append(area_of_curr_mod)

        set_areas = new_mod_areas

    mod_area_sizes = [get_area_size(area) for area in set_areas]
    mod_num_area_ratio = [size / num for num, size in zip(set_areas, mod_area_sizes)]
    # readjust areas by comparing number of node area ratio
    # for optimize_iter in range(len(mod_area_sizes)*10):
    #     mod_with_larges_ratio = np.argmax(mod_num_area_ratio)
    #     mods_with_border =

    # set_areas_order_adjusted = [ for org_pos in ]
    return set_areas


def get_pca_layout_pos(self, n_components=2):
    """Performs PCA on scaled data returns new n-D Positions in node dict and postion list of lists

    Args:
        n_components: number PCs
    """
    pca = PCA(n_components=n_components, random_state=random.randint(0, 1000))
    new_pos = pca.fit_transform(self.data_table_scaled_filled)
    new_pos_norm = normalize_value_list_in_range(new_pos, [0, 1])

    explained_variation = pca.explained_variance_ratio_
    print("Variance explained by PC1 = " + str(explained_variation[0]))
    print("Variance explained by PC2 = " + str(explained_variation[1]))
    pos_norm_dic_pca = {
        node_name: row
        for row, node_name in zip(new_pos_norm, list(self.data_table.index))
    }

    return pos_norm_dic_pca, new_pos_norm


def add_reactome_roots_to_modules(self, reactome_roots):
    """Add reactome roots to the cluster with the highst number of sub nodes from the root"""
    mod_dic = {
        pathway: mod_num
        for mod_num, module in enumerate(self.modules)
        for pathway in module
    }

    for root, subpathways in reactome_roots.items():
        maj_mod_num = most_frequent(
            [mod_dic[pathway] for pathway in subpathways if pathway in mod_dic.keys()]
        )
        self.modules[maj_mod_num] = np.append(self.modules[maj_mod_num], root)
