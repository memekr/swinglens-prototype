"""Paths for the copy of the hitting RAG stack inside swinglens-prototype."""
from pathlib import Path

RAG_DIR = Path(__file__).resolve().parent
PROTO_ROOT = RAG_DIR.parent
# rag/ -> swinglens-prototype/ -> src/ -> Personal Baseball Project
REPO_ROOT = PROTO_ROOT.parent.parent

RESOURCES_DIR = PROTO_ROOT / "rag_data"
RAG_RESOURCES_DIR = RESOURCES_DIR / "RAG Resources"
RAG_INDEX_DIR = RAG_RESOURCES_DIR / "rag_index"
