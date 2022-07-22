import pickle

class ReactomeQuery:
    """ Reactome Query class
    Maps the query (i.e. experimental omics data) to reactome data

    Args:
        query_data: placeholder (?) tuple of ({ID: QueryID, table_id: ID in table}, NUMBER) representing id and associated measurement value

        target_organism: full name organism (e.g. Mus_musculus, Homo_sapiens)

        id_database: database for which to map the ids to reactome (e.g. uniprot, ensmbl)

        pickle_path: path to pickle files

    """

    def __init__(self, query_data, target_organism, id_database, pickle_path):
        self.query_data = query_data
        self.query_results = {}
        self.id_table_id = {elem[0]['ID']: elem[0]['table_id'] for elem in query_data }
        self.all_contained_pathways = []
        self.get_query_results(target_organism, id_database, pickle_path)
        self.calc_all_pathways()

    def asdict(self):
        """ Return the ReactomeQuery as dictionary 
        """
        return {}        
    def get_query_results(self, target_organism, id_database, pickle_path):
        """ Load the query results

        Args:
            target_organism: full name organism (e.g. Mus_musculus, Homo_sapiens)

            id_database: database for which to map the ids to reactome (e.g. uniprot, ensmbl)

            pickle_path: path to picle files

        """
        with open(pickle_path / ('{}_{}2Reactome.pickle'.format(target_organism, id_database)), 'rb') as handle:
            reactome_data = pickle.load(handle)
            not_found = 0
            for elem in self.query_data:
                try:
                    reactome_elem = reactome_data[elem[0]['ID']]
                    for pathway_id in reactome_elem:
                        reactome_elem[pathway_id]['measurement'] = elem[1]
                    self.query_results[elem[0]['ID']] = reactome_elem
                except:
                    not_found += 1
            print("{} entries from {} were not found in REACTOME DB".format(not_found, id_database))

    def calc_all_pathways(self):
        """ Calculates the set of all reactome low level pathways contained in the query
        """
        pathways = []
        for k, v in self.query_results.items():
            for reactome_id, physical_entity in v.items():
                pathways.extend(physical_entity['pathways'])
        self.all_contained_pathways = list(set(pathways))

    def get_query_pathway_dict(self):
        """ generates a dict with k: entryID  v: pathways tuples (for lowlevel pathways, maybe deprecate)
        """
        query_pathway_dict = {}
        for k,v in self.query_results.items():
            pathways = []
            for entity_k, entity in v.items():
                pathway_ids = [elem[0]for elem in entity['pathways']]
                pathways.extend(pathway_ids)
            query_pathway_dict[self.id_table_id[k]] = list(set(pathways))
        return query_pathway_dict
    
    def get_measurement_levels(self):
        """ gets measurement levels of query
        """
        fold_changes = {}
        for k,v in self.query_results.items():
            k2, entry = list(v.items())[0]
            measurement_val = entry['measurement']
            fold_changes[k] = measurement_val
        return fold_changes
       
    def get_levels_of_query(self, hierarchy, level):
        """ gets level of all queried pathway
            probably deprecate
        """
        out_pathways = []
        for elem in self.all_contained_pathways:
            if hierarchy[elem[0]].level == level:
                out_pathways.append(elem)

        return out_pathways
        
        