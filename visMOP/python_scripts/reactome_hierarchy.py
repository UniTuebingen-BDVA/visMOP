import json
import pathlib

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
        self.proteins = {}
        self.genes = {}
        self.metabolites = {}
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
            v.root_name = next_elem
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
                    entry.graph_json_file = json_file
            except:
                pass
    
    def aggregate_pathways(self):
        """ Aggregates data from low level nodes to higher level nodes
        
        as the supplied omics data is only mapped to leaf nodes, data has to be aggregated to the higher level nodes
        """
        for k, v in self.items():
            if not v.is_leaf:
                leaves = self.get_leaves_target(v.reactome_sID)
                proteins = {}
                genes = {}
                metabolites = {}
                for leaf in leaves:
                    proteins = {**proteins, **self[leaf].proteins}
                    genes = {**genes, **self[leaf].genes}
                    metabolite = {**metabolites, **self[leaf].metabolites}
                v.proteins = proteins
                v.genes = genes
                v.metabolites = metabolites
                if ((len(v.proteins) > 0) and (len(v.genes) > 0) and (len(v.metabolites) > 0)):
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
            self[pathway[0]].has_data = True
            if self[pathway[0]].name == '': self[pathway[0]].name = pathway[1]
            if query_type == 'protein':
                if query_key in self[pathway[0]].proteins:
                    self[pathway[0]].proteins[query_key]['forms'][current_reactome_id] =  entity_data['name']
                else:
                    self[pathway[0]].proteins[query_key] = {'measurement': entity_data['measurement'], 'forms':{current_reactome_id: entity_data['name']}}

            elif query_type == 'gene':
                if query_key in self[pathway[0]].genes:
                    self[pathway[0]].genes[query_key]['forms'][current_reactome_id] = entity_data['name']
                else:
                    self[pathway[0]].genes[query_key] = {'measurement': entity_data['measurement'], 'forms':{current_reactome_id: entity_data['name']}}
            
            elif query_type == 'metabolite':
                if query_key in self[pathway[0]].metabolites:
                    self[pathway[0]].metabolites[query_key]['forms'][current_reactome_id] =  entity_data['name']
                else:
                    self[pathway[0]].metabolites[query_key] = {'measurement': entity_data['measurement'], 'forms':{current_reactome_id: entity_data['name']}}
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
    
    def generate_overview_data(self, level):
        out_data = []
        pathway_ids = self.levels[level]
        for pathway in pathway_ids:
            pathway_dict = {'pathway_name': '', 'pathway_id': '', 'entries': {'proteomics': {}, 'metabolomics': {}, 'transctiptomics': {}}}