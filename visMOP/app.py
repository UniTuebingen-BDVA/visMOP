from flask import Flask, render_template, send_from_directory,request, Response
from python_scripts.networkx_layouting import get_spring_layout_pos, add_initial_positions, relayout
from python_scripts.kegg_parsing import parse_KGML, generate_networkx_dict, drop_empty,add_incoming_edges
from python_scripts.keggAccess import gene_symbols_to_keggID, multiple_query, kegg_get, parse_get, get_unique_pathways, query_kgmls,associacte_value_keggID
from python_scripts.data_table_parsing import generate_vue_table_entries, generate_vue_table_header, create_df
from python_scripts.create_overview import get_overview
from python_scripts.uniprot_access import make_protein_dict, get_uniprot_entry, add_uniprot_info, make_interaction_dict
from python_scripts.interaction_graph import StringGraph
import pandas as pd
import pathlib
import os
import json
import sys
import snappy

app = Flask(__name__, static_folder = "../dist/static", template_folder="../dist")

transcriptomics_df_global = None
stringGraph = None
prot_dict_global = None
# DATA PATHS: (1) Local, (2) tuevis
data_path = pathlib.Path().resolve().parent
#data_path = pathlib.Path("/var/www/visMOP")

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
table recieve
"""
@app.route('/transcriptomics_table', methods=['POST'])
def data_table_recieve():
    global transcriptomics_df_global
    print("table recieve triggered")
    transfer_dat = request.files['dataTable']
    #table_raw = transfer_dat.read()
    data_table = create_df(transfer_dat)
    transcriptomics_df_global = data_table.copy(deep=True)
    table_json = data_table.to_json(orient="columns")
    entry_IDs = list(data_table.iloc[:,0])
    out_data =  {}
    out_data["entry_IDs"] = entry_IDs
    out_data["header"] = generate_vue_table_header(data_table)
    out_data["entries"] = generate_vue_table_entries(data_table)
    out_data["data"] = table_json
    #debuggings
    #out_data["header"] = [{"text": 'A', "value": 'a'}, {"text": 'B', "value": 'b'}, {"text": 'C', "value": 'c'}]
    #out_data["entries"] = [{"a": '1', "b": '4',"c": '3'}, {"a": '1', "b": '4',"c": '3'}, {"a": '1', "b": '4',"c": '3'}]

    json_data = json.dumps(out_data)

    return json_data


"""
protein recieve
"""
@app.route('/proteomics_table', methods=['POST'])
def prot_table_recieve():
    global prot_table_global
    global stringGraph

    transfer_dat = request.files['proteinDat']
    prot_data = create_df(transfer_dat)

   

    # shorten protein names a bit
    #not a good idea
    prot_data['Protein name'] = prot_data['Protein name'].apply(lambda x: x.split("(")[0])
    # add location to data table

    prot_table_global = prot_data.copy(deep=True)

    prot_table_json = prot_data.to_json(orient="columns")
    entry_IDs = list(prot_data.iloc[:, 0])
    out_data = {}
    out_data["entry_IDs"] = entry_IDs
    out_data["header"] = generate_vue_table_header(prot_data)
    out_data["entries"] = generate_vue_table_entries(prot_data)
    out_data["data"] = prot_table_json
    #out_data["data"] = out_data["data"].replace('\\/', '_')
    #print(out_data["data"])

    # build protein interaction dict
    try:
        script_dir = data_path
        dest_dir = os.path.join(script_dir, '10090.protein.links.v11.5.txt.gz')  # '10090.protein.links.v11.0.txt'
        stringGraph = StringGraph(dest_dir)

    except FileNotFoundError:
        interaction_dict = {}
        print("Download 10090.protein.links.v11.5.txt.gz from STRING database.")

    #compressed = snappy.compress(json.dumps({"protein_dat": protein_dict, "protein_table": out_data})) # , "interaction_dict": interaction_dict
    #resp = Response(response=compressed, mimetype="application/octet-stream")
    #resp.headers["Content-Type"] = "application/octet-stream; charset=utf-8"

    return json.dumps({"protein_table": out_data})

@app.route('/interaction_graph', methods=['POST'])
def interaction_graph():
    global stringGraph
    global prot_dict_global

    stringGraph.clear_ego_graphs()
    node_IDs = request.json['nodes']
    
    string_ID = [prot_dict_global[node_ID]["string_id"] for node_ID in node_IDs]
    confidence_threshold = request.json['threshold']
    if confidence_threshold != stringGraph.current_confidence:
        stringGraph.filter_by_confidence(confidence_threshold)
    stringGraph.print_info()
    for node in string_ID:
        stringGraph.query_ego_graph(node, 1)
    return json.dumps({"interaction_graph": stringGraph.get_merged_egoGraph()})

def uniprot_access(colname):
     # create dict with additional uniprot data
    protein_dict = make_protein_dict(prot_table_global,colname)
    get_uniprot_entry(protein_dict)
    add_uniprot_info(protein_dict)
    prot_table_global['Location'] = [protein_dict[item]['location'] for item in protein_dict]
    print(protein_dict)
    global prot_dict_global
    prot_dict_global= protein_dict
    global stringGraph
    stringID_to_name = {v["string_id"]:v["Gene Symbol"][0] for k,v in prot_dict_global.items()}
    stringGraph.set_string_name_dict(stringID_to_name)


"""
App route for querying and parsing kegg files
"""
@app.route('/kegg_parsing', methods=['POST'])
def kegg_parsing():
    global_entry = {}
    global_relation = {}
    global_reaction = {}
    proteomics_symbol_dict = {}
    mouse_db = "mmu"
    transcriptomics = request.json['transcriptomics']
    proteomics = request.json['proteomics']


    #gene_symbols_col = request.json['geneSymbolsCol']
    #value_col = request.json['valueCol']
    print("transcriptomics", transcriptomics)
    print("proteomics", proteomics)
    if(not transcriptomics["recieved"]) and (not proteomics["recieved"]):
        print("No Valid Data Supplied")

    else:
        keggIDs_proteomics = []
        fold_changes = {}

        #Handle Proteomics if available
        if proteomics["recieved"]:
            uniprot_access(proteomics["symbol"])
            for ID in prot_dict_global:
                entry = prot_dict_global[ID]
                #print(entry)
                proteomics_symbol_dict[ID] = entry["keggID"]
                keggIDs_proteomics.append(entry["keggID"])
                fold_changes[entry["keggID"]] = {"transcriptomics": "NA", "proteomics": entry[proteomics["value"]]}

        #Handle Transcriptomics
        #TODO Duplicates are dropped how to handle these duplicates?!
        transcriptomics_dict = transcriptomics_df_global.drop_duplicates(subset=transcriptomics["symbol"]).set_index(transcriptomics["symbol"]).to_dict("index")
        
        gene_symbols_transcriptomics=transcriptomics_dict.keys()
        unwanted_temporary = {"Gm10972","Gm2399","Gm5819","Gm7969","LOC636187","AC004946.2","AP005901.1","AC079779.1","FP325318.1","LINC00540","THCAT155","AC132825.3","AL138889.3","AL023807.1","AC092957.1","LINC02842","AC024337.2","LINC01331","GAGE12B","NBPF5P","LINC00536","AC019270.1","AC092640.1","LINC02470","OR4K13","AL512605.1","AC113418.1","AL359851.1","RPL22P12","OR10G4","AC124804.1","AP005901.5","LINC02717","LINC00906","LINC01727","C10orf105","AC024270.4","AC008083.3","AC104118.1","RPL37P2","ACTG1P15","SEPHS1P1","AL512328.1","RRAS2P1","ARMS2","NPHP3-AS1","AC011595.2","AC022211.1","RPL26P6","SPRR2G","GGTLC4P","AL844908.1","AC025040.2","AC093458.2","AC104024.4","LINC02016","AC090772.3","AC107081.3","AC013724.1","RPS19P3","RPS7P3","AP001432.1","AC069213.3","AP001024.1"}
        gene_symbols_transcriptomics = [symb for symb in gene_symbols_transcriptomics if symb not in unwanted_temporary]
        keggIDs_transcriptomics, symbol_kegg_dict_transcriptomics = gene_symbols_to_keggID(gene_symbols_transcriptomics, mouse_db, data_path / 'kegg_cache/gene_symbol_cache.json')
        for symbol in gene_symbols_transcriptomics:
            try:
                keggID = symbol_kegg_dict_transcriptomics[symbol]
                if keggID in fold_changes:
                    fold_changes[keggID]["transcriptomics"] = transcriptomics_dict[symbol][transcriptomics["value"]]
                else:
                    fold_changes[keggID] = {"transcriptomics": transcriptomics_dict[symbol][transcriptomics["value"]], "proteomics": "NA"}
            except:
                print("Symbol: {} was not in the kegg dictionary, probably due to it not being found in the kegg DB")
        
        #keggID_value_dict, value_extent, all_gene_fcs = associacte_value_keggID(transcriptomics_df_global,gene_symbols_col,value_col,symbol_kegg_dict)
        #print("keggIDs: {}".format(keggIDs))

        #combineKeggIDS
        combined_keggIDs = list(set(keggIDs_transcriptomics+keggIDs_proteomics))
        print("len keggIDs: {}".format(len(combined_keggIDs)))

        kegg_gets = kegg_get(keggIDs=combined_keggIDs,caching_path=data_path / 'kegg_cache/kegg_gets.json')
        print("kegg_gets: {}".format(len(kegg_gets)))

        parsed_gets = [parse_get(v,k) for k,v in kegg_gets.items()]
        print("parsed_gets: {}".format(len(parsed_gets)))
        #pathways_per_gene = {elem.geneName : (elem.keggID,elem.pathways) for elem in parsed_gets}
        #print(pathways_per_gene)
        unique_pathways = get_unique_pathways(parsed_gets)
        #print(unique_pathways)
        kegg_kgml = query_kgmls(unique_pathways, data_path / 'kegg_cache/kgml_cache.json')
        parsed_pathways = []
        print("Len unique pws: ", len(unique_pathways))
        for pathwayID in unique_pathways[0:15]:
            if "01100" in pathwayID:
                print("Skipping map01100, general overview")
            else:
                parsed_pathways.append(parse_KGML(pathwayID, kegg_kgml[pathwayID], global_entry, global_relation, global_reaction, fold_changes)) #.asdict())
        pathway_node_dict = {k:v for k,v in (pathway.return_pathway_node_list() for pathway in parsed_pathways)}
        dropdown_pathways = [pathway.return_formated_title() for pathway in parsed_pathways]        
        add_incoming_edges(global_entry)
        global_dict_entries = {k: v.asdict() for k, v in global_entry.items()}

        # fix pathway names (some had 'TITLE:' prefix)
        for key in global_dict_entries:
            if not global_dict_entries[key]['name'] is None:
                for i in range(len(global_dict_entries[key]['name'])):
                    if global_dict_entries[key]['name'][i].startswith('TITLE:'):
                        global_dict_entries[key]['name'][i] = global_dict_entries[key]['name'][i][6::]



        without_empty = global_dict_entries#drop_empty(global_dict_entries)
        print("global", len(global_dict_entries))
        print("without_empty", len(without_empty))
        #print(without_empty)
        #print(global_dict_entries)
        networkx_parsed = generate_networkx_dict(without_empty)
        pos = get_spring_layout_pos(networkx_parsed)
        #current_node_positions = pos
        #current_graph = graph
        #node_data = without_empty
        #print("POS", pos)
        with_init_pos = add_initial_positions(pos,without_empty)


        ###########################################################################
        # creates a dict with all pathway names for create_overview function
        
        pathway_titles = {}
        for i in parsed_pathways:
            pathway_titles["path:" + i.keggID] = [i.title]


        pathway_connection_dict = get_overview(pathway_node_dict, without_empty, global_dict_entries,pathway_titles)

        network_ov = generate_networkx_dict(pathway_connection_dict)
        pos_ov = get_spring_layout_pos(network_ov)
        init_pos_ov = add_initial_positions(pos_ov, pathway_connection_dict)
        print("OVERVIEW",pathway_connection_dict)

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
        out_dat = {
            "overview_data": pathway_connection_dict,
            "main_data":with_init_pos,
            "fcs": fold_changes,
            "transcriptomics_symbol_dict": symbol_kegg_dict_transcriptomics,
            "pathway_layouting": {"pathway_list": dropdown_pathways, "pathway_node_dictionary": pathway_node_dict},
            "proteomics_symbol_dict": proteomics_symbol_dict,
            "used_symbol_cols" : {"transcriptomics": transcriptomics["symbol"],"proteomics": proteomics["symbol"]}
        }
        return json.dumps(out_dat)#json.dumps(pathway_dicts)




if __name__ == "__main__":
    app.run(host='localhost', port=8000, debug=True)

    