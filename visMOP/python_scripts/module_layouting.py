from pickle import TRUE
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from umap import UMAP
from sklearn.cluster import KMeans
import pandas as pd
import numpy as np
import math
import networkx as nx
from collections import Counter
from itertools import combinations
from scipy.spatial import distance
from visMOP.python_scripts.forceDir_layouting import get_pos_in_force_dir_layout
import scipy.stats as stats


class Module_layout:
    
    def __init__(self, data_table, graph_dict, drm = 'umap'):
        self.data_table = StandardScaler().fit_transform(self.fill_missing_values_with_neighbor_mean(graph_dict, data_table))
        self.initial_node_pos = self.get_initial_node_pos(drm)
        self.modules = self.get_cluster(self.data_table)
        self.modules_center = self.get_module_centers()
        self.modules_area = self.getSizeOfModulesRegion()
        self.relative_distances = self.getRealtiveDistancesBetweenModules(self.modules_center)
        self.fullGraph = nx.Graph(graph_dict)
        self.weights= self.getModulesWeights(self.modules, self.fullGraph)
        self.getModulePos()
        
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

    def get_pca_layout_pos(self):
        pca = PCA(n_components=2)
        new_pos = pca.fit_transform(self.data_table)
        
        explained_variation = pca.explained_variance_ratio_
        print("Variance explained by PC1 = " + str(explained_variation[0]))
        print("Variance explained by PC2 = " + str(explained_variation[1]))
        pos_dic_pca = {node_name: row for row, node_name in zip(
            new_pos, list(self.data_table.index))}
        norm_vals_dict = self.normalizeNodePositionInRange(pos_dic_pca, [[0,1],[0,1]])
                        
        return norm_vals_dict

    def get_umap_layout_pos(self):
        new_pos = UMAP().fit_transform(self.data_table)
        pos_dic = {node_name: row for row, node_name in zip(
            new_pos, list(self.data_table.index))}
        norm_vals_dict = self.normalizeNodePositionInRange(pos_dic, [[0,1],[0,1]])
        return norm_vals_dict

    def get_cluster(self):

        kmeans = KMeans(n_clusters=5, random_state=0).fit_predict(self.data_table)
        ordered_nodes = [x for _, x in sorted(zip(kmeans, self.data_table.index))]
        nums_in_cl = list(dict(sorted(Counter(Y).items())).values())
        split_array = [sum(nums_in_cl[:i+1]) for i, _ in enumerate(nums_in_cl)]
        cl_list = np.split(ordered_nodes, split_array)
        return cl_list[:-1]

    def get_initial_node_pos(self, drm):
        node_pos = self.get_umap_layout_pos() if drm=='umap' else self.get_pca_layout_pos()
        return node_pos

    def getModulesWeights(self):
        '''
        weights between all module-pairs
        '''
        num_modules = len(self.modules)
        weights = np.zeros((num_modules,num_modules))
        for module_pair in combinations(range(len(self.modules)), 2):
            self.module_pair_order.append(module_pair)
            num_edges = sum([self.full_graph.has_edge(n_1,n_2) for n_1 in self.modules[module_pair[0]] for n_2 in self.modules[module_pair[1]]])
            weights[module_pair[0], module_pair[1]] = num_edges
            weights[module_pair[1], module_pair[0]] = weights[module_pair[0], module_pair[1]]
        return weights

    def get_module_centers(self):
        module_centers = [np.median([self.initial_node_pos[pathway] for pathway in module]) for module in self.modules]
        return module_centers

    def getRealtiveDistancesBetweenModules(self, cur_module_centers):
        '''
        1. get median node positions of all modules using UMAP
        2. calculated  Manhattan distance between all modules
        3. calculated distances as multiple of the smallest distance
        '''
        all_distances = [distance.cityblock(cur_module_centers[module_pair[0]], cur_module_centers[module_pair[1]]) for module_pair in combinations(range(len(self.modules)), 2)]
        min_distance = min(all_distances)
        relative_distances = [dist/min_distance for dist in all_distances]
        return relative_distances

    def evaluteCostFunction(self, cur_module_centers):
        '''
        Parameter: Weight of module h and k w(h,k), Manhattan distance between module h and k d(h,k)
        C = sum over (w(h,k) * d(h,k)) 
        '''
        distances = [distance.cityblock(cur_module_centers[module_pair[0]], cur_module_centers[module_pair[1]]) for module_pair in combinations(range(len(self.modules)), 2)]
        C = sum([w*d for w, d in zip(self.weights, distances)])
        return C

    def getModulePos(self):
        '''
        1. getModulesWeights
        2. getSizeOfModulesRegion
        3. initial module layout R given bei umap or pca
        4. repeat x times 
            4.1 repeat until a positioning found which satifies the contrition that modules don't overlap and relative distances are the same 
                4.1.1 randomly move modules R1
            4.2 partly optimize R1
            4.3 R = R1 if C1 < C
        5. return R
        '''
        best_C = self.evaluteCostFunction(self.modules_center)
        
        distance_similarities = [1]*len(self.relative_distances)
        for maxiteration in range(100):
            noPossibleLayout = True    
            while(noPossibleLayout and maxiteration>0):
                cur_module_centers = [self.getNewModuleCenter(module_center, module_number, distance_similarities) for module_number, module_center in enumerate(self.modules_center)]
                new_rel_distances = self.getRealtiveDistancesBetweenModules(cur_module_centers)
                distance_similarities = self.evaluateRelativDistanceSimilarity(self.relative_distances, new_rel_distances)
                noPossibleLayout = sum(distance_similarities) == len(new_rel_distances)
            new_C = self.evaluteCostFunction(cur_module_centers)
            if new_C < best_C:
                self.modules_center = cur_module_centers
                best_C = new_C
                
    def getNewModuleCenter(self, module_center, module_number, distance_similarities):
        total_dist_sim = sum([sim if module_number in module_pair else 0 for module_pair,sim in distance_similarities.items()])
        change_pos = np.random.binom(1, 0.4 + total_dist_sim*0.03) == 0
        #norm_dist # von x: - module_center[0] + 0,1, 1,1 - module_center[0] same for y
        new_center = [module_center[0]  , module_center[1]]
        return 0   

        '''

            x = sample(10, 10)
            ind = rbinom(length(x), 1, 0.5) == 1
            x[ind] = x[ind] + rnorm(sum(ind), 0, 0.1)

        '''       
    def evaluateRelativDistanceSimilarity(self, original_dist, new_dist):
        distance_similarities = [(o_d-0.1*o_d)<= n_d <= (o_d+0.1*o_d) for o_d,n_d in zip(original_dist, new_dist)]
        return distance_similarities

        
    def getSizeOfModulesRegion(self):
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
        sort_order = [pos for pos, _ in sorted(enumerate(new_centers), key=lambda en_coord: (en_coord[1][0],en_coord[1][1]))]
        new_centers_sorted = self.get_sorted_list(new_centers, sort_order)
        module_node_nums_sorted = self.get_sorted_list(module_node_nums, sort_order)

        # own technic
        # square: [x_min, x_max,  y_min, y_max]
        # start with module center with is nearest to 0/0
        total_area = [0,l_max,0,l_max]
        set_areas = [total_area]
        mod_borders = {}
        for mod_wo_area_num, (mod_wo_area_center, mod_wo_area_size) in enumerate(zip(new_centers_sorted[1:], module_node_nums_sorted[1:])):
            area_of_curr_mod = [total_area]
            for mod_with_area_num, (mod_area, mod_with_area_center, mod_with_area_size) in enumerate(zip(set_areas, new_centers_sorted, module_node_nums_sorted)):
                if self.mod_center_in_area(mod_wo_area_center, mod_area):
                    x_diff = mod_with_area_center[0] - mod_wo_area_center[0]
                    y_diff = mod_with_area_center[1]- mod_wo_area_center[1]
                    size_ratio = 1 - (mod_with_area_size/(mod_with_area_size+mod_wo_area_size))
                    # adjust x coordinates of mod_area
                    if abs(x_diff) > abs(y_diff):
                        mod_borders[(mod_wo_area_num,mod_with_area_num)] = 'x'
                        if x_diff > 0:
                            border_x = mod_with_area_center[0] - x_diff * size_ratio
                            # adjust x_min of mod_with_area
                            mod_area[0] = border_x if border_x > mod_area[0] else mod_area[0]
                            # adjust x_max of curr mod_wo_area
                            area_of_curr_mod[1] = border_x if border_x < area_of_curr_mod[1] else area_of_curr_mod[1]
                        else: 
                            # minus because X-diff is already negative
                            border_x = mod_with_area_center[0] - x_diff * size_ratio
                            # adjust x_max of mod_with_area
                            mod_area[1] = border_x if border_x < mod_area[1] else mod_area[1]
                            # adjust x_min of curr mod_wo_area
                            area_of_curr_mod[0] = border_x if border_x > area_of_curr_mod[0] else area_of_curr_mod[0]

                    # adjust y coordinates of mod_area    
                    else:
                        mod_borders[(mod_wo_area_num,mod_with_area_num)] = 'y'
                        if y_diff > 0:
                            border_y = mod_with_area_center[1] - y_diff * size_ratio
                            # adjust y_min of mod_with_area
                            mod_area[2] = border_y if border_y > mod_area[2] else mod_area[2]
                            # adjust y_max of curr mod_wo_area
                            area_of_curr_mod[3] = border_y if border_y < area_of_curr_mod[3] else area_of_curr_mod[3]                            
                        else: # plus because X-diff is already negative
                            border_y = mod_with_area_center[1] - y_diff * size_ratio
                            # adjust y_max of mod_with_area
                            mod_area[3] = border_y if border_y < mod_area[3] else mod_area[3]
                            # adjust y_min of curr mod_wo_area
                            area_of_curr_mod[2] = border_y if border_y > area_of_curr_mod[2] else area_of_curr_mod[2]                            
                new_mod_areas.append(mod_area)
            new_mod_areas.append(area_of_curr_mod)

            #readjust areas by comparing number of node area ratio
            set_areas = new_mod_areas

        mod_area_sizes = [self.get_area_size(area) for area in set_areas]
        mod_num_area_ratio = [size/num for num, size in zip(set_areas, mod_area_sizes)]
        
        for optimize_iter in range(len(mod_area_sizes)*10):
            mod_with_larges_ratio = np.argmax(mod_num_area_ratio)
            mods_with_border =                                 
        
        # set_areas_order_adjusted = [ for org_pos in ]
        return set_areas

    def get_area_size(area):
        area_size = (area[1]-area[0]) * (area[3]-area[2])
        return area_size

    def get_sorted_list(list_to_sort, sorting_order):
        sorted_list = [element for _, element in sorted(zip(sorting_order,list_to_sort))]
        return sorted_list

    def mod_center_in_area(mod_center, area):
        # area: [x_min, x_max,  y_min, y_max]
        in_area = True if area[0] <= mod_center[0] <= area[1] and area[2] <= mod_center[1] <= area[3] else False
        return in_area

    def normalize_in_range(self, val, min_val, max_val, val_space):
        numerator = (val_space[1]-val_space[0]) * (val-min_val)
        devisor = max_val - min_val 
        if devisor == 0:
            return val_space[0] 
        return numerator/devisor + val_space[0]


    def normalizeNodePositionInRange(self, node_positions, x_y_ranges):
        x_vals = [val[0] for key, val in node_positions.items()]
        y_vals = [val[1] for key, val in node_positions.items()]

        min_x, max_x, min_y, max_y = min(x_vals), max(x_vals), min(y_vals), max(y_vals)

        adjusted_node_positions = {node: [self.normalize_in_range(xy[0], min_x, max_x, (x_y_ranges[0][0],x_y_ranges[0][1])), self.normalize_in_range(
        xy[1], min_y, max_y, (x_y_ranges[1][0], x_y_ranges[1][1]))] for node, xy in node_positions.items()}
        return adjusted_node_positions

    def getNodePositions(self):
        '''
        1. for all modules 
            1.1 get force directed layout
            1.2. adjust position to module Region coordinates
        2. return node positions 
        '''
        node_positions = {}
        for module, module_area in zip(self.modules, self.modules_area):
            sub_graph = self.fullGraph.subgraph(module,0)
            module_node_positions = get_pos_in_force_dir_layout(sub_graph)
            adjusted_node_positions = self.normalizeNodePositionInRange(module_node_positions, module_area)
            node_positions = node_positions | adjusted_node_positions

        adjusted_to_ncd = self.normalizeNodePositionInRange(node_positions, [[-1,1], [-1,1]])

        return adjusted_to_ncd

    

