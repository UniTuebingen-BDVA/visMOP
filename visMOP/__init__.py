import math
from random import random
from flask import Flask, render_template, send_from_directory, request
from visMOP.python_scripts.utils import kegg_to_chebi
from visMOP.python_scripts.data_table_parsing import table_request, format_omics_data
from visMOP.python_scripts.create_overview import create_overview_data
from visMOP.python_scripts.reactome_hierarchy import PathwayHierarchy
from visMOP.python_scripts.reactome_query import ReactomeQuery

import pandas as pd
import pathlib
import json
from visMOP.python_scripts.cluster_layout import (
    get_layout_settings,
    getClusterLayout,
    timepoint_analysis,
)
from numpy.core.fromnumeric import mean

import secrets
from flask_caching import Cache
from multiprocessing import set_start_method

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
def icons(filename):
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
            "omicsRecieved": dictionary containing for which omics type data was recieved
            "used_symbol_cols" : dictionary containing string which indicate which column in the data-table contains the queried accession IDs
            "fcs": fold changes of the queries
    """
    ###
    # Parse POST data
    ###
    target_db = request.json["targetOrganism"]["value"]
    transcriptomics = request.json["transcriptomics"]
    proteomics = request.json["proteomics"]
    metabolomics = request.json["metabolomics"]
    slider_vals = request.json["sliderVals"]
    layout_settings = request.json["layoutSettings"]
    cache.set("target_db", target_db)

    ##
    # Initialize Reactome Hierarchy
    ##
    omics_recieved = [
        transcriptomics["recieved"],
        proteomics["recieved"],
        metabolomics["recieved"],
    ]
    amt_timesteps = math.inf
    if transcriptomics["recieved"] and transcriptomics["amtTimesteps"] < amt_timesteps:
        amt_timesteps = transcriptomics["amtTimesteps"]
    if proteomics["recieved"] and proteomics["amtTimesteps"] < amt_timesteps:
        amt_timesteps = proteomics["amtTimesteps"]
    if metabolomics["recieved"] and metabolomics["amtTimesteps"] < amt_timesteps:
        amt_timesteps = metabolomics["amtTimesteps"]

    reactome_hierarchy = PathwayHierarchy(
        {"amt_timesteps": amt_timesteps, "omics_recieved": omics_recieved},
        data_path / "reactome_data",
        target_db.upper(),
        data_path / "reactome_data" / "diagram",
    )

    ##
    # Add query Data to Hierarchy
    ##
    node_pathway_dict = {}
    fold_changes = {"transcriptomics": [], "proteomics": [], "metabolomics": []}
    chebi_ids = {}
    ##
    # Add Proteomics Data
    ##
    if proteomics["recieved"]:
        proteomics_query_data_tuples = []

        format_omics_data(
            proteomics["symbol"],
            slider_vals["proteomics"],
            "proteomics_data_cache",
            cache,
        )
        proteomics_data = json.loads(cache.get("proteomics_data_cache"))

        for ID_number in proteomics_data:
            entry = proteomics_data[ID_number]
            proteomics_query_data_tuples.append(
                (
                    {"ID": ID_number, "table_id": ID_number},
                    [entry[valCol] for valCol in proteomics["value"]],
                )
            )
        # target organism is a little bit annoying at the moment
        tar_organism = "Mus_musculus" if target_db == "mmu" else "Homo_sapiens"
        print(tar_organism)
        protein_query = ReactomeQuery(
            proteomics_query_data_tuples,
            tar_organism,
            "UniProt",
            data_path / "reactome_data/pickles/",
        )
        fold_changes["proteomics"] = protein_query.get_measurement_levels()
        # add entries to hierarchy
        node_pathway_dict = {
            **node_pathway_dict,
            **protein_query.get_query_pathway_dict(),
        }
        for query_key, query_result in protein_query.query_results.items():
            for entity_id, entity_data in query_result.items():
                reactome_hierarchy.add_query_data(entity_data, "protein", query_key)
    ##
    # Add Metabolomics Data
    ##
    if metabolomics["recieved"]:
        metabolomics_query_data_tuples = []

        format_omics_data(
            metabolomics["symbol"],
            slider_vals["metabolomics"],
            "metabolomics_data_cache",
            cache,
        )
        metabolomics_dict = json.loads(cache.get("metabolomics_data_cache"))
        metabolomics_IDs = list(metabolomics_dict.keys())

        if any(
            (str(entry)[0] == "C") and (str(entry)[1] != "H")
            for entry in metabolomics_IDs
        ):
            chebi_ids = kegg_to_chebi(metabolomics_IDs)
            for k in chebi_ids.keys():
                for entry in chebi_ids[k]:
                    metabolomics_query_data_tuples.append(
                        (
                            {"ID": entry, "table_id": k},
                            [
                                metabolomics_dict[k][valCol]
                                for valCol in metabolomics["value"]
                            ],
                        )
                    )
        else:
            for ID_entry in metabolomics_IDs:
                # TODO handle KEGGIDS
                ID_number = str(ID_entry).replace("CHEBI:", "")
                metabolomics_query_data_tuples.append(
                    (
                        {"ID": ID_number, "table_id": ID_number},
                        [
                            metabolomics_dict[ID_entry][valCol]
                            for valCol in metabolomics["value"]
                        ],
                    )
                )

        # target organism is a little bit annoying at the moment
        tar_organism = "Mus_musculus" if target_db == "mmu" else "Homo_sapiens"
        print(tar_organism)
        metabolite_query = ReactomeQuery(
            metabolomics_query_data_tuples,
            tar_organism,
            "ChEBI",
            data_path / "reactome_data/pickles/",
        )
        fold_changes["metabolomics"] = metabolite_query.get_measurement_levels()
        # add entries to hierarchy
        node_pathway_dict = {
            **node_pathway_dict,
            **metabolite_query.get_query_pathway_dict(),
        }

        for query_key, query_result in metabolite_query.query_results.items():
            for entity_id, entity_data in query_result.items():
                reactome_hierarchy.add_query_data(entity_data, "metabolite", query_key)
    ##
    # Add Transcriptomics Data Data
    ##
    if transcriptomics["recieved"]:
        transcriptomics_query_data_tuples = []
        format_omics_data(
            transcriptomics["symbol"],
            slider_vals["transcriptomics"],
            "transcriptomics_data_cache",
            cache,
        )
        transcriptomics_dict = json.loads(cache.get("transcriptomics_data_cache"))
        transcriptomics_IDs = list(transcriptomics_dict.keys())
        for ID_number in transcriptomics_IDs:
            transcriptomics_query_data_tuples.append(
                (
                    {"ID": ID_number, "table_id": ID_number},
                    [
                        transcriptomics_dict[ID_number][valCol]
                        for valCol in transcriptomics["value"]
                    ],
                )
            )

        # target organism is a little bit annoying at the moment
        tar_organism = "Mus_musculus" if target_db == "mmu" else "Homo_sapiens"
        print(tar_organism)
        # Some entries do not exist for ENMUSG but do exist for ENSMUSP
        transcriptomics_query = ReactomeQuery(
            transcriptomics_query_data_tuples,
            tar_organism,
            "Ensembl",
            data_path / "reactome_data/pickles/",
        )
        fold_changes["transcriptomics"] = transcriptomics_query.get_measurement_levels()
        # add entries to hierarchy
        node_pathway_dict = {
            **node_pathway_dict,
            **transcriptomics_query.get_query_pathway_dict(),
        }
        for query_key, query_result in transcriptomics_query.query_results.items():
            for entity_id, entity_data in query_result.items():
                reactome_hierarchy.add_query_data(entity_data, "gene", query_key)
    # Aggregate Data in Hierarchy, and set session cache
    ##
    reactome_hierarchy.aggregate_pathways()
    reactome_hierarchy.set_layout_settings(
        get_layout_settings(layout_settings, omics_recieved)
    )
    cache.set("reactome_hierarchy", reactome_hierarchy)

    out_dat = {
        "keggChebiTranslate": chebi_ids,
        "fcs": fold_changes,
    }
    return json.dumps(out_dat)


@app.route("/reactome_overview", methods=["GET"])
def reactome_overview():
    """Generates and sends data to the frontend needed to display the reactome overview graph
    Returns:
        json string containting overview data and pathway layouting data
            overview data: list of pathways and their data
            pathway layouting:  list of pathways
                                dictionary mapping query to pathway ids
                                list of Ids belonging to root nodes
    """

    reactome_hierarchy = cache.get("reactome_hierarchy")
    layout_limits = reactome_hierarchy.layout_settings["limits"]
    layout_attributes_used = reactome_hierarchy.layout_settings["attributes"]
    # user choice
    # up- and downregulation limits (limits_transriptomics, limits_proteomics, limits_metabolomics)
    print(reactome_hierarchy.layout_settings)
    # print(layout_limits, layout_attributes_used)
    (
        out_data,
        central_nodes,
        query_pathway_dict,
        dropdown_data,
        root_ids,
        pathways_root_names,
        root_subpathways,
        statistic_data_complete,
        omics_recieved,
    ) = reactome_hierarchy.generate_overview_data(layout_limits, False)
    pathway_connection_dict = create_overview_data(out_data, central_nodes)
    # network_overview = generate_networkx_dict(pathway_connection_dict)
    # pathway_info_dict = {'path:'+id: ontology_string_info for id, ontology_string_info in (pathway.return_pathway_kegg_String_info_dict() for pathway in parsed_pathways)}
    # network_with_edge_weight = get_networkx_with_edge_weights(network_overview, pathway_info_dict, stringGraph)

    # cluster_node_pos, cluster_areas = getClusterLayout(
    clusters, cluster_centers, noiseClusterExists = getClusterLayout(
        omics_recieved,
        central_nodes,
        layout_limits,
        layout_attributes_used,
        statistic_data_complete,
        pathway_connection_dict,
        root_subpathways,
        pathways_root_names,
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
    timepoint_analysis(clusters)
    # temporary?
    out_data_dict = {elem["pathwayId"]: elem for elem in out_data}

    return json.dumps(
        {
            "exitState": 0,
            "overviewData": out_data_dict,
            "amtTimepoints": reactome_hierarchy.amt_timesteps,
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
def get_reactome_json(pathway):
    pathway = pathway.split("_")[0]
    hierarchy = cache.get("reactome_hierarchy")
    pathway_entry = hierarchy[pathway]
    if not pathway_entry.has_diagram:
        # fixes crash when pathways has no own diagram entry, this shouldnt happen tho?!
        pathway_entry = pathway_entry.diagram_entry
    layout_json = pathway_entry.layout_json_file
    graph_json = pathway_entry.graph_json_file
    inset_pathways_totals = {}
    inset_pathway_ID_transcriptomics = [
        [k, v["stableID"]] for k, v in pathway_entry.subdiagrams_measured_genes.items()
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


if __name__ == "__main__":
    app.run(host="localhost", port=8000, debug=True)
