// 학생 페이지 로직
document.addEventListener('DOMContentLoaded', function() {
    const studentForm = document.getElementById('studentForm');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const feedbackSection = document.getElementById('feedbackSection');
    const searchAgainBtn = document.getElementById('searchAgainBtn');
    const searchForm = document.getElementById('searchForm');

    // 피드백 네비게이션 요소들
    const prevFeedbackBtn = document.getElementById('prevFeedbackBtn');
    const nextFeedbackBtn = document.getElementById('nextFeedbackBtn');
    const currentFeedbackIndex = document.getElementById('currentFeedbackIndex');
    const currentFeedbackTitle = document.getElementById('currentFeedbackTitle');
    const feedbackBadge = document.getElementById('feedbackBadge');

    // 현재 표시 중인 피드백 인덱스 (0: 1차, 1: 2차, 2: 3차)
    let currentIndex = 0;
    const feedbackTitles = ['1차', '2차', '3차'];
    const feedbackColors = [
        { bg: 'bg-blue-100', text: 'text-blue-800' },
        { bg: 'bg-green-100', text: 'text-green-800' },
        { bg: 'bg-purple-100', text: 'text-purple-800' }
    ];    // Firebase 라이브러리 로딩 확인
    async function waitForFirebase() {
        // firebase-config.js의 초기화 함수 사용
        if (typeof window.waitForFirebaseInit === 'function') {
            try {
                await window.waitForFirebaseInit();
                return window.db !== undefined;
            } catch (error) {
                console.error('Firebase 초기화 실패:', error);
                return false;
            }
        }
        
        // 백업 방식: 직접 확인
        return new Promise((resolve) => {
            if (window.db) {
                resolve(true);
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 100; // 10초 (100ms * 100)
            
            const checkFirebase = setInterval(() => {
                attempts++;
                
                if (window.db) {
                    clearInterval(checkFirebase);
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    clearInterval(checkFirebase);
                    console.error('Firebase 로딩 타임아웃');
                    resolve(false);
                }
            }, 100);
        });
    }    // Firebase 로딩 완료 후 초기화
    waitForFirebase().then((success) => {
        if (!success || !window.db) {
            console.error('Firebase 초기화 실패');
            showError('시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
            return;
        }

        console.log('Firebase 데이터베이스 시스템 준비 완료');

        // 폼 제출 이벤트
        studentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('studentName').value.trim();
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            
            if (!name || !phoneNumber) {
                showError('이름과 전화번호를 모두 입력해주세요.');
                return;
            }

        // 전화번호 형식 검증
        const phoneRegex = /^010\d{8}$/;
        if (!phoneRegex.test(phoneNumber)) {
            showError('전화번호 형식이 올바르지 않습니다. (예: 01012345678)');
            return;
        }

        await searchStudent(name, phoneNumber);
    });

    // 다시 조회하기 버튼 이벤트
    searchAgainBtn.addEventListener('click', function() {
        resetForm();
        studentForm.scrollIntoView({ behavior: 'smooth' });
    });

    // 피드백 네비게이션 이벤트
    if (prevFeedbackBtn && nextFeedbackBtn) {
        prevFeedbackBtn.addEventListener('click', function() {
            if (currentIndex > 0) {
                currentIndex--;
                updateFeedbackDisplay();
            }
        });

        nextFeedbackBtn.addEventListener('click', function() {
            if (currentIndex < 2) {
                currentIndex++;
                updateFeedbackDisplay();
            }
        });
    }

    // 학생 검색 함수
    async function searchStudent(name, phoneNumber) {
        showLoading(true);
        hideError();
        hideFeedbackSection();

        try {
            // 전화번호를 문서 ID로 사용하여 직접 문서 조회
            const studentDoc = await window.db.collection('students').doc(phoneNumber).get();
            
            if (!studentDoc.exists) {
                showError('입력하신 정보로 등록된 학생을 찾을 수 없습니다.');
                return;
            }

            const studentData = studentDoc.data();
            
            // 이름 검증
            if (studentData.name !== name) {
                showError('이름 또는 전화번호가 일치하지 않습니다.');
                return;
            }

            // 학생 정보 표시
            displayStudentInfo(studentData);
            
            // 피드백 조회
            await loadFeedback(phoneNumber);
            
            showFeedbackSection();
            
        } catch (error) {
            console.error('학생 검색 중 오류:', error);
            showError('검색 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            showLoading(false);
        }
    }

    // 학생 정보 표시
    function displayStudentInfo(studentData) {
        document.getElementById('displayName').textContent = studentData.name;
        document.getElementById('displayClass').textContent = studentData.class;
        // document.getElementById('displayPhone').textContent = studentData.phoneNumber;
    }

    // 피드백 로드
    async function loadFeedback(phoneNumber) {
        try {
            const feedbackRef = window.db.collection('students').doc(phoneNumber).collection('feedback');
            const feedbackSnapshot = await feedbackRef.get();
            
            // 피드백 데이터 정리
            const feedbacks = {};
            feedbackSnapshot.forEach(doc => {
                const data = doc.data();
                feedbacks[data.assignment] = data;
            });

            // 각 과제별 피드백 표시
            displayFeedback('1차', feedbacks['1차'], 'feedback1', 'feedback1Date');
            displayFeedback('2차', feedbacks['2차'], 'feedback2', 'feedback2Date');
            displayFeedback('3차', feedbacks['3차'], 'feedback3', 'feedback3Date');
            
        } catch (error) {
            console.error('피드백 로딩 중 오류:', error);
            showError('피드백을 불러오는 중 오류가 발생했습니다.');
        }
    }

    // 개별 피드백 표시
    function displayFeedback(assignment, feedbackData, contentId, dateId) {
        const contentElement = document.getElementById(contentId);
        const dateElement = document.getElementById(dateId);
        
        if (feedbackData && feedbackData.content) {
            contentElement.innerHTML = `<p class="whitespace-pre-wrap">${feedbackData.content}</p>`;
            
        } else {
            contentElement.innerHTML = '<p class="text-gray-500 italic">아직 피드백이 입력되지 않았습니다.</p>';
        }
    }

    // 날짜 포맷팅
    function formatDate(date) {
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // UI 제어 함수들
    function showLoading(show) {
        loading.classList.toggle('hidden', !show);
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        // 3초 후 자동으로 숨기기
        setTimeout(() => {
            hideError();
        }, 5000);
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function showFeedbackSection() {
        // 입력 폼 숨기기
        searchForm.classList.add('hidden');
        // 피드백 섹션 보이기
        feedbackSection.classList.remove('hidden');
        // 첫 번째 피드백으로 초기화
        currentIndex = 0;
        updateFeedbackDisplay();
        feedbackSection.scrollIntoView({ behavior: 'smooth' });
    }

    function hideFeedbackSection() {
        feedbackSection.classList.add('hidden');
        // 입력 폼 다시 보이기
        searchForm.classList.remove('hidden');
    }

    // 피드백 표시 업데이트
    function updateFeedbackDisplay() {
        // 모든 피드백 컨텐츠 숨기기
        for (let i = 1; i <= 3; i++) {
            const content = document.getElementById(`feedbackContent${i}`);
            if (content) {
                content.classList.add('hidden');
            }
        }

        // 현재 인덱스의 피드백 컨텐츠 보이기
        const currentContent = document.getElementById(`feedbackContent${currentIndex + 1}`);
        if (currentContent) {
            currentContent.classList.remove('hidden');
        }

        // 네비게이션 UI 업데이트
        if (currentFeedbackIndex) {
            currentFeedbackIndex.textContent = `${currentIndex + 1} / 3`;
        }

        // 피드백 제목 및 배지 업데이트
        if (feedbackBadge && currentFeedbackTitle) {
            const title = feedbackTitles[currentIndex];
            const colors = feedbackColors[currentIndex];
            
            feedbackBadge.textContent = title;
            feedbackBadge.className = `${colors.bg} ${colors.text} px-3 py-1 rounded-full text-sm md:text-base mr-3`;
        }

        // 버튼 상태 업데이트
        if (prevFeedbackBtn) {
            prevFeedbackBtn.disabled = currentIndex === 0;
        }
        if (nextFeedbackBtn) {
            nextFeedbackBtn.disabled = currentIndex === 2;
        }
    }

    function resetForm() {
        studentForm.reset();
        hideFeedbackSection();
        hideError();
        currentIndex = 0; // 피드백 인덱스 초기화
    }
    
    }); // waitForFirebase().then() 종료
}); // DOMContentLoaded 종료
