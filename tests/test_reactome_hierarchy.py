import pathlib
import pytest

from visMOP.python_scripts.reactome_hierarchy import PathwayHierarchy

data_path = pathlib.Path().resolve()


@pytest.fixture()
def hierarchy_setup():
    target_db = 'MMU'
    reactome_hierarchy = PathwayHierarchy()
    reactome_hierarchy.load_data(data_path / "reactome_data", target_db.upper())
    reactome_hierarchy.add_json_data(data_path / "reactome_data" / "diagram")
    yield reactome_hierarchy


class TestGetSubtreeTarget:
    def test_get_subtree_at_leaf(self, hierarchy_setup):
        subtree_expected = ['R-MMU-381753']

        assert hierarchy_setup.get_subtree_target('R-MMU-381753') == subtree_expected

    def test_get_small_subtree(self, hierarchy_setup):
        generated_subtree = hierarchy_setup.get_subtree_target('R-MMU-9717189')
        query_elem_index = generated_subtree.index('R-MMU-9717189')

        assert len(generated_subtree) == 3
        assert query_elem_index == 2
        assert query_elem_index > generated_subtree.index('R-MMU-9717207')
        assert query_elem_index > generated_subtree.index('R-MMU-9730628')

    def test_get_medium_subtree(self, hierarchy_setup):
        generated_subtree = hierarchy_setup.get_subtree_target('R-MMU-2187338')
        query_elem_index = generated_subtree.index('R-MMU-2187338')

        assert len(generated_subtree) == 7
        assert query_elem_index == 6
        assert query_elem_index > generated_subtree.index('R-MMU-2187335')
        assert query_elem_index > generated_subtree.index('R-MMU-2453902')
        assert query_elem_index > generated_subtree.index('R-MMU-975634')
        assert query_elem_index > generated_subtree.index('R-MMU-2514856')
        assert generated_subtree.index('R-MMU-2514856') > generated_subtree.index('R-MMU-2514859')
        assert generated_subtree.index('R-MMU-2514856') > generated_subtree.index('R-MMU-2485179')

class TestGetSubtreeNon_overview():
    def test_subtreeoverview():
        #TODO
        assert True