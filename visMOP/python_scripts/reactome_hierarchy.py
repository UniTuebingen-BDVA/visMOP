import json
import pathlib

import pickle
import os

class ReactomePathway:
    """ Pathway Class for ractome pathway entries

    Args:
        Reactome_sID: Stable Reactome ID for pathway

    """ 
    def __init__(self, reactome_sID, has_diagram):
        self.is_root= False
        self.is_leaf= False
        self.has_data = False
        self.has_diagram = has_diagram
        self.is_overview = True
        self.name= ''
        self.json_file = None
        self.graph_json_file = None
        self.reactome_sID= reactome_sID
        self.children = []
        self.subtree_ids = []
        self.measured_proteins = {}
        self.measured_genes = {}
        self.measured_metabolites = {}
        self.total_proteins = []
        self.total_metabolites = []
        self.maplinks = []
        self.parents= []
        self.level = -1
        self.root_id = ''
    def asdict(self):
        """ Returns Object as dictionary 
        """
        return {'reactome_sID': self.reactome_sID, 'children': self.children, 'parents': self.parents, 'is_leaf': self.is_leaf, 'is_root': self.is_root, 'level': self.level, 'root_id': self.root_id}        
    def assert_leaf_root_state(self):
        """ Checks if pathway is root or leaf 
        """
        if len(self.children) == 0:
            self.is_leaf= True
        if len(self.parents) == 0:
            self.is_root = True


class PathwayHierarchy(dict):
    """ Class for pathway hierarchy

    functions as main datastructure for reactome data
    """
    def __init__(self, *arg, **kw):
       super(PathwayHierarchy, self).__init__(*arg, **kw)
       self.levels = {}
    def add_hierarchy_levels(self):
        """ Adds hierarchy levels to all entries.
        With 0 Being root and each increase is one level further
        """
        for k,v in self.items():
            level = 0
            not_at_root = True
            next_elem = k
            parent_name = ''
            while not_at_root:
                if len(self[next_elem].parents) < 1:
                    not_at_root = False
                    parent_name = next_elem
                    break
                else:
                    level += 1
                    next_elem = self[next_elem].parents[0] # [0] is temp fix disregards more than one parent
            v.level = level
            v.root_id= next_elem
            if level in self.levels:
                self.levels[level].append(v.reactome_sID)
            else:
                self.levels[level] = [v.reactome_sID]


    def hierarchyInfo(self):
        """ Prints info about hierarchy

        """
        entries = len(self.keys()) 
        leafs = len([v for k,v in self.items() if v.is_leaf])
        roots = len([v for k,v in self.items() if v.is_root])
        return {'size': entries, 'leafs': leafs, 'roots': roots}

    def add_json_data(self, json_path):
        """ Adds json data to the pathways

        this includes names, aswell as detail level pathway information

        Args:
            json_path: path at which to find the json diagram files
        """
        current_level = 0

        while current_level in self.levels:
            current_level_ids = self.levels[current_level]
            current_level += 1
            for key in current_level_ids:
                entry = self[key]
                
                try:
                    with open(json_path / (key+'.json')) as fh:
                        json_file = json.load(fh)
                        entry.json_file = json_file
                        entry.name = json_file['displayName']
                except:
                    pass

                if entry.has_diagram:
                    with open(json_path / (key+'.graph.json')) as fh:
                        json_file = json.load(fh)
                        json_file = format_graph_json(json_file)
                        entry.graph_json_file = json_file
                        prot, molec, contained_maplinks, is_overview = get_contained_entities_graph_json(entry.graph_json_file['nodes'].keys(), entry.graph_json_file)
                        entry.total_proteins = prot
                        entry.total_metabolites = molec
                        entry.maplinks = contained_maplinks
                        entry.is_overview = is_overview

                else:
                    current_entry = entry
                    next_entry = entry.parents[0] #todo might cause problems (does not consider branches)
                    arrived_at_diagram = False
                    while not arrived_at_diagram:
                        current_entry = self[next_entry]
                        arrived_at_diagram = current_entry.has_diagram
                        if(len(current_entry.parents) > 0 ):
                            next_entry = current_entry.parents[0]
                        else:
                            if not arrived_at_diagram:
                                print('did not find diagram for: ', key)
                                arrived_at_diagram = True
                    prot, molec, contained_maplinks, is_overview, name = get_subpathway_entities_graph_json(current_entry.graph_json_file, key)
                    entry.name = name
                    entry.total_proteins = prot
                    entry.total_metabolites = molec
                    entry.maplinks = contained_maplinks
                    entry.is_overview = is_overview
    
    def aggregate_pathways(self):
        """ Aggregates data from low level nodes to higher level nodes
        
        as the supplied omics data is only mapped to leaf nodes, data has to be aggregated to the higher level nodes
        """
        for k, v in self.items():
            #if not v.is_leaf:
            subtree = self.get_subtree_target(v.reactome_sID)
            proteins = v.measured_proteins
            genes = v.measured_genes
            metabolites = v.measured_metabolites
            total_proteins = v.total_proteins
            total_metabolites = v.total_metabolites
            maplinks = v.maplinks
            subtree_ids = subtree
            subtree_ids.append(v.reactome_sID)
            tree_has_diagram = v.has_diagram
            for node in subtree:
                proteins = {**proteins, **self[node].measured_proteins}
                genes = {**genes, **self[node].measured_genes}
                metabolite = {**metabolites, **self[node].measured_metabolites}
                total_proteins.extend(self[node].total_proteins)
                total_metabolites.extend(self[node].total_metabolites)
                maplinks.extend(self[node].maplinks)
                if self[node].has_diagram:
                    tree_has_diagram = True
            v.measured_proteins = proteins
            v.measured_genes = genes
            v.measured_metabolites = metabolites
            v.total_proteins = list(set(total_proteins))
            v.total_metabolites = list(set(total_metabolites))
            v.maplinks = list(set(maplinks))
            v.subtree_ids = subtree_ids
            if ((len(v.measured_proteins) > 0) or (len(v.measured_genes) > 0) or (len(v.measured_metabolites) > 0)):
                v.has_data = True

    def get_subtree_target(self, tar_id):
        """ Gets all leaves found for target entry

        Args:
            tar_id: String: entry id for which to retrieve leaves
        """
        subtree = []
        self._subtree_recursive(tar_id,subtree)
        return subtree

    def _subtree_recursive(self, entry_id, subtree):
        """ Recursive function for leaf retrieval
        """
        if entry_id is not None:
            if len(self[entry_id].children) == 0:
                pass#leaves.append(entry_id)
            for elem in self[entry_id].children:
                self._subtree_recursive(elem, subtree)
            subtree.append(entry_id)

    def add_query_data(self, entity_data, query_type, query_key):
        """ Adds query data (i.e. experimental omics data, to hierarchy structure) 
        """
        current_reactome_id = entity_data['reactome_id']
        for pathway in entity_data["pathways"]:
            if self[pathway[0]].name == '': self[pathway[0]].name = pathway[1]
            if query_type == 'protein':
                if query_key in self[pathway[0]].measured_proteins:
                    self[pathway[0]].measured_proteins[query_key]['forms'][current_reactome_id] =  entity_data['name']
                else:
                    self[pathway[0]].measured_proteins[query_key] = {'measurement': entity_data['measurement'], 'forms':{current_reactome_id: entity_data['name']}}

            elif query_type == 'gene':
                if query_key in self[pathway[0]].measured_genes:
                    self[pathway[0]].measured_genes[query_key]['forms'][current_reactome_id] = entity_data['name']
                else:
                    self[pathway[0]].measured_genes[query_key] = {'measurement': entity_data['measurement'], 'forms':{current_reactome_id: entity_data['name']}}
            
            elif query_type == 'metabolite':
                if query_key in self[pathway[0]].measured_metabolites:
                    self[pathway[0]].measured_metabolites[query_key]['forms'][current_reactome_id] =  entity_data['name']
                else:
                    self[pathway[0]].measured_metabolites[query_key] = {'measurement': entity_data['measurement'], 'forms':{current_reactome_id: entity_data['name']}}
    def load_data(self, path, organism):
        """ Load hierarchy data into datastructure

            Args:
                path: path to data folder

                organism: 3 letter abbrev for target organism
        """
        diagram_files = os.listdir(path/'diagram')
        with open(path/'ReactomePathwaysRelation.txt') as fh:
           
            for line in fh:
                line_list = line.strip().split('\t')
                left_entry = line_list[0]
                right_entry = line_list[1]
                left_entry_has_diagram = left_entry + '.graph.json' in diagram_files
                right_entry_has_diagram = right_entry + '.graph.json' in diagram_files
                if(organism in left_entry):
                    if left_entry not in self.keys():
                        self[left_entry] = ReactomePathway(left_entry, left_entry_has_diagram)
                        self[left_entry].children.append(right_entry)
                    else:
                        self[left_entry].children.append(right_entry)
                    if right_entry not in self.keys():
                        self[right_entry] = ReactomePathway(right_entry, right_entry_has_diagram)
                        self[right_entry].parents.append(left_entry)
                    else:
                        self[right_entry].parents.append(left_entry)

        for k,v in self.items():
            v.assert_leaf_root_state()
        self.add_hierarchy_levels()
    
    def get_subtree_non_overview(self, tar_id):
        """ Gets all leaves found for target entry

        Args:
            tar_id: String: entry id for which to retrieve leaves
        """
        subtree = []
        self._get_subtree_non_overview_recursion(tar_id,subtree)
        return subtree

    def _get_subtree_non_overview_recursion(self, entry_id, subtree):
        """ Recursive function for leaf retrieval
        """
        if entry_id is not None:
            if not self[entry_id].is_overview:
                subtree.append(entry_id)
                return
            if self[entry_id].is_overview:
                for elem in self[entry_id].children:
                    self._get_subtree_non_overview_recursion(elem, subtree)


    def generate_overview_data(self, verbose):
        """ Generates data to be exported to the frontend
            Args:
                verbose: boolean: If total proteins/metabolite ids should be transmitted
            Returns:
                List of pathway overview entries, with each element being one pathway
                Dictionary of which query (accession Ids, e.g. uniprot/ensmbl) maps to which pathways
                List of pathways
                List of contained hierarchy nodes
        """
        out_data = []
        #pathway_ids = self.levels[level]
        pathway_ids = []
        for root in self.levels[0]:
            pathway_ids.extend(self.get_subtree_non_overview(root))
        pathway_ids.extend(self.levels[0])
        pathway_ids = list(set(pathway_ids))
        query_pathway_dict = {}
        pathway_dropdown = []
        root_ids = []
        for pathway in pathway_ids:
            entry = self[pathway]
            if entry.has_data:
                pathway_dict = {'pathwayName': '',
                'pathwayId': '',
                'rootId': '',
                'maplinks': [],
                'subtreeIds': [],
                'entries': {
                    'proteomics': {'measured':{}, 'total':0},
                    'transcriptomics': {'measured':{}, 'total':0},
                    'metabolomics': {'measured':{}, 'total':0}
                    }
                }
                pathway_dict['pathwayName'] = entry.name
                pathway_dict['pathwayId'] = entry.reactome_sID
                pathway_dict['rootId'] = entry.root_id
                root_ids.append(entry.root_id)
                pathway_dict['maplinks'] = entry.maplinks
                pathway_dict['subtreeIds'] = entry.subtree_ids
                pathway_dropdown.append({"text": entry.reactome_sID +" - "+ entry.name, "value" : entry.reactome_sID, "title": entry.name})

                pathway_dict['entries']['proteomics']['total'] = entry.total_proteins if verbose else len(entry.total_proteins)
                pathway_dict['entries']['transcriptomics']['total'] = entry.total_proteins if verbose else len(entry.total_proteins)
                pathway_dict['entries']['metabolomics']['total'] = entry.total_metabolites if verbose else len(entry.total_metabolites)

                for k, v in entry.measured_proteins.items():
                    name = v['forms'][list(v['forms'].keys())[0]].split(' [')[0]
                    pathway_dict['entries']['proteomics']['measured'][k] = {'id': k, 'value': v['measurement'], 'name': name}
                    if k in query_pathway_dict.keys():
                        query_pathway_dict[k].append(pathway)
                    else:
                        query_pathway_dict[k] = [pathway]
                for k, v in entry.measured_genes.items():
                    name = v['forms'][list(v['forms'].keys())[0]].split(' [')[0]
                    pathway_dict['entries']['transcriptomics']['measured'][k] = {'id': k, 'value': v['measurement'], 'name': name}
                    if k in query_pathway_dict.keys():
                        query_pathway_dict[k].append(pathway)
                    else:
                        query_pathway_dict[k] = [pathway]
                for k, v in entry.measured_metabolites.items():
                    name = v['forms'][list(v['forms'].keys())[0]].split(' [')[0]
                    pathway_dict['entries']['metabolomics']['measured'][k] = {'id': k, 'value': v['measurement'], 'name': name}
                    if k in query_pathway_dict.keys():
                        query_pathway_dict[k].append(pathway)
                    else:
                        query_pathway_dict[k] = [pathway]
                out_data.append( pathway_dict )
        return out_data, query_pathway_dict, pathway_dropdown, list(set(root_ids))

def format_graph_json(graph_json_file):
    """ Formats .graph.json nodes to be easily accessible in dictionary form with
        the keys being node Ids

        Args:
            graph_json_file: loaded graph.json file
        
        Returns:
            formatted json file dictionary
    """
    intermediate_node_dict = {}
    intermediate_edge_dict = {}
    intermediate_subpathway_dict = {}

    try:
        for v in graph_json_file['nodes']:
            intermediate_node_dict[v['dbId']] = v
    except:
        pass

    try:
        for v in graph_json_file['edges']:
            intermediate_edge_dict[v['dbId']] = v
    except:
        pass

    try:
        for v in graph_json_file['subpathways']:
            intermediate_subpathway_dict[v['dbId']] = v
    except:
        pass
    
    graph_json_file['nodes'] = intermediate_node_dict
    graph_json_file['edges'] = intermediate_edge_dict
    graph_json_file['subpathways'] = intermediate_subpathway_dict
    return graph_json_file

def get_contained_entities_graph_json(node_ids, formatted_json):
    """ Gets contained entities (protein/genes, molecules, maplinks)
        In order to properly generate the glyphs and links of the overview visualization,
        all contained entities and maplinks (non hierarchical links from one pathway to another)
        have to be caluclated for a given pathway.

        Args:
            formatted_json: json file formatted by 'format_graph_json'

        Return:
            contained_proteins: list of Ids ofcontained proteins/genes
            contained_molecules: list of Ids of contained molecules
            contained_maplinks: list of Ids of contained maplinks
            is_overview: boolean, is pathway overview (i.e. only contains maplinks)
    """
    contained_proteins = []
    contained_molecules = []
    contained_maplinks = []
    is_overview = True

    leaves_total = []
    for k in node_ids:
        leaves = get_leaves_graph_json(formatted_json['nodes'], k)
        leaves_total.extend(leaves)
    leaves_set = list(set(leaves_total))

    for leaf in leaves_total:
        entry = formatted_json['nodes'][leaf]
        if entry['schemaClass'] == 'EntityWithAccessionedSequence':
            contained_proteins.append(leaf)
            is_overview = False
        elif entry['schemaClass'] == 'Pathway':
            contained_maplinks.append(entry['stId'])
        else:
            contained_molecules.append(leaf)
            is_overview = False
    return contained_proteins, contained_molecules, contained_maplinks, is_overview

def get_subpathway_entities_graph_json(formatted_json, subpathwayID):
    """ Gets entities for subpathways from higherlevel pathways

        Args:
            formatted_json: formatted json file for SUPERPATHWAY
            subpathwayID: ID of sub-pathway to query

        Return:
            contained_proteins: list of Ids ofcontained proteins/genes
            contained_molecules: list of Ids of contained molecules
            contained_maplinks: list of Ids of contained maplinks
            name: name of query-sub-pathway

    
    """
    name = ''

    contained_events = []
    for k, v in formatted_json['subpathways'].items():
        # todo we can get pathway name here!!!
        if v['stId'] == subpathwayID:
            contained_events = v['events']
            name = v['displayName']
            break
    entities = []
    for event in contained_events:
        event_node = formatted_json['edges'][event]
        try:
            entities.extend(event_node['inputs'])
        except:
            pass
        try:
            entities.extend(event_node['outputs'])
        except:
            pass
        try:
            entities.extend(event_node['catalysts'])
        except:
            pass
        try:
            entities.extend(event_node['inhibitors'])
        except:
            pass

    contained_proteins, contained_molecules, contained_maplinks, is_overview = get_contained_entities_graph_json(entities, formatted_json)
    
    return contained_proteins, contained_molecules, contained_maplinks, is_overview, name

def get_leaves_graph_json(intermediate_node_dict, entry_id):
    """ Gets leaves of an .graph.json entry
        Reactome graphs can contain complexes, which in turn can contain
        a multide of proteins (or other entities), thus we have to descend
        to the leaves to identify the actual entites and count them.

        Args:
            intermediate_node_dict: node dictionary containing the graph nodes,
            entry_id: id for which to collect the leaves
        
        Returns:
            list of leaf-ids
    """
    leaves = []
    leaf_recursive_graph_json(intermediate_node_dict, entry_id, leaves)
    return leaves

def leaf_recursive_graph_json(intermediate_node_dict, entry_id, leaves):
    """ recursive function to get .graph.json leaves
    """
    if entry_id is not None:
        #print(intermediate_node_dict[entry_id]['children'])
        if 'children' not in intermediate_node_dict[entry_id]:
            leaves.append(entry_id)
        if 'children' in intermediate_node_dict[entry_id]:
            for elem in intermediate_node_dict[entry_id]['children']:
                leaf_recursive_graph_json(intermediate_node_dict, elem, leaves)
    else:
        print('end recursion')