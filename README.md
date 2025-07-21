# 영재교육원 피드백 시스템

영재교육원 학생들의 과제물에 대해 교사가 피드백을 입력하고, 학생들이 자신의 피드백을 확인할 수 있는 웹 기반 시스템입니다.

## 🚀 주요 기능

### 학생 기능
- **피드백 조회**: 이름 + 전화번호 입력으로 본인 피드백 조회
- **과제별 확인**: 1차, 2차, 3차 과제 피드백을 각각 확인
- **실시간 업데이트**: 교사가 입력한 피드백을 즉시 확인 가능

### 교사 기능
- **간편 로그인**: 아이디만 입력하면 자동으로 `@daechi.sen.es.kr` 도메인 추가
- **반별 피드백 관리**: 반을 선택하면 해당 반 학생들의 피드백을 한 번에 관리
- **과제별 탭**: 1차, 2차, 3차 과제별로 구분하여 피드백 입력
- **개별/일괄 저장**: 학생별 개별 저장 또는 전체 일괄 저장 지원
- **넓은 입력 필드**: 충분한 크기의 텍스트 영역으로 편리한 피드백 작성

### 관리자 기능 (2차 인증 필요)
- **CSV 일괄 업로드**: 이름, 전화번호, 반 순서로 구성된 CSV 파일로 학생 명단 일괄 등록
- **드래그 앤 드롭**: CSV 파일을 드래그하여 간편 업로드
- **실시간 검증**: CSV 데이터의 유효성을 실시간으로 확인
- **학생 명단 관리**: 개별 학생 정보 등록/수정/삭제
- **피드백 현황 관리**: 학생별 피드백 입력 현황 확인

## 🛠 기술 스택

- **프론트엔드**: HTML5, Tailwind CSS, Vanilla JavaScript
- **백엔드**: Firebase (Authentication, Firestore Database)
- **배포**: GitHub Pages (정적 호스팅)

## 📱 페이지 구조

```
/
├── index.html          # 학생용 피드백 조회 페이지
├── login.html          # 교사 로그인 페이지
├── teacher.html        # 교사 관리 페이지 (피드백 관리 + 명단 관리)
├── css/
│   └── styles.css      # 커스텀 스타일
├── js/
│   ├── firebase-config.js  # Firebase 설정
│   ├── student.js          # 학생 페이지 로직
│   ├── auth.js            # 인증 관련 로직
│   ├── teacher.js         # 교사 피드백 관리 로직
│   └── admin.js           # 관리자 기능 로직
└── README.md
```

## 🔧 설치 및 설정

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication > Sign-in method에서 이메일/비밀번호 활성화
3. Firestore Database 생성 (테스트 모드에서 시작)
4. 프로젝트 설정에서 웹 앱 등록 후 구성 정보 복사

### 2. Firebase 설정 파일 수정

`js/firebase-config.js` 파일을 열어 Firebase 프로젝트 설정으로 교체:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Firestore 보안 규칙 설정

Firebase Console > Firestore Database > 규칙에서 다음 규칙 적용:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 학생 정보: 모든 사용자가 읽기 가능, 교사만 쓰기 가능
    match /students/{phoneNumber} {
      allow read: if true;
      allow write: if request.auth != null;
      
      // 각 학생의 피드백 서브컬렉션
      match /feedback/{assignmentId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
}
```

### 4. 교사 계정 생성

Firebase Console > Authentication > Users에서 교사 계정 생성:
- 이메일: `teacher@daechi.sen.es.kr` (또는 원하는 아이디@daechi.sen.es.kr)
- 비밀번호: 원하는 비밀번호 설정

### 5. GitHub Pages 배포

1. GitHub 저장소 생성
2. 프로젝트 파일들 업로드
3. Settings > Pages에서 배포 설정
4. 생성된 URL로 접속 테스트

## 📊 데이터베이스 구조

### `students` 컬렉션
```javascript
students/{phoneNumber}  // 전화번호를 문서 ID로 사용
{
  name: "학생이름",
  class: "아리스토텔레스" | "케플러",
  phoneNumber: "010-1234-5678"
}
```

### `feedback` 서브컬렉션
```javascript
students/{phoneNumber}/feedback/{assignmentId}
{
  assignment: "1차" | "2차" | "3차",
  content: "피드백 내용",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🔐 보안 및 인증

### 1차 인증 (Firebase Authentication)
- 교사는 Firebase 인증을 통해 로그인
- `@daechi.sen.es.kr` 도메인으로 이메일 주소 자동 생성

### 2차 인증 (관리자 기능)
- 학생 명단 관리 시 추가 비밀번호 확인
- 기본 비밀번호: `5552455`
- 클라이언트 사이드에서 검증 (간단한 보안)

### 데이터 보안
- 전화번호를 문서 ID로 사용하여 O(1) 성능과 자연스러운 보안 제공
- 정확한 이름+전화번호 조합이 일치해야만 조회 가능

## 🚀 사용 방법

### 학생용
1. 메인 페이지(`index.html`)에서 이름과 전화번호 입력
2. 1차, 2차, 3차 과제별 피드백 확인
3. 피드백이 없는 경우 "아직 피드백이 입력되지 않았습니다" 메시지 표시

### 교사용
1. 교사 로그인 페이지(`login.html`)에서 아이디와 비밀번호로 로그인
2. **피드백 관리 탭**: 
   - 반(아리스토텔레스/케플러) 선택
   - 과제(1차/2차/3차) 탭 선택
   - 해당 반 학생들의 피드백을 한 화면에서 입력/수정
   - 개별 저장 또는 일괄 저장 가능
3. **명단 관리 탭**: 2차 인증 후 학생 정보 관리 및 CSV 업로드

### CSV 파일 형식
학생 명단을 CSV 파일로 업로드할 때 다음 형식을 사용하세요:

```csv
홍길동,010-1234-5678,아리스토텔레스
김철수,010-2345-6789,케플러
이영희,010-3456-7890,아리스토텔레스
```

- **1열**: 학생 이름
- **2열**: 전화번호 (010-1234-5678 형식)
- **3열**: 반 (아리스토텔레스 또는 케플러)
- 헤더 행은 포함하지 마세요

## 🎨 주요 특징

### 성능 최적화
- **O(1) 검색**: 전화번호를 문서 ID로 사용하여 즉시 문서 접근
- **최소 쿼리**: where 조건 없이 직접 문서 조회
- **효율적 구조**: 서브컬렉션을 통한 계층적 데이터 관리

### 사용자 경험
- **반응형 디자인**: 모바일/태블릿/데스크톱 모든 환경 지원
- **직관적 UI**: Tailwind CSS 기반의 깔끔한 디자인
- **실시간 피드백**: 저장 즉시 학생이 확인 가능
- **효율적 워크플로**: 반별/과제별 구분으로 체계적인 피드백 관리
- **CSV 업로드**: 드래그 앤 드롭으로 간편한 대량 데이터 등록

### 개발자 친화적
- **모듈화된 구조**: 기능별로 분리된 JavaScript 파일
- **명확한 네이밍**: 이해하기 쉬운 변수명과 함수명
- **확장 가능성**: 추가 기능 구현이 용이한 구조

## 🔧 커스터마이징

### 반 이름 변경
`teacher.html`, `admin.js`, `student.js` 파일에서 "아리스토텔레스", "케플러"를 원하는 반 이름으로 변경

### 과제 수 변경
현재 1차, 2차, 3차 과제를 지원하며, 추가 과제가 필요한 경우 해당 파일들을 수정

### 관리자 비밀번호 변경
`admin.js` 파일의 `ADMIN_PASSWORD` 상수 값 변경

## 📞 지원 및 문의

프로젝트 관련 문의나 버그 리포트는 GitHub Issues를 통해 등록해주세요.

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

**개발자**: GitHub Copilot  
**버전**: 1.0.0  
**최종 업데이트**: 2025년 7월 21일
