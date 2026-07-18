"""Pinned BDG2 provenance and legal-gate tests."""

from wattwise_benchmark.acquisition.bdg2_provenance import (
    BDG2_PROVENANCE,
    BDG2_PROVENANCE_STATUS,
    BDG2_REPOSITORY_LICENSE_TEXT,
)


def test_bdg2_lfs_oids_match_local_file_checksums() -> None:
    lfs = BDG2_PROVENANCE["git_lfs_objects"]
    local = BDG2_PROVENANCE["local_dataset_file_checksums"]
    assert lfs["data/meters/raw/electricity.csv"]["oid_sha256"] == local["electricity.csv"]
    assert lfs["data/metadata/metadata.csv"]["oid_sha256"] == local["metadata.csv"]


def test_bdg2_provenance_remains_partial_until_zenodo_equivalence_is_proven() -> None:
    assert BDG2_PROVENANCE["repository_commit"] == "3d0cbaf7ba281029ce04887503ab56f3c8344575"
    assert BDG2_PROVENANCE["zenodo_archive_byte_equivalence_proven"] is False
    assert BDG2_PROVENANCE["license_review_required"] is True
    assert BDG2_PROVENANCE["status"] == BDG2_PROVENANCE_STATUS


def test_repository_and_zenodo_license_scopes_are_not_conflated() -> None:
    assert BDG2_PROVENANCE["repository_license_at_commit"] == "MIT"
    assert BDG2_PROVENANCE["zenodo_record_license"] == "CC BY 4.0"


def test_bdg2_repository_license_is_pinned_verbatim() -> None:
    assert (
        BDG2_PROVENANCE["repository_license_blob_sha1"]
        == "f1b2f17c79567044c1ce14293ff67f9836dad999"
    )
    assert BDG2_PROVENANCE["repository_license_text"] == BDG2_REPOSITORY_LICENSE_TEXT
    assert "Copyright (c) 2020 Building and Urban Data Science (BUDS) Group" in (
        BDG2_REPOSITORY_LICENSE_TEXT
    )
