from __future__ import annotations

import argparse

from wattwise_serving.ai05_http import serve
from wattwise_serving.ai05_service import application_from_environment


def main() -> None:
    parser = argparse.ArgumentParser(description="WattWise AI-05 private v2 service")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8091)
    args = parser.parse_args()
    serve(args.host, args.port, application_from_environment())


if __name__ == "__main__":
    main()
