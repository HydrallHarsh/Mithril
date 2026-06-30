"""
Tests for mithril.ingest — Slack export + generic file parsing.
"""

from mithril.ingest import parse_slack_export, load_generic_file


class TestSlackParse:
    def test_extracts_content_messages(self):
        raw = [
            {"type": "message", "user": "U1", "text": "hello", "ts": "1717290000.0001"},
            {"type": "message", "user": "U2", "text": "world", "ts": "1717293600.0002"},
        ]
        msgs = parse_slack_export(raw)
        assert [m.text for m in msgs] == ["hello", "world"]

    def test_skips_join_and_bot_noise(self):
        raw = [
            {"type": "message", "subtype": "channel_join", "user": "U1", "text": "joined"},
            {"type": "message", "subtype": "bot_message", "username": "GitHub", "text": "deploy ok"},
            {"type": "message", "user": "U2", "text": "real claim"},
        ]
        msgs = parse_slack_export(raw)
        assert len(msgs) == 1
        assert msgs[0].text == "real claim"

    def test_skips_empty_text(self):
        raw = [{"type": "message", "user": "U1", "text": "   "}]
        assert parse_slack_export(raw) == []

    def test_accepts_messages_wrapper_object(self):
        raw = {"messages": [{"type": "message", "user": "U1", "text": "x"}]}
        assert len(parse_slack_export(raw)) == 1

    def test_prefers_real_name_for_author(self):
        raw = [
            {
                "type": "message",
                "user": "U1",
                "user_profile": {"real_name": "Dana"},
                "text": "hi",
            }
        ]
        assert parse_slack_export(raw)[0].author == "Dana"

    def test_parses_slack_timestamp(self):
        raw = [{"type": "message", "user": "U1", "text": "hi", "ts": "1717290000.000200"}]
        msg = parse_slack_export(raw)[0]
        assert msg.timestamp is not None
        assert msg.timestamp.year == 2024

    def test_handles_garbage_input(self):
        assert parse_slack_export(None) == []
        assert parse_slack_export("not a feed") == []


class TestGenericFile:
    def test_reads_txt_one_claim_per_line(self, tmp_path):
        p = tmp_path / "claims.txt"
        p.write_text("first claim\n\nsecond claim\n", encoding="utf-8")
        msgs = load_generic_file(p)
        assert [m.text for m in msgs] == ["first claim", "second claim"]

    def test_reads_jsonl_with_author(self, tmp_path):
        p = tmp_path / "claims.jsonl"
        p.write_text(
            '{"text": "a claim", "author": "bob"}\n{"bad json}\n{"text": "another"}\n',
            encoding="utf-8",
        )
        msgs = load_generic_file(p)
        assert [m.text for m in msgs] == ["a claim", "another"]
        assert msgs[0].author == "bob"
