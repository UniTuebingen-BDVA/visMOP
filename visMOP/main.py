from random import random
from collections import defaultdict
from flask import Flask, render_template, send_from_directory, request
from visMOP.python_scripts.utils import kegg_to_chebi
from visMOP.python_scripts.data_table_parsing import table_request, format_omics_data
from visMOP.python_scripts.create_overview import create_overview_data
from visMOP.python_scripts.reactome_hierarchy import ReactomeHierarchy
from visMOP.python_scripts.reactome_query import ReactomeQuery
from visMOP.python_scripts.omicsTypeDefs import (
    MeasurementData,
    OmicsInputVals,
    AllSliderVals,
    LayoutSettingsRecieved,
    OmicsDataTuples,
)

import pathlib
import json
from visMOP.python_scripts.cluster_layout import (
    get_layout_settings,
    getClusterLayout,
)
from typing import Dict, List, Tuple, DefaultDict

import secrets
from flask_caching import Cache
from multiprocessing import set_start_method


def create_app(
    redis_host: str = "localhost", redis_port: int = 6379, redis_pw: str = ""
):
    # seems to be needed for linux not sure why i need to force the start method tho
    set_start_method("spawn", force=True)

    app = Flask(__name__, static_folder="../dist/assets", template_folder="../dist")
    # DATA PATHS: (1) Local, (2) tuevis
    data_path = pathlib.Path().resolve()
    # data_path = pathlib.Path("/var/www/vismop")

    app.config.from_mapping(
        # this causes random key on each start, so a server restart will invaldiate sessions
        SECRET_KEY=secrets.token_hex(),
        # ONLY FOR DEV CHANGE TO NEW KEY WHEN DEPLOYING
        # SECRET_KEY = 'a3759c42d7a3317735ac032895d8abda630d2017f798a052c7e86f1c6eea3cc9',
        # !!!!!!
        CACHE_TYPE="FileSystemCache",
        CACHE_DIR=data_path / "session_cache",
        CACHE_DEFAULT_TIMEOUT=43200,
        ICON_FOLDER=data_path / "dist/icons",
    )
    cache = Cache(app)

    """
    Default app routes for index and favicon
    """

    @app.route("/icons/<path:filename>", methods=["GET"])
    def icons(filename: str):
        return send_from_directory(app.config["ICON_FOLDER"], filename)

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/favicon.ico", methods=["GET"])
    def fav():
        print(app.config["ICON_FOLDER"])
        return send_from_directory(app.config["ICON_FOLDER"], "favicon.ico")

    """
    APP ROUTES FOR THE DATATABLE
    """

    @app.route("/transcriptomics_table", methods=["POST"])
    def transcriptomics_table_recieve():
        json_data = table_request(request, cache, "transcriptomics_data_cache")
        return json_data

    @app.route("/proteomics_table", methods=["POST"])
    def prot_table_recieve():
        json_data = table_request(request, cache, "proteomics_data_cache")
        return json_data

    @app.route("/metabolomics_table", methods=["POST"])
    def metabolomics_table_recieve():
        json_data = table_request(request, cache, "metabolomics_data_cache")
        return json_data

    """
    App route for querying and parsing on reactome data
    """

    @app.route("/reactome_parsing", methods=["POST"])
    def reactome_parsing():
        """Generates reactome hierarchy and maps query data to it
        returns: json:


        """
        ###
        # Parse POST data
        ###
        # throw error if no data is recieved
        if not request.json:
            return json.dumps({"error": "no data recieved"})

        target_db: str = request.json["targetOrganism"]["value"]
        transcriptomics: OmicsInputVals = request.json["transcriptomics"]
        proteomics: OmicsInputVals = request.json["proteomics"]
        metabolomics: OmicsInputVals = request.json["metabolomics"]
        slider_vals: AllSliderVals = request.json["sliderVals"]
        layout_settings_recieved: LayoutSettingsRecieved = request.json[
            "layoutSettings"
        ]
        timeseries_mode = request.json["timeseriesMode"]
        cache.set("target_db", target_db)

        ##
        # Initialize Reactome Hierarchy
        ##
        omics_recieved = [
            transcriptomics["recieved"],
            proteomics["recieved"],
            metabolomics["recieved"],
        ]
        amt_timesteps: int = 2**10000
        if (
            transcriptomics["recieved"]
            and transcriptomics["amtTimesteps"] < amt_timesteps
        ):
            amt_timesteps = transcriptomics["amtTimesteps"]
        if proteomics["recieved"] and proteomics["amtTimesteps"] < amt_timesteps:
            amt_timesteps = proteomics["amtTimesteps"]
        if metabolomics["recieved"] and metabolomics["amtTimesteps"] < amt_timesteps:
            amt_timesteps = metabolomics["amtTimesteps"]

        reactome_hierarchy = ReactomeHierarchy(
            redis_host,
            redis_port,
            redis_pw,
            {
                "amt_timesteps": amt_timesteps,
                "omics_recieved": omics_recieved,
                "target_organism": target_db.upper(),
            },
        )

        ##
        # Add query Data to Hierarchy
        ##
        node_pathway_dict: Dict[str, List[str]] = {}
        fold_changes: Dict[str, Dict[str, MeasurementData]] = {
            "transcriptomics": {},
            "proteomics": {},
            "metabolomics": {},
        }
        chebi_ids: DefaultDict[str, List[str]] = defaultdict(list)
        ##
        # Add Proteomics Data
        ##
        if proteomics["recieved"]:
            proteomics_query_data_tuples: List[OmicsDataTuples] = []

            format_omics_data(
                proteomics["symbol"],
                slider_vals["proteomics"],
                "proteomics_data_cache",
                cache,
            )
            proteomics_cache_data = cache.get("proteomics_data_cache_filtered")
            proteomics_data = json.loads(
                proteomics_cache_data if proteomics_cache_data else "{}"
            )

            for ID_number in proteomics_data:
                entry = proteomics_data[ID_number]
                tuple_entry: OmicsDataTuples = (
                    {"ID": ID_number, "table_id": ID_number},
                    [entry[valCol] for valCol in proteomics["value"]],
                )
                proteomics_query_data_tuples.append(tuple_entry)
            # target organism is a little bit annoying at the moment
            tar_organism = "Mus_musculus" if target_db == "mmu" else "Homo_sapiens"
            print(tar_organism)
            protein_query = ReactomeQuery(
                proteomics_query_data_tuples,
                tar_organism,
                "UniProt",
            )
            fold_changes["proteomics"] = protein_query.get_measurement_levels()
            # add entries to hierarchy
            node_pathway_dict = {
                **node_pathway_dict,
                **protein_query.get_query_pathway_dict(),
            }
            for query_key, query_result in protein_query.query_results.items():
                for entity_data in query_result.values():
                    reactome_hierarchy.add_query_data(
                        entity_data, "protein", query_key, timeseries_mode
                    )
        ##
        # Add Metabolomics Data
        ##
        if metabolomics["recieved"]:
            metabolomics_query_data_tuples: List[OmicsDataTuples] = []

            format_omics_data(
                metabolomics["symbol"],
                slider_vals["metabolomics"],
                "metabolomics_data_cache",
                cache,
            )

            metabolomics_cache_data = cache.get("metabolomics_data_cache_filtered")
            metabolomics_dict = json.loads(
                metabolomics_cache_data if metabolomics_cache_data else "{}"
            )
            metabolomics_IDs = list(metabolomics_dict.keys())

            if any(
                (str(entry)[0] == "C") and (str(entry)[1] != "H")
                for entry in metabolomics_IDs
            ):
                chebi_ids = kegg_to_chebi(metabolomics_IDs)
                for k in chebi_ids.keys():
                    for entry in chebi_ids[k]:
                        tuple_entry: OmicsDataTuples = (
                            {"ID": entry, "table_id": k},
                            [
                                metabolomics_dict[k][valCol]
                                for valCol in metabolomics["value"]
                            ],
                        )
                        metabolomics_query_data_tuples.append(tuple_entry)
            else:
                for ID_entry in metabolomics_IDs:
                    # TODO handle KEGGIDS
                    ID_number = str(ID_entry).replace("CHEBI:", "")
                    tuple_entry: OmicsDataTuples = (
                        {"ID": ID_number, "table_id": ID_number},
                        [
                            metabolomics_dict[ID_entry][valCol]
                            for valCol in metabolomics["value"]
                        ],
                    )

                    metabolomics_query_data_tuples.append(tuple_entry)

            # target organism is a little bit annoying at the moment
            tar_organism = "Mus_musculus" if target_db == "mmu" else "Homo_sapiens"
            print(tar_organism)
            metabolite_query = ReactomeQuery(
                metabolomics_query_data_tuples,
                tar_organism,
                "ChEBI",
            )
            fold_changes["metabolomics"] = metabolite_query.get_measurement_levels()
            # add entries to hierarchy
            node_pathway_dict = {
                **node_pathway_dict,
                **metabolite_query.get_query_pathway_dict(),
            }

            for query_key, query_result in metabolite_query.query_results.items():
                for entity_data in query_result.values():
                    reactome_hierarchy.add_query_data(
                        entity_data, "metabolite", query_key, timeseries_mode
                    )
        ##
        # Add Transcriptomics Data Data
        ##
        if transcriptomics["recieved"]:
            transcriptomics_query_data_tuples: List[OmicsDataTuples] = []
            format_omics_data(
                transcriptomics["symbol"],
                slider_vals["transcriptomics"],
                "transcriptomics_data_cache",
                cache,
            )

            transcriptomics_cache_data = cache.get(
                "transcriptomics_data_cache_filtered"
            )
            transcriptomics_dict = json.loads(
                transcriptomics_cache_data if transcriptomics_cache_data else "{}"
            )

            transcriptomics_IDs = list(transcriptomics_dict.keys())
            for ID_number in transcriptomics_IDs:
                tuple_entry: OmicsDataTuples = (
                    {"ID": ID_number, "table_id": ID_number},
                    [
                        transcriptomics_dict[ID_number][valCol]
                        for valCol in transcriptomics["value"]
                    ],
                )
                transcriptomics_query_data_tuples.append(tuple_entry)

            # target organism is a little bit annoying at the moment
            tar_organism = "Mus_musculus" if target_db == "mmu" else "Homo_sapiens"
            print(tar_organism)
            # Some entries do not exist for ENMUSG but do exist for ENSMUSP
            transcriptomics_query = ReactomeQuery(
                transcriptomics_query_data_tuples,
                tar_organism,
                "Ensembl",
            )
            fold_changes[
                "transcriptomics"
            ] = transcriptomics_query.get_measurement_levels()
            # add entries to hierarchy
            node_pathway_dict = {
                **node_pathway_dict,
                **transcriptomics_query.get_query_pathway_dict(),
            }
            for query_key, query_result in transcriptomics_query.query_results.items():
                for entity_data in query_result.values():
                    reactome_hierarchy.add_query_data(
                        entity_data, "gene", query_key, timeseries_mode
                    )
        # Aggregate Data in Hierarchy, and set session cache
        ##
        reactome_hierarchy.aggregate_pathways()
        layout_settings = get_layout_settings(
            layout_settings_recieved, timeseries_mode, omics_recieved
        )
        cache.set("layout_settings", layout_settings)
        cache.set("reactome_hierarchy", reactome_hierarchy)

        # use add_regression_data_to_omics_data to add regression data to the fold_changes dict
        # add_regression_data_to_omics_data(fold_changes)

        out_dat = {
            "keggChebiTranslate": chebi_ids,
        }
        return json.dumps(out_dat)

    @app.route("/reactome_overview", methods=["POST"])
    def reactome_overview():
        """Generates and sends data to the frontend needed to display the reactome overview graph
        Returns:
            json string containting overview data and pathway layouting data
                overview data: list of pathways and their data
                pathway layouting:  list of pathways
                                    dictionary mapping query to pathway ids
                                    list of Ids belonging to root nodes
        """

        # raise error if request is empty
        if not request.json:
            raise TypeError("Request is empty")

        hierarchy_cache = cache.get("reactome_hierarchy")
        if hierarchy_cache is None:
            raise TypeError("Hierarchy cache is empty")

        reactome_hierarchy: ReactomeHierarchy = hierarchy_cache  # type: ignore Until flask_caching is updated

        layout_settings_cache = cache.get("layout_settings")
        if layout_settings_cache is None:
            raise TypeError("Layout settings cache is empty")

        layout_settings: Tuple[List[List[str]], List[List[float]]] = layout_settings_cache  # type: ignore Until flask_caching is updated

        layout_attributes_used: List[str]  #
        layout_limits: List[List[float]]
        layout_attributes_used, layout_limits = layout_settings

        umap_settings = {
            "cluster_min_size_quotient": request.json["cluster_min_size_quotient"],
            "use_umap": request.json["useUMAP"],
            "automatic_cluster_target_dimensions": request.json[
                "automaticClusterTargetDimensions"
            ],
            "cluster_target_dimensions": request.json["clusterTargetDimensions"],
            "umap_distance_metric": request.json["umapDistanceMetric"],
        }

        # user choice
        # up- and downregulation limits (limits_transriptomics, limits_proteomics, limits_metabolomics)
        print(layout_settings)
        # print(layout_limits, layout_attributes_used)
        (
            out_data,
            central_nodes,
            query_pathway_dict,
            dropdown_data,
            root_ids,
            root_subpathways,
            statistic_data_complete,
            omics_recieved,
        ) = reactome_hierarchy.generate_overview_data(
            layout_limits, False, request.json["timeseriesMode"]
        )
        pathway_connection_dict = create_overview_data(out_data, central_nodes)

        # cluster_node_pos, cluster_areas = getClusterLayout(

        clusters: any
        cluster_centers: any
        noiseClusterExists: bool

        clusters, cluster_centers, noiseClusterExists = getClusterLayout(
            omics_recieved,
            central_nodes,
            layout_limits,
            layout_attributes_used,
            statistic_data_complete,
            pathway_connection_dict,
            root_subpathways,
            umap_settings,
        )

        if clusters == -1:
            return {"exitState": 1, "ErrorMsg": "Value Error! Correct Organism chosen?"}
        # print("number of Clusters", len(cluster_areas))
        for pathway in out_data:
            # x_y_pos = cluster_node_pos[pathway["pathwayId"]]
            pathway["initialPosX"] = random()  # x_y_pos[0]
            pathway["initialPosY"] = random()  # x_y_pos[1]
            pathway["clusterNum"] = 0  # x_y_pos[2]
        clusters = [elem.tolist() for elem in clusters]
        # timepoint_analysis(clusters)
        # temporary?
        out_data_dict = {elem["pathwayId"]: elem for elem in out_data}

        return json.dumps(
            {
                "exitState": 0,
                "overviewData": out_data_dict,
                "clusterData": {
                    "clusters": clusters,
                    "clusterCenters": cluster_centers,
                    "noiseClusterExists": noiseClusterExists,
                },
                "pathwayList": dropdown_data,
                "queryToPathwayDictionary": query_pathway_dict,
                "rootIds": root_ids,
            }
        )

    @app.route("/get_reactome_json_files/<pathway>", methods=["GET"])
    def get_reactome_json(pathway: str) -> str:
        pathway = pathway.split("_")[0]
        hierarchy = cache.get("reactome_hierarchy")
        if hierarchy is None:
            raise TypeError("Hierarchy cache is empty")

        hierarchy: ReactomeHierarchy = hierarchy
        pathway_entry = hierarchy[pathway]
        if not pathway_entry.has_diagram:
            # fixes crash when pathways has no own diagram entry, this shouldnt happen tho?!
            pathway_entry = pathway_entry.diagram_entry
        layout_json = pathway_entry.layout_json_file
        graph_json = pathway_entry.graph_json_file
        inset_pathways_totals = {}
        inset_pathway_ID_transcriptomics = [
            [k, v["stableID"]]
            for k, v in pathway_entry.subdiagrams_measured_genes.items()
        ]
        inset_pathway_ID_proteomics = [
            [k, v["stableID"]]
            for k, v in pathway_entry.subdiagrams_measured_proteins.items()
        ]
        inset_pathway_ID_metabolomics = [
            [k, v["stableID"]]
            for k, v in pathway_entry.subdiagrams_measured_metabolites.items()
        ]

        for inset_pathway in (
            inset_pathway_ID_transcriptomics
            + inset_pathway_ID_proteomics
            + inset_pathway_ID_metabolomics
        ):
            inset_pathways_totals[inset_pathway[0]] = {
                "proteomics": len(hierarchy[inset_pathway[1]].total_proteins),
                "metabolomics": len(hierarchy[inset_pathway[1]].total_metabolites),
                "transcriptomics": len(hierarchy[inset_pathway[1]].total_proteins),
            }

        return json.dumps(
            {
                "layoutJson": layout_json,
                "graphJson": graph_json,
                "insetPathwayTotals": inset_pathways_totals,
            }
        )

    return app


if __name__ == "__main__":
    create_app().run(host="localhost", port=8000, debug=True)
