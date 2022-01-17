from flask import Flask, render_template, send_from_directory,request, Response
from visMOP.python_scripts.networkx_layouting import get_spring_layout_pos, add_initial_positions, relayout
from visMOP.python_scripts.kegg_parsing import parse_KGML, generate_networkx_dict, drop_empty,add_incoming_edges
from visMOP.python_scripts.keggAccess import gene_symbols_to_keggID, multiple_query, kegg_get, parse_get, get_unique_pathways, query_kgmls,associacte_value_keggID
from visMOP.python_scripts.data_table_parsing import generate_vue_table_entries, generate_vue_table_header, create_df
from visMOP.python_scripts.create_overview import get_overview
from visMOP.python_scripts.uniprot_access import make_protein_dict, get_uniprot_entry, add_uniprot_info
from visMOP.python_scripts.interaction_graph import StringGraph
import pandas as pd
import pathlib
import os
import json
import sys

app = Flask(__name__, static_folder = "../dist/static", template_folder="../dist")


# global data
transcriptomics_df_global = None

prot_table_global = None
prot_dict_global = None

metabolomics_df_global = None

stringGraph = None

# DATA PATHS: (1) Local, (2) tuevis
data_path = pathlib.Path().resolve()
#data_path = pathlib.Path("/var/www/vismop")

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
    
    # make variable available globally TODO evaluate if there is a better alternative (maybe a class?)
    global transcriptomics_df_global
    print("table recieve triggered")
    
    # recieve data-blob
    transfer_dat = request.files['dataTable']
    
    #create and parse data table and prepare json
    data_table = create_df(transfer_dat)
    transcriptomics_df_global = data_table.copy(deep=True)
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
    # make table available globally
    global prot_table_global

    # aquire table data-blob
    transfer_dat = request.files['dataTable']
    
    # parse data table and prepare json
    prot_data = create_df(transfer_dat)
    prot_table_global = prot_data.copy(deep=True)
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

    # make dataframe available globally
    global metabolomics_df_global

    # recieve table data-blob
    transfer_dat = request.files['dataTable']
    
    # parse and create dataframe and prepare json
    data_table = create_df(transfer_dat)
    metabolomics_df_global = data_table.copy(deep=True)
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
    global prot_dict_global # keggID --> Uniprot data

    # clear existing graphs, if function is called again!!
    stringGraph.clear_ego_graphs()

    # get node IDs and confidence threshold from request
    node_IDs = request.json['nodes']
    confidence_threshold = request.json['threshold']

    # check if graph confidence needs updating
    if confidence_threshold != stringGraph.current_confidence:
        stringGraph.filter_by_confidence(confidence_threshold)

    # get string IDs from the transferred keggIDs of selected proteins/nodes
    string_ID = [prot_dict_global[node_ID]["string_id"] for node_ID in node_IDs]
    
    # generate a ego graph for each node
    for idx, node in enumerate(string_ID):
        stringGraph.query_ego_graph(node, idx, 1)
    # generate json data of merged ego graphs
    return json.dumps({"interaction_graph": stringGraph.get_merged_egoGraph()})

def uniprot_access(colname):
    # create dict from protein dataframe
    protein_dict = make_protein_dict(prot_table_global,colname)

    # query uniprot for the IDs in the table and add their info to the dictionary
    get_uniprot_entry(protein_dict,data_path)
    add_uniprot_info(protein_dict)
    # add location to table
    prot_table_global['Location'] = [protein_dict[item]['location'] for item in protein_dict]
    
    # make dict availbe globally and update it
    global prot_dict_global
    prot_dict_global= protein_dict

    # make string graph available globally and set a translation dict: k: stringID, v: GeneSymbol
    global stringGraph
    stringID_to_name = {v["string_id"]:v["Gene Symbol"][0] for k,v in prot_dict_global.items()}
    stringGraph.set_string_name_dict(stringID_to_name)


"""
App route for querying and parsing kegg files
"""
@app.route('/kegg_parsing', methods=['POST'])
def kegg_parsing():
    global metabolomics_df_global
    global stringGraph

    overall_entries = {}
    overall_relations = {}
    overall_reactions = {}
    proteomics_symbol_dict = {}
    symbol_kegg_dict_transcriptomics = {}
    mouse_db = "mmu"
    transcriptomics = request.json['transcriptomics']
    proteomics = request.json['proteomics']
    metabolomics = request.json['metabolomics']


    #gene_symbols_col = request.json['geneSymbolsCol']
    #value_col = request.json['valueCol']
    

    proteomics_keggIDs = []
    metabolomics_keggIDs = []
    transcriptomics_keggIDs = []

    fold_changes = {}

    #Handle Proteomics if available
    if proteomics["recieved"]:
        try:
            script_dir = data_path
            dest_dir = os.path.join(script_dir, '10090.protein.links.v11.5.txt.gz')  # '10090.protein.links.v11.0.txt'
            stringGraph = StringGraph(dest_dir)
            uniprot_access(proteomics["symbol"])
            # ID being a Uniprot ID
            for ID in prot_dict_global:
                entry = prot_dict_global[ID]
                proteomics_symbol_dict[ID] = entry["keggID"]
                proteomics_keggIDs.append(entry["keggID"])
                fold_changes[entry["keggID"]] = {"transcriptomics": "NA", "proteomics": entry[proteomics["value"]], "metabolomics": "NA",}

        except FileNotFoundError:
            print("Download 10090.protein.links.v11.5.txt.gz from STRING database.")
          
            # build protein interaction graph from string file
        

    # Handle Metabolomics if available
    if metabolomics["recieved"]:
        metabolomics_dict = metabolomics_df_global.drop_duplicates(subset=metabolomics["symbol"]).set_index(metabolomics["symbol"]).to_dict("index")
        metabolomics_keggIDs = metabolomics_dict.keys()
        for elem in metabolomics_keggIDs:
            if elem in fold_changes:
                fold_changes[elem]["metabolomics"] = metabolomics_dict[elem][metabolomics["value"]]

            else:
                fold_changes[elem] = {"transcriptomics": "NA", "proteomics":"NA", "metabolomics": metabolomics_dict[elem][metabolomics["value"]]}


    #Handle Transcriptomics
    if transcriptomics["recieved"]:
        #TODO Duplicates are dropped how to handle these duplicates?!
        transcriptomics_dict = transcriptomics_df_global.drop_duplicates(subset=transcriptomics["symbol"]).set_index(transcriptomics["symbol"]).to_dict("index")
        
        gene_symbols_transcriptomics=transcriptomics_dict.keys()
        #TODO blacklist system to handle unanswered queries
        unwanted_temporary = {"Gm10972","Gm2399","Gm5819","Gm7969","LOC636187","AC004946.2","AP005901.1","AC079779.1","FP325318.1","LINC00540","THCAT155","AC132825.3","AL138889.3","AL023807.1","AC092957.1","LINC02842","AC024337.2","LINC01331","GAGE12B","NBPF5P","LINC00536","AC019270.1","AC092640.1","LINC02470","OR4K13","AL512605.1","AC113418.1","AL359851.1","RPL22P12","OR10G4","AC124804.1","AP005901.5","LINC02717","LINC00906","LINC01727","C10orf105","AC024270.4","AC008083.3","AC104118.1","RPL37P2","ACTG1P15","SEPHS1P1","AL512328.1","RRAS2P1","ARMS2","NPHP3-AS1","AC011595.2","AC022211.1","RPL26P6","SPRR2G","GGTLC4P","AL844908.1","AC025040.2","AC093458.2","AC104024.4","LINC02016","AC090772.3","AC107081.3","AC013724.1","RPS19P3","RPS7P3","AP001432.1","AC069213.3","AP001024.1"}
        gene_symbols_transcriptomics = [symb for symb in gene_symbols_transcriptomics if symb not in unwanted_temporary]
        transcriptomics_keggIDs, symbol_kegg_dict_transcriptomics = gene_symbols_to_keggID(gene_symbols_transcriptomics, mouse_db, data_path / 'kegg_cache/gene_symbol_cache.json')
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
    combined_keggIDs = list(set(transcriptomics_keggIDs+proteomics_keggIDs+list(metabolomics_keggIDs)))
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




if __name__ == "__main__":
    app.run(host='localhost', port=8000, debug=True)

    