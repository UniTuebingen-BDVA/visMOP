import json
import pathlib

import pickle

class ReactomePathway:
    """ Pathway Class for ractome pathway entries

    Args:
        Reactome_sID: Stable Reactome ID for pathway

    """ 
    def __init__(self, reactome_sID):
        self.is_root= False
        self.is_leaf= False
        self.has_data = False
        self.name= ''
        self.json_file = None
        self.graph_json_file = None
        self.reactome_sID= reactome_sID
        self.children= []
        self.measured_proteins = {}
        self.measured_genes = {}
        self.measured_metabolites = {}
        self.total_proteins = []
        self.total_metabolites = []
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
            partent_name = ''
            while not_at_root:
                if len(self[next_elem].parents) < 1:
                    not_at_root = False
                    partent_name = next_elem
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
        for key, entry in self.items():
            try:
                with open(json_path / (key+'.json')) as fh:
                    json_file = json.load(fh)
                    entry.json_file = json_file
                    entry.name = json_file['displayName']
            except:
                pass

            try:
                with open(json_path / (key+'.graph.json')) as fh:
                    json_file = json.load(fh)
                    json_file['nodes'] = format_content_graph_json(json_file)
                    entry.graph_json_file = json_file
                    prot, molec = get_contained_entities_graph_json(entry.graph_json_file)
                    entry.total_proteins = prot
                    entry.total_metabolites = molec
            except Exception as e:
                #print('Exception', e)
                pass
    
    def aggregate_pathways(self):
        """ Aggregates data from low level nodes to higher level nodes
        
        as the supplied omics data is only mapped to leaf nodes, data has to be aggregated to the higher level nodes
        """
        for k, v in self.items():
            if not v.is_leaf:
                leaves = self.get_leaves_target(v.reactome_sID)
                proteins = v.measured_proteins
                genes = v.measured_genes
                metabolites = v.measured_metabolites
                total_proteins = v.total_proteins
                total_metabolites = v.total_metabolites
                for leaf in leaves:
                    proteins = {**proteins, **self[leaf].measured_proteins}
                    genes = {**genes, **self[leaf].measured_genes}
                    metabolite = {**metabolites, **self[leaf].measured_metabolites}
                    total_proteins.extend(self[leaf].total_proteins)
                    total_metabolites.extend(self[leaf].total_metabolites)
                v.measured_proteins = proteins
                v.measured_genes = genes
                v.measured_metabolites = metabolites
                v.total_proteins = list(set(total_proteins))
                v.total_metabolites = list(set(total_metabolites))
            if ((len(v.measured_proteins) > 0) or (len(v.measured_genes) > 0) or (len(v.measured_metabolites) > 0)):
                v.has_data = True

    def get_leaves_target(self, tar_id):
        """ Gets all leaves found for target entry

        Args:
            tar_id: String: entry id for which to retrieve leafes
        """
        leaves = []
        self._leaf_recursive(tar_id,leaves)
        return leaves

    def _leaf_recursive(self, entry_id, leaves):
        """ Recursive function for leaf retrieval
        """
        if entry_id is not None:
            if len(self[entry_id].children) == 0:
                leaves.append(entry_id)
            for elem in self[entry_id].children:
                self._leaf_recursive(elem, leaves)

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
                path: path to "ReactomePathwaysRelation.txt" File

                organism: 3 letter abbrev for target organism
        """
        with open(path) as fh:
            for line in fh:
                line_list = line.strip().split('\t')
                left_entry = line_list[0]
                right_entry = line_list[1]
                if(organism in left_entry):
                    if left_entry not in self.keys():
                        self[left_entry] = ReactomePathway(left_entry)
                        self[left_entry].children.append(right_entry)
                    else:
                        self[left_entry].children.append(right_entry)
                    if right_entry not in self.keys():
                        self[right_entry] = ReactomePathway(right_entry)
                        self[right_entry].parents.append(left_entry)
                    else:
                        self[right_entry].parents.append(left_entry)

        for k,v in self.items():
            v.assert_leaf_root_state()
        self.add_hierarchy_levels()
    
    def generate_overview_data(self, level, verbose):
        out_data = []
        pathway_ids = self.levels[level]
        pathway_ids.extend(self.levels[0])
        for pathway in pathway_ids:
            entry = self[pathway]
            if entry.has_data:
                pathway_dict = {'pathwayName': '',
                'pathwayId': '',
                'rootId': '',
                'entries': {
                    'proteomics': {'measured':{}, 'total':0},
                    'transcriptomics': {'measured':{}, 'total':0},
                    'metabolomics': {'measured':{}, 'total':0}
                    }
                }
                
                pathway_dict['pathwayName'] = entry.name
                pathway_dict['pathwayId'] = entry.reactome_sID
                pathway_dict['rootId'] = entry.root_id

                pathway_dict['entries']['proteomics']['total'] = entry.total_proteins if verbose else len(entry.total_proteins)
                pathway_dict['entries']['transcriptomics']['total'] = entry.total_proteins if verbose else len(entry.total_proteins)
                pathway_dict['entries']['metabolomics']['total'] = entry.total_metabolites if verbose else len(entry.total_metabolites)

                for k, v in entry.measured_proteins.items():
                    name = v['forms'][list(v['forms'].keys())[0]].split(' [')[0]
                    pathway_dict['entries']['proteomics']['measured'][k] = {'id': k, 'value': v['measurement'], 'name': name}
                for k, v in entry.measured_genes.items():
                    name = v['forms'][list(v['forms'].keys())[0]].split(' [')[0]
                    pathway_dict['entries']['transcriptomics']['measured'][k] = {'id': k, 'value': v['measurement'], 'name': name}
                for k, v in entry.measured_metabolites.items():
                    name = v['forms'][list(v['forms'].keys())[0]].split(' [')[0]
                    pathway_dict['entries']['metabolomics']['measured'][k] = {'id': k, 'value': v['measurement'], 'name': name}
                out_data.append( pathway_dict )
        return out_data

def format_content_graph_json(json_file):
    intermediate_node_dict = {}

    for v in json_file['nodes']:
        intermediate_node_dict[v['dbId']] = v
    return intermediate_node_dict
def get_contained_entities_graph_json(formatted_json):
    contained_proteins = []
    contained_molecules = []

    leaves_total = []
    for k in formatted_json['nodes'].keys():
        leaves = get_leaves_graph_json(formatted_json['nodes'], k)
        leaves_total.extend(leaves)
    leaves_set = list(set(leaves_total))

    for leaf in leaves_total:
        entry = formatted_json['nodes'][leaf]
        if entry['schemaClass'] == 'EntityWithAccessionedSequence':
            contained_proteins.append(leaf)
        elif entry['schemaClass'] == 'Pathway':
            pass # TODO
        else:
            contained_molecules.append(leaf)
    return contained_proteins, contained_molecules

def get_leaves_graph_json(intermediate_node_dict, entry_id):
        leaves = []
        leaf_recursive_graph_json(intermediate_node_dict, entry_id, leaves)
        return leaves

def leaf_recursive_graph_json(intermediate_node_dict, entry_id, leaves):
    if entry_id is not None:
        #print(intermediate_node_dict[entry_id]['children'])
        if 'children' not in intermediate_node_dict[entry_id]:
            leaves.append(entry_id)
        if 'children' in intermediate_node_dict[entry_id]:
            for elem in intermediate_node_dict[entry_id]['children']:
                leaf_recursive_graph_json(intermediate_node_dict, elem, leaves)
    else:
        print('end recursion')