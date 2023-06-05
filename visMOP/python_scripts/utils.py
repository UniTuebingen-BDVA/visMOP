from collections import defaultdict
from reactome2py import analysis
from typing import List, DefaultDict, TypedDict


class mapsTo(TypedDict):
    identifier: str
    interactsWith: List[str]
    resource: str


class ReactomeAnalysisResult(TypedDict):
    identifier: str
    mapsTo: List[mapsTo]


def kegg_to_chebi(keggIDlist: List[str]) -> DefaultDict[str, List[str]]:
    results: List[ReactomeAnalysisResult] = analysis.identifiers_mapping(
        ids=",".join(keggIDlist)
    )  # type: ignore
    out_ids: DefaultDict[str, List[str]] = defaultdict(list)
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
