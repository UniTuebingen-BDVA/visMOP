import urllib.request
import json
import pathlib
import time
import re
from visMOP.python_scripts.kegg_get_entry import KeggGet

# DATA PATHS: (1) Local, (2) tuevis
#data_path = pathlib.Path().resolve()
#data_path = pathlib.Path("/var/www/vismop")

def associacte_value_keggID(datatable,symbol_col, val_col, symbol_kegg_dict):
    out_dict = {}
    val_extent = [datatable[val_col].min(), datatable[val_col].max()]
    all_fcs = datatable[val_col].tolist()

    def apply_func(series):
        current_symbol = series[symbol_col]
        try:
            out_dict[symbol_kegg_dict[current_symbol]] = series[val_col]
        except:
            print("Genesymbol not found! (Probably not available on KEGG)")
    datatable.apply(apply_func, axis = 1)
    return out_dict, val_extent, all_fcs

def cache_kegg_data(cache_path, data_dict):
    """ Dumps requested data dictionaries into specified cache

    as shown in https://stackoverflow.com/a/12309296

    Args:
        cache_path: path to cache folder (use pathlib path!!)
        data_dict: data_dictionary to be cached
    """

    with open(cache_path, 'w+', encoding='utf-8') as out_file:
        json.dump(data_dict, out_file, ensure_ascii=False, indent=4)


def check_cache(caching_path, check_keys):
    """ Checks if provided keys are already in cache 

    Args:
        caching_path: Path to cach file
        check_key: List of keys to check
    Returns:
        query_IDs: Key not contained in cache
        cache_data: cached data
    """
    try:
        with open(caching_path) as in_file:
            read_data = json.load(in_file)
            set_cache = set(read_data.keys())
            query_IDs = [elem for elem in check_keys if elem not in set_cache]
            print("Amount not in Cache ", len(query_IDs))
            cache_data = read_data
            print("Amount in Cache ", len(cache_data.keys()))
            return query_IDs, cache_data
    except:
        print("Cache was empty!!! Querying all supplied IDs")
        query_IDs = check_keys
        return query_IDs, {}

def kegg_conv(origin_IDs=None, kegg_DB=None, origin_DB=None, caching_path=None):
    """ Converts non-KEGG IDs to KEGG IDs
    
    for kegg api infos see: https://www.kegg.jp/kegg/rest/keggapi.html

    Args:
        kegg_DB: KEGG database as string (e.g. "mmu", "hsa")
        origin_DB: Origin non-KEGG database as string (e.g. "uniprot" or up", "pubmed" or "pmid")
        origin_IDs: List of one or more gene/protein IDs from the specified non-KEGG database
        caching_path: path to cache, optional, if none all origin_IDs are queried
    Returns:
        converted_IDs: dictionary with "<origin ID> : <KEGG ID>" entries
    """
    
    converted_IDs_cache ={}
    origin_IDs = ["{}:{}".format(origin_DB, elem) for elem in origin_IDs]

    if caching_path:
        query_IDs, converted_IDs_cache = check_cache(caching_path, origin_IDs)
    else:
        query_IDs = origin_IDs

    if query_IDs:
        origin_query = "+".join(query_IDs)
        kegg_api_url = "http://rest.kegg.jp/conv/{}/{}".format(kegg_DB, origin_query)
        print(kegg_api_url)
        try:
            with urllib.request.urlopen( kegg_api_url ) as kegg_response:
                api_text_lines = filter(None, kegg_response.read().decode("utf-8").split("\n"))
                for line in api_text_lines:
                    tmp_line = line.strip().split("\t")
                    converted_IDs_cache[tmp_line[0]] = tmp_line[1]
        except urllib.error.HTTPError as e:
            print("HTTP ERROR: {}".format(e.__dict__))
        except urllib.error.URLError as e:
            print("URL ERROR: {}".format(e.__dict__))            

    if caching_path : cache_kegg_data(caching_path, converted_IDs_cache)
    converted_IDs = {}

    conv_failed = []
    for ID in origin_IDs:
        try:
            converted_IDs[ID] = converted_IDs_cache[ID]
        except:
            conv_failed.append(ID)
            print("Couldn't find a corresponding KEGG-ID to ", ID)

    return converted_IDs, conv_failed 

def kegg_find(gene_symbol, organism):
    """ performs find kegg api request 

    Args:
        gene_symbol: string corresponding to the required gene symbol
        organisum strign corresponding to the target organism (e.g. "mmu")
    """
    kegg_api_url = "http://rest.kegg.jp/find/{}/{}".format(organism, gene_symbol)
    print("KEGG-URL, ", kegg_api_url)
    regex_pattern = re.compile(r"(?i)(\\t|\t| ){}(,|;)".format(gene_symbol))
    try:
        with urllib.request.urlopen( kegg_api_url ) as kegg_response:
                api_text_lines = kegg_response.read().decode("utf-8")
                lines_list = api_text_lines.split("\n")
                if lines_list[-1] == '':
                    lines_list = lines_list[:-1]
                for line in lines_list:
                    if(regex_pattern.search(line)):
                        return line.split("\t")[0]
    except urllib.error.HTTPError as e:
            print("URL ERROR: {}".format(e.__dict__))
    except urllib.error.URLError as e:
            print("URL ERROR: {}".format(e.__dict__))

def gene_symbols_to_keggID(gene_symbols, organism, caching_path = None):
    """ converts a list of genesymbols to kegg IDs of a given organism

    Args:
        gene_symbols: list of gene_symbols
        organism: sting indicating target organism
        cahcing_path: path to cache
    Return:
        kegg Ids: List of Kegg-IDs
        symbol_kegg_dict: dictrionary: K: symbol, V: keggID

    """
    query_symbols = []
    cache_data = {}

    if caching_path:
        try:
            with open(caching_path) as in_file:
                cache_data = json.load(in_file)
                set_cache = set(cache_data[organism].keys())
                query_symbols = [elem for elem in gene_symbols if elem not in set_cache]
        except:
            print("Cache was empty!!! Querying all supplied gene symbols")
            query_symbols = gene_symbols
    else:
        query_symbols = gene_symbols

    if len(query_symbols) > 0:
        new_results = query_gene_symbols(query_symbols, organism)
        if organism in cache_data.keys():
            cache_data[organism] = {**new_results, **cache_data[organism]}
        else:
            cache_data[organism] = new_results
        cache_kegg_data(caching_path, cache_data)

    keggIDs = []
    symbol_kegg_dict = {}
    for symbol in gene_symbols:
        try:
            keggId = cache_data[organism][symbol]
            symbol_kegg_dict[symbol] = keggId
            keggIDs.append(keggId)
        except:
            print("Couldn't find a matching KeggID ", symbol)

    return keggIDs, symbol_kegg_dict 


def kegg_get(keggIDs=None, kegg_DB=None, options = None, caching_path=None ):
    """ Gets KEGG entries specified in keggIDs from the specified KEGG database 
    
    for kegg api infos see: https://www.kegg.jp/kegg/rest/keggapi.html

    Args:
        keggIDs: One or More Kegg IDs

        kegg_DB: Kegg database as string (e.g. "mmu", "hsa"),
                if None keggIDs are expected to contain the database abbreviation (i.e. "mmu:00000")
                
        options: options for file output, default is None: returns flat file format

        caching_path: path objecto to indicating the cache file, if None, no caching is performed
        
    Returns:
        out_dict: dict with kegg GET entries
        get_failed: list of accession numbers for which the get request was not successful
    """
    if kegg_DB:
        format_IDs = ["{}:{}".format(kegg_DB, ID) for ID in keggIDs]
    else:
        format_IDs = [elem for elem in keggIDs]

    kegg_get_cache = {}
    if caching_path:
        query_IDs, kegg_get_cache = check_cache(caching_path, format_IDs)
    else:
        query_IDs = format_IDs

    ID_chunks = [query_IDs[i:i+10] for i in range(0,len(query_IDs),10)]

    
    query_chunks = ["+".join(ID_chunk) for ID_chunk in ID_chunks]

    if options:
        query_chunks = [query_chunk + "/{}".format(options) for query_chunk in query_chunks]  


    result_collection = []
    if query_chunks:
        print("Querying KEGG Database!!")
        for query_chunk in query_chunks:
            
            time.sleep(.1)
            kegg_api_url = "http://rest.kegg.jp/get/{}".format(query_chunk)
            print(kegg_api_url)
            try:
                with urllib.request.urlopen( kegg_api_url ) as kegg_response:
                    api_text_lines = kegg_response.read().decode("utf-8")
                    get_results = api_text_lines.split("///\n")

                if get_results[-1] == '':
                    get_results = get_results[:-1]
                result_collection.extend(get_results)
            except urllib.error.HTTPError as e:
                print("URL ERROR: {}".format(e.__dict__))
            except urllib.error.URLError as e:
                print("URL ERROR: {}".format(e.__dict__))                
    else:
        print("All requested files are cached!!!")
    get_result_dict = dict(zip(query_IDs, result_collection))
    cache_dict = {**kegg_get_cache, **get_result_dict}
    if caching_path : cache_kegg_data(caching_path, cache_dict)

    out_dict = {}
    get_failed = []
    for ID in format_IDs:
        if ID in out_dict.keys():
            print("ID {} already in Keys, possible duplicate?".format(ID))
        try:
            out_dict[ID] = cache_dict[ID]
        except:
            print("Couldn't get a KEGG entry to ", ID)
            get_failed.append(ID)
    print("{} KEGG entries could not be recieved!".format(len(get_failed)))
    return out_dict

def query_kgmls(pathways_ids, caching_path):
    """queries kegg for kgmls corres

    Args:
        pathways_ids: a list of pathway ids
        caching_path: path to caching file

    Returns:
        out_dict: dictionary with entries corresponding to the pathway ids
    
    """
    # check which kgmls are already aquired
    not_contained, cache_data = check_cache(caching_path, pathways_ids)
    # temporary blacklist TODO permanent Blacklist?
    temporary_blacklist = ["mmu07229", "mmu01120", "mmu04626", "mmu02020"]
    successful_query = []
    # query kgmls 
    for pathway in not_contained:
        if( pathway not in temporary_blacklist):
            kegg_api_url = "http://rest.kegg.jp/get/{}/kgml".format(pathway)
            try:
                with urllib.request.urlopen( kegg_api_url ) as kegg_response:
                    api_text_lines = kegg_response.read().decode("utf-8")
                    cache_data[pathway] = api_text_lines
                    print("GET KGML: {}".format(pathway))
                    successful_query.append(pathway)
            except urllib.error.URLError as e:
                print("HTTP ERROR: {}".format(e.__dict__))
            except urllib.error.URLError as e:
                print("URL ERROR: {}".format(e.__dict__))    
            time.sleep(.1)
    cache_kegg_data(caching_path, cache_data)
    out_dict = {}
    for ID in pathways_ids:
        try:
            out_dict[ID] = cache_data[ID]
        except:
            print(pathway, "not found in cache, probably it does not exist for target organism" )
    return out_dict


def multiple_query(query_function,**func_options):
    """queries multiple elements

    Args:
        query_function: function which to call
        func_options: options to pass into the query function
    Returns:
        out_dict: query results
    """
    not_get = None
    out_dict = {}
    while True:
            time.sleep(.1)
            try:
                out_dict, remaining = query_function(**func_options)
                if len(remaining) == not_get:
                    break
                print(len(remaining))
                not_get = len(remaining)
            except:
                break
           
    return out_dict

def query_gene_symbols(gene_symbols, organism):
    """queries multiple gene symbols

    Args:
        gene_symbols: list of gene symbols
        organism: string indicating organism
    Returns:
        out_dict: query results
    """
    out_dict = {}
    for symbol in gene_symbols:
            time.sleep(.5)
            try:
                query_result = kegg_find(symbol, organism)
                if(query_result):
                    print(query_result)
                    out_dict[symbol] = query_result
                else:
                    print("Could not find a KeggID for: {}".format(symbol))

            except:
                print("Error during query for: {}".format(symbol))
           
    return out_dict


def parse_get(get_response, keggID):
    """parses a kegg get response to a KeggGet class-object

    Args:
        get_response: a kegg get response as text
        keggID: kegg id of get response

    Returns:
        kegg_get: parsed KeggGet class object
    
    """

    kegg_get = KeggGet(keggID)
    lines = get_response.split("\n")
    in_pathway = False
    for line in lines:
        line_header = line[0:12].strip()
        line_content = line[12:]

        if line_header == "NAME":
            #print(line_content)

            kegg_get.geneName = line_content.split(",")[0]
        elif line_header == "PATHWAY":
            in_pathway = True
            kegg_get.add_pathway(line_content.split("  ")[0])
        elif in_pathway and len(line_header)==0:
            kegg_get.add_pathway(line_content.split("  ")[0])
        else:
            in_pathway = False

    return kegg_get    

def get_unique_pathways(list_KeggGets, kegg_target_organism='mmu'):
    """Returns a list of unique pathways

    Args:
        list_KeggGets: a list of KeggGets class-objects
    Returns:
        unique_pathways: a list of unique pathways
    
    """
    unique_pathways = []
    for entry in list_KeggGets:
        current_pathways = entry.pathways
        current_pathways = [entry.replace("map", kegg_target_organism) for entry in current_pathways]
        for pathway in current_pathways:
            if pathway not in unique_pathways:
                unique_pathways.append(pathway)
    return unique_pathways

if __name__ == "__main__":
    """Tests KEGG acess functions

    
    mouse_db = "mmu"
    keggIDs = gene_symbols_to_keggID(["Acot1", "Abcg2", "Acat2", "Acadm"], mouse_db, data_path / 'kegg_cache/gene_symbol_cache.json')
    print(keggIDs)
    kegg_gets = multiple_query(kegg_get, keggIDs=keggIDs,caching_path=data_path / 'kegg_cache/kegg_gets.json')
    print(kegg_gets)
    parsed_gets = [parse_get(v,k) for k,v in kegg_gets.items()]
    unique_pathways = get_unique_pathways(parsed_gets)

    print(unique_pathways)
    """
    #uniprot_IDs = ["Q8BWN8","P47740","Q9R0H0","Q9DBK0","O88844","Q9D379","P34914","Q9QZD8","O08756","P45952","Q9QXD1","Q61425","P51660","Q2TPA8","Q8QZT1","Q9Z2Z6","Q99LB2","O35459","Q5XG73","Q8VCW8","Q91Z53","P52825","Q8CC88","Q921G7","Q8R086","Q8BH86","Q9R112","Q9D6M3","Q8BW75","O09174","P26443","Q9Z2I8","Q9JHW2","Q8R0Y8","Q9EQ20","Q3URE1","Q07417","Q99LB7","Q8BGA8","Q3UEG6","Q8R164","Q9QXX4","Q9D938","Q8C5Q4","Q61387","Q8QZS1","Q8R216","Q8BK72","P67778","P11352","Q9DBF1","O35129","P05202","Q8CHT0","Q61578","Q9DCW4","Q3ULD5","P53395","Q9CPY7","Q9JHI5","Q8R4H7","P97823","Q8BIP0","A2AS89","Q9CXT8","Q8QZY2","O35857","Q8K370","Q9WTQ8","Q9CR61","P47791","P63038","Q9Z1P6","Q9WVM8","Q78J03","Q9CQS4","Q9CQH3","Q9D051","Q9WU19","Q91YT0","Q8BKZ9","Q91VD9","Q8VEM8","O35490","Q9DC70","Q3UIU2","Q9CQZ6","Q8K2B3","Q9CQJ8","Q9DB20","Q8BUY5","Q99LC3","Q8VE38","Q6PB66","Q91VR2","P35486","Q9D6J5","Q91WD5","Q99LY9","P03930","O08601","Q9D6J6","Q91WK1","P03921","Q9DCT2","P35564","Q8BK30","Q9DCS9","Q60930","Q9ERS2","Q6ZQI3","Q9CZU6","Q9CQF9","Q9EQI8","Q8BU14","Q9CR21","Q8JZR0","A2APY7","P08003","P47738","Q9EQH2","P45878","Q9CQF4","Q8VHE0","Q9D0F3","Q9CRB8","Q9ERR7","Q9CQZ5","Q9CXV1","O09159","Q60932","P06909","P08226","Q9DCM0","P00329","Q60931","Q8CCJ3","P57759","O09158","Q8BVI4","Q9D8V0","Q8BMF4","Q8C7X2","Q64310","Q9QXT0","Q99PG0","P04939","Q60936","P12265","Q8BM55","P50580","Q80UM7","Q62186","Q9JKR6","P62900","Q9JK42","Q99L04","P34884","P20029","Q922R8","Q99LM2","P53026","P50172","O88986","Q91YW3","P47962","Q91YQ5","P62717","P47963","O08807","P61620","Q8BVA5","P33267","O54734","P19221","P19253","P14148","Q9DCN2","P47911","Q8K2T4","O08600","P16406","Q8VCR2","P61358","P50427","Q8QZR3","Q99PL5","Q91V92","P07759","O88587","P56657","Q68FF9","Q9D1M7","Q91W64"]

    #print(data_path / 'kegg_cache')
    #out_dict = read_into_cache(kegg_conv, origin_IDs=uniprot_IDs, kegg_DB="mmu", origin_DB="up", caching_path=data_path / 'kegg_cache/converted_IDs.json')

    #print(out_dict.values())

    #test = read_into_cache(kegg_get, keggIDs=list(out_dict.values()),caching_path=data_path / 'kegg_cache/kegg_gets.json')
    #list(out_dict.values()),caching_path=data_path / 'kegg_cache/kgml_gets.json'

    #test_key = list(test.keys())[0]
    #test_get =  "ENTRY       217830            CDS       T01002\nNAME        Dglucy, 9030617O03Rik\nDEFINITION  (RefSeq) D-glutamate cyclase\nORTHOLOGY   K22210  D-glutamate cyclase [EC:4.2.1.48]\nORGANISM    mmu  Mus musculus (mouse)\nPATHWAY     mmu00471  D-Glutamine and D-glutamate metabolism\n            mmu01100  Metabolic pathways\nBRITE       KEGG Orthology (KO) [BR:mmu00001]\n             09100 Metabolism\n              09106 Metabolism of other amino acids\n               00471 D-Glutamine and D-glutamate metabolism\n                217830 (Dglucy)\n            Enzymes [BR:mmu01000]\n             4. Lyases\n              4.2  Carbon-oxygen lyases\n               4.2.1  Hydro-lyases\n                4.2.1.48  D-glutamate cyclase\n                 217830 (Dglucy)\nPOSITION    12; 12 E\nMOTIF       Pfam: DUF4392 DUF1445\nDBLINKS     NCBI-GeneID: 217830\n            NCBI-ProteinID: NP_663423\n            MGI: 2444813\n            Ensembl: ENSMUSG00000021185\n            Vega: OTTMUSG00000024490\n            UniProt: Q8BH86\nAASEQ       617\n            MTISFLLRSCLRSAVRSLPKAALIRNTSSMTEGLQPASVVVLPRSLAPAFESFCQGNRGP\n            LPLLGQSEAVKTLPQLSAVSDIRTICPQLQKYKFGTCTGILTSLEEHSEQLKEMVTFIID\n            CSFSIEEALEQAGIPRRDLTGPSHAGAYKTTVPCATIAGFCCPLVVTMRPIPKDKLERLL\n            QATHAIRGQQGQPIHIGDPGLLGIEALSKPDYGSYVECRPEDVPVFWPSPLTSLEAVISC\n            KAPLAFASPPGCMVMVPKDTASSASCLTPEMVPEVHAISKDPLHYSIVSAPAAQKVRELE\n            STIAVDPGNRGIGHLLLKDELLQAALSLSHARSVLVTTGFPTHFNHEPPEETDGPPGAIA\n            LAAFLQALGKETAMVVDQRALNLHMRIVEDAIRQGVLKTPIPILTYQGRSMEDARAFLCK\n            DGDPKSPRFDHLVAIERAGRAADGNYYNARKMNIKHLVDPIDDIFLAAQKIPGISSTGVG\n            DGGNELGMGKVKAAVKKHIRNGDVIACDVEADFAVIAGVSNWGGYALACALYILNSCQVH\n            ERYLRRATGPSRRAGEQSWIQALPSVAKEEKMLGILVENQVRSGVSGIVGMEVDGLPFHD\n            VHAEMIRKLVGATTVHM\nNTSEQ       1854\n            atgaccatctcatttctcctgaggtcctgtcttcgctctgctgtaaggagtctacccaag\n            gcagcacttatcagaaacacttccagcatgacggaaggactccagccggctagtgtggtg\n            gtcctgcccagatccctagcaccagcttttgaaagcttctgccagggcaaccggggtcct\n            ctgcccctccttggacaaagtgaggcggtgaagacactccctcagctgagcgctgtttca\n            gacataaggaccatctgtccacagttgcagaaatacaagtttggcacctgcacaggcatc\n            ctgacctcactggaagagcactcagaacaactaaaagaaatggtgaccttcatcatagac\n            tgcagcttctccatagaagaggccttggagcaggcagggatccccagaagagacctaaca\n            ggtcccagccatgcaggagcatacaagacaacagtgccctgtgccaccattgctggcttc\n            tgctgccctctggtggtcacaatgagacccattcccaaggacaagctggaaaggctgttg\n            caggccactcacgccataagaggacagcaaggacaacccattcacatcggtgacccaggt\n            cttttgggaattgaggcactttccaaacctgactacgggagttatgtggagtgtcggccc\n            gaggatgtccctgtgttctggccatctccgctgaccagtctggaagcagtcatcagctgc\n            aaggctccattggctttcgccagccctccaggctgcatggtgatggtcccgaaggacaca\n            gcgtcttcagccagttgtctgactcctgagatggttccagaagtccatgccatttccaaa\n            gaccctttgcattacagcatagtgtcagcccctgctgctcaaaaggtcagagagctagag\n            tccacaattgccgtagacccagggaaccgaggaatcgggcacctactacttaaagatgag\n            ctactgcaagctgctttgtcactgtctcatgcccgctccgtactcgtcaccactggattc\n            ccaacacatttcaatcatgagcccccagaagagacagatggcccaccaggagccatcgcc\n            ttagctgccttcctacaggctctggggaaggagaccgccatggtagtagaccagagagcc\n            ttgaacttgcatatgaggattgttgaagacgccattaggcaaggagttctaaagacaccg\n            attcccatattaacttaccaaggaagatccatggaagatgctcgggcatttttgtgcaaa\n            gatggggaccctaagtctcctagatttgaccatctggtggccatagagcgtgcgggaagg\n            gctgctgatggcaattactacaacgcgaggaagatgaacatcaaacacttagttgacccc\n            attgatgacattttccttgctgcacaaaagattcctggcatctcatcaactggtgttggt\n            gacggaggcaatgagcttggaatgggcaaagtaaaggcggccgtgaagaagcacattaga\n            aatggagatgtcattgcctgtgatgtggaggctgattttgctgtcattgccggtgtttct\n            aactggggaggctacgccctggcctgtgcactgtatattctgaactcatgtcaagtccat\n            gagcgctacctgaggagggcaactggaccttccaggagagctggggaacagagctggatc\n            caggccctgccatctgtcgctaaggaagaaaagatgttgggcatcctggtagagaaccaa\n            gtccgcagtggtgtctcaggcatcgtgggcatggaagtggatgggctgcctttccatgac\n            gttcatgctgagatgatccggaagctggtgggtgccaccacagtgcacatgtga\n"

    #parsed_gets = [parse_get(v,k) for k,v in test.items()]

    #unique_pathways = get_unique_pathways(parsed_gets)

    #test = read_into_cache(kegg_get, keggIDs=unique_pathways, ,caching_path=data_path) / 'kegg_cache/pathway_kgml.json')

    #keggIDs = list(out_dict.values())
    #not_get = len(out_dict.values())

    #kegg_kgml = query_kgmls(unique_pathways, data_path / 'kegg_cache/kgml_cache.json')
    #from kegg_parsing import parse_KGML 

    #with open(data_path / 'kegg_cache/kgml_cache.json') as in_file:
    #    read_data = json.load(in_file)
    #    dict_kgml = parse_KGML('mmu00062', read_data['mmu00062'])
    #    print(dict_kgml)

    #print(kegg_find("Acot1", "mmu"))

    a = [1,2,3,4,5]
    b = [6,7,8,9,10]

    c = [(elem[0],elem[1]) for elem in zip(a,b)]
