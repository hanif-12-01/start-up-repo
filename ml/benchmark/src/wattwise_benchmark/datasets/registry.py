from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

LegalStatus = Literal["CLEARED", "SECONDARY", "RESEARCH_ONLY", "LEGAL_REVIEW_REQUIRED", "REJECTED"]


@dataclass(frozen=True)
class DatasetEntry:
    id: str
    name: str
    publisher: str
    source: str
    landing_page: str
    download_method: str
    version: str
    license: str
    license_evidence: str
    commercial_use: bool
    redistribution: bool
    country: str
    domain: str
    native_frequency: str
    measurement_method: str
    energy_unit: str
    selected: bool
    legal_status: LegalStatus
    adapter: str
    notes: str


DATASET_REGISTRY: dict[str, DatasetEntry] = {
    "uci_eld": DatasetEntry(
        id="uci_eld",
        name="UCI ElectricityLoadDiagrams20112014",
        publisher="UCI Machine Learning Repository",
        source="https://archive.ics.uci.edu/dataset/321/electricityloaddiagrams20112014",
        landing_page="https://doi.org/10.24432/C58C86",
        download_method="ZIP archive download",
        version="2011-2014",
        license="CC BY 4.0",
        license_evidence="UCI ML Repository published licence metadata (DOI 10.24432/C58C86)",
        commercial_use=True,
        redistribution=True,
        country="PRT",
        domain="PUBLIC_RESIDENTIAL_COMMERCIAL",
        native_frequency="15min",
        measurement_method="UTILITY_METER",
        energy_unit="kW",
        selected=True,
        legal_status="CLEARED",
        adapter="wattwise_benchmark.ingestion.uci",
        notes="370 client meters, converted from 15-min avg kW to monthly kWh.",
    ),
    "bdg2": DatasetEntry(
        id="bdg2",
        name="Building Data Genome Project 2",
        publisher="Zenodo (buds-lab)",
        source="https://github.com/nrel/building-data-genome-project-2",
        landing_page="https://doi.org/10.5281/zenodo.3887306",
        download_method="Git LFS / Zenodo zip archive",
        version="v1.0",
        license="CC BY 4.0",
        license_evidence="Zenodo v1.0 release license metadata and repository commit 3d0cbaf7",
        commercial_use=True,
        redistribution=True,
        country="USA/CAN/EUR",
        domain="PUBLIC_COMMERCIAL",
        native_frequency="hourly",
        measurement_method="SMART_METER",
        energy_unit="kWh",
        selected=True,
        legal_status="CLEARED",
        adapter="wattwise_benchmark.ingestion.bdg2",
        notes=(
            "1,574 commercial buildings with metadata (primary_use, floor_area). "
            "Byte equivalence proven."
        ),
    ),
    "london_smartmeter": DatasetEntry(
        id="london_smartmeter",
        name="London SmartMeter Energy Consumption",
        publisher="UK Power Networks / Greater London Authority",
        source=(
            "https://data.london.gov.uk/dataset/"
            "smartmeter-energy-consumption-data-in-london-households-vqm0d/"
        ),
        landing_page=(
            "https://data.london.gov.uk/dataset/"
            "smartmeter-energy-consumption-data-in-london-households-vqm0d/"
        ),
        download_method="London Datastore official ZIP archive",
        version="2011-2014",
        license="Creative Commons Attribution",
        license_evidence=(
            "Current official London Datastore dataset metadata labels the licence "
            "Creative Commons Attribution; version not stated"
        ),
        commercial_use=True,
        redistribution=True,
        country="GBR",
        domain="PUBLIC_RESIDENTIAL",
        native_frequency="30min",
        measurement_method="SMART_METER",
        energy_unit="kWh",
        selected=True,
        legal_status="CLEARED",
        adapter="wattwise_benchmark.ingestion.london",
        notes="5,567 London residential households (PUBLIC_RESIDENTIAL proxy).",
    ),
    "nrel_comstock": DatasetEntry(
        id="nrel_comstock",
        name="NREL ComStock Commercial Building Profiles",
        publisher="US DOE / NREL",
        source="https://www.nrel.gov/buildings/comstock.html",
        landing_page="https://oefdb.nrel.gov/comstock",
        download_method="AWS S3 public bucket / NREL API",
        version="2023.1",
        license="CC BY 4.0 / US Open Data",
        license_evidence="NREL Open Data platform terms",
        commercial_use=True,
        redistribution=True,
        country="USA",
        domain="PUBLIC_COMMERCIAL",
        native_frequency="hourly",
        measurement_method="MODELED_SIMULATION",
        energy_unit="kWh",
        selected=True,
        legal_status="CLEARED",
        adapter="wattwise_benchmark.ingestion.nrel_comstock",
        notes=(
            "Commercial building energy models by business sub-type "
            "(retail, food service, office). MODELED_SIMULATION."
        ),
    ),
    "goiener": DatasetEntry(
        id="goiener",
        name="GoiEner Electricity Smart Meter Dataset",
        publisher="Zenodo",
        source="https://doi.org/10.5281/zenodo.7362094",
        landing_page="https://doi.org/10.5281/zenodo.7362094",
        download_method="Manual download",
        version="v1.0",
        license="CC BY-SA 4.0",
        license_evidence="Zenodo metadata CC BY-SA 4.0 copyleft license tag",
        commercial_use=False,
        redistribution=False,
        country="ESP",
        domain="PUBLIC_RESIDENTIAL",
        native_frequency="hourly",
        measurement_method="SMART_METER",
        energy_unit="kWh",
        selected=False,
        legal_status="LEGAL_REVIEW_REQUIRED",
        adapter="none",
        notes="BLOCKED: ShareAlike copyleft conflicts with project license requirements.",
    ),
}


def get_dataset(dataset_id: str) -> DatasetEntry:
    if dataset_id not in DATASET_REGISTRY:
        raise KeyError(f"Dataset '{dataset_id}' is not registered.")
    return DATASET_REGISTRY[dataset_id]


def list_datasets(selected_only: bool = False) -> list[DatasetEntry]:
    entries = list(DATASET_REGISTRY.values())
    if selected_only:
        return [entry for entry in entries if entry.selected]
    return entries


def validate_dataset_license(dataset_id: str) -> bool:
    entry = get_dataset(dataset_id)
    if entry.legal_status not in ("CLEARED", "SECONDARY"):
        raise ValueError(
            f"Dataset '{dataset_id}' cannot be ingested: legal status is {entry.legal_status}"
        )
    return True
