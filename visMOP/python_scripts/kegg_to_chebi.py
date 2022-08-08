from collections import defaultdict
from reactome2py import analysis


def kegg_to_chebi(keggIDlist):
    results = analysis.identifiers_mapping(ids=",".join(keggIDlist))
    out_ids = defaultdict(list)
    for result in results:
        found_chebi = False
        print(result)
        for mappingResult in result["mapsTo"]:
            if mappingResult["resource"] == "CHEBI":
                found_chebi = True
                out_ids[result["identifier"]].append(mappingResult["identifier"])
        if not found_chebi:
            print("No Chebi found for: ", result["identifier"])
    return out_ids
