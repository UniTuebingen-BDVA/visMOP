import json
import sys
import pathlib
from typing import Dict, List, NotRequired, Tuple, TypedDict
import redis


class ReactomeDBEntry(TypedDict):
    """
    A TypedDict that describes an entry in the Reactome.

    Attributes:
        reactome_id (str): The Reactome ID for the entry.
        name (str): The name of the entry.
        pathways (List[Tuple[str, str]]): A list of tuples containing the pathway ID and name for the entry.
    """

    reactome_id: str
    name: str
    pathways: List[Tuple[str, str]]
    measurement: NotRequired[List[float]]


ReactomeQueryEntry = Dict[str, ReactomeDBEntry]
"""
A dictionary that maps Reactome IDs to ReactomeDBEntry objects.
"""


ReactomeDBOrganism = Dict[str, ReactomeQueryEntry]
"""
A dictionary that maps organism IDs to ReactomeQueryEntry objects.
"""


def populate_redis_mapping(file_path: str, mapping_file_name: str, omics_type: str):
    """generate Redis mapping objects from mapping files. This is function should be run when updating the reactome data

    Args:
        file_path: path to pickles
        mapping_file_name: mapping file name
        omics_type: omics type

    """
    data_path = pathlib.Path(file_path)
    database_2_reactome: Dict[str, ReactomeDBOrganism] = {}
    r = redis.Redis(host="localhost", port=6379, db=0)  # connect to local redis

    # mapping_file e.g. 'UniProt2Reactome_PE_Pathway.txt' for uniprot
    with open(data_path / mapping_file_name, encoding="utf8") as fh:
        for line in fh:
            line_split = line.strip().split("\t")
            query_ID = line_split[0]
            reactome_entity_ID = line_split[1]
            entity_name = line_split[2]
            reactome_pathway_ID = line_split[3]
            reactome_pathway_Name = line_split[5]
            organism = line_split[7].replace(" ", "_")
            if organism not in database_2_reactome:
                database_2_reactome[organism] = dict()
            # for non reactome ID query
            if query_ID in database_2_reactome[organism]:
                if reactome_entity_ID in database_2_reactome[organism][query_ID]:
                    database_2_reactome[organism][query_ID][reactome_entity_ID][
                        "pathways"
                    ].append((reactome_pathway_ID, reactome_pathway_Name))
                else:
                    database_2_reactome[organism][query_ID][reactome_entity_ID] = {
                        "reactome_id": reactome_entity_ID,
                        "name": entity_name,
                        "pathways": [(reactome_pathway_ID, reactome_pathway_Name)],
                    }
            else:
                database_2_reactome[organism][query_ID] = {}
                database_2_reactome[organism][query_ID][reactome_entity_ID] = {
                    "reactome_id": reactome_entity_ID,
                    "name": entity_name,
                    "pathways": [(reactome_pathway_ID, reactome_pathway_Name)],
                }
            # for reactome ID query
            if reactome_entity_ID in database_2_reactome[organism]:
                if (
                    reactome_entity_ID
                    in database_2_reactome[organism][reactome_entity_ID]
                ):
                    database_2_reactome[organism][reactome_entity_ID][
                        reactome_entity_ID
                    ]["pathways"].append((reactome_pathway_ID, reactome_pathway_Name))
                else:
                    database_2_reactome[organism][reactome_entity_ID][
                        reactome_entity_ID
                    ] = {
                        "reactome_id": reactome_entity_ID,
                        "name": entity_name,
                        "pathways": [(reactome_pathway_ID, reactome_pathway_Name)],
                    }
            else:
                database_2_reactome[organism][reactome_entity_ID] = {}
                database_2_reactome[organism][reactome_entity_ID][
                    reactome_entity_ID
                ] = {
                    "reactome_id": reactome_entity_ID,
                    "name": entity_name,
                    "pathways": [(reactome_pathway_ID, reactome_pathway_Name)],
                }
    for organism, entities in database_2_reactome.items():
        for entity, data in entities.items():
            r.hset(
                f"{omics_type}:{organism}", entity, json.dumps(data)
            )  # store data in redis


def populate_redis_diagram(file_path: str):
    """
    save the diagram json files in file_path to redis
    """
    data_path = pathlib.Path(file_path) / "diagram"
    r = redis.Redis(host="localhost", port=6379, db=1)  # connect to local redis
    for file in data_path.glob("*.json"):
        with open(file) as fh:
            data = json.load(fh)
            r.set(file.stem, json.dumps(data))


def populate_relations(file_path: str):
    """
    save the content, as a whole, from file_path/ReactomePathwaysRelation.txt to redis
    """
    data_path = pathlib.Path(file_path)
    r = redis.Redis(host="localhost", port=6379, db=2)  # connect to local redis
    with open(data_path / "ReactomePathwaysRelation.txt") as fh:
        data = fh.read()
        r.set("ReactomePathwaysRelation", data)


if __name__ == "__main__":
    # run with path_to_files, filename, omics_type as args
    omics_types = ["Ensembl", "UniProt", "ChEBI"]
    file_names = [
        "Ensembl2Reactome_PE_Pathway.txt",
        "UniProt2Reactome_PE_Pathway.txt",
        "ChEBI2Reactome_PE_Pathway.txt",
    ]
    populate_redis_diagram(sys.argv[1])
    populate_relations(sys.argv[1])
    for omics_type, file_name in zip(omics_types, file_names):
        populate_redis_mapping(sys.argv[1], file_name, omics_type)
