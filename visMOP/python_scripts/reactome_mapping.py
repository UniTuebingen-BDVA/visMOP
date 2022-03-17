import pickle
import sys
import pathlib

def generate_pickles(file_path, mapping_file):
    """ generate pickle mapping objects from mapping files. This is function should be run when updating the reactome data

    Args:
        mapping_file: path to mapping file

    """
    data_path = pathlib.Path(file_path)
    database_2_reactome = {}
    # mapping_file e.g. 'UniProt2Reactome_PE_Pathway.txt' for uniprot
    with open(data_path / mapping_file, encoding="utf8") as fh:
        for line in fh:
            line_split = line.strip().split('\t')
            uniprot_ID = line_split[0]
            reactome_entity_ID = line_split[1]
            entity_name = line_split[2]
            reactome_pathway_ID = line_split[3]
            reactome_pathway_Name = line_split[5]
            organism = line_split[7].replace(' ', '_')
            if organism not in database_2_reactome:
                database_2_reactome[organism] = {}
            if uniprot_ID in database_2_reactome[organism]:
                if reactome_entity_ID in database_2_reactome[organism][uniprot_ID]:
                    database_2_reactome[organism][uniprot_ID][reactome_entity_ID]['pathways'].append((reactome_pathway_ID, reactome_pathway_Name))
                else:
                    database_2_reactome[organism][uniprot_ID][reactome_entity_ID] = {'reactome_id':reactome_entity_ID, 'name': entity_name, 'pathways': [(reactome_pathway_ID, reactome_pathway_Name)]}
            else:
                database_2_reactome[organism][uniprot_ID] = {}
                database_2_reactome[organism][uniprot_ID][reactome_entity_ID] = {'reactome_id':reactome_entity_ID, 'name': entity_name, 'pathways': [(reactome_pathway_ID, reactome_pathway_Name)]}
    for key in database_2_reactome.keys():
        with open(data_path / 'pickles' / '{}_{}.pickle'.format(key, mapping_file.split('_')[0]), 'wb') as handle:
            pickle.dump(database_2_reactome[key], handle, protocol=pickle.HIGHEST_PROTOCOL)

if __name__ == "__main__":
    # run with path_to_files, filename as args
    generate_pickles(sys.argv[1], sys.argv[2])