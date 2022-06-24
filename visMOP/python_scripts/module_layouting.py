from faulthandler import disable
import pandas as pd
import numpy as np
import math
import networkx as nx
import time
import matplotlib.pyplot as plt

from cmath import inf
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from umap import UMAP
from sklearn.cluster import KMeans, OPTICS
from collections import Counter
from itertools import combinations
from scipy.spatial import distance
from random import randint
from copy import deepcopy
from sklearn import metrics
from visMOP.python_scripts.forceDir_layouting import get_adjusted_force_dir_node_pos
from visMOP.python_scripts.kegg_parsing import generate_networkx_dict

def most_frequent(List):
    return max(set(List), key = List.count)

def optimal_number_of_clusters(wcss):
    x1, y1 = 2, wcss[0]
    x2, y2 = 20, wcss[len(wcss)-1]

    distances = []
    for i in range(len(wcss)):
        x0 = i+2
        y0 = wcss[i]
        numerator = abs((y2-y1)*x0 - (x2-x1)*y0 + x2*y1 - y2*x1)
        denominator = math.sqrt((y2 - y1)**2 + (x2 - x1)**2)
        distances.append(numerator/denominator)
    return distances.index(max(distances)) + 2

def get_area_size(area, get_smallest_side = False):
    x_side = area[1]-area[0]
    y_side = area[3]-area[2]
    area_size = x_side * y_side
    if not get_smallest_side:
        return area_size
    return area_size, min(x_side, y_side)

def get_sorted_list(list_to_sort, sorting_order):
    sorted_list = [element for _, element in sorted(
        zip(sorting_order, list_to_sort))]
    return sorted_list

def mod_center_in_area(mod_center, area):
    # area: [x_min, x_max,  y_min, y_max]
    in_area = area[0] <= mod_center[0] <= area[1] and area[2] <= mod_center[1] <= area[3]
    return in_area

def normalize_in_range(val, min_val, max_val, val_space):
    numerator = (val_space[1]-val_space[0]) * (val-min_val)
    devisor = max_val - min_val
    if devisor == 0:
        return val_space[0]
    return numerator/devisor + val_space[0]

def normalizeNodePositionInRange(node_positions, x_y_ranges, withModuleNum = False):
    x_vals = [val[0] for _, val in node_positions.items()]
    y_vals = [val[1] for _, val in node_positions.items()]

    min_x, max_x, min_y, max_y = min(x_vals), max(
        x_vals), min(y_vals), max(y_vals)
    if withModuleNum:
        adjusted_node_positions = {node: [normalize_in_range(xy[0], min_x, max_x, [x_y_ranges[0], x_y_ranges[1]]), normalize_in_range(
            xy[1], min_y, max_y, [x_y_ranges[2], x_y_ranges[3]]), xy[2]] for node, xy in node_positions.items()}
    else: 
        adjusted_node_positions = {node: [normalize_in_range(xy[0], min_x, max_x, [x_y_ranges[0], x_y_ranges[1]]), normalize_in_range(
            xy[1], min_y, max_y, [x_y_ranges[2], x_y_ranges[3]])] for node, xy in node_positions.items()}
    return adjusted_node_positions



class Module_layout:

    def __init__(self, data_table, graph_dict, up_down_reg_means, reactome_roots, pathways_root_names, drm='umap', node_size = 2):
        data_table.sort_index(inplace=True)
        # print(data_table.to_string())
        self.half_node_size = node_size / 2 
        startTime = time.time()
        self.module_nodes_num = []
        print("Calculating module layout...")
        networkx_dict = generate_networkx_dict(graph_dict)
        self.full_graph = nx.Graph(networkx_dict)
        reactome_root_ids = list(reactome_roots.keys())
        self.data_table = data_table.drop(reactome_root_ids)
        self.data_table_scaled_filled = StandardScaler().fit_transform(
            self.fill_missing_values_with_neighbor_mean(graph_dict, up_down_reg_means, reactome_root_ids))
        print("Scaled input data")
        print(self.data_table_scaled_filled)
        self.initial_node_pos, self.dim_red_res = self.get_initial_node_pos(drm)
        print("initial node positions calculated")
        self.modules, self.num_cluster, positions_higherD = self.get_cluster()
        print("Clusters identified")
        self.p_f_m = {}
        for i in range(self.num_cluster):
            pos_m = []
            for j in range(i+1, self.num_cluster):
                pos_m.append(self.num_cluster * i + j - ((i + 2) * (i + 1)) // 2)
            self.p_f_m[i] = pos_m
        initial_modules_center = self.get_module_centers(self.initial_node_pos)
        initial_modules_center_from_clustering = self.get_module_centers(positions_higherD)

        self.modules_center = initial_modules_center
        
        print("Cluster centers identified")
        self.module_pair_min_dist = None
        self.relative_distances = self.getRealtiveDistancesBetweenModules(
            initial_modules_center_from_clustering)
        self.mod_pairs_ordered_by_rel_dist_initial = self.get_mod_pair_ordered_by_rel_dist(self.relative_distances)
        self.add_reactome_roots_to_modules(reactome_roots)
        self.weights = self.getModulesWeights()
        initial_mC_cost = self.evaluteCostFunction(initial_modules_center)
        print(initial_mC_cost)
        print("Relative distances between modules and module weights calculated")
        area_num_node_ratio_ok = False
        prev_best_cost_C = None
        num_iterations = 1000
        while not area_num_node_ratio_ok:
            best_cost_C = self.getModulePos(prev_best_cost_C, num_iterations)
            print("Module Positions identified")
            self.modules_area, area_num_node_ratio_ok = self.getSizeOfModulesRegion()
            print("Module sizes identified ")
            num_iterations = num_iterations - 100 if num_iterations > 200 else 200
            if best_cost_C == prev_best_cost_C and not area_num_node_ratio_ok:
                # start at random new position?
                print('Start new!!!') 
                self.modules_center = np.random.uniform(0,1,(self.num_cluster,2))
                prev_best_cost_C = None
            else:
               prev_best_cost_C = best_cost_C
        self.final_node_pos = self.getNodePositions(pathways_root_names)
        print("final node positions identified")
        endTime = time.time()
        self.get_stats()
        # self.get_stat_plots()
        print("Time for Module Layout calculation {:.3f} s".format((endTime-startTime)))
        
    def get_mod_pair_ordered_by_rel_dist(self, rel_dists):
        all_mod_pair_comb = combinations(range(self.num_cluster), 2)
        mod_pair_ordered_by_rel_dist = [x for _, x in sorted(
            zip(rel_dists, all_mod_pair_comb))]
        return mod_pair_ordered_by_rel_dist

    def get_stats(self):
        new_module_center = self.get_module_centers(self.final_node_pos)
        new_realtiv_dist = self.getRealtiveDistancesBetweenModules(new_module_center)
        mod_pairs_ordered_by_rel_dist = self.get_mod_pair_ordered_by_rel_dist(new_realtiv_dist)
        _, distance_similarities = self.evaluateRelativDistanceSimilarity(
                    self.relative_distances , new_realtiv_dist)
        final_area_size = [get_area_size(area) for area in self.modules_area]
        total_area = sum(final_area_size)
        area_nodes_ratio = [area/node_num for area, node_num in zip(final_area_size, self.module_nodes_num)]
        node_num_ratio = [node_num/len(self.final_node_pos ) for node_num in self.module_nodes_num]
        area_ratio = [area/total_area for area in final_area_size]
        print('distance_similarities: ', distance_similarities)
        # print('old rel dist centers: ', ordered_org_rel_dist)
        # print('new rel dist centers: ', list(new_realtiv_dist.values()))
        # print('rel dis comparison: ', list(distance_similarities.values()))
        # print('num nodes in Module: ', self.module_nodes_num)
        print('Node Num Ratio: ', node_num_ratio)
        print('Area Size Ratio: ', area_ratio)
        print('Area Num Nodes Ratio: ', area_nodes_ratio)
        # print('Areas: ', self.modules_area)

    def get_stat_plots(self):
        df_imputed = pd.DataFrame(self.data_table_scaled_filled, columns=self.data_table.columns, index=self.data_table.index)
        num_fig_cols = math.ceil(len(self.modules)/2)
        # print(num_fig_cols)
        for col in df_imputed.columns:
            new_file_name = str(col) + '_stats.png'
            fig, ax  = plt.subplots(nrows=2, ncols= num_fig_cols)
            fig.suptitle(col)
            for i, cluster_nodes in enumerate(self.modules):
                ax[i%2,i//2].hist(df_imputed.loc[cluster_nodes, col].values)
                ax[i%2,i//2].set_title('Cluster ' + str(i))
                ax[i%2,i//2].set_ylabel('frequency')
            plt.savefig(new_file_name)
            plt.clf()

    # defold values per omic and pos
    def fill_missing_values_with_neighbor_mean(self, graph_dict, defaul_means, root_ids):
        node_names = list(self.data_table.index)
        new_data = {}
        default_val_0 = ['num values', 'pathway size', '%']
        for node_name in node_names:
            new_node_vec = []
            for ind, val in zip(list(self.data_table.columns), self.data_table.loc[node_name]):
                default_val = 0 if any(s in ind for s in default_val_0) else defaul_means[ind[0]]
                new_val = val
                if math.isnan(val):
                    # get Neighbor for nodes
                    neighbor_nodes = graph_dict[node_name]['outgoingEdges']
                    node_vals_not_none = 0
                    calc_node_val = 0
                    for node_info in neighbor_nodes:
                        neighbor_name = node_info['target']
                        neighbor_val = self.data_table.loc[neighbor_name][ind]
                        if not math.isnan(neighbor_val) and neighbor_name not in root_ids:
                            calc_node_val += neighbor_val
                            node_vals_not_none += 1
                    new_val = calc_node_val/node_vals_not_none if node_vals_not_none != 0 else default_val
                new_node_vec.append(new_val)
            new_data[node_name] = new_node_vec

        new_data_table = pd.DataFrame.from_dict(new_data, orient='index')
        print(new_data_table.to_string())
        return new_data_table

    def get_pca_layout_pos(self, n_components = 2):
        pca = PCA(n_components=n_components, random_state=10)
        new_pos = pca.fit_transform(self.data_table_scaled_filled)

        explained_variation = pca.explained_variance_ratio_
        print("Variance explained by PC1 = " + str(explained_variation[0]))
        print("Variance explained by PC2 = " + str(explained_variation[1]))
        pos_dic_pca = {node_name: row for row, node_name in zip(
            new_pos, list(self.data_table.index))}
        norm_vals_dict = normalizeNodePositionInRange(
            pos_dic_pca, [0, 1, 0, 1]) 

        return norm_vals_dict, new_pos

    #for clustering higer n_components and n_neighbors and lower min_dist
    def get_umap_layout_pos(self, n_components=2, n_neighbors = 30, min_dist=0):
        new_pos = UMAP(n_components=n_components, n_neighbors=n_neighbors, min_dist=min_dist, random_state=10).fit_transform(self.data_table_scaled_filled)
        pos_dic = {node_name: row  for row, node_name in zip(
            new_pos, list(self.data_table.index))}
        norm_vals_dict = normalizeNodePositionInRange(
            pos_dic, [0, 1, 0, 1]) # brauch ich das?
        return norm_vals_dict, new_pos
   
    '''
    get clusteres
    sort nodes, so that nodes in same Clusteres are together
    return list of list with one list for every cluster
    '''
    def get_cluster(self):
        num_features = len(self.data_table_scaled_filled[0])
        if num_features >= 2:
            n_comp = min(math.ceil(num_features / 2), 10)
            positions, data = self.get_umap_layout_pos(n_components=n_comp, n_neighbors = 15, min_dist=0)
        else:
            data = self.data_table_scaled_filled
        # if 2 < cluster_method_threshold:
        optics = OPTICS(min_samples=5, n_jobs=-1, min_cluster_size=0.05)
        optics_fit = optics.fit(data)
        clustering_labels = optics_fit.labels_
        print(clustering_labels)
        
        clustering_labels_ss = clustering_labels
        rand_cl_pos = [i for i,x in enumerate(clustering_labels_ss) if x == -1]
        if len(rand_cl_pos) != 0 and max(clustering_labels_ss)>1:
            data = np.delete(data, rand_cl_pos, axis=0)
            clustering_labels_ss = [x for x in clustering_labels if x != -1]
        ss = metrics.silhouette_score(data, clustering_labels_ss, metric='euclidean')
        print('silhouette_score', ss)
        # ss = metrics.silhouette_score(self.get_umap_layout_pos(n_components=2, n_neighbors = 15, min_dist=0)[1], clustering_labels_ss, metric='euclidean')
        # print('silhouette_score 2D', ss)

        ordered_nodes = [x for _, x in sorted(
            zip(clustering_labels, self.data_table.index))]
        nums_in_cl = list(
            dict(sorted(Counter(clustering_labels).items())).values())
        split_array = [sum(nums_in_cl[:i+1]) for i, _ in enumerate(nums_in_cl)]
        cl_list = np.split(ordered_nodes, split_array)[:-1]

        return cl_list, max(clustering_labels)+2, positions

    def add_reactome_roots_to_modules(self, reactome_roots):
        # add roots again 
        mod_dic = {}
        for mod_num, module in enumerate(self.modules):
            for pathway in module:
                mod_dic[pathway] = mod_num
        for root, subpathways in reactome_roots.items():
            maj_mod_num = most_frequent([mod_dic[pathway] for pathway in subpathways if pathway in mod_dic.keys()])
            self.modules[maj_mod_num] = np.append(self.modules[maj_mod_num], root)

    def get_initial_node_pos(self, drm):
        node_pos_dic, dim_red_res  = self.get_umap_layout_pos() if drm == 'umap' else self.get_pca_layout_pos()[0]
        return node_pos_dic, dim_red_res

    def getModulesWeights(self):
        '''
        weights between all module-pairs
        '''
        num_modules = len(self.modules)
        weights = np.zeros((num_modules, num_modules))
        for module_pair in combinations(range(len(self.modules)), 2):
            num_edges = sum([self.full_graph.has_edge(
                n_1, n_2) for n_1 in self.modules[module_pair[0]] for n_2 in self.modules[module_pair[1]]])
            weights[module_pair[0], module_pair[1]] = num_edges
        return weights

    def get_module_centers(self, node_pos):
        module_centers = [[node_pos[pathway]
                                     for pathway in module] for module in self.modules]
        module_centers = [list(map(list, zip(*module_coords))) for module_coords in module_centers]
        module_centers_med = []
        for module_coords in module_centers:
            c_f_m = []
            for pos_per_dim in module_coords:
                c_f_m.append(np.median(pos_per_dim))
            module_centers_med.append(c_f_m)
        print(module_centers_med)
        # module_centers = [[np.median(module_coords[0]),np.median(module_coords[1])] for module_coords in module_centers]
        return module_centers_med

    def getRealtiveDistancesBetweenModules(self, cur_module_centers):
        '''
        1. get median node positions of all modules using UMAP
        2. calculated  Manhattan distance between all modules
        3. calculated distances as multiple of the distance between the node pair 
            that has the smallest distance in the initial UMAP layout
        '''
        all_vecs = [cur_module_centers[module] for module in range(len(self.modules))]
        
        all_distances = distance.pdist(all_vecs, 'cityblock')
        if self.module_pair_min_dist is None:
            self.module_pair_min_dist = np.max(all_distances)

        max_distance = self.module_pair_min_dist # all_distances[self.module_pair_min_dist]
        relative_distances = [dist/max_distance for dist in all_distances]

        return relative_distances

    def evaluateRelativDistanceSimilarity(self, original, new):
        # distance_similarities = [mp_org == mp_new for mp_org, mp_new in zip(original, new)]
        distance_similarities = [(rd_org - 0.1) >= rd_new <= (rd_org + 0.1) for rd_org, rd_new in zip(original, new)]

        distance_similarities = [ds if m not in self.p_f_m[0] else True for m, ds in enumerate(distance_similarities)]

        dist_sim_sum = sum(distance_similarities)
        possibleLayout = dist_sim_sum == len(distance_similarities)
        return possibleLayout, distance_similarities


    def evaluteCostFunction(self, cur_module_centers):
        '''
        Parameter: Weight of module h and k w(h,k), Manhattan distance between module h and k d(h,k)
        C = sum over (w(h,k) * d(h,k)) 
        '''
        num_modules = len(self.modules)
        distances = np.zeros((num_modules, num_modules))
        for module_pair in combinations(range(len(self.modules)), 2):
            distances[module_pair[0], module_pair[1]] = distance.cityblock(cur_module_centers[module_pair[0]], cur_module_centers[module_pair[1]])

        C = sum(sum([np.array(w)*np.array(d) for w, d in zip(self.weights, distances)]))

        return C

    def getModulePos(self, prev_best_C, num_iterations):
        '''
        1. getModulesWeights
        2. getSizeOfModulesRegion
        3. initial module layout R given bei umap or pca
        4. repeat x times 
            4.1 repeat until a positioning found which satifies the condition that modules don't overlap and relative distances are the same 
                4.1.1 randomly move modules R1
            4.2 partly optimize R1
            4.3 R = R1 if C1 < C
        5. return R
        '''
        best_C = self.evaluteCostFunction(self.modules_center) if prev_best_C is None else prev_best_C 
        
        # all position where the distance to module x is calculated --> m * i + j - ((i + 2) * (i + 1)) // 2
        
        distance_similarities = [0] * len(self.mod_pairs_ordered_by_rel_dist_initial)
        iter_num = 0
        possibleLayout_found = True if num_iterations == 1000 else False 
        possibleLayout = False
        cur_mod_center = self.modules_center
        while iter_num < num_iterations and not possibleLayout_found:
            timeout = time.time() + 60
            while not possibleLayout:
                new_module_centers = [self.getNewModuleCenter(
                    module_center, mn, sum(distance_similarities[p] for p in self.p_f_m[mn])) for mn, module_center in enumerate(cur_mod_center)]
                new_rel_distances = self.getRealtiveDistancesBetweenModules(
                    new_module_centers)
                
                # mps_ordered_by_rel_dist = self.get_mod_pair_ordered_by_rel_dist(new_rel_distances)
                possibleLayout, distance_similarities_new = self.evaluateRelativDistanceSimilarity(
                    self.relative_distances, new_rel_distances)
                if sum(distance_similarities_new) > sum(distance_similarities):
                    print(sum(distance_similarities_new), len(distance_similarities_new))
                    distance_similarities = distance_similarities_new
                    cur_mod_center = new_module_centers
                if time.time() > timeout:
                    print('timeout')
                    timeout = time.time() + 60
                    distance_similarities = [ds if ds==0 else np.random.binomial(1, 0.8) for ds in distance_similarities ]
                
            new_C = self.evaluteCostFunction(new_module_centers)
            # new_C *= 0.95
            if new_C < best_C:
                possibleLayout_found = True
                print('new_C', new_C)
                self.modules_center = new_module_centers
                distance_similarities = distance_similarities_new
                best_C = new_C
            iter_num += 1
        print('best Costfunction value: ', best_C)
        return best_C

    def getNewModuleCenter(self, module_center, mod_num, distance_similarities_value):
        # je mehr die distancen stimmen desto weniger wahrscheinlich wird das cluster center erschoben
        dist_bonus = distance_similarities_value/(self.num_cluster) - 0.2 if mod_num != 0 else 0
        change_pos = np.random.binomial(1, max(0.1, min(1, 0.1 + dist_bonus))) == 0
        new_center = module_center
        if change_pos:
            # to make sure center is not at 0 /1: always substract 0.1?
            # max movement in neg/ pos x direction: m_c[0] - 0.1 / 1-m_c[0] -0.1
            for coord in [0, 1]:
                move_in_neg_dir = np.random.binomial(1, 0.5) == 1
                curve_half_width_neg = module_center[coord] 
                curve_half_width_pos = 1 - module_center[coord]
                curve_half_width = curve_half_width_neg if (move_in_neg_dir and curve_half_width_neg > 0) or curve_half_width_pos <= 0 else curve_half_width_pos
                normal_dist_vals = np.random.normal(0, curve_half_width/3, 501)
                shift_num_valid = False
                while not shift_num_valid:
                    shift_num = abs(normal_dist_vals[randint(0, 500)])
                    shift_num_valid = shift_num != 0 and - curve_half_width <= shift_num <= curve_half_width
                new_center[coord] = new_center[coord] - \
                    shift_num if move_in_neg_dir else new_center[coord] + shift_num
        return new_center

    def getSizeOfModulesRegion(self):
        '''
        calculate For dir for module
        get max nodes in vertical and horizontal position 
        '''
        module_node_nums = [len(module) for module in self.modules]
        self.module_nodes_num = module_node_nums
        l_max = 2 * math.sqrt(max(module_node_nums))
        # l_max = max(module_node_nums)

        new_centers = [[mod_center[0] * l_max, mod_center[1] * l_max] for mod_center in self.modules_center]
        # max_x_y = 2*max([val for xy in new_centers for val in xy])
        # get max distance between two modules, x or y
        # for m_p in combinations(range(len(new_centers)), 2):
        #     print(m_p)
        #     print(new_centers[m_p[0]])
            # print(max(abs(new_centers[m_p[0]][0]-new_centers[m_p[1]][0]),abs(new_centers[m_p[0]][1]-new_centers[m_p[1]][1])))
        module_x_y_distances = {max(abs(new_centers[m_p[0]][0]-new_centers[m_p[1]][0]),abs(new_centers[m_p[0]][1]-new_centers[m_p[1]][1])):m_p for m_p in combinations(range(len(new_centers)), 2)}
        for i in [0,1]:
            module_regions = self.divideSpaceForTwoModules(i, new_centers, module_node_nums, module_x_y_distances, [
                                                        0, l_max, 0, l_max], list(range(len(new_centers))), sum(module_node_nums))
            mod_id_sorted_by_num_nodes = [x for _, x in sorted(
                zip(module_node_nums, list(range(len(module_node_nums)))), reverse=True)]
            print(mod_id_sorted_by_num_nodes)
            area_list = [[]] * len(new_centers)
            for (area, mod_num) in module_regions:
                area_list[mod_num] = area
            # print(area_list)
            final_area_size = [get_area_size(area, True) for area in area_list]
            total_area = sum([size for size,_ in final_area_size])
            node_num_ratio = [node_num/sum(module_node_nums) for node_num in module_node_nums]
            area_ratio = [[area/total_area, normalize_in_range(min_side, 0, l_max, [0,1]) > 0.15 ] for area, min_side in final_area_size]
            nn_a_comp = [abs(nn_r-a_r) < 0.1 and (s_ok or len(n_in_m)<20) for nn_r, [a_r, s_ok], n_in_m in zip (node_num_ratio, area_ratio, self.modules)]
            success = True if sum(nn_a_comp)==len(nn_a_comp) else False
            print(i)
            print(nn_a_comp)
            print(area_ratio)
            print(node_num_ratio)
            if success:
                return area_list, success

        # print(node_num_ratio)
        

        return area_list, success

    def divideSpaceForTwoModules(self, init, module_centers, module_node_number, module_ia_x_y_distances, area_to_divide, modules_in_area, total_sum_nodes_in_area):
        if len(modules_in_area) == 1:
            return [[area_to_divide, modules_in_area[0]]]

        # get the two modules furthest away from each other
        if init == 0:
            found_mod_pair = False
            while not found_mod_pair:
                max_dist = max(module_ia_x_y_distances.keys())
                mod_pair = module_ia_x_y_distances[max_dist]
                found_mod_pair = set(mod_pair).issubset(modules_in_area)
                del module_ia_x_y_distances[max_dist]
        else:
            mod_id_sorted_by_num_nodes = [x for _, x in sorted(
                zip(module_node_number, list(range(len(module_node_number)))), reverse=True)] # von anfang an mitgeben
            mod_pair = []
            for mod in mod_id_sorted_by_num_nodes:
                if set([mod]).issubset(modules_in_area):
                    mod_pair.append(mod)
                    if len(mod_pair)==2:
                        break

        mod_1 = mod_pair[0]
        mod_2 = mod_pair[1]

        max_dist = max(abs(module_centers[mod_pair[0]][0]-module_centers[mod_pair[1]][0]),abs(module_centers[mod_pair[0]][1]-module_centers[mod_pair[1]][1]))
        # max dist is on x axis
        x_dist = module_centers[mod_1][0] - module_centers[mod_2][0]
        area_1 = deepcopy(area_to_divide)
        area_2 = deepcopy(area_to_divide)
        # change x coord
        if max_dist == abs(x_dist):
            mod_1_area_pos_to_ad, mod_2_area_pos_to_ad, min_border_pos = [1, 0, module_centers[mod_1][0]] if x_dist < 0 else [
                0, 1, module_centers[mod_2][0]]  # mod 2 x_min anpassen, mod 1 x_max anpassen
        # change y coord
        else:
            y_dist = module_centers[mod_1][1] - module_centers[mod_2][1]
            mod_1_area_pos_to_ad, mod_2_area_pos_to_ad, min_border_pos = [
                3, 2, module_centers[mod_1][1]] if y_dist < 0 else [2, 3, module_centers[mod_2][1]]

        area_1_best, area_2_best, mods_in_area_1_best, num_nodes_area_2, num_nodes_area_1_best, num_nodes_area_2_best, score_min = [
            [], [], [], [], 0, 0, inf]
        area_t_d_size = get_area_size(area_to_divide)
        for abst in np.arange(0.01, max_dist - 0.01, 0.01):
            area_1[mod_1_area_pos_to_ad] = min_border_pos + abst
            area_2[mod_2_area_pos_to_ad] = min_border_pos + abst
            mods_in_area_1 = [mod for mod in modules_in_area if mod_center_in_area(module_centers[mod], area_1)]
            num_nodes_area_1 = sum([module_node_number[mod] for mod in mods_in_area_1])
            num_nodes_area_2 = total_sum_nodes_in_area - num_nodes_area_1
            # score = abs(self.get_area_size(area_1)*num_nodes_area_2/total_sum_nodes_in_area -
            #             self.get_area_size(area_2)*num_nodes_area_1/total_sum_nodes_in_area)

            score = abs(get_area_size(area_1)/area_t_d_size - num_nodes_area_1/total_sum_nodes_in_area) + abs(get_area_size(area_2)/area_t_d_size -num_nodes_area_2/total_sum_nodes_in_area)

            if score < score_min:
                score_min = score
                mods_in_area_1_best = deepcopy(mods_in_area_1)
                mods_in_area_2_best = [mod for mod in modules_in_area if mod not in mods_in_area_1_best]
                area_1_best = deepcopy(area_1)
                area_2_best = deepcopy(area_2)
                num_nodes_area_1_best = deepcopy(num_nodes_area_1)
                num_nodes_area_2_best = deepcopy(num_nodes_area_2)
        print(score)
        return self.divideSpaceForTwoModules(init,module_centers, module_node_number, deepcopy(module_ia_x_y_distances), area_1_best, mods_in_area_1_best, num_nodes_area_1_best) + self.divideSpaceForTwoModules(init, module_centers, module_node_number, deepcopy(module_ia_x_y_distances), area_2_best, mods_in_area_2_best, num_nodes_area_2_best)

    def getNodePositions(self, pathways_root_names):
        '''
        1. for all modules 
            1.1 get force directed layout
            1.2. adjust position to module Region coordinates
        2. return node positions 
        '''
        node_positions = {}
        for mod_num, (module, module_area) in enumerate(zip(self.modules, self.modules_area)):
            sub_graph = self.full_graph.subgraph(module)
            module_node_positions = get_adjusted_force_dir_node_pos(sub_graph, mod_num, pathways_root_names)
            adjusted_node_positions = normalizeNodePositionInRange(
                module_node_positions, module_area, True)

            node_positions = {**node_positions, **adjusted_node_positions}
    
        # for root, subpathways in reactome_roots.items():
        #     a_subpathways = [pathway for pathway in subpathways if pathway in node_positions.keys()]
        #     root_pos = [node_positions[subpathway] for subpathway in a_subpathways]
        #     # print(len(subpathways), len(a_subpathways))
        #     num_subpathways = len(a_subpathways)
        #     root_pos = [sum(subpathway_pos)/num_subpathways if pos!=2 else most_frequent(subpathway_pos) for pos, subpathway_pos in enumerate(zip(*root_pos))]
        #     node_positions[root] = root_pos
            
        # kann man sich vllt sparen?
        # adjusted_to_ncd = normalizeNodePositionInRange(
        #     node_positions, [-1, 1, -1, 1])

        return node_positions
    
    def get_final_node_positions(self):
        # print(self.final_node_pos)
        return self.final_node_pos

    def get_module_areas(self):
        return self.modules_area


''' OLD '''

def getSizeOfModulesRegion_old(self):
    '''
    calculate For dir for module
    get max nodes in vertical and horizontal position 
    '''
    module_node_nums = [len(module) for module in self.modules]
    l_max = 2 * math.sqrt(max(module_node_nums))
    """
        # paper method
        set_areas = [[[mod_center[0]*l_max - math.sqrt(mod_l),mod_center[0]*l_max + math.sqrt(mod_l)], [mod_center[1]*l_max - math.sqrt(mod_l),mod_center[1]*l_max + math.sqrt(mod_l)]] for mod_center, mod_l in zip(self.modules_center,module_sizes)]
        """
    new_centers = [mod_center[0]*l_max for mod_center in self.modules_center]
    # sorting order ordering first by x and then by y
    sort_order = [pos for pos, _ in sorted(
        enumerate(new_centers), key=lambda en_coord: (en_coord[1][0], en_coord[1][1]))]
    new_centers_sorted = get_sorted_list(new_centers, sort_order)
    module_node_nums_sorted = get_sorted_list(
        module_node_nums, sort_order)

    # own technic
    # square: [x_min, x_max,  y_min, y_max]
    # start with module center with is nearest to 0/0
    total_area = [0, l_max, 0, l_max]
    set_areas = [total_area]
    mod_borders = {}
    for mod_wo_area_num, (mod_wo_area_center, mod_wo_area_size) in enumerate(zip(new_centers_sorted[1:], module_node_nums_sorted[1:])):
        area_of_curr_mod = [total_area]
        new_mod_areas = []
        for mod_with_area_num, (mod_area, mod_with_area_center, mod_with_area_size) in enumerate(zip(set_areas, new_centers_sorted, module_node_nums_sorted)):
            if mod_center_in_area(mod_wo_area_center, mod_area):
                x_diff = mod_with_area_center[0] - mod_wo_area_center[0]
                y_diff = mod_with_area_center[1] - mod_wo_area_center[1]
                size_ratio = 1 - (mod_with_area_size /
                                  (mod_with_area_size+mod_wo_area_size))
                # adjust x coordinates of mod_area
                if abs(x_diff) > abs(y_diff):
                    mod_borders[(mod_wo_area_num, mod_with_area_num)] = 'x'
                    if x_diff > 0:
                        border_x = mod_with_area_center[0] - \
                            x_diff * size_ratio
                        # adjust x_min of mod_with_area
                        mod_area[0] = border_x if border_x > mod_area[0] else mod_area[0]
                        # adjust x_max of curr mod_wo_area
                        area_of_curr_mod[1] = border_x if border_x < area_of_curr_mod[1] else area_of_curr_mod[1]
                    else:
                        # minus because X-diff is already negative
                        border_x = mod_with_area_center[0] - \
                            x_diff * size_ratio
                        # adjust x_max of mod_with_area
                        mod_area[1] = border_x if border_x < mod_area[1] else mod_area[1]
                        # adjust x_min of curr mod_wo_area
                        area_of_curr_mod[0] = border_x if border_x > area_of_curr_mod[0] else area_of_curr_mod[0]

                # adjust y coordinates of mod_area
                else:
                    mod_borders[(mod_wo_area_num, mod_with_area_num)] = 'y'
                    if y_diff > 0:
                        border_y = mod_with_area_center[1] - \
                            y_diff * size_ratio
                        # adjust y_min of mod_with_area
                        mod_area[2] = border_y if border_y > mod_area[2] else mod_area[2]
                        # adjust y_max of curr mod_wo_area
                        area_of_curr_mod[3] = border_y if border_y < area_of_curr_mod[3] else area_of_curr_mod[3]
                    else:  # plus because X-diff is already negative
                        border_y = mod_with_area_center[1] - \
                            y_diff * size_ratio
                        # adjust y_max of mod_with_area
                        mod_area[3] = border_y if border_y < mod_area[3] else mod_area[3]
                        # adjust y_min of curr mod_wo_area
                        area_of_curr_mod[2] = border_y if border_y > area_of_curr_mod[2] else area_of_curr_mod[2]
            new_mod_areas.append(mod_area)
        new_mod_areas.append(area_of_curr_mod)

        set_areas = new_mod_areas

    mod_area_sizes = [get_area_size(area) for area in set_areas]
    mod_num_area_ratio = [size/num for num,
                          size in zip(set_areas, mod_area_sizes)]
    # readjust areas by comparing number of node area ratio
    # for optimize_iter in range(len(mod_area_sizes)*10):
    #     mod_with_larges_ratio = np.argmax(mod_num_area_ratio)
    #     mods_with_border =

    # set_areas_order_adjusted = [ for org_pos in ]
    return set_areas
