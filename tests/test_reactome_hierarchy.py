from html import entities
import pathlib
import pytest

from visMOP.python_scripts.reactome_hierarchy import PathwayHierarchy, get_occurrences_graph_json

data_path = pathlib.Path().resolve()


@pytest.fixture(scope="module")
def hierarchy():
    """ Generate hierarchy as fixture for the unit tests"""
    target_db = 'MMU'
    reactome_hierarchy = PathwayHierarchy()
    reactome_hierarchy.load_data(data_path / "reactome_data", target_db.upper())
    reactome_hierarchy.add_json_data(data_path / "reactome_data" / "diagram")
    yield reactome_hierarchy


class TestGetSubtreeTarget:
    def test_at_leaf(self, hierarchy):
        """When already at leaf, subtree should only be the leaf itself"""
        subtree_expected = ['R-MMU-381753']

        assert hierarchy.get_subtree_target('R-MMU-381753') == subtree_expected # check that subtree is only query

    def test_small_subtree(self, hierarchy):
        """test small subtree"""
        generated_subtree = hierarchy.get_subtree_target('R-MMU-9717189')
        query_elem_index = generated_subtree.index('R-MMU-9717189')

        assert len(generated_subtree) == 3 # check if size is correct
        assert query_elem_index == 2 # check if query element is correctly at last position
        assert query_elem_index > generated_subtree.index('R-MMU-9717207') # check if children nodes are correctly placed BEFORE the query node
        assert query_elem_index > generated_subtree.index('R-MMU-9730628') # check if children nodes are correctly placed BEFORE the query node

    def test_medium_subtree(self, hierarchy):
        generated_subtree = hierarchy.get_subtree_target('R-MMU-2187338')
        query_elem_index = generated_subtree.index('R-MMU-2187338')

        assert len(generated_subtree) == 7 # check if size is correct
        assert query_elem_index == 6 # check if query element is correctly at last position
        assert query_elem_index > generated_subtree.index('R-MMU-2187335') # check if children nodes are correctly placed BEFORE the query node
        assert query_elem_index > generated_subtree.index('R-MMU-2453902') # check if children nodes are correctly placed BEFORE the query node
        assert query_elem_index > generated_subtree.index('R-MMU-975634') # check if children nodes are correctly placed BEFORE the query node
        assert query_elem_index > generated_subtree.index('R-MMU-2514856') # check if children nodes are correctly placed BEFORE the query node
        assert generated_subtree.index('R-MMU-2514856') > generated_subtree.index('R-MMU-2514859') # check if children nodes of specific subtree node are placed before it
        assert generated_subtree.index('R-MMU-2514856') > generated_subtree.index('R-MMU-2485179') # check if children nodes of specific subtree node are placed before it

class TestGetSubtreeNonOverview():
    def test_at_non_overview(self, hierarchy):
        """ If already at node which posses a non-overview diagram"""
        non_overview_diagrams = hierarchy.get_subtree_non_overview('R-MMU-2187338')
        assert non_overview_diagrams == ['R-MMU-2187338'] # check if result contains only query
    def test_small_tree(self, hierarchy):
        """ Not starting at non overview, small testcase """
        non_overview_diagrams = ['R-MMU-2187338', 'R-MMU-9717189', 'R-MMU-381753']
        assert set(non_overview_diagrams) == set(hierarchy.get_subtree_non_overview('R-MMU-9709957')) # check if results contain the same pathways
    def test_skip_node(self, hierarchy):
        """ Not starting at non overview with node skip, i.e. not the first level of child-nodes posses non-overview diagrams"""
        non_overview_diagrams = ['R-MMU-5663220', 'R-MMU-5668599', 'R-MMU-5627117', 'R-MMU-5666185', 'R-MMU-5663213', 'R-MMU-5625900', 'R-MMU-5626467', 'R-MMU-5625970', 'R-MMU-5627123', 'R-MMU-5625740', 'R-MMU-5627083', 'R-MMU-9012999', 'R-MMU-9706019', 'R-MMU-9715370']
        assert set(non_overview_diagrams) == set(hierarchy.get_subtree_non_overview('R-MMU-9716542')) # check if results contain the same pathways
class TestFindDiagram():
    def test_already_at_diagram(self, hierarchy):
        """test case where target already has a diagram"""
        entries = []
        hierarchy._find_diagram_recursion('R-MMU-9717189', entries, 0)
        true_diagram_parent = [('R-MMU-9717189', 0)]
        assert true_diagram_parent == entries
    
    def test_simple_example(self, hierarchy):
        """test case where direct parent has a diagram"""
        entries = []
        hierarchy._find_diagram_recursion('R-MMU-9730628', entries, 0)
        true_diagram_parent = [('R-MMU-9717189', 1)]
        assert true_diagram_parent == entries

    def test_branch_example(self, hierarchy):
        """test where mutiple diagram parents should be found"""
        entries = []
        hierarchy._find_diagram_recursion('R-MMU-162699', entries, 0)
        true_diagram_parents = [('R-MMU-163125', 1), ('R-MMU-446203', 3)]
        assert set(true_diagram_parents) == set(entries)

class TestFindOccurences():
    @pytest.fixture(scope="class")
    def get_intermediate_node_dict(self, hierarchy):
        yield hierarchy["R-MMU-68884"].graph_json_file['nodes']

    def test_no_parents(self, get_intermediate_node_dict):
        """test case with no parents"""
        expected_result = {9768535: {'internalID': 9768535, 'stableID': 'R-MMU-156721'}}        
        assert expected_result == get_occurrences_graph_json(get_intermediate_node_dict, 9768535)

    def test_with_parents(self, get_intermediate_node_dict):
        """test case with multiple parents"""
        expected_result = {
            912410: {'internalID': 912410, 'stableID': 'R-MMU-912410'},
            9820451:  {'internalID': 9820451, 'stableID': 'R-MMU-1641505'},
            9820461:  {'internalID': 9820461, 'stableID': 'R-MMU-2468042'},
            9820523:  {'internalID': 9820523, 'stableID': 'R-MMU-2470943'},
            9820527:  {'internalID': 9820527, 'stableID': 'R-MMU-2537688'},
            9820525:  {'internalID': 9820525, 'stableID': 'R-MMU-2470928'},
        }
        assert expected_result == get_occurrences_graph_json(get_intermediate_node_dict, 912410)