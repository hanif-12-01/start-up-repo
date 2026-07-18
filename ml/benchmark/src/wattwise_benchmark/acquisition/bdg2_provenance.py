from __future__ import annotations

from typing import Any

BDG2_PROVENANCE_STATUS = "PARTIAL — BDG2 PROVENANCE REVIEW REQUIRED"

BDG2_REPOSITORY_LICENSE_TEXT = """MIT License

Copyright (c) 2020 Building and Urban Data Science (BUDS) Group

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE."""

BDG2_PROVENANCE: dict[str, Any] = {
    "status": BDG2_PROVENANCE_STATUS,
    "official_repository_url": "https://github.com/buds-lab/building-data-genome-project-2",
    "repository_tag": "v1.0",
    "repository_commit": "3d0cbaf7ba281029ce04887503ab56f3c8344575",
    "git_lfs_objects": {
        "data/meters/raw/electricity.csv": {
            "oid_sha256": "039d909d8981e2d69eaeb366144e6ab7e84fa5e7e216aee42bddd95384a66418",
            "bytes": 174_239_039,
        },
        "data/metadata/metadata.csv": {
            "oid_sha256": "992d0b29f24f96ad4332bc4dbb534b7bdd7dd2689aad093f94e93068ecddca02",
            "bytes": 272_024,
        },
    },
    "local_dataset_file_checksums": {
        "electricity.csv": "039d909d8981e2d69eaeb366144e6ab7e84fa5e7e216aee42bddd95384a66418",
        "metadata.csv": "992d0b29f24f96ad4332bc4dbb534b7bdd7dd2689aad093f94e93068ecddca02",
    },
    "repository_license_at_commit": "MIT",
    "repository_license_blob_sha1": "f1b2f17c79567044c1ce14293ff67f9836dad999",
    "repository_license_text": BDG2_REPOSITORY_LICENSE_TEXT,
    "zenodo_record": "https://zenodo.org/records/3887306",
    "zenodo_doi": "10.5281/zenodo.3887306",
    "zenodo_record_license": "CC BY 4.0",
    "relationship": "Zenodo v1.0 states that it is a supplement to the GitHub v1.0 tree",
    "github_lfs_bytes_match_local_files": True,
    "zenodo_archive_byte_equivalence_proven": False,
    "license_review_required": True,
}
