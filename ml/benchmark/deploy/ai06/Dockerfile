FROM python:3.13-slim@sha256:ffb752e139c0a19692a43af8d8523b274222dd68eebad5d583b45c2201c6e30a

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    WATTWISE_MODEL_ARTIFACT_SHA256=541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6

RUN groupadd --system wattwise && useradd --system --gid wattwise --home-dir /nonexistent wattwise

WORKDIR /opt/wattwise
COPY pyproject.toml README.md ./
COPY src ./src
RUN python -m pip install --no-cache-dir . && rm -rf /root/.cache

ENV LD_LIBRARY_PATH=/usr/local/lib/python3.13/site-packages/torch/lib

USER wattwise:wattwise
EXPOSE 8091
HEALTHCHECK --interval=30s --timeout=3s --start-period=120s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8091/health/ready', timeout=2)" || exit 1

ENTRYPOINT ["python", "-m", "wattwise_serving.ai05_main"]
CMD ["--host", "0.0.0.0", "--port", "8091"]
