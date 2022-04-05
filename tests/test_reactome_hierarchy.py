import pathlib
import pytest

from visMOP.python_scripts.reactome_hierarchy import PathwayHierarchy

data_path = pathlib.Path().resolve()


@pytest.fixture()
def hierarchy_setup():
    """ Generate hierarchy as fixture for the unit tests"""
    target_db = 'MMU'
    reactome_hierarchy = PathwayHierarchy()
    reactome_hierarchy.load_data(data_path / "reactome_data", target_db.upper())
    reactome_hierarchy.add_json_data(data_path / "reactome_data" / "diagram")
    yield reactome_hierarchy


class TestGetSubtreeTarget:
    def test_get_subtree_at_leaf(self, hierarchy_setup):
        """When already at leaf, subtree should only be the leaf itself"""
        subtree_expected = ['R-MMU-381753']

        assert hierarchy_setup.get_subtree_target('R-MMU-381753') == subtree_expected # check that subtree is only query

    def test_get_small_subtree(self, hierarchy_setup):
        """test small subtree"""
        generated_subtree = hierarchy_setup.get_subtree_target('R-MMU-9717189')
        query_elem_index = generated_subtree.index('R-MMU-9717189')

        assert len(generated_subtree) == 3 # check if size is correct
        assert query_elem_index == 2 # check if query element is correctly at last position
        assert query_elem_index > generated_subtree.index('R-MMU-9717207') # check if children nodes are correctly placed BEFORE the query node
        assert query_elem_index > generated_subtree.index('R-MMU-9730628') # check if children nodes are correctly placed BEFORE the query node

    def test_get_medium_subtree(self, hierarchy_setup):
        generated_subtree = hierarchy_setup.get_subtree_target('R-MMU-2187338')
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
    def test_subtreeoverview():
        #TODO
        assert True