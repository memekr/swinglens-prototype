# Graph Report - swinglens-prototype  (2026-08-09)

## Corpus Check
- 36 files · ~116,970 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 704 nodes · 944 edges · 62 communities (28 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `926aa04c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Third-party notices|Third-party notices]]

## God Nodes (most connected - your core abstractions)
1. `module` - 47 edges
2. `compilerOptions` - 16 edges
3. `ExceptionInfo` - 13 edges
4. `ExceptionInfo` - 13 edges
5. `phaseMetrics()` - 9 edges
6. `analyzeVideoFile()` - 9 edges
7. `scripts` - 8 edges
8. `detectPhases()` - 7 edges
9. `analyzePoseSequence()` - 7 edges
10. `createDemoFrames()` - 7 edges

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

## Communities (62 total, 34 thin omitted)

### Community 2 - "analysis.ts"
Cohesion: 0.07
Nodes (54): AnalysisReport(), PHASE_ORDER, Icon(), IconName, ReviewStudio(), SkeletonView(), RunStatus, SwingAnalyzer() (+46 more)

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
Cohesion: 0.11
Nodes (16): Features added from external pattern research, Native mobile path, Prototype architecture and decision boundaries, Runtime flow, Validation still required, Values intentionally not measured, Competitive and open-source feature research, Differentiation (+8 more)

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

### Community 61 - "Third-party notices"
Cohesion: 0.50
Nodes (3): MediaPipe Pose Landmarker Lite, MediaPipe Tasks Vision, Third-party notices

## Knowledge Gaps
- **74 isolated node(s):** `metadata`, `viewport`, `PHASE_ORDER`, `IconName`, `RunStatus` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `module` connect `module` to `compilerOptions`?**
  _High betweenness centrality (0.339) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `compilerOptions` to `module`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `ExceptionInfo` connect `ExceptionInfo` to `vision_wasm_internal.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `metadata`, `viewport`, `PHASE_ORDER` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `vision_wasm_internal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.012121212121212121 - nodes in this community are weakly interconnected._
- **Should `vision_wasm_nosimd_internal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.012121212121212121 - nodes in this community are weakly interconnected._
- **Should `analysis.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0656140350877193 - nodes in this community are weakly interconnected._