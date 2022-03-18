from flask import Flask, render_template, send_from_directory,request, Response
from visMOP.python_scripts.networkx_layouting import get_spring_layout_pos, add_initial_positions, relayout
from visMOP.python_scripts.kegg_parsing import parse_KGML, generate_networkx_dict, drop_empty,add_incoming_edges
from visMOP.python_scripts.keggAccess import gene_symbols_to_keggID, multiple_query, kegg_get, parse_get, get_unique_pathways, query_kgmls,associacte_value_keggID
from visMOP.python_scripts.data_table_parsing import generate_vue_table_entries, generate_vue_table_header, create_df
from visMOP.python_scripts.create_overview import get_overview
from visMOP.python_scripts.uniprot_access import make_protein_dict, get_uniprot_entry, add_uniprot_info
from visMOP.python_scripts.interaction_graph import StringGraph
from visMOP.python_scripts.reactome_hierarchy import PathwayHierarchy
from visMOP.python_scripts.reactome_query import ReactomeQuery


import pandas as pd
import pathlib
import os
import json
import sys
import numbers
import secrets
from flask_caching import Cache
app = Flask(__name__, static_folder = "../dist/static", template_folder="../dist")

# DATA PATHS: (1) Local, (2) tuevis
data_path = pathlib.Path().resolve()
#data_path = pathlib.Path("/var/www/vismop")

app.config.from_mapping(
    # this causes random key on each start, so a server restart will invaldiate sessions
    SECRET_KEY=secrets.token_hex(),

    # ONLY FOR DEV CHANGE TO NEW KEY WHEN DEPLOYING
    #SECRET_KEY = 'a3759c42d7a3317735ac032895d8abda630d2017f798a052c7e86f1c6eea3cc9',
    # !!!!!!

    CACHE_TYPE='FileSystemCache',
    CACHE_DIR=data_path/'session_cache',
    CACHE_DEFAULT_TIMEOUT= 43200
)
cache = Cache(app)

# build stringraph, once
stringGraph = None
try:
    script_dir = data_path
    dest_dir = os.path.join(script_dir, '10090.protein.links.v11.5.txt.gz')  # '10090.protein.links.v11.0.txt'
    # comment out stringgraph for debugging purposes
    stringGraph = ''#StringGraph(dest_dir)
except:
    print("Stringraph Error")

"""
Default app routes for index and favicon
"""
@app.route('/')
def index():
    return render_template("index.html")

@app.route('/favicon.ico')
def fav():
    return send_from_directory(os.path.join(app.root_path,'static'), 'favicon.ico')

"""
transcriptomics table recieve
"""
@app.route('/transcriptomics_table', methods=['POST'])
def transcriptomics_table_recieve():
    print("table recieve triggered")
    
    # recieve data-blob
    transfer_dat = request.files['dataTable']
    sheet_no = int(request.form['sheetNumber'])
    #create and parse data table and prepare json
    data_table = create_df(transfer_dat, sheet_no)
    cache.set('transcriptomics_df_global', data_table.copy(deep=True).to_json(orient="columns"))
    table_json = data_table.to_json(orient="columns")
    entry_IDs = list(data_table.iloc[:,0])
    out_data =  {}
    out_data["entry_IDs"] = entry_IDs
    out_data["header"] = generate_vue_table_header(data_table)
    out_data["entries"] = generate_vue_table_entries(data_table)
    out_data["data"] = table_json

    json_data = json.dumps(out_data)

    return json_data


"""
protein recieve
"""
@app.route('/proteomics_table', methods=['POST'])
def prot_table_recieve():
  
    # aquire table data-blob
    transfer_dat = request.files['dataTable']
    sheet_no = int(request.form['sheetNumber'])
    print("sheet no", sheet_no)

    # parse data table and prepare json
    prot_data = create_df(transfer_dat, sheet_no)
    cache.set('prot_table_global', prot_data.copy(deep=True).to_json(orient="columns"))
    prot_table_json = prot_data.to_json(orient="columns")
    entry_IDs = list(prot_data.iloc[:, 0])
    out_data = {}
    out_data["entry_IDs"] = entry_IDs
    out_data["header"] = generate_vue_table_header(prot_data)
    out_data["entries"] = generate_vue_table_entries(prot_data)
    out_data["data"] = prot_table_json

    return json.dumps(out_data)

"""
metabolomics table recieve
"""
@app.route('/metabolomics_table', methods=['POST'])
def metabolomics_table_recieve():
    print("table recieve triggered")

    # recieve table data-blob
    transfer_dat = request.files['dataTable']
    sheet_no = int(request.form['sheetNumber'])
    
    # parse and create dataframe and prepare json
    data_table = create_df(transfer_dat, sheet_no)
    cache.set('metabolomics_df_global', data_table.copy(deep=True).to_json(orient="columns"))
    table_json = data_table.to_json(orient="columns")
    entry_IDs = list(data_table.iloc[:,0])
    out_data =  {}
    out_data["entry_IDs"] = entry_IDs
    out_data["header"] = generate_vue_table_header(data_table)
    out_data["entries"] = generate_vue_table_entries(data_table)
    out_data["data"] = table_json
    
    json_data = json.dumps(out_data)

    return json_data


@app.route('/interaction_graph', methods=['POST'])
def interaction_graph():
    # make variables available globally
    global stringGraph
    #global prot_dict_global # keggID --> Uniprot data
    prot_dict_global = json.loads(cache.get('prot_dict_global'))

    # get node IDs and confidence threshold from request
    node_IDs = request.json['nodes']
    confidence_threshold = request.json['threshold']

    # get name Mapping
    stringID_to_name = {v["string_id"]:v["Gene Symbol"][0] for k,v in prot_dict_global.items()}

    # get string IDs from the transferred keggIDs of selected proteins/nodes
    string_IDs = [prot_dict_global[node_ID]["string_id"] for node_ID in node_IDs]
    
    # generate json data of merged ego graphs
    return json.dumps({"interaction_graph": stringGraph.get_merged_egoGraph(string_IDs,1,stringID_to_name,confidence_threshold)})

def uniprot_access(colname, filter_obj):
    # create dict from protein dataframe
    prot_table = pd.read_json(cache.get('prot_table_global'), orient="columns")
    prot_table = prot_table.drop_duplicates(subset=colname).set_index(colname)
    for k,v in filter_obj.items():
        is_empty = (v['empties'] & (prot_table[k] == 'None'))
        is_numeric = (pd.to_numeric(prot_table[k],errors='coerce').notnull())
        df_numeric = prot_table.loc[is_numeric]
        df_is_in_range = df_numeric.loc[(df_numeric[k] >= v['vals'][0]) & (df_numeric[k] <= v['vals'][1])]
        df_is_empty = prot_table.loc[is_empty]
    
        prot_table = prot_table.loc[prot_table.index.isin(df_is_in_range.index) | prot_table.index.isin(df_is_empty.index) ]
    protein_dict = make_protein_dict(prot_table,colname)
    # query uniprot for the IDs in the table and add their info to the dictionary
    get_uniprot_entry(protein_dict,data_path)
    add_uniprot_info(protein_dict)
    # add location to table
    # prot_table_global['Location'] = [protein_dict[item]['location'] for item in protein_dict]
    
    # set cache for structures
    cache.set('prot_dict_global', json.dumps(protein_dict))
    #cache.set('prot_table_global', prot_table_global.to_json(orient="columns"))
  
    


"""
App route for querying and parsing kegg files
"""
@app.route('/kegg_parsing', methods=['POST'])
def kegg_parsing():

    overall_entries = {}
    overall_relations = {}
    overall_reactions = {}
    proteomics_symbol_dict = {}
    symbol_kegg_dict_transcriptomics = {}
    target_db = request.json['targetOrganism']
    transcriptomics = request.json['transcriptomics']
    proteomics = request.json['proteomics']
    metabolomics = request.json['metabolomics']
    slider_vals = request.json['sliderVals']

    #gene_symbols_col = request.json['geneSymbolsCol']
    #value_col = request.json['valueCol']
    

    proteomics_keggIDs = []
    metabolomics_keggIDs = []
    transcriptomics_keggIDs = []

    fold_changes = {}

    #Handle Proteomics if available
    if proteomics["recieved"]:
        try:
            uniprot_access(proteomics["symbol"], slider_vals["proteomics"])
            prot_dict_global = json.loads(cache.get('prot_dict_global'))

            # ID being a Uniprot ID
            for ID in prot_dict_global:
                entry = prot_dict_global[ID]
                try:
                    proteomics_symbol_dict[ID] = entry["keggID"]
                    proteomics_keggIDs.append(entry["keggID"])
                    fold_changes[entry["keggID"]] = {"transcriptomics": "NA", "proteomics": entry[proteomics["value"]], "metabolomics": "NA",}
                except:
                    print('ID not added to fold chances or keggIDs: ', ID)

        except FileNotFoundError:
            print("Download 10090.protein.links.v11.5.txt.gz from STRING database.")
          
            # build protein interaction graph from string file
        

    # Handle Metabolomics if available
    if metabolomics["recieved"]:
        metabolomics_df_global = pd.read_json(cache.get('metabolomics_df_global'),orient='columns')
        metabolomics_df = metabolomics_df_global.drop_duplicates(subset=metabolomics["symbol"]).set_index(metabolomics["symbol"])
        for k,v in slider_vals["metabolomics"].items():
            is_empty = (v['empties'] & (metabolomics_df[k] == 'None'))
            is_numeric = (pd.to_numeric(metabolomics_df[k],errors='coerce').notnull())
            df_numeric = metabolomics_df.loc[is_numeric]
            df_is_in_range = df_numeric.loc[(df_numeric[k] >= v['vals'][0]) & (df_numeric[k] <= v['vals'][1])]
            df_is_empty = metabolomics_df.loc[is_empty]
        
            metabolomics_df = metabolomics_df.loc[metabolomics_df.index.isin(df_is_in_range.index) | metabolomics_df.index.isin(df_is_empty.index) ]
        metabolomics_dict = metabolomics_df.to_dict("index")
        metabolomics_keggIDs =  list(metabolomics_dict.keys())
        for elem in metabolomics_keggIDs:
            if elem in fold_changes:
                fold_changes[elem]["metabolomics"] = metabolomics_dict[elem][metabolomics["value"]]

            else:
                fold_changes[elem] = {"transcriptomics": "NA", "proteomics":"NA", "metabolomics": metabolomics_dict[elem][metabolomics["value"]]}


    #Handle Transcriptomics
    if transcriptomics["recieved"]:
        transcriptomics_df_global = pd.read_json(cache.get('transcriptomics_df_global'),orient='columns')
        #TODO Duplicates are dropped how to handle these duplicates?!
        transcriptomics_df = transcriptomics_df_global.drop_duplicates(subset=transcriptomics["symbol"]).set_index(transcriptomics["symbol"])
        for k,v in slider_vals["transcriptomics"].items():
            is_empty = (v['empties'] & (transcriptomics_df[k] == 'None'))
            is_numeric = (pd.to_numeric(transcriptomics_df[k],errors='coerce').notnull())
            df_numeric = transcriptomics_df.loc[is_numeric]
            df_is_in_range = df_numeric.loc[(df_numeric[k] >= v['vals'][0]) & (df_numeric[k] <= v['vals'][1])]
            df_is_empty = transcriptomics_df.loc[is_empty]
        
            transcriptomics_df = transcriptomics_df.loc[transcriptomics_df.index.isin(df_is_in_range.index) | transcriptomics_df.index.isin(df_is_empty.index) ]

        #print("DF", transcriptomics_df)
        transcriptomics_dict = transcriptomics_df.to_dict("index")
        
        gene_symbols_transcriptomics=transcriptomics_dict.keys()
        #TODO blacklist system to handle unanswered queries
        unwanted_temporary = {"Gm10972","Gm2399","Gm5819","Gm7969","LOC636187","AC004946.2","AP005901.1","AC079779.1","FP325318.1","LINC00540","THCAT155","AC132825.3","AL138889.3","AL023807.1","AC092957.1","LINC02842","AC024337.2","LINC01331","GAGE12B","NBPF5P","LINC00536","AC019270.1","AC092640.1","LINC02470","OR4K13","AL512605.1","AC113418.1","AL359851.1","RPL22P12","OR10G4","AC124804.1","AP005901.5","LINC02717","LINC00906","LINC01727","C10orf105","AC024270.4","AC008083.3","AC104118.1","RPL37P2","ACTG1P15","SEPHS1P1","AL512328.1","RRAS2P1","ARMS2","NPHP3-AS1","AC011595.2","AC022211.1","RPL26P6","SPRR2G","GGTLC4P","AL844908.1","AC025040.2","AC093458.2","AC104024.4","LINC02016","AC090772.3","AC107081.3","AC013724.1","RPS19P3","RPS7P3","AP001432.1","AC069213.3","AP001024.1"}
        gene_symbols_transcriptomics = [symb for symb in gene_symbols_transcriptomics if symb not in unwanted_temporary]
        transcriptomics_keggIDs, symbol_kegg_dict_transcriptomics = gene_symbols_to_keggID(gene_symbols_transcriptomics, target_db, data_path / 'kegg_cache/gene_symbol_cache.json')
        for symbol in gene_symbols_transcriptomics:
            try:
                keggID = symbol_kegg_dict_transcriptomics[symbol]
                if keggID in fold_changes:
                    fold_changes[keggID]["transcriptomics"] = transcriptomics_dict[symbol][transcriptomics["value"]]
                else:
                    fold_changes[keggID] = {"transcriptomics": transcriptomics_dict[symbol][transcriptomics["value"]], "proteomics": "NA", "metabolomics": "NA"}
            except:
                print("Symbol: {} was not in the kegg dictionary, probably due to it not being found in the kegg DB")
        
        #keggID_value_dict, value_extent, all_gene_fcs = associacte_value_keggID(transcriptomics_df_global,gene_symbols_col,value_col,symbol_kegg_dict)
        #print("keggIDs: {}".format(keggIDs))

    # combineKeggIDS from all sources
    print(metabolomics_keggIDs)
    combined_keggIDs = list(set(transcriptomics_keggIDs+proteomics_keggIDs+metabolomics_keggIDs))
    print("len keggIDs: {}".format(len(combined_keggIDs)))

    # query kegg gets by keggID (using cache)
    kegg_gets = kegg_get(keggIDs=combined_keggIDs,caching_path=data_path / 'kegg_cache/kegg_gets.json')
    print("kegg_gets: {}".format(len(kegg_gets)))

    # parse gets into a usable format
    parsed_gets = [parse_get(v,k) for k,v in kegg_gets.items()]
    print("parsed_gets: {}".format(len(parsed_gets)))

    #pathways_per_gene = {elem.geneName : (elem.keggID,elem.pathways) for elem in parsed_gets}
    #print(pathways_per_gene)

    # look through all gets and find unique pathway IDs
    unique_pathways = get_unique_pathways(parsed_gets)
    # generate kgml files from unique IDs
    kegg_kgml = query_kgmls(unique_pathways, data_path / 'kegg_cache/kgml_cache.json')
    # useful since some of the ids might not have been parsed. TODO what does that mean?
    
    # parse KGML of pathways
    parsed_IDs = list(kegg_kgml.keys())
    parsed_pathways = []
    print("Len unique Pathways: ", len(unique_pathways))
    if len(unique_pathways) == 0 :
        return json.dumps(1)
    # list accessor is used for test purposes only --> less data = faster
    for pathwayID in parsed_IDs[0:]:
        # TODO blacklist system?!
        if "01100" in pathwayID:
            print("Skipping map01100, general overview")
        else:
            parsed_pathways.append(parse_KGML(pathwayID, kegg_kgml[pathwayID], overall_entries, overall_relations, overall_reactions, fold_changes)) #.asdict())
    
    # generate dict with k: pathway v: nodes
    pathway_node_dict = {k:v for k,v in (pathway.return_pathway_node_list() for pathway in parsed_pathways)}
    
    # generate dict with k: pathwy v: {amountGenes, amountCompounds}
    pathway_amount_dict = {k:v for k,v in (pathway.return_amounts() for pathway in parsed_pathways)}

    # generate list of pathways for pathway selection
    dropdown_pathways = [pathway.return_formated_title() for pathway in parsed_pathways]        
    
    # add incoming edges to nodes 
    add_incoming_edges(overall_entries)

    # generate dict of entries
    global_dict_entries = {k: v.asdict() for k, v in overall_entries.items()}

    # fix pathway names (some had 'TITLE:' prefix) # is this really useful?
    for key in global_dict_entries:
        if not global_dict_entries[key]['name'] is None:
            for i in range(len(global_dict_entries[key]['name'])):
                if global_dict_entries[key]['name'][i].startswith('TITLE:'):
                    global_dict_entries[key]['name'][i] = global_dict_entries[key]['name'][i][6::]


    #drop_empty(global_dict_entries)
    without_empty = global_dict_entries

    print(f"From {len(global_dict_entries)} entries in total, {len(without_empty)} remain after filtering entries without useful edges")
        
    # Not needed atm: generate networkX representation of Data and add force directed layout positions 
    #networkx_parsed = generate_networkx_dict(without_empty)
    #pos = get_spring_layout_pos(networkx_parsed)
    #with_init_pos = add_initial_positions(pos,without_empty)


    ###########################################################################
    # creates a dict with all pathway names for create_overview function
    
    pathway_titles = {}
    for i in parsed_pathways:
        pathway_titles["path:" + i.keggID] = [i.title]


    pathway_connection_dict = get_overview(pathway_node_dict, without_empty, global_dict_entries,pathway_titles, parsed_pathways)
    network_overview = generate_networkx_dict(pathway_connection_dict)
    pos_overview = get_spring_layout_pos(network_overview)
    init_pos_overview = add_initial_positions(pos_overview, pathway_connection_dict)
    #print(init_pos_overview)

    # add genes with available fc values to overview_dict
    """
    for i in with_init_pos.keys():
        if not with_init_pos[i]["value"] == "NoVal":
            for key in pathway_node_dict.keys():
                if i in pathway_node_dict[key]:
                    if key.startswith("mmu"):
                        tmp_key = "path:"+key

                        if "available_genes" in init_pos_ov[tmp_key].keys():
                            init_pos_ov[tmp_key]["available_genes"].append(with_init_pos[i]["name"][0])
                            init_pos_ov[tmp_key]["available_genes_values"].append(with_init_pos[i]["value"])
                        else:
                            init_pos_ov[tmp_key]["available_genes"] = [with_init_pos[i]["name"][0]]
                            init_pos_ov[tmp_key]["available_genes_values"] = [with_init_pos[i]["value"]]
    """
    # prepare json data
    out_dat = {
        "omicsRecieved": {"transcriptomics": transcriptomics["recieved"], "proteomics": proteomics["recieved"], "metabolomics": metabolomics["recieved"]},
        "overview_data": pathway_connection_dict,
        "main_data":without_empty,
        "fcs": fold_changes,
        "transcriptomics_symbol_dict": symbol_kegg_dict_transcriptomics,
        "pathwayLayouting": {"pathwayList": dropdown_pathways, "pathwayNodeDictionary": pathway_node_dict},
        "proteomics_symbol_dict": proteomics_symbol_dict,
        "used_symbol_cols" : {"transcriptomics": transcriptomics["symbol"],"proteomics": proteomics["symbol"], "metabolomics": metabolomics["symbol"]},
        "pathways_amount_dict": pathway_amount_dict
    }
    return json.dumps(out_dat)#json.dumps(pathway_dicts)


"""
App route for querying and parsing on reactome data
"""
@app.route('/reactome_parsing', methods=['POST'])
def reactome_parsing():
    """ Generates reactome hierarchy and maps query data to it
        returns: json:
                "omicsRecieved": dictionary containing for which omics type data was recieved
                "used_symbol_cols" : dictionary containing string which indicate which column in the data-table contains the queried accession IDs
                "fcs": fold changes of the queries
    """

    ###
    # Parse POST data
    ###
    target_db = request.json['targetOrganism']
    transcriptomics = request.json['transcriptomics']
    proteomics = request.json['proteomics']
    metabolomics = request.json['metabolomics']
    slider_vals = request.json['sliderVals']

    ##
    # Initialize Reactome Hierarchy
    ##
    reactome_hierarchy = PathwayHierarchy()
    reactome_hierarchy.load_data(data_path / "reactome_data", target_db.upper())
    reactome_hierarchy.add_json_data(data_path / "reactome_data" / "diagram")

    ##
    # Add query Data to Hierarchy
    ##
    node_pathway_dict = {}
    fold_changes = {'transcriptomics': [], 'proteomics': [], 'metabolomics': []}
    
    ##
    # Add Proteomics Data
    ##
    if proteomics["recieved"]:
        proteomics_query_data_tuples = []
        try:
            uniprot_access(proteomics["symbol"], slider_vals["proteomics"])
            prot_dict_global = json.loads(cache.get('prot_dict_global'))
            
            for ID in prot_dict_global:
                entry = prot_dict_global[ID]
                proteomics_query_data_tuples.append( (ID, entry[proteomics["value"]]) ) 

        except FileNotFoundError:
            print("Download 10090.protein.links.v11.5.txt.gz from STRING database.")
          
        # target organism is a little bit annoying at the moment
        tar_organism = 'Mus_musculus' if target_db == 'mmu' else 'Homo_sapiens'
        print(tar_organism)
        protein_query = ReactomeQuery(proteomics_query_data_tuples, tar_organism, 'UniProt', data_path / "reactome_data/pickles/")
        fold_changes['proteomics'] = protein_query.get_measurement_levels()
        # add entries to hierarchy
        # node_pathway_dict = {**node_pathway_dict, **protein_query.get_query_pathway_dict()}
        for query_key, query_result in protein_query.query_results.items():
            for entity_id, entity_data in query_result.items():
                reactome_hierarchy.add_query_data(entity_data, 'protein', query_key)
        
    ##
    # Add Metabolomics Data
    ##
    if metabolomics["recieved"]:
        metabolomics_query_data_tuples = []

        metabolomics_df_global = pd.read_json(cache.get('metabolomics_df_global'),orient='columns')
        metabolomics_df = metabolomics_df_global.drop_duplicates(subset=metabolomics["symbol"]).set_index(metabolomics["symbol"])
        for k,v in slider_vals["metabolomics"].items():
            is_empty = (v['empties'] & (metabolomics_df[k] == 'None'))
            is_numeric = (pd.to_numeric(metabolomics_df[k],errors='coerce').notnull())
            df_numeric = metabolomics_df.loc[is_numeric]
            df_is_in_range = df_numeric.loc[(df_numeric[k] >= v['vals'][0]) & (df_numeric[k] <= v['vals'][1])]
            df_is_empty = metabolomics_df.loc[is_empty]
        
            metabolomics_df = metabolomics_df.loc[metabolomics_df.index.isin(df_is_in_range.index) | metabolomics_df.index.isin(df_is_empty.index) ]
        metabolomics_dict = metabolomics_df.to_dict("index")
        metabolomics_IDs =  list(metabolomics_dict.keys())
        for ID in metabolomics_IDs:
            ID_number = str(ID).replace('CHEBI:','')
            metabolomics_query_data_tuples.append((ID_number, metabolomics_dict[ID][metabolomics["value"]]) ) 

          
        # target organism is a little bit annoying at the moment
        tar_organism = 'Mus_musculus' if target_db == 'mmu' else 'Homo_sapiens'
        print(tar_organism)
        metabolite_query = ReactomeQuery(metabolomics_query_data_tuples, tar_organism, 'ChEBI', data_path / "reactome_data/pickles/")
        fold_changes['metabolomics'] = metabolite_query.get_measurement_levels()
        # add entries to hierarchy
        # node_pathway_dict = {**node_pathway_dict, **metabolite_query.get_query_pathway_dict()}

        for query_key, query_result in metabolite_query.query_results.items():
            for entity_id, entity_data in query_result.items():
                reactome_hierarchy.add_query_data(entity_data, 'metabolite', query_key)
    
    ##
    # Add Transcriptomics Data Data
    ##
    if transcriptomics["recieved"]:
        transcriptomics_query_data_tuples = []
        transcriptomics_df_global = pd.read_json(cache.get('transcriptomics_df_global'),orient='columns')
        #TODO Duplicates are dropped how to handle these duplicates?!
        transcriptomics_df = transcriptomics_df_global.drop_duplicates(subset=transcriptomics["symbol"]).set_index(transcriptomics["symbol"])
        for k,v in slider_vals["transcriptomics"].items():
            is_empty = (v['empties'] & (transcriptomics_df[k] == 'None'))
            is_numeric = (pd.to_numeric(transcriptomics_df[k],errors='coerce').notnull())
            df_numeric = transcriptomics_df.loc[is_numeric]
            df_is_in_range = df_numeric.loc[(df_numeric[k] >= v['vals'][0]) & (df_numeric[k] <= v['vals'][1])]
            df_is_empty = transcriptomics_df.loc[is_empty]
        
            transcriptomics_df = transcriptomics_df.loc[transcriptomics_df.index.isin(df_is_in_range.index) | transcriptomics_df.index.isin(df_is_empty.index) ]

        #print("DF", transcriptomics_df)
        transcriptomics_dict = transcriptomics_df.to_dict("index")
        transcriptomics_IDs =  list(transcriptomics_dict.keys())
        for ID in transcriptomics_IDs:
            transcriptomics_query_data_tuples.append( (ID, transcriptomics_dict[ID][transcriptomics["value"]]) ) 

        # target organism is a little bit annoying at the moment
        tar_organism = 'Mus_musculus' if target_db == 'mmu' else 'Homo_sapiens'
        print(tar_organism)
        transcriptomics_query = ReactomeQuery(transcriptomics_query_data_tuples, tar_organism, 'Ensembl', data_path / "reactome_data/pickles/")
        fold_changes['transcriptomics'] = transcriptomics_query.get_measurement_levels()
        # add entries to hierarchy
        # node_pathway_dict = {**node_pathway_dict, **transcriptomics_query.get_query_pathway_dict()}
        for query_key, query_result in transcriptomics_query.query_results.items():
            for entity_id, entity_data in query_result.items():
                reactome_hierarchy.add_query_data(entity_data, 'gene', query_key)

    ##
    # Aggregate Data in Hierarcy, and set session cache
    ##
    reactome_hierarchy.aggregate_pathways()
    cache.set('reactome_hierarchy', reactome_hierarchy)
    dropdown_pathways = [] # TODO 
    out_dat = {
        "omicsRecieved": {"transcriptomics": transcriptomics["recieved"], "proteomics": proteomics["recieved"], "metabolomics": metabolomics["recieved"]},
        "used_symbol_cols" : {"transcriptomics": transcriptomics["symbol"],"proteomics": proteomics["symbol"], "metabolomics": metabolomics["symbol"]},
        "fcs": fold_changes
    }
    return json.dumps(out_dat)


@app.route('/reactome_overview', methods=['GET'])
def reactome_overview():
    """ Generates and sends data to the frontend needed to display the reactome overview graph
        Returns:
            json string containting overview data and pathway layouting data
                overview data: list of pathways and their data
                pathway layouting:  list of pathways
                                    dictionary mapping query to pathway ids
                                    list of Ids belonging to root nodes 
    """
    reactome_hierarchy = cache.get('reactome_hierarchy')
    out_data, pathway_dict, dropdown_data, root_ids = reactome_hierarchy.generate_overview_data(False)
    
    return json.dumps({'overviewData': out_data, "pathwayLayouting": {"pathwayList": dropdown_data, "pathwayNodeDictionary": pathway_dict, "rootIds": root_ids}})


@app.route('/get_reactome_json_files/<pathway>', methods=['GET'])
def get_reactome_json(pathway):
    hierarchy = cache.get('reactome_hierarchy')
    layout_json = hierarchy[pathway].layout_json_file
    graph_json = hierarchy[pathway].graph_json_file
    inset_pathways = {}
    for inset_pathway in list(set(list(hierarchy[pathway].total_measured_proteins.keys()) + list(hierarchy[pathway].total_measured_proteins.keys()) + list(hierarchy[pathway].total_measured_proteins.keys()))):
        pass

    return json.dumps({'layoutJson': layout_json, 'graphJson': graph_json})
if __name__ == "__main__":
    app.run(host='localhost', port=8000, debug=True)

    