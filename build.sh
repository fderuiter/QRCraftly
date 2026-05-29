#!/bin/bash -eu

npm install -g pnpm
pnpm install

# Build fuzzers using Jazzer.js
compile_javascript_fuzzer qrcraftly fuzz/protocol.fuzz.ts --sync -i @jazzer.js/core protocol_fuzzer
compile_javascript_fuzzer qrcraftly fuzz/render.fuzz.ts --sync -i @jazzer.js/core render_fuzzer
