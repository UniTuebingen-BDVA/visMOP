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
