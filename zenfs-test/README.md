```bash
../../emsdk/emsdk activate
source "../../emsdk/emsdk_env.sh"

for p in OFF ON ; do
  for t in Debug Release ; do
    rm -fR build && \
      emcmake cmake -B build \
        -DWASM_BUILD_TYPE=node \
        -DWASM_PTHREAD=$p \
        -DCMAKE_BUILD_TYPE=$t && \
      cmake --build build && \
      node build/minicat.js CMakeLists.txt || say "failed with $t p=$p"
  done
done

emcmake cmake -B build -DWASM_BUILD_TYPE=node && cmake --build build &&  node build/minicat.js CMakeLists.txt
```