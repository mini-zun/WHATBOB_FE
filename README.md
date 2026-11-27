# WHATBOB · 왓밥 🍚

> 오늘 뭐 먹지? 취향에 맞는 메뉴를 추천받고 주변 음식점까지 찾아보세요.

Expo와 React Native로 개발하는 왓밥 프론트엔드입니다. 현재 로그인·세션 처리는 웹 기준으로 지원하며, 네이티브 앱의 인증 연결은 개발이 필요합니다.

- [웹 서비스](https://whatbobfe-app.vercel.app)
- [백엔드 저장소](https://github.com/pknu-wap/WHATBOB_BE)
- [API 문서](https://whatbob.kro.kr/docs#/)

## 주요 기능

| 기능 | 구현 내용 |
| --- | --- |
| 로그인·계정 | 웹 카카오 로그인, 인증 세션 관리, 계정 연결 및 로그아웃 |
| 프로필 | 닉네임 수정, 프로필 사진 촬영·선택·초기화 |
| 비선호 음식 | 목록 조회, 검색·선택·해제 및 저장 |
| 개인 추천 | 주문서 질문 조회, 답변 제출, 추천 캐러셀, 수락·거절 피드백 |
| 음식 확정 | 수락한 음식의 확정 화면, 음식 일러스트 및 주변 음식점 화면 연결 |
| 랜덤 추천 | 랜덤 메뉴 조회 및 선택 애니메이션 |
| 같이 고르기 | 방 생성·참여, QR 코드, 실시간 참여자 갱신, 방장 시작 시 주문서 이동 |
| 주변 음식점 | 현재 위치 권한 요청, 반경 1km·3km 검색, 카카오 지도·마커와 목록 연동 |
| Google 평점 | Google Places UI Kit으로 평점 및 공식 출처 표시 |
| 길찾기 | 선택한 음식점의 카카오맵 도보 길찾기 연결 |
| 음식 기록 | 음식점 목록 선택 시 식사 기록 저장, 기록 조회, 홈의 최근 먹은 메뉴 조회 |
| 웹 홈 화면 아이콘 | 아이폰 홈 화면에 추가할 때 사용할 아이콘과 이름 설정 |

개인 추천은 **주문서 → 추천 메뉴 → 음식 확정 → 주변 음식점 → 음식점 선택 및 식사 기록 저장** 순서로 이어집니다. 지도 마커 선택과 길찾기 실행은 식사 기록을 추가 저장하지 않습니다.

주변 음식점은 백엔드가 가까운 순으로 최대 10개 반환합니다. 표시 거리는 직선거리이며 실제 도보 거리·시간을 계산하지 않습니다. 도보 길찾기는 카카오맵으로 연결합니다. Google 장소 ID가 없는 음식점은 ‘평점 정보 없음’으로 표시합니다.

## 개발 중인 기능

- 랜덤 추천의 메뉴 확정 버튼 이후 음식 확정·지도 연결
- 같이 고르기 주문서 답변 제출, 공동 추천·투표·결과 API 연결 및 상태별 화면 이동
- 개인정보 처리방침 본문 작성
- Android·iOS 네이티브 로그인, 인증 토큰 저장 및 세션 처리

그릇에 골라담기는 현재 제공하지 않으며 홈 캐러셀에는 준비 중 카드가 표시됩니다. 모바일 브라우저·실기기에서 화면, 권한 및 외부 앱 연결도 확인해야 합니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| 언어 | TypeScript |
| UI | React 19.2, React Native 0.86, React Native Web |
| 개발 환경·라우팅 | Expo SDK 57, Expo Router |
| 제스처·애니메이션 | React Native Gesture Handler, Reanimated |
| 이미지·폰트·위치 | Expo Image, Expo Font, Expo Location |
| 카메라·사진 | Expo Camera, Expo Image Picker, Expo Image Manipulator |
| QR 코드 | react-native-qrcode-svg |
| 지도·평점 | Kakao Maps JavaScript API, Google Places UI Kit |
| 통신·배포 | Fetch API, WebSocket, Vercel |

## 로컬 실행

Node.js와 npm이 필요합니다. Expo SDK 57을 지원하는 Node.js LTS를 사용하고, 명령은 앱 소스가 있는 `app` 디렉터리에서 실행합니다.

```bash
git clone https://github.com/pknu-wap/WHATBOB_FE.git
cd WHATBOB_FE/app
npm ci
```

`app/.env.local`을 생성하고 개발 환경에 맞는 값을 입력합니다.

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://whatbob.kro.kr
EXPO_PUBLIC_KAKAO_MAP_JS_KEY=your_frontend_kakao_javascript_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_frontend_google_maps_key
```

| 환경 변수 | 용도 |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | 백엔드 주소. 마지막 `/api`는 포함하지 않음 |
| `EXPO_PUBLIC_KAKAO_MAP_JS_KEY` | 카카오 지도 프론트엔드 JavaScript 키 |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API·Places UI Kit 프론트엔드 키 |
| `EXPO_PUBLIC_WS_BASE_URL` | 선택 사항. 생략하면 백엔드 주소에서 WebSocket 주소 생성 |
| `EXPO_PUBLIC_GOOGLE_PLACES_WIDGET_URL` | 네이티브 평점 WebView용 배포 페이지 HTTPS URL. 웹 실행에는 불필요 |
| `BACKEND_API_URL` | Vercel 서버 API 프록시용 백엔드 주소. 공개 프론트엔드 변수가 아님 |

`EXPO_PUBLIC_` 값은 클라이언트에 포함됩니다. 서버용 비밀 키를 넣지 말고 프론트엔드 키에 도메인·API 제한을 적용하세요. `.env.local`은 Git에 커밋하지 않습니다.

```bash
npx expo start --web --clear
```

- 기본 접속 주소: `http://localhost:8081`
- 위치 기능은 localhost 또는 HTTPS에서 확인합니다. 휴대폰에서 PC의 HTTP LAN 주소로 접속하면 위치 요청이 제한될 수 있습니다.
- 카카오 로그인 복귀 주소는 백엔드·카카오 설정의 영향을 받습니다. 배포 주소로 설정되어 있으면 로컬 로그인 후에도 배포 서비스로 이동하므로, 로컬 인증 테스트에는 별도 개발 환경 설정이 필요합니다.
- Vercel의 프록시와 rewrite는 Expo 개발 서버에서 자동 실행되지 않습니다. 로컬 백엔드의 CORS·쿠키 설정도 확인해야 합니다.

## 검사 및 웹 빌드

`app` 디렉터리에서 실행합니다.

```bash
npx tsc --noEmit
npm run lint
node --test scripts/room-flow.test.cjs scripts/places-widget.test.cjs
npx expo export --platform web
```

웹 빌드 결과는 `app/dist`에 생성되며 `app/public` 파일도 함께 복사됩니다. Metro 설정은 웹 배포 폰트 경로를 담은 `public/google-place-fonts.json`을 생성합니다. 이 파일은 Git에서 제외됩니다.

## 배포 시 확인

- Vercel Root Directory는 `app`, 빌드 명령은 `npx expo export --platform web`, 출력 디렉터리는 `dist`로 설정합니다.
- 필요한 환경 변수를 등록한 뒤 다시 배포합니다. 공개 프론트엔드 변수는 Vercel의 Config 유형을 사용합니다.
- 카카오 지도 허용 도메인, Google 키의 웹사이트·API 제한, 로그인 복귀 주소를 실제 서비스 주소에 맞춥니다.
- Google 평점에는 백엔드의 `google_place_id`와 프론트엔드 키 설정이 모두 필요합니다. Google 출처·고지를 유지합니다.
- 아이폰 홈 화면 아이콘을 변경했다면 기존 바로가기를 삭제하고 다시 추가해 확인합니다.
- 네이티브 앱 배포 전 로그인·세션 연결과 실기기 검증이 필요합니다.

## 디렉터리 구조

```text
app/
├── src/app/          # Expo Router 화면
├── src/components/   # 공통 UI, 주문서, 지도·평점 컴포넌트
├── src/lib/          # API, 인증, 방 상태 및 지도 연결
├── src/types/        # API·화면 타입
├── src/constants/    # 공통 색상과 글꼴
├── assets/           # 이미지와 폰트
├── public/           # 평점 웹 페이지와 홈 화면 아이콘
├── api/              # Vercel API 프록시
└── scripts/          # 테스트와 빌드 보조 스크립트
```
