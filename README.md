# SwingLens Prototype

휴대폰 영상에서 야구 스윙의 전신 포즈와 핵심 단계를 확인하는 온디바이스 PWA 프로토타입이다. 영상은 서버로 전송하지 않으며 MediaPipe Pose Landmarker Lite가 브라우저 안에서 실행된다.

## 로컬 실행

```bash
npm install
npm run dev
```

`public/models/pose_landmarker_lite.task`와 `public/wasm/`이 있어야 실제 영상 분석이 동작한다. 저장소에는 배포 가능한 모델과 런타임 자산이 포함된다.

## 검증

```bash
npm run lint
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

## 현재 기능

- iOS/Android 브라우저 촬영·영상 선택
- 실제 타임스탬프 기반 최대 72프레임 로컬 샘플링
- 고품질 공간 리샘플링과 보수적 명암 정규화
- 33개 랜드마크 포즈 추정
- 손목 속도 기반 셋업·런치·컨택 후보·팔로스루 구간화
- 앞무릎, 몸통 기울기, 어깨–골반 선 차이, 머리 상대 이동의 2D 지표
- 신뢰도 부족 시 점수 보류와 재촬영 안내
- 영상 없는 테스트용 합성 스켈레톤 데모
- PWA 매니페스트와 모델/WASM 런타임 캐시

## 중요한 한계

`컨택 후보`는 손목 속도가 가장 큰 프레임이며 실제 공 접촉 검출이 아니다. 앱은 배트 스피드, 타구 속도, 정확한 어택 앵글 또는 3D 자세를 측정하지 않는다. 낮은 FPS에서 사라진 시간 정보를 만들어내지 않는다. 단계별 참고 범위는 코치·데이터 검증 전 프로토타입 기준이며 훈련 참고용이다.

설계 근거는 [경쟁 제품 참고](./docs/competitive-analysis.md)와 [아키텍처·판단 경계](./docs/architecture.md)에 정리되어 있다.

## 라이선스 메모

MediaPipe Tasks 및 Pose Landmarker 모델은 원 배포 조건을 따른다. 상용 제품 전환 시 앱 배포물의 제3자 고지와 모델 라이선스를 다시 검토해야 한다.
