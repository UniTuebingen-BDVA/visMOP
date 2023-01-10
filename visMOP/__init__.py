from random import randint, random
from flask import Flask, render_template, send_from_directory, request
from visMOP.python_scripts.utils import kegg_to_chebi
from visMOP.python_scripts.data_table_parsing import (
    table_request,
)
from visMOP.python_scripts.create_overview import get_overview_reactome
from visMOP.python_scripts.uniprot_access import (
    make_protein_dict,
    get_uniprot_entry,
    add_uniprot_info,
)
from visMOP.python_scripts.interaction_graph import StringGraph
from visMOP.python_scripts.reactome_hierarchy import PathwayHierarchy
from visMOP.python_scripts.reactome_query import ReactomeQuery


import pandas as pd
import pathlib
import os
import json
from visMOP.python_scripts.module_layouting import (
    Module_layout,
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


def getModuleLayout(
    omics_recieved,
    layout_targets,
    up_down_reg_limits,
    data_col_used,
    statistic_data_complete,
    pathway_connection_dict,
    reactome_roots={},
    pathways_root_names={},
):
    up_down_reg_means = {
        o: mean(limits) for o, limits in zip(["t", "p", "m"], up_down_reg_limits)
    }

    omics_names = ["t", "p", "m"]
    stat_value_names = [
        "num values",
        "mean exp (high ",
        "% vals (higher ",
        "mean exp(lower ",
        "% vals (lower ",
        "% Reg (",
        "% Unreg (",
        "% p with val",
    ]
    # for diagramms
    complete_stat_names = []
    for omic, omic_r, limits in zip(omics_names, omics_recieved, up_down_reg_limits):
        if omic_r:
            for pos, stat in enumerate(stat_value_names):
                next_col_name = omic + "_" + stat
                if pos in [1, 2]:  #
                    next_col_name += str(limits[1]) + ")"
                elif pos in [3, 4]:  #
                    next_col_name += str(limits[0]) + ")"
                elif pos in [5, 6]:  #
                    next_col_name += str(limits) + ")"
                complete_stat_names.append(next_col_name)
    complete_stat_names += ["pathway size"]
    statistic_data_user = statistic_data_complete.iloc[:, data_col_used]
    statistic_data_complete.columns = complete_stat_names
    try:
        module_layout = Module_layout(
            statistic_data_user,
            layout_targets,
            pathway_connection_dict,
            up_down_reg_means,
            reactome_roots,
            pathways_root_names,
        )
    except ValueError as e:
        print("LayoutError", e)
        return -1, -1
    # module_node_pos = module_layout.initial_node_pos
    # outcommented for test of voronoi layout
    # module_node_pos = module_layout.get_final_node_positions()
    # module_areas = module_layout.get_module_areas()
    # module_areas = []
    # return module_node_pos, module_areas
    return (
        module_layout.modules,
        module_layout.modules_center,
        module_layout.noise_cluster_exists,
    )


def get_layout_settings(settings, omics_recieved):
    possible_omic_attributes = [
        "Number of values",
        "Mean expression above limit",
        "% values above limit",
        "Mean expression below limit ",
        "% values below limit ",
        "% regulated",
        "% unregulated",
        "% with measured value",
    ]
    possible_no_omic_attributes = ["% values measured over all omics"]
    attributes = []
    limits = []
    # print(settings.items())
    omics_recieved.append(True)
    for recieved, (omic, layout_settings) in zip(omics_recieved, settings.items()):
        omic_limits = [float(i) for i in layout_settings["limits"]]
        limits.append(omic_limits)
        if recieved and omic != "not related to specific omic ":
            attribute_boolean = [
                (
                    (layout_settings["attributes"] is not None)
                    and att in layout_settings["attributes"]
                )
                for att in possible_omic_attributes
            ]
            attributes += attribute_boolean

        elif recieved:
            attribute_boolean = [
                att in layout_settings["attributes"]
                for att in possible_no_omic_attributes
            ]
            attributes += attribute_boolean
    return {"attributes": attributes, "limits": limits}


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
transcriptomics table recieve
"""


@app.route("/transcriptomics_table", methods=["POST"])
def transcriptomics_table_recieve():
    json_data = table_request(request, cache, "transcriptomics_df_global")
    return json_data


"""
protein recieve
"""


@app.route("/proteomics_table", methods=["POST"])
def prot_table_recieve():
    json_data = table_request(request, cache, "prot_table_global")
    return json_data


"""
metabolomics table recieve
"""


@app.route("/metabolomics_table", methods=["POST"])
def metabolomics_table_recieve():
    json_data = table_request(request, cache, "metabolomics_df_global")
    return json_data


@app.route("/interaction_graph", methods=["POST"])
def interaction_graph():
    # get string graph:
    string_graph = cache.get("string_graph")
    if not string_graph:
        script_dir = data_path
        target_db = cache.get("target_db")
        dest_dir = os.path.join(
            script_dir,
            "10090.protein.links.v11.5.txt.gz"
            if target_db == "mmu"
            else "9606.protein.links.v11.5.txt.gz",
        )
        string_graph = StringGraph(dest_dir)
        cache.set("string_graph", string_graph)
    # global prot_dict_global # keggID --> Uniprot data
    prot_dict_global = json.loads(cache.get("prot_dict_global"))

    # get node IDs and confidence threshold from request
    node_IDs = request.json["nodes"]
    confidence_threshold = request.json["threshold"]

    # get name Mapping
    stringID_to_name = {
        v["string_id"]: v["Gene Symbol"][0] for k, v in prot_dict_global.items()
    }

    # get string IDs from the transferred keggIDs of selected proteins/nodes
    string_IDs = [prot_dict_global[node_ID]["string_id"] for node_ID in node_IDs]

    # generate json data of merged ego graphs
    return json.dumps(
        {
            "interaction_graph": string_graph.get_merged_egoGraph(
                string_IDs, 1, stringID_to_name, confidence_threshold
            )
        }
    )


def uniprot_access(colname, filter_obj):
    # create dict from protein dataframe
    print("protcols", colname)
    prot_table = pd.read_json(cache.get("prot_table_global"), orient="columns")

    id_col = colname
    prot_table = prot_table.drop_duplicates(subset=id_col).set_index(id_col)
    for k, v in filter_obj.items():
        is_empty = v["empties"] & (prot_table[k] == "None")
        is_numeric = pd.to_numeric(prot_table[k], errors="coerce").notnull()
        df_numeric = prot_table.loc[is_numeric]
        if v["inside"]:
            df_is_in_range = df_numeric.loc[
                (df_numeric[k] >= v["vals"]["min"])
                & (df_numeric[k] <= v["vals"]["max"])
            ]
        else:
            df_is_in_range = df_numeric.loc[
                (df_numeric[k] <= v["vals"]["min"])
                | (df_numeric[k] >= v["vals"]["max"])
            ]
        df_is_empty = prot_table.loc[is_empty]

        prot_table = prot_table.loc[
            prot_table.index.isin(df_is_in_range.index)
            | prot_table.index.isin(df_is_empty.index)
        ]
    protein_dict = make_protein_dict(prot_table, id_col)
    # query uniprot for the IDs in the table and add their info to the dictionary
    get_uniprot_entry(protein_dict, data_path)
    add_uniprot_info(protein_dict)
    # add location to table
    # prot_table_global['Location'] = [protein_dict[item]['location'] for item in protein_dict]

    # set cache for structures
    cache.set("prot_dict_global", json.dumps(protein_dict))
    # cache.set('prot_table_global', prot_table_global.to_json(orient="columns"))


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
    reactome_hierarchy = PathwayHierarchy()
    reactome_hierarchy.load_data(data_path / "reactome_data", target_db.upper())
    reactome_hierarchy.add_json_data(data_path / "reactome_data" / "diagram")
    reactome_hierarchy.set_omics_recieved(omics_recieved)
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
        try:
            uniprot_access(proteomics["symbol"], slider_vals["proteomics"])
            prot_dict_global = json.loads(cache.get("prot_dict_global"))

            for ID_number in prot_dict_global:
                entry = prot_dict_global[ID_number]
                proteomics_query_data_tuples.append(
                    (
                        {"ID": ID_number, "table_id": ID_number},
                        entry[proteomics["value"]],
                    )
                )

        except FileNotFoundError:
            print("Download 10090.protein.links.v11.5.txt.gz from STRING database.")

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

        metabolomics_df_global = pd.read_json(
            cache.get("metabolomics_df_global"), orient="columns"
        )
        id_col = metabolomics["symbol"]
        metabolomics_df = metabolomics_df_global.drop_duplicates(
            subset=id_col
        ).set_index(id_col)
        for k, v in slider_vals["metabolomics"].items():
            if k != id_col:
                is_empty = v["empties"] & (metabolomics_df[k] == "None")
                is_numeric = pd.to_numeric(
                    metabolomics_df[k], errors="coerce"
                ).notnull()
                df_numeric = metabolomics_df.loc[is_numeric]
                if v["inside"]:
                    df_is_in_range = df_numeric.loc[
                        (df_numeric[k] >= v["vals"]["min"])
                        & (df_numeric[k] <= v["vals"]["max"])
                    ]
                else:
                    df_is_in_range = df_numeric.loc[
                        (df_numeric[k] <= v["vals"]["min"])
                        | (df_numeric[k] >= v["vals"]["max"])
                    ]
                df_is_empty = metabolomics_df.loc[is_empty]

                metabolomics_df = metabolomics_df.loc[
                    metabolomics_df.index.isin(df_is_in_range.index)
                    | metabolomics_df.index.isin(df_is_empty.index)
                ]
        metabolomics_dict = metabolomics_df.to_dict("index")
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
                            metabolomics_dict[k][metabolomics["value"]],
                        )
                    )
        else:
            for ID_entry in metabolomics_IDs:
                # TODO handle KEGGIDS
                ID_number = str(ID_entry).replace("CHEBI:", "")
                metabolomics_query_data_tuples.append(
                    (
                        {"ID": ID_number, "table_id": ID_number},
                        metabolomics_dict[ID_entry][metabolomics["value"]],
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
        transcriptomics_df_global = pd.read_json(
            cache.get("transcriptomics_df_global"), orient="columns"
        )
        id_col = transcriptomics["symbol"]
        # TODO Duplicates are dropped how to handle these duplicates?!
        transcriptomics_df = transcriptomics_df_global.drop_duplicates(
            subset=id_col
        ).set_index(id_col)
        for k, v in slider_vals["transcriptomics"].items():
            is_empty = v["empties"] & (transcriptomics_df[k] == "None")
            is_numeric = pd.to_numeric(transcriptomics_df[k], errors="coerce").notnull()
            df_numeric = transcriptomics_df.loc[is_numeric]
            if v["inside"]:
                df_is_in_range = df_numeric.loc[
                    (df_numeric[k] >= v["vals"]["min"])
                    & (df_numeric[k] <= v["vals"]["max"])
                ]
            else:
                df_is_in_range = df_numeric.loc[
                    (df_numeric[k] <= v["vals"]["min"])
                    | (df_numeric[k] >= v["vals"]["max"])
                ]
            df_is_empty = transcriptomics_df.loc[is_empty]

            transcriptomics_df = transcriptomics_df.loc[
                transcriptomics_df.index.isin(df_is_in_range.index)
                | transcriptomics_df.index.isin(df_is_empty.index)
            ]

        # print("DF", transcriptomics_df)
        transcriptomics_dict = transcriptomics_df.to_dict("index")
        transcriptomics_IDs = list(transcriptomics_dict.keys())
        for ID_number in transcriptomics_IDs:
            transcriptomics_query_data_tuples.append(
                (
                    {"ID": ID_number, "table_id": ID_number},
                    transcriptomics_dict[ID_number][transcriptomics["value"]],
                )
            )

        # target organism is a little bit annoying at the moment
        tar_organism = "Mus_musculus" if target_db == "mmu" else "Homo_sapiens"
        print(tar_organism)
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

    # Aggregate Data in Hierarcy, and set session cache
    ##
    reactome_hierarchy.aggregate_pathways()
    reactome_hierarchy.set_layout_settings(
        get_layout_settings(layout_settings, omics_recieved)
    )

    cache.set("reactome_hierarchy", reactome_hierarchy)
    dropdown_pathways = []  # TODO
    out_dat = {
        "keggChebiTranslate": chebi_ids,
        "omicsRecieved": {
            "transcriptomics": transcriptomics["recieved"],
            "proteomics": proteomics["recieved"],
            "metabolomics": metabolomics["recieved"],
        },
        "used_symbol_cols": {
            "transcriptomics": transcriptomics["symbol"],
            "proteomics": proteomics["symbol"],
            "metabolomics": metabolomics["symbol"],
        },
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
        pathway_dict,
        dropdown_data,
        root_ids,
        pathways_root_names,
        root_subpathways,
        statistic_data_complete,
        omics_recieved,
    ) = reactome_hierarchy.generate_overview_data(layout_limits, False)
    pathway_connection_dict = get_overview_reactome(out_data, central_nodes)
    # network_overview = generate_networkx_dict(pathway_connection_dict)
    # pathway_info_dict = {'path:'+id: ontology_string_info for id, ontology_string_info in (pathway.return_pathway_kegg_String_info_dict() for pathway in parsed_pathways)}
    # network_with_edge_weight = get_networkx_with_edge_weights(network_overview, pathway_info_dict, stringGraph)

    # module_node_pos, module_areas = getModuleLayout(
    modules, module_centers, noiseClusterExists = getModuleLayout(
        omics_recieved,
        central_nodes,
        layout_limits,
        layout_attributes_used,
        statistic_data_complete,
        pathway_connection_dict,
        root_subpathways,
        pathways_root_names,
    )

    if modules == -1:
        return {"exitState": 1, "ErrorMsg": "Value Error! Correct Organism chosen?"}
    # print("number of Clusters", len(module_areas))
    for pathway in out_data:
        # x_y_pos = module_node_pos[pathway["pathwayId"]]
        pathway["initialPosX"] = random()  # x_y_pos[0]
        pathway["initialPosY"] = random()  # x_y_pos[1]
        pathway["moduleNum"] = 0  # x_y_pos[2]
    modules = [elem.tolist() for elem in modules]
    # temporary?

    out_data_dict = {elem["pathwayId"]: elem for elem in out_data}

    return json.dumps(
        {
            "exitState": 0,
            "overviewData": out_data_dict,
            "modules": modules,
            "moduleCenters": module_centers,
            "noiseClusterExists": noiseClusterExists,
            # "moduleAreas": module_areas,
            "pathwayLayouting": {
                "pathwayList": dropdown_data,
                "pathwayNodeDictionary": pathway_dict,
                "rootIds": root_ids,
            },
        }
    )


@app.route("/get_reactome_json_files/<pathway>", methods=["GET"])
def get_reactome_json(pathway):
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
