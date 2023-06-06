from typing import (
    List,
    Tuple,
    Dict,
    Union,
    DefaultDict,
    TypeVar,
)
from collections import defaultdict
from visMOP.python_scripts.omicsTypeDefs import (
    LayoutSettingRecieved,
    LayoutSettingsRecieved,
)
from visMOP.python_scripts.create_overview import NodeAttributes
import matplotlib.pyplot as plt
import matplotlib as mpl

from functools import partial
import warnings
from statistics import mean
import pandas as pd
import numpy as np
import math
import networkx as nx
import time

from multiprocessing import Pool

from sklearn.preprocessing import StandardScaler

with warnings.catch_warnings():
    warnings.filterwarnings("ignore", category=NumbaDeprecationWarning)
    from umap import UMAP
from sklearn.cluster import OPTICS
from collections import Counter
from itertools import combinations
from scipy.spatial import distance
from sklearn import metrics
from visMOP.python_scripts.networkx_layouting import generate_networkx_dict
from visMOP.python_scripts.cluster_layout_types import UmapClusterSettings
import pandas as pd

from sklearn.ensemble import RandomForestClassifier

with warnings.catch_warnings():
    warnings.filterwarnings("ignore", category=NumbaDeprecationWarning)
import shap

T = TypeVar("T")

defaultVals = {}


def getClusterLayout(
    omics_recieved: List[bool],
    layout_targets: List[str],
    up_down_reg_limits: List[List[float]],
    data_col_used: List[str],
    statistic_data_complete: pd.DataFrame,
    pathway_connection_dict: dict[str, NodeAttributes],
    reactome_roots: DefaultDict[str, List[str]] = defaultdict(list),
    umap_cluster_settings: UmapClusterSettings = {
        "cluster_min_size_quotient": 80,
        "use_umap": True,
        "automatic_cluster_target_dimensions": True,
        "cluster_target_dimensions": 2,
        "umap_distance_metric": "correlation",
    },
):
    up_down_reg_means = {
        o: mean(limits) for o, limits in zip(["t", "p", "m"], up_down_reg_limits)
    }
    up_down_reg_means["n"] = 0
    # for diagramms
    statistic_data_user = statistic_data_complete.loc[:, data_col_used]
    try:
        cluster_layout = Cluster_layout(
            statistic_data_user,
            layout_targets,
            pathway_connection_dict,
            up_down_reg_means,
            reactome_roots,
            umap_cluster_settings,
        )
    except ValueError as e:
        print("LayoutError", e)
        return -1, -1
    return (
        cluster_layout.clusters,
        cluster_layout.clusters_center,
        cluster_layout.noise_cluster_exists,
    )


def get_layout_settings(
    settings: LayoutSettingsRecieved, timeseries_mode: str, omics_recieved: List[bool]
) -> Tuple[List[str], List[List[float]]]:
    """
    "common"
        "Number of values",
        "% regulated",
        "% unregulated",
        "% with measured value",

    "slope"
        "Mean Slope above limit",
        "Mean Slope below limit",
        "% slopes below limit",
        "% slopes above limit",
        "standard error above limit",
        "standard error below limit",
        "% standard error above limit",
        "% standard error below limit",
    ],
    "fc"
        "Mean expression above limit",
        "% values above limit",
        "Mean expression below limit ",
        "% values below limit ",


    """
    attributes: List[str] = []
    limits: List[List[float]] = []
    # print(settings.items())
    omics_recieved.append(True)
    omic: str
    recieved: bool
    layout_settings: LayoutSettingRecieved
    for recieved, (omic, layout_settings) in zip(omics_recieved, settings.items()):
        omic_limits = [float(i) for i in layout_settings["limits"]]
        limits.append(omic_limits)
        if recieved and omic != "nonSpecific ":
            attributes.extend([att["value"] for att in layout_settings["attributes"]])

        elif recieved:
            attributes.extend([att["value"] for att in layout_settings["attributes"]])

    return attributes, limits


def get_area_size(
    area: List[float], get_side_ratio_ok: bool = False, l_max: int = 1
) -> Tuple(float, float):
    """determine the area given array of min and max x and y positions

    Args:
        area: [x_min, x_max, y_min, y_max ]
        get_smallest_side: boolean to deterine whether to return legth of smallest side

    """

    x_side: float = area[1] - area[0]
    y_side: float = area[3] - area[2]
    area_size: float = x_side * y_side
    if not get_side_ratio_ok:
        return area_size
    min_side: float = normalize_val_in_range(min(x_side, y_side), 0, l_max, [0, 1])
    return area_size, min_side


def get_min_max_side(area: List[float], l_max: int) -> Tuple[float, float]:
    x_side: float = area[1] - area[0]
    y_side: float = area[3] - area[2]

    min_side: float = normalize_val_in_range(min(x_side, y_side), 0, l_max, [0, 1])
    max_side: float = normalize_val_in_range(max(x_side, y_side), 0, l_max, [0, 1])

    return min_side, max_side


def get_sorted_list_by_list_B_sorting_order(
    list_to_sort: List[T], sorting_list: List[T], reverse: bool = False
) -> List[T]:
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


def cluster_center_in_area(cluster_center: List[float], area: List[float]) -> bool:
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


def normalize_val_in_range(
    val: Union[int, float], min_val: float, max_val: float, val_space: List[float]
) -> float:
    """normalize Value in range

    Args:
        val: value to normalize
        min_val: minimal value in original value space
        max_val: maximal value in original value space
        val_space: Value space in which to normalise

    """
    numerator: float = (val_space[1] - val_space[0]) * (val - min_val)
    divisor: float = max_val - min_val
    if divisor == 0:
        return val_space[0]
    return numerator / divisor + val_space[0]


def normalize_value_list_in_range(
    points_pos: List[List[float]], norm_range: List[float]
) -> List[List[float]]:
    """normalize all values in list of lists in range

    Args:
        points_pos: list of lists of values to normalize
        norm_range: range to normalize to
    """
    # Transpose_list_ to that we have a list for each coordinate_dimension
    points_pos_per_dim: List[List[float]] = list(map(list, zip(*points_pos)))
    vals_all_axis = []
    for pos_in_dim in points_pos_per_dim:
        org_min, org_max = min(pos_in_dim), max(pos_in_dim)
        norm_vals = [
            normalize_val_in_range(val, org_min, org_max, norm_range)
            for val in pos_in_dim
        ]
        vals_all_axis.append(norm_vals)
    # Transpose_list back that we have again alls dim pos per point
    vals_all_axis_per_point: List[List[float]] = list(map(list, zip(*vals_all_axis)))
    return vals_all_axis_per_point


def normalize_2D_node_pos_in_range(
    node_positions: Dict[str, List[float]],
    x_y_ranges: List[float],
    with_cluster_num: bool = False,
) -> dict[str, list[float]]:
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
        umap_cluster_settings,
        node_size=2,
    ):
        self.pool_size = 8
        self.cluster_min_size_quotient = int(
            umap_cluster_settings["cluster_min_size_quotient"]
        )
        self.use_umap = umap_cluster_settings["use_umap"]
        self.umap_distance_metric = umap_cluster_settings["umap_distance_metric"]
        self.automatic_cluster_target_dimensions = umap_cluster_settings[
            "automatic_cluster_target_dimensions"
        ]
        self.cluster_target_dimensions = umap_cluster_settings[
            "cluster_target_dimensions"
        ]

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

        initial_clusters_center = self.get_cluster_centers(self.initial_node_pos)
        self.clusters_center = initial_clusters_center
        self.weights = self.getClustersWeights()

        self.relative_distances = self.getRealtiveDistancesBetweenClusters(
            self.get_cluster_centers(self.positions_dict_clustering)
        )
        print("Clusters identified")
        print(cluster_length)
        endTime = time.time()
        # self.get_stats()
        # self.get_stat_plots()
        print(
            "Time for Cluster Layout calculation {:.3f} s".format((endTime - startTime))
        )

    # default values per omic and pos
    def fill_missing_values_with_neighbor_mean(
        self, graph_dict, default_means, root_ids
    ):
        node_names = list(self.data_table.index)
        new_data = {}
        default_val_0 = ["numVals", "percent"]
        for node_name in node_names:
            new_node_vec = []
            for ind, val in zip(
                list(self.data_table.columns), self.data_table.loc[node_name]
            ):
                # kinda fishy, as default means are always 0
                # TODO get defaults working,
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
        self,
        log_arg: str,
        n_components: int = 2,
        n_neighbors: int = 5,
        min_dist: float = 0.1,
        norm_lower: float = 0,
        norm_upper: float = 1,
        metric: str = "correlation",
        output_metric: str = "correlation",
    ):
        """Performs UMAP on scaled data returns new normalizied in [0,1] n-D Positions in node dict and postion list of lists

        Args:
            n_components: number components
            n_neigherbors: Parameter for UMAP
            min_dist: Parameter for UMAP
        """
        print(
            f"Applying UMAP {log_arg} with n_components={n_components}, n_neighbors={n_neighbors}, min_dist={min_dist}, metric={metric}"
        )
        new_pos: List[List[float]] = UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            output_metric=metric,
            # random_state=10,
        ).fit_transform(self.data_table_scaled_filled)
        print("UMAP done")
        new_pos_norm = normalize_value_list_in_range(new_pos, [norm_lower, norm_upper])
        pos_norm_dic = {
            node_name: row
            for row, node_name in zip(new_pos_norm, list(self.data_table.index))
        }
        return pos_norm_dic, new_pos_norm

    def get_cluster_for_min_sample(self, min_samples, data, metric="euclidean"):
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
            data_for_sil,
            clustering_labels_for_sil,
            metric=metric,  # TODO metric is fixed
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
        print("Number of Features: ", num_features)
        print("Using UMAP: ", self.use_umap)
        print("Number of Pathways: ", num_pathways)
        if num_features > 2 and self.use_umap:
            n_comp = (
                min(math.ceil(num_features / 2), 10)
                if self.automatic_cluster_target_dimensions
                else self.cluster_target_dimensions
            )
            n_neighbors = 5 if num_pathways < 100 else 10 if num_pathways < 200 else 15
            positions_dict, position_list = self.get_umap_layout_pos(
                "for clustering",
                n_components=n_comp,
                n_neighbors=n_neighbors,
                min_dist=0,
                norm_lower=-125,
                norm_upper=125,
                metric=self.umap_distance_metric,
                output_metric="euclidean",
            )
        else:
            position_list = self.data_table_scaled_filled
            positions_dict = {
                node_name: row
                for row, node_name in zip(position_list, list(self.data_table.index))
            }
        pool = Pool(self.pool_size)
        simplified_func = partial(
            self.get_cluster_for_min_sample,
            data=position_list,
            metric="euclidean",
        )
        clustering_labels = None
        ss = -1
        for result in pool.imap_unordered(
            simplified_func,
            range(
                math.floor(
                    max(4, num_pathways / self.cluster_min_size_quotient)
                ),  # TODO make this a parameter
                math.floor(max(4, num_pathways / self.cluster_min_size_quotient))
                + self.pool_size,
            ),
        ):
            if result:
                # print('ss', result[0])
                if result[0] > ss:
                    ss = result[0]
                    clustering_labels = result[1]
        pool.close()
        pool.join()
        print("clustering labels", clustering_labels)
        self.noise_cluster_exists = -1 in clustering_labels

        ordered_nodes = get_sorted_list_by_list_B_sorting_order(
            self.data_table.index, clustering_labels
        )
        nums_in_cl = list(dict(sorted(Counter(clustering_labels).items())).values())
        split_array = [sum(nums_in_cl[: i + 1]) for i, _ in enumerate(nums_in_cl)]
        cl_list = np.split(ordered_nodes, split_array)[:-1]

        # test for random forest + SHAP values
        test = False
        mpl.use("Agg")
        plt.ioff()
        dataDF = pd.DataFrame.from_records(self.data_table_scaled_filled)
        dataDF.columns = self.data_table.columns.values
        forest_classifier = RandomForestClassifier()
        forest_classifier.fit(dataDF, clustering_labels)
        explainer = shap.TreeExplainer(forest_classifier)
        shap_values = explainer(dataDF)
        # shap.plots.waterfall(shap_values[0, :, 1], show=False)
        # plt.tight_layout()
        # plt.savefig("shap_all.png")
        # plt.close()
        for i in range((max(clustering_labels) + 2)):
            shap.plots.beeswarm(shap_values[:, :, i], show=False)
            plt.tight_layout()
            plt.savefig("shap_{}.png".format(i - 1))
            plt.close()
        return cl_list, max(clustering_labels) + 2, positions_dict

    def get_initial_node_pos(self):
        """Get node positions using dimensionality reduction drm

        Args:
            drm: dimensionality reduction method

        """
        node_pos_dic, node_pos_list = self.get_umap_layout_pos(
            "for visualization",
            metric=self.umap_distance_metric,
            output_metric="euclidean",
        )
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
