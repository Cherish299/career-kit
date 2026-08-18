"""Application 状态机测试。"""
import pytest

from app.models import InvalidTransitionError, validate_transition


def test_valid_path_full_flow():
    """完整正向流程：发现→收藏→待投递→已投递→笔试→一面→后续面试→Offer"""
    path = [
        ("discovered", "favorited"),
        ("favorited", "to_submit"),
        ("to_submit", "submitted"),
        ("submitted", "written_test"),
        ("written_test", "interview_1"),
        ("interview_1", "interview_next"),
        ("interview_next", "offer"),
    ]
    for frm, to in path:
        validate_transition(frm, to)  # 不抛即通过


@pytest.mark.parametrize(
    "frm,to",
    [
        ("discovered", "offer"),  # 跳级
        ("submitted", "favorited"),  # 回退到投递前
        ("offer", "rejected"),  # 终态再流转
        ("to_submit", "to_submit"),  # 自环
        ("written_test", "submitted"),  # 倒退
        ("unknown", "discovered"),  # 未知状态
    ],
)
def test_invalid_transitions_raise(frm, to):
    with pytest.raises(InvalidTransitionError):
        validate_transition(frm, to)


def test_terminal_states_are_frozen():
    for terminal in ("offer", "rejected", "abandoned"):
        with pytest.raises(InvalidTransitionError):
            validate_transition(terminal, "discovered")


def test_abandon_allowed_from_most_states():
    for frm in ("discovered", "favorited", "to_submit", "written_test", "interview_1", "interview_next"):
        validate_transition(frm, "abandoned")
