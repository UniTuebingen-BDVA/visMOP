import pandas as pd
import requests
import urllib.parse
import pathlib
import os
import time
import json


def format_protein_data(
    colname,
    filter_obj,
    data_path,
    cache,
):
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
    # get_uniprot_entry(protein_dict, data_path)
    # add_uniprot_info(protein_dict)

    # set cache for structures
    cache.set("prot_dict_global", json.dumps(protein_dict))


def make_protein_dict(df, colname):
    column_names = df.columns

    # stores data for each uniprot ID

    prot_dict = df.to_dict("index")

    # convert all gene symbols to a list
    """     
    for key in prot_dict.copy():
        prot_dict[key][colname] = prot_dict.copy()[key][colname].split(" ")
    """
    return prot_dict


def get_uniprot_entry(protein_dict, data_path):
    print("Retrieving Uniprot Data...")
    script_dir = data_path
    dest_dir = os.path.join(script_dir, "uniprot_files")

    # check if uniprot_files directory exists, else create one
    try:
        os.makedirs(dest_dir)
    except OSError:
        pass  # already exists

    query_IDs = []

    for key in protein_dict:
        file_name = key + ".json"
        full_path = pathlib.Path(os.path.join(dest_dir, file_name))
        # check if files for protein_dict entries were already retrieved, else get them from Uniprot
        if full_path.is_file():
            # print(key, 'already exists')
            pass
        else:
            query_IDs.append(key)
    try:
        url = "https://rest.uniprot.org/uniprotkb/accessions"

        with requests.get(
            url, params={"accessions": query_IDs, "format": "json"}
        ) as uniprot_response:
            print(len(uniprot_response.json()["results"]))
            print(len(query_IDs))
            for result in uniprot_response.json()["results"]:
                with open(
                    os.path.join(dest_dir, result["primaryAccession"] + ".json"),
                    "w",
                    encoding="utf-8",
                ) as f:
                    json.dump(result, f, ensure_ascii=False, indent=4)
                    print(file_name, "added to uniprot_files")

    except urllib.error.HTTPError as e:
        print("URL ERROR: {}".format(e.__dict__))
    except urllib.error.URLError as e:
        print("URL ERROR: {}".format(e.__dict__))

    print("Retrieving Uniprot Data...DONE!")


"""
get location and STRING_ID from uniprot files
modifies dict inplace
"""


def add_uniprot_info(dict):
    for filename in dict.keys():
        id = filename.split(".")[0]
        loc = ""
        with open(pathlib.Path("uniprot_files") / (filename + ".json"), "r") as file:
            json_data = json.load(file)
            while line:
                line = file.readline()
                if line.startswith("CC   -!- ") and "SUBCELLULAR LOCATION" in line:
                    loc += line.strip()
                    line = file.readline()
                    while not line.startswith("CC   -!- "):
                        if "--------" in line:
                            break
                        else:
                            loc += line.strip().split("CC", 1)[1]
                            line = file.readline()
                # get STRING_ID
                if line.startswith("DR") and "STRING" in line:
                    string_id = line.strip().split(";")[1].strip()
                    line = file.readline()
                if line.startswith("DR") and "KEGG" in line:
                    keggID = line.strip().split(";")[1].strip()
                    line = file.readline()
                if line.startswith("GN"):
                    line_split = (
                        line.strip().split("GN")[1].strip().strip(";").split(";")
                    )
                    symbol_list = [line_split[0].replace("Name=", "")]
                    try:
                        symbol_list.extend(
                            line_split[1].replace("Synonyms=", "").split(",")
                        )
                    except:
                        pass
        try:
            dict[id]["string_id"] = string_id
            dict[id]["keggID"] = keggID
            dict[id]["Gene Symbol"] = symbol_list
        except:
            print("ID has no String and/or no KEGG ID: ", id)
        # from textfile split lines to get location name
        try:

            #### OLD CODE ####
            location = (
                loc.split("SUBCELLULAR LOCATION: ", 1)[1]
                .split(".", 1)[0]
                .split("{")[0]
                .strip()
            )

            # format location
            if ";" in location:
                location = location.split(";")[0].strip()

            dict[id]["location"] = location
            # dict[id]['string_id'] = string_id
            #### END OLD CODE ####

            #### NEW ####
            """
            EVIDENCE CODES SCORE
            10 --> ECO:0000269 -> publication, experimental
            9 --> ECO:0000303 -> publication, no scientific evidence
            8 --> ECO:0000305 -> publication, curator inference
            7 --> ECO:0000250 -> sequence similarity
            6 --> ECO:0000255 -> sequence model evidence manual
            5 --> ECO:0000256 -> sequence model evidence automatic
            4 --> ECO:0000312 -> imported evidence manual
            3 --> ECO:0000313 -> imported evidence automatic
            2 --> ECO:0007744 -> combinatorial evidence manual
            1 --> ECO:0007829 -> combinatorial evidence automatic
            """

            evidence_ranks = {
                "ECO:0000269": 10,
                "ECO:0000303": 9,
                "ECO:0000305": 8,
                "ECO:0000250": 7,
                "ECO:0000255": 6,
                "ECO:0000256": 5,
                "ECO:0000312": 4,
                "ECO:0000313": 3,
                "ECO:0007744": 2,
                "ECO:0007829": 1,
            }

            all_locations_new = " ".join(
                loc.split("SUBCELLULAR LOCATION: ", 1)[1].split()
            ).split(
                "."
            )  # .join removes unnecessary tabs and whitespace

            # remove empty strings
            all_locations_new = list(filter(None, all_locations_new))

            # include only items with "evidence" --> indicated by "{"; removes "Notes=..."
            all_locations_new = list(
                filter(lambda item: item.index("{"), all_locations_new)
            )

            # removes further specifications such as "Multi-Pass protein ..."
            # TODO: should be implemented in future versions
            all_locations_new = [i.split(";")[0].strip() for i in all_locations_new]

            all_locations_new = [
                i.split("]:") for i in all_locations_new
            ]  # list of lists

            for item in all_locations_new:
                if len(item) == 1:
                    loc_key = item[0].split("{")[0].strip()
                    # -1 cuts off "}" at end of evidence string
                    evidence_list = item[0].split("{")[1].strip()[:-1].split(",")
                    # extract only the evidence codes, omit publication codes
                    evidence_codes = [
                        evidence_ranks[i.split("|")[0].strip()] for i in evidence_list
                    ]
                    note = "none"

                # happens if Isoform is defined
                elif len(item) == 2:
                    isoform = item[0][1::]  # removes first character "["
                    loc_key = item[1].split("{")[0].strip()
                    # -1 cuts off "}" at end of evidence string
                    evidence_list = item[1].split("{")[1].strip()[:-1].split(",")

                    # extract only the evidence codes, omit publication codes
                    # convert codes to scores
                    evidence_codes = [
                        evidence_ranks[i.split("|")[0].strip()] for i in evidence_list
                    ]
                    note = isoform

                # calculate evidence score (sum of all evidence types provided)
                evidence_score = sum(evidence_codes)

                if "location_new" in dict[id]:

                    # get previous location key
                    prev_key = list(
                        filter(
                            lambda x: x != "note", list(dict[id]["location_new"].keys())
                        )
                    )[0]

                    # only put new location if score is higher
                    if evidence_score > (dict[id]["location_new"][prev_key][0]):
                        dict[id]["location_new"] = {}
                        dict[id]["location_new"]["location"] = loc_key
                        dict[id]["location_new"]["evidence"] = [
                            evidence_score,
                            evidence_codes,
                        ]
                        dict[id]["location_new"]["note"] = note
                else:
                    dict[id]["location_new"] = {}
                    dict[id]["location_new"]["location"] = loc_key
                    dict[id]["location_new"]["evidence"] = [
                        evidence_score,
                        evidence_codes,
                    ]
                    dict[id]["location_new"]["note"] = note

            #### END NEW ####

        except:
            dict[id]["location_new"] = {
                "location": "n/a",
                "evidence": [0, []],
                "note": "none",
            }
            dict[id]["location"] = "n/a"
            # dict[id]['string_id'] = 'n/a'


def add_uniprot_info(dict):
    for filename in dict.keys():
        id = filename.split(".")[0]
        loc = ""
        with open(pathlib.Path("uniprot_files") / (filename + ".txt"), "r") as file:
            line = file.readline()
            while line:
                line = file.readline()
                if line.startswith("CC   -!- ") and "SUBCELLULAR LOCATION" in line:
                    loc += line.strip()
                    line = file.readline()
                    while not line.startswith("CC   -!- "):
                        if "--------" in line:
                            break
                        else:
                            loc += line.strip().split("CC", 1)[1]
                            line = file.readline()
                # get STRING_ID
                if line.startswith("DR") and "STRING" in line:
                    string_id = line.strip().split(";")[1].strip()
                    line = file.readline()
                if line.startswith("DR") and "KEGG" in line:
                    keggID = line.strip().split(";")[1].strip()
                    line = file.readline()
                if line.startswith("GN"):
                    line_split = (
                        line.strip().split("GN")[1].strip().strip(";").split(";")
                    )
                    symbol_list = [line_split[0].replace("Name=", "")]
                    try:
                        symbol_list.extend(
                            line_split[1].replace("Synonyms=", "").split(",")
                        )
                    except:
                        pass
        try:
            dict[id]["string_id"] = string_id
            dict[id]["keggID"] = keggID
            dict[id]["Gene Symbol"] = symbol_list
        except:
            print("ID has no String and/or no KEGG ID: ", id)
        # from textfile split lines to get location name
        try:

            #### OLD CODE ####
            location = (
                loc.split("SUBCELLULAR LOCATION: ", 1)[1]
                .split(".", 1)[0]
                .split("{")[0]
                .strip()
            )

            # format location
            if ";" in location:
                location = location.split(";")[0].strip()

            dict[id]["location"] = location
            # dict[id]['string_id'] = string_id
            #### END OLD CODE ####

            #### NEW ####
            """
            EVIDENCE CODES SCORE
            10 --> ECO:0000269 -> publication, experimental
            9 --> ECO:0000303 -> publication, no scientific evidence
            8 --> ECO:0000305 -> publication, curator inference
            7 --> ECO:0000250 -> sequence similarity
            6 --> ECO:0000255 -> sequence model evidence manual
            5 --> ECO:0000256 -> sequence model evidence automatic
            4 --> ECO:0000312 -> imported evidence manual
            3 --> ECO:0000313 -> imported evidence automatic
            2 --> ECO:0007744 -> combinatorial evidence manual
            1 --> ECO:0007829 -> combinatorial evidence automatic
            """

            evidence_ranks = {
                "ECO:0000269": 10,
                "ECO:0000303": 9,
                "ECO:0000305": 8,
                "ECO:0000250": 7,
                "ECO:0000255": 6,
                "ECO:0000256": 5,
                "ECO:0000312": 4,
                "ECO:0000313": 3,
                "ECO:0007744": 2,
                "ECO:0007829": 1,
            }

            all_locations_new = " ".join(
                loc.split("SUBCELLULAR LOCATION: ", 1)[1].split()
            ).split(
                "."
            )  # .join removes unnecessary tabs and whitespace

            # remove empty strings
            all_locations_new = list(filter(None, all_locations_new))

            # include only items with "evidence" --> indicated by "{"; removes "Notes=..."
            all_locations_new = list(
                filter(lambda item: item.index("{"), all_locations_new)
            )

            # removes further specifications such as "Multi-Pass protein ..."
            # TODO: should be implemented in future versions
            all_locations_new = [i.split(";")[0].strip() for i in all_locations_new]

            all_locations_new = [
                i.split("]:") for i in all_locations_new
            ]  # list of lists

            for item in all_locations_new:
                if len(item) == 1:
                    loc_key = item[0].split("{")[0].strip()
                    # -1 cuts off "}" at end of evidence string
                    evidence_list = item[0].split("{")[1].strip()[:-1].split(",")
                    # extract only the evidence codes, omit publication codes
                    evidence_codes = [
                        evidence_ranks[i.split("|")[0].strip()] for i in evidence_list
                    ]
                    note = "none"

                # happens if Isoform is defined
                elif len(item) == 2:
                    isoform = item[0][1::]  # removes first character "["
                    loc_key = item[1].split("{")[0].strip()
                    # -1 cuts off "}" at end of evidence string
                    evidence_list = item[1].split("{")[1].strip()[:-1].split(",")

                    # extract only the evidence codes, omit publication codes
                    # convert codes to scores
                    evidence_codes = [
                        evidence_ranks[i.split("|")[0].strip()] for i in evidence_list
                    ]
                    note = isoform

                # calculate evidence score (sum of all evidence types provided)
                evidence_score = sum(evidence_codes)

                if "location_new" in dict[id]:

                    # get previous location key
                    prev_key = list(
                        filter(
                            lambda x: x != "note", list(dict[id]["location_new"].keys())
                        )
                    )[0]

                    # only put new location if score is higher
                    if evidence_score > (dict[id]["location_new"][prev_key][0]):
                        dict[id]["location_new"] = {}
                        dict[id]["location_new"]["location"] = loc_key
                        dict[id]["location_new"]["evidence"] = [
                            evidence_score,
                            evidence_codes,
                        ]
                        dict[id]["location_new"]["note"] = note
                else:
                    dict[id]["location_new"] = {}
                    dict[id]["location_new"]["location"] = loc_key
                    dict[id]["location_new"]["evidence"] = [
                        evidence_score,
                        evidence_codes,
                    ]
                    dict[id]["location_new"]["note"] = note

            #### END NEW ####

        except:
            dict[id]["location_new"] = {
                "location": "n/a",
                "evidence": [0, []],
                "note": "none",
            }
            dict[id]["location"] = "n/a"
            # dict[id]['string_id'] = 'n/a'


"""
Get interaction data from STRING database:
file needs to be downloaded (10090.protein.physical.links.v11.0.txt) and filepath needs to be specified
interaction_dict = {string_id :{string_id_interaction_prot1 : score, string_id_interaction_prot2 : score, ...}}
"""


def make_interaction_dict(filepath, data_path):
    start_time = time.time()
    cache_path = data_path / "interaction_dict.json"
    print("Parsing interaction dictionary...")
    interaction_dict = {}

    # TODO: currently assumes that if a file is present, it is also complete (does not add missing keys)
    if cache_path:
        try:
            with open(cache_path) as in_file:
                interaction_dict = json.load(in_file)

        except:
            print(
                "interaction_dict cache was empty. Creating interaction_dict from file."
            )

            with open(filepath, "r") as file:
                line = file.readline()
                while line:
                    line = file.readline()
                    if not line.startswith("protein") and line != "":
                        entries = line.strip().split(" ")
                        prot1 = entries[0].strip()
                        prot2 = entries[1].strip()
                        score = int(entries[2].strip())

                        if prot1 not in interaction_dict:
                            interaction_dict[prot1] = {}

                        interaction_dict[prot1][prot2] = score

            with open(cache_path, "w+", encoding="utf-8") as out_file:
                json.dump(interaction_dict, out_file, ensure_ascii=False, indent=4)

    # map string_id to uniprot identifier (problem: 2 million entries)
    """query = ""
    url = 'https://www.uniprot.org/uploadlists/'
    for key in interaction_dict:
        query += '10090.' + key + ' '
        print(query)

    params = {
        'from': 'STRING_ID',
        'to': 'ACC',
        'format': 'tab',
        'query': query
    }

    data = urllib.parse.urlencode(params)
    data = data.encode('utf-8')
    req = urllib.request.Request(url, data)
    with urllib.request.urlopen(req) as f:
        response = f.read()
    print(response.decode('utf-8'))"""

    print("--- Parsing took %s seconds ---" % (time.time() - start_time))

    return interaction_dict
