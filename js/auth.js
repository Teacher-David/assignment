// 교사 로그인 페이지 로직
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loginBtn = document.getElementById('loginBtn');
    const teacherIdInput = document.getElementById('teacherId');

    // Firebase 라이브러리 로딩 확인
    function waitForFirebase() {
        return new Promise((resolve) => {
            if (window.auth) {
                resolve();
                return;
            }
            
            // Firebase가 로드될 때까지 대기
            const checkFirebase = setInterval(() => {
                if (window.auth) {
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);
            
            // 5초 후 타임아웃
            setTimeout(() => {
                clearInterval(checkFirebase);
                console.error('Firebase 로딩 타임아웃');
                resolve();
            }, 5000);
        });
    }

    // Firebase 로딩 완료 후 초기화
    waitForFirebase().then(() => {
        if (!window.auth) {
            console.error('Firebase 초기화 실패');
            showError('시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
            return;
        }

        // 이미 로그인된 상태라면 teacher.html로 리다이렉트
        window.auth.onAuthStateChanged(user => {
            if (user) {
                window.location.href = 'teacher.html';
            }
        });

        // 폼 제출 이벤트
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
        
        const teacherId = teacherIdInput.value.trim();
        const password = document.getElementById('password').value;
        
        if (!teacherId || !password) {
            showError('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        // 이메일 주소 생성 (@daechi.sen.es.kr 자동 추가)
        const email = `${teacherId}@daechi.sen.es.kr`;
        
        await loginTeacher(email, password);
    });

    // 교사 로그인 함수
    async function loginTeacher(email, password) {
        showLoading(true);
        hideError();
        loginBtn.disabled = true;

        try {
            await window.auth.signInWithEmailAndPassword(email, password);
            // 로그인 성공 시 teacher.html로 리다이렉트 (onAuthStateChanged에서 처리)
        } catch (error) {
            console.error('로그인 오류:', error);
            
            let errorMessage = '로그인 중 오류가 발생했습니다.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = '등록되지 않은 사용자입니다.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = '비밀번호가 올바르지 않습니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '이메일 형식이 올바르지 않습니다.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = '비활성화된 계정입니다.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = '네트워크 연결을 확인해주세요.';
                    break;
                default:
                    errorMessage = `로그인 실패: ${error.message}`;
            }
            
            showError(errorMessage);
        } finally {
            showLoading(false);
            loginBtn.disabled = false;
        }
    }

    // UI 제어 함수들
    function showLoading(show) {
        loading.classList.toggle('hidden', !show);
        loginForm.classList.toggle('opacity-50', show);
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        // 5초 후 자동으로 숨기기
        setTimeout(() => {
            hideError();
        }, 5000);
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // 아이디 입력 시 실시간 이메일 미리보기 (선택사항)
    teacherIdInput.addEventListener('input', function() {
        // 현재는 단순히 @daechi.sen.es.kr 도메인을 표시하는 것으로 충분
        // 필요하다면 여기에 추가 로직 구현
    });
    
    }); // waitForFirebase().then() 종료
}); // DOMContentLoaded 종료
