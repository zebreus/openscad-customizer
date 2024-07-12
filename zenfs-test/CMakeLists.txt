cmake_minimum_required(VERSION 3.29)
project(zenfs-test LANGUAGES CXX)

set(WASM_BUILD_TYPE "web" CACHE STRING "WebAssembly build type. Support web or node")
option(WASM_PTHREAD "Whether to build WASM w/ pthread" OFF)

add_executable(minicat minicat.cc)

target_compile_options(minicat PRIVATE "$<$<CONFIG:DEBUG>:-DDEBUG>")
set_property(TARGET minicat PROPERTY CXX_STANDARD 17)
set_property(TARGET minicat PROPERTY CXX_EXTENSIONS OFF)
set_property(TARGET minicat PROPERTY CXX_STANDARD_REQUIRED ON)
# Output compilation database (compile_commands.json), so we can e.g. run clang-tidy or other tools separately
set_property(TARGET minicat PROPERTY EXPORT_COMPILE_COMMANDS ON)
set_property(TARGET minicat PROPERTY LINKER_LANGUAGE CXX)

if (CMAKE_SYSTEM_NAME STREQUAL Emscripten)
  # https://emscripten.org/docs/tools_reference/emcc.html
  target_compile_options(minicat PRIVATE
    -fexceptions
  )
  target_link_options(minicat PUBLIC
    # https://emscripten.org/docs/tools_reference/settings_reference.html  
    -fexceptions
    -sABORT_ON_WASM_EXCEPTIONS
    -sALLOW_MEMORY_GROWTH=1
    -sDISABLE_EXCEPTION_CATCHING=0
    -sEXPORTED_RUNTIME_METHODS=['FS','ENV','PATH','callMain','formatException','ERRNO_CODES']
    -sFORCE_FILESYSTEM=1
    -sMAXIMUM_MEMORY=4GB

    $<$<CONFIG:Debug>:
      -g3
      -gsource-map
      -O0
      -sASSERTIONS=2
      -sCHECK_NULL_WRITES
      -sEXCEPTION_DEBUG
      -sLOAD_SOURCE_MAP
      -sSAFE_HEAP=1
      -sSTACK_OVERFLOW_CHECK=2
      # -sMALLOC=emmalloc-memvalidate # Broken?
      -sSTRICT # Broken?
    >
  )
  if (WASM_PTHREAD)
    target_compile_options(minicat PRIVATE -pthread)
    target_link_options(minicat PUBLIC -pthread)
  endif()

  if (WASM_BUILD_TYPE STREQUAL "web")
    target_link_options(minicat PUBLIC
      -sENVIRONMENT=web,worker
      -sEXIT_RUNTIME=1
      -sEXPORT_ES6=1
      -sEXPORT_NAME=minicat
      -sMODULARIZE=1
    )
  elseif (WASM_BUILD_TYPE STREQUAL "node")
    target_link_options(minicat PUBLIC
      -sENVIRONMENT=node,worker
      -sNODEJS_CATCH_EXIT
      -sNODERAWFS

      # Single-file release FTW:
      $<$<CONFIG:Release>:-sSINGLE_FILE> # Takes more space so only doing this for node.js build
      
      # Alternatively, code caching would make things faster:
      # -sNODE_CODE_CACHING -sWASM_ASYNC_COMPILATION=0
    )

    # Ensure the resulting .js file is executable on Unix:
    file(WRITE ${CMAKE_CURRENT_BINARY_DIR}/prepend_node_shebang.cmake "
      file(READ \"\${FILE}\" CONTENT)
      file(WRITE \"\${FILE}\" \"#!/usr/bin/env node\n\${CONTENT}\")
      if(CMAKE_HOST_UNIX)
        execute_process(COMMAND chmod +x \"\${FILE}\")
      endif()
    ")
    add_custom_command(
      POST_BUILD TARGET minicat
      COMMAND ${CMAKE_COMMAND} "-DFILE=$<TARGET_FILE:minicat>" -P "${CMAKE_CURRENT_BINARY_DIR}/prepend_node_shebang.cmake"
    )
  else()
    message(FATAL_ERROR "Invalid WASM_BUILD_TYPE: ${WASM_BUILD_TYPE} (allowed: node, web)")
  endif()
endif()
