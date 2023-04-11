#!/bin/bash

set -e

echo "Running Kotoba benchmarks..."
node run.js

echo "---------------"

echo "Running better-sqlite3 benchmark..."
cd better-sqlite3
node benchmark
