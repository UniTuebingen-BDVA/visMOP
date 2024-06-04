import json
import redis
from typing import Literal, Tuple, List, Dict
from visMOP.python_scripts.omicsTypeDefs import (
    OmicsDataTuples,
    ReactomeQueryEntry,
    MeasurementData,
)
from visMOP.python_scripts.reactome_hierarchy import ReactomeHierarchy


class ReactomeQuery:
    """
    A class representing a Reactome query.

    Args:
        query: The query string.
        target_organism: The full name of the organism (e.g. Mus_musculus, Homo_sapiens).
        id_database: The database for which to map the IDs to Reactome (e.g. uniprot, ensmbl).
        pickle_path: The path to the pickle files.

    Attributes:
        query: The query string.
        target_organism: The full name of the organism (e.g. Mus_musculus, Homo_sapiens).
        id_database: The database for which to map the IDs to Reactome (e.g. uniprot, ensmbl).
        pickle_path: The path to the pickle files.
        query_results: A dictionary containing the query results.
        id_table_id: A dictionary mapping IDs to table IDs.
        all_contained_pathways: A list of all Reactome low level pathways contained in the query.
    """

    def __init__(
        self,
        redis_host: str,
        redis_port: int,
        redis_pw: str,
        query_data: List[OmicsDataTuples],
        target_organism: Literal["Mus_musculus", "Homo_sapiens"],
        id_database: Literal["ChEBI", "UniProt", "Ensembl"],
    ):
        """ """
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.redis_pw = redis_pw
        self.query_data = query_data
        self.query_results: Dict[str, ReactomeQueryEntry] = {}
        self.id_table_id = {elem[0]["ID"]: elem[0]["table_id"] for elem in query_data}
        self.all_contained_pathways = []
        self.get_query_results(target_organism, id_database)
        self.calc_all_pathways()

    def get_query_results(
        self,
        target_organism: str,
        id_database: Literal["UniProt", "ChEBI", "Ensembl"],
    ) -> None:
        """Load the query results

        Args:
            target_organism: full name organism (e.g. Mus_musculus, Homo_sapiens)

            id_database: database for which to map the ids to reactome (e.g. uniprot, ensmbl)


        """
        r = redis.Redis(
            host=self.redis_host,
            port=self.redis_port,
            db=0,
            password=self.redis_pw,
        )  # connect to local redis
        not_found = 0
        for elem in self.query_data:
            query_id = elem[0]["ID"]
            reactome_elem_str = r.hget(f"{id_database}:{target_organism}", query_id)
            if reactome_elem_str is not None:
                reactome_elem = json.loads(
                    reactome_elem_str
                )  # convert string back to Python object

                for pathway_id in reactome_elem:
                    reactome_elem[pathway_id]["measurement"] = elem[1]
                    reactome_elem[pathway_id]["pathways"] = [
                        tuple(elem) for elem in reactome_elem[pathway_id]["pathways"]
                    ]
                self.query_results[query_id] = reactome_elem
            else:
                not_found += 1
        print(
            "{} entries from {} were not found in REACTOME DB".format(
                not_found, id_database
            )
        )

    def calc_all_pathways(self) -> None:
        """Calculates the set of all reactome low level pathways contained in the query"""
        pathways: List[Tuple[str, str]] = []
        for v in self.query_results.values():
            for physical_entity in v.values():
                pathways.extend(physical_entity["pathways"])
        self.all_contained_pathways = list(set(pathways))

    def get_query_pathway_dict(self) -> Dict[str, List[str]]:
        """generates a dict with k: entryID  v: pathways tuples (for lowlevel pathways, maybe deprecate)

        Returns:
            query_pathway_dict: dict with k: entryID v: pathways tuples"""
        query_pathway_dict: Dict[str, List[str]] = {}
        for k, v in self.query_results.items():
            pathways: List[str] = []
            for entity in v.values():
                pathway_ids = [elem[0] for elem in entity["pathways"]]
                pathways.extend(pathway_ids)
            query_pathway_dict[self.id_table_id[k]] = list(set(pathways))
        return query_pathway_dict

    def get_measurement_levels(self) -> Dict[str, MeasurementData]:
        """
        gets the measurement values for all queried pathways

        Returns:
            fold_changes: dict with k: entryID v: measurement values"""
        fold_changes: Dict[str, MeasurementData] = {}
        for k, v in self.query_results.items():
            _t1, entry = list(v.items())[0]
            measurement_val = entry.get("measurement")
            if measurement_val:
                fold_changes[k] = {"fc_values": []}
                fold_changes[k]["fc_values"] = measurement_val
        return fold_changes

    def get_levels_of_query(self, hierarchy: ReactomeHierarchy, level: int):
        """gets level of all queried pathway
        probably deprecate

        Args:
            hierarchy: reactome hierarchy
            level: level of pathway

        Returns:
            out_pathways: list of pathways at level
        """
        out_pathways: List[Tuple[str, str]] = []
        for elem in self.all_contained_pathways:
            if hierarchy[elem[0]].level == level:
                out_pathways.append(elem)

        return out_pathways
