# Graph Report - swinglens-prototype  (2026-08-09)

## Corpus Check
- 30 files · ~120,159 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 686 nodes · 904 edges · 61 communities (27 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_vision_wasm_internal.js|vision_wasm_internal.js]]
- [[_COMMUNITY_vision_wasm_nosimd_internal.js|vision_wasm_nosimd_internal.js]]
- [[_COMMUNITY_analysis.ts|analysis.ts]]
- [[_COMMUNITY_module|module]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_SwingLens Prototype|SwingLens Prototype]]
- [[_COMMUNITY_abort|abort]]
- [[_COMMUNITY_abort|abort]]
- [[_COMMUNITY_ExceptionInfo|ExceptionInfo]]
- [[_COMMUNITY_ExceptionInfo|ExceptionInfo]]
- [[_COMMUNITY_makeEntry|makeEntry]]
- [[_COMMUNITY_makeEntry|makeEntry]]
- [[_COMMUNITY_makeBlendState|makeBlendState]]
- [[_COMMUNITY_makeVertexAttributes|makeVertexAttributes]]
- [[_COMMUNITY_makeBlendState|makeBlendState]]
- [[_COMMUNITY_makeVertexAttributes|makeVertexAttributes]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY____syscall_ioctl|___syscall_ioctl]]
- [[_COMMUNITY_makeColorAttachments|makeColorAttachments]]
- [[_COMMUNITY____syscall_ioctl|___syscall_ioctl]]
- [[_COMMUNITY_makeColorAttachments|makeColorAttachments]]
- [[_COMMUNITY_hardware_concurrency|hardware_concurrency]]
- [[_COMMUNITY_write|write]]
- [[_COMMUNITY_write|write]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_close|close]]
- [[_COMMUNITY_convertReturnValue|convertReturnValue]]
- [[_COMMUNITY_ExitStatus|ExitStatus]]
- [[_COMMUNITY_fromWireType|fromWireType]]
- [[_COMMUNITY_get_char|get_char]]
- [[_COMMUNITY_getFullscreenElement|getFullscreenElement]]
- [[_COMMUNITY_init|init]]
- [[_COMMUNITY_lookupPath|lookupPath]]
- [[_COMMUNITY_makeDepthStencilState|makeDepthStencilState]]
- [[_COMMUNITY_mount|mount]]
- [[_COMMUNITY_preRun|preRun]]
- [[_COMMUNITY_registerType|registerType]]
- [[_COMMUNITY_statfs|statfs]]
- [[_COMMUNITY_close|close]]
- [[_COMMUNITY_convertReturnValue|convertReturnValue]]
- [[_COMMUNITY_ExitStatus|ExitStatus]]
- [[_COMMUNITY_fromWireType|fromWireType]]
- [[_COMMUNITY_get_char|get_char]]
- [[_COMMUNITY_getFullscreenElement|getFullscreenElement]]
- [[_COMMUNITY_init|init]]
- [[_COMMUNITY_lookupPath|lookupPath]]
- [[_COMMUNITY_makeDepthStencilState|makeDepthStencilState]]
- [[_COMMUNITY_mount|mount]]
- [[_COMMUNITY_preRun|preRun]]
- [[_COMMUNITY_registerType|registerType]]
- [[_COMMUNITY_statfs|statfs]]

## God Nodes (most connected - your core abstractions)
1. `module` - 47 edges
2. `compilerOptions` - 16 edges
3. `ExceptionInfo` - 13 edges
4. `ExceptionInfo` - 13 edges
5. `phaseMetrics()` - 9 edges
6. `midpoint()` - 9 edges
7. `analyzeVideoFile()` - 9 edges
8. `scripts` - 8 edges
9. `detectPhases()` - 7 edges
10. `torsoScale()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `JsOnUint8ArrayImageListener()` --references--> `module`  [EXTRACTED]
  public/wasm/vision_wasm_internal.js → tsconfig.json
- `JsOnFloat32ArrayImageListener()` --references--> `module`  [EXTRACTED]
  public/wasm/vision_wasm_internal.js → tsconfig.json
- `JsOnWebGLTextureListener()` --references--> `module`  [EXTRACTED]
  public/wasm/vision_wasm_internal.js → tsconfig.json
- `JsOnUint8ArrayImageVectorListener()` --references--> `module`  [EXTRACTED]
  public/wasm/vision_wasm_internal.js → tsconfig.json
- `JsOnFloat32ArrayImageVectorListener()` --references--> `module`  [EXTRACTED]
  public/wasm/vision_wasm_internal.js → tsconfig.json

## Import Cycles
- None detected.

## Communities (61 total, 34 thin omitted)

### Community 2 - "analysis.ts"
Cohesion: 0.07
Nodes (47): SkeletonView(), PHASE_ORDER, RunStatus, SwingAnalyzer(), analyzePoseSequence(), detectPhases(), KEY_JOINTS, PHASE_COPY (+39 more)

### Community 3 - "module"
Cohesion: 0.04
Nodes (47): JsOnEmptyPacketListener(), JsOnFloat32ArrayImageListener(), JsOnFloat32ArrayImageVectorListener(), JsOnSimpleListenerBinaryArray(), JsOnSimpleListenerBool(), JsOnSimpleListenerDouble(), JsOnSimpleListenerFloat(), JsOnSimpleListenerInt() (+39 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (26): dependencies, @mediapipe/tasks-vision, next, react, react-dom, devDependencies, eslint, eslint-config-next (+18 more)

### Community 5 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, moduleResolution (+10 more)

### Community 6 - "SwingLens Prototype"
Cohesion: 0.12
Nodes (13): 검증이 필요한 다음 단계, 모바일 앱 전환 경로, 실행 흐름, 의도적으로 측정하지 않는 값, 프로토타입 아키텍처와 판단 경계, 경쟁 제품 참고 메모, 제품 차별점, SwingLens Prototype (+5 more)

### Community 7 - "abort"
Cohesion: 0.13
Nodes (15): abort(), assert(), createLazyFile(), createWasm(), findWasmBinary(), forceLoadFile(), getBinarySync(), getMouseWheelDelta() (+7 more)

### Community 8 - "abort"
Cohesion: 0.13
Nodes (15): abort(), assert(), createLazyFile(), createWasm(), findWasmBinary(), forceLoadFile(), getBinarySync(), getMouseWheelDelta() (+7 more)

### Community 11 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 12 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 13 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 14 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 15 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 16 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 18 - "___syscall_ioctl"
Cohesion: 0.50
Nodes (4): ioctl_tcgets(), ioctl_tcsets(), ioctl_tiocgwinsz(), ___syscall_ioctl()

### Community 19 - "makeColorAttachments"
Cohesion: 0.50
Nodes (4): makeColorAttachment(), makeColorAttachments(), makeDepthStencilAttachment(), makeRenderPassDescriptor()

### Community 20 - "___syscall_ioctl"
Cohesion: 0.50
Nodes (4): ioctl_tcgets(), ioctl_tcsets(), ioctl_tiocgwinsz(), ___syscall_ioctl()

### Community 21 - "makeColorAttachments"
Cohesion: 0.50
Nodes (4): makeColorAttachment(), makeColorAttachments(), makeDepthStencilAttachment(), makeRenderPassDescriptor()

### Community 23 - "write"
Cohesion: 0.67
Nodes (3): msync(), put_char(), write()

### Community 24 - "write"
Cohesion: 0.67
Nodes (3): msync(), put_char(), write()

## Knowledge Gaps
- **67 isolated node(s):** `metadata`, `viewport`, `RunStatus`, `PHASE_ORDER`, `PHASE_COPY` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `module` connect `module` to `compilerOptions`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `compilerOptions` to `module`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `ExceptionInfo` connect `ExceptionInfo` to `vision_wasm_internal.js`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `metadata`, `viewport`, `RunStatus` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `vision_wasm_internal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.012121212121212121 - nodes in this community are weakly interconnected._
- **Should `vision_wasm_nosimd_internal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.012121212121212121 - nodes in this community are weakly interconnected._
- **Should `analysis.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07355769230769231 - nodes in this community are weakly interconnected._