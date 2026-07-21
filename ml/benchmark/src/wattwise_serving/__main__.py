from __future__ import annotations

import argparse

from wattwise_serving.artifacts import ArtifactInventory
from wattwise_serving.http_server import InferenceApplication, serve
from wattwise_serving.runtime import InferenceRuntime


def main() -> None:
    parser = argparse.ArgumentParser(description="WattWise versioned inference service")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8090)
    args = parser.parse_args()

    inventory = ArtifactInventory.from_environment()
    runtime = InferenceRuntime(inventory)
    application = InferenceApplication(inventory, runtime)
    serve(args.host, args.port, application)


if __name__ == "__main__":
    main()
