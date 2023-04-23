# Benchmarks

Mainly for me to get an idea of performance on different hardware for different operations.

To run, cd into this directory and:

```bash
docker run -it --rm $(docker build -q -f ./Dockerfile.node .)
```

ARM64 version:

```bash
docker run -it --rm $(docker build -q -f ./Dockerfile.arm64v8node .)
```

(it may take several minutes before any output appears)
