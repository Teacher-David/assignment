// 교사 페이지 로직
document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    let selectedClass = null;
    let selectedAssignment = '1차';
    let classStudents = [];

    // DOM 요소들
    const teacherEmail = document.getElementById('teacherEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const feedbackTab = document.getElementById('feedbackTab');
    const adminTab = document.getElementById('adminTab');
    const feedbackContent = document.getElementById('feedbackContent');
    const adminContent = document.getElementById('adminContent');

    // 반 선택 버튼들
    const selectAristotle = document.getElementById('selectAristotle');
    const selectKepler = document.getElementById('selectKepler');
    const feedbackManagement = document.getElementById('feedbackManagement');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const selectedClassName = document.getElementById('selectedClassName');

    // 과제 탭들
    const assignment1Tab = document.getElementById('assignment1Tab');
    const assignment2Tab = document.getElementById('assignment2Tab');
    const assignment3Tab = document.getElementById('assignment3Tab');
    const studentFeedbackList = document.getElementById('studentFeedbackList');
    const saveAllFeedback = document.getElementById('saveAllFeedback');

    // 메시지 요소들
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');    // Firebase 라이브러리 로딩 확인
    async function waitForFirebase() {
        // firebase-config.js의 초기화 함수 사용
        if (typeof window.waitForFirebaseInit === 'function') {
            try {
                await window.waitForFirebaseInit();
                return window.auth !== undefined && window.db !== undefined;
            } catch (error) {
                console.error('Firebase 초기화 실패:', error);
                return false;
            }
        }
        
        // 백업 방식: 직접 확인
        return new Promise((resolve) => {
            if (window.auth && window.db) {
                resolve(true);
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 100; // 10초 (100ms * 100)
            
            const checkFirebase = setInterval(() => {
                attempts++;
                
                if (window.auth && window.db) {
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
    }   
    
    // Firebase 로딩 완료 후 초기화
    waitForFirebase().then((success) => {
        if (!success || !window.auth || !window.db) {
            console.error('Firebase 초기화 실패');
            return;
        }

        console.log('Firebase 시스템 준비 완료');

        // 인증 상태 확인
        window.auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                teacherEmail.textContent = user.email;
        } else {
            window.location.href = 'login.html';
        }
    });

    // 로그아웃 버튼
    logoutBtn.addEventListener('click', async function() {
        try {
            await window.auth.signOut();
        } catch (error) {
            console.error('로그아웃 오류:', error);
            showError('로그아웃 중 오류가 발생했습니다.');
        }
    });

    // 탭 전환
    feedbackTab.addEventListener('click', () => switchTab('feedback'));
    adminTab.addEventListener('click', () => switchTab('admin'));

    // 반 선택 버튼들
    selectAristotle.addEventListener('click', () => selectClass('아리스토텔레스'));
    selectKepler.addEventListener('click', () => selectClass('케플러'));
    clearSelectionBtn.addEventListener('click', clearClassSelection);

    // 과제 탭들
    assignment1Tab.addEventListener('click', () => switchAssignment('1차'));
    assignment2Tab.addEventListener('click', () => switchAssignment('2차'));
    assignment3Tab.addEventListener('click', () => switchAssignment('3차'));

    // 일괄 저장 버튼
    saveAllFeedback.addEventListener('click', saveAllStudentFeedback);

    // 탭 전환 함수
    function switchTab(tab) {
        // 탭 버튼 스타일 업데이트
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });

        if (tab === 'feedback') {
            feedbackTab.classList.add('active', 'border-blue-500', 'text-blue-600');
            feedbackTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            feedbackContent.classList.remove('hidden');
            adminContent.classList.add('hidden');
        } else if (tab === 'admin') {
            adminTab.classList.add('active', 'border-blue-500', 'text-blue-600');
            adminTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            feedbackContent.classList.add('hidden');
            adminContent.classList.remove('hidden');
        }
    }

    // 반 선택 함수
    async function selectClass(className) {
        selectedClass = className;
        selectedClassName.textContent = className;
        
        // 반 선택 버튼 스타일 업데이트
        document.querySelectorAll('.class-select-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-50');
            btn.classList.add('border-gray-300');
        });
        
        const selectedBtn = className === '아리스토텔레스' ? selectAristotle : selectKepler;
        selectedBtn.classList.remove('border-gray-300');
        selectedBtn.classList.add('border-blue-500', 'bg-blue-50');

        // 해당 반 학생들 로드
        await loadClassStudents(className);
        
        // 피드백 관리 섹션 표시
        feedbackManagement.classList.remove('hidden');
        feedbackManagement.scrollIntoView({ behavior: 'smooth' });
    }

    // 반 선택 해제
    function clearClassSelection() {
        selectedClass = null;
        feedbackManagement.classList.add('hidden');
        
        // 반 선택 버튼 스타일 초기화
        document.querySelectorAll('.class-select-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-50');
            btn.classList.add('border-gray-300');
        });
    }

    // 과제 탭 전환
    function switchAssignment(assignment) {
        selectedAssignment = assignment;
        
        // 과제 탭 스타일 업데이트
        document.querySelectorAll('.assignment-tab').forEach(tab => {
            tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });
        
        const selectedTab = document.querySelector(`[data-assignment="${assignment}"]`);
        selectedTab.classList.add('active', 'border-blue-500', 'text-blue-600');
        selectedTab.classList.remove('border-transparent', 'text-gray-500');

        // 해당 과제의 피드백 데이터 로드
        loadAssignmentFeedback();
    }

    // 반별 학생 목록 로드
    async function loadClassStudents(className) {
        try {
            const snapshot = await window.db.collection('students')
                .where('class', '==', className)
                .get();
            
            classStudents = [];
            snapshot.forEach(doc => {
                classStudents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            classStudents.sort((a, b) => a.name.localeCompare(b.name));
            await loadAssignmentFeedback();
        } catch (error) {
            console.error('학생 목록 로딩 오류:', error);
            showError('학생 목록을 불러오는 중 오류가 발생했습니다.');
        }
    }

    // 과제별 피드백 로드 및 표시
    async function loadAssignmentFeedback() {
        try {
            studentFeedbackList.innerHTML = '';
            
            if (classStudents.length === 0) {
                studentFeedbackList.innerHTML = '<p class="text-gray-500 text-center py-8">해당 반에 등록된 학생이 없습니다.</p>';
                return;
            }

            for (const student of classStudents) {
                // 해당 학생의 선택된 과제 피드백 조회
                const feedbackDoc = await window.db.collection('students')
                    .doc(student.phoneNumber)
                    .collection('feedback')
                    .doc(selectedAssignment)
                    .get();
                
                const feedbackData = feedbackDoc.exists ? feedbackDoc.data() : null;
                
                // 학생별 피드백 입력 폼 생성
                const studentFeedbackElement = document.createElement('div');
                studentFeedbackElement.className = 'flex items-start gap-4 p-4 border border-gray-200 rounded-lg';
                studentFeedbackElement.innerHTML = `
                    <div class="w-32 flex-shrink-0">
                        <div class="font-medium text-gray-900">${student.name}</div>
                    </div>
                    <div class="flex-1">
                        <textarea 
                            class="student-feedback-input w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="${selectedAssignment} 과제에 대한 피드백을 입력하세요..."
                            data-student-id="${student.phoneNumber}"
                            data-assignment="${selectedAssignment}"
                        >${feedbackData ? feedbackData.content || '' : ''}</textarea>
                        <div class="mt-2 flex justify-between items-center">
                            <div class="text-xs text-gray-500">
                                ${feedbackData && feedbackData.updatedAt ? 
                                    `마지막 수정: ${feedbackData.updatedAt.toDate().toLocaleString('ko-KR')}` : 
                                    '피드백 없음'
                                }
                            </div>
                            <button 
                                class="save-individual-btn text-blue-600 hover:text-blue-800 text-sm"
                                data-student-id="${student.phoneNumber}"
                                data-assignment="${selectedAssignment}"
                            >
                                개별 저장
                            </button>
                        </div>
                    </div>
                `;
                
                studentFeedbackList.appendChild(studentFeedbackElement);
            }

            // 개별 저장 버튼 이벤트 리스너 추가
            document.querySelectorAll('.save-individual-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const studentId = e.target.dataset.studentId;
                    const assignment = e.target.dataset.assignment;
                    saveIndividualFeedback(studentId, assignment);
                });
            });

        } catch (error) {
            console.error('피드백 로딩 오류:', error);
            showError('피드백을 불러오는 중 오류가 발생했습니다.');
        }
    }

    // 개별 피드백 저장
    async function saveIndividualFeedback(studentId, assignment) {
        const textarea = document.querySelector(`textarea[data-student-id="${studentId}"][data-assignment="${assignment}"]`);
        const content = textarea.value.trim();
        
        try {
            const feedbackData = {
                assignment: assignment,
                content: content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 기존 피드백이 있는지 확인
            const feedbackRef = window.db.collection('students')
                .doc(studentId)
                .collection('feedback')
                .doc(assignment);

            const existingDoc = await feedbackRef.get();
            if (!existingDoc.exists) {
                feedbackData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            await feedbackRef.set(feedbackData, { merge: true });
            
            showSuccess(`피드백이 저장되었습니다.`);
            
            // UI 업데이트 (저장 시간 표시)
            const timeElement = textarea.parentElement.querySelector('.text-xs.text-gray-500');
            timeElement.textContent = `마지막 수정: ${new Date().toLocaleString('ko-KR')}`;
            
        } catch (error) {
            console.error('피드백 저장 오류:', error);
            showError('피드백 저장 중 오류가 발생했습니다.');
        }
    }

    // 모든 피드백 일괄 저장
    async function saveAllStudentFeedback() {
        const textareas = document.querySelectorAll('.student-feedback-input');
        const batch = window.db.batch();
        let saveCount = 0;

        try {
            for (const textarea of textareas) {
                const studentId = textarea.dataset.studentId;
                const assignment = textarea.dataset.assignment;
                const content = textarea.value.trim();
                
                if (content) { // 내용이 있을 때만 저장
                    const feedbackRef = window.db.collection('students')
                        .doc(studentId)
                        .collection('feedback')
                        .doc(assignment);

                    const feedbackData = {
                        assignment: assignment,
                        content: content,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    batch.set(feedbackRef, feedbackData, { merge: true });
                    saveCount++;
                }
            }

            if (saveCount > 0) {
                await batch.commit();
                showSuccess(`${saveCount}개의 피드백이 저장되었습니다.`);
                // 피드백 데이터 새로고침
                await loadAssignmentFeedback();
            } else {
                showError('저장할 피드백이 없습니다.');
            }

        } catch (error) {
            console.error('일괄 저장 오류:', error);
            showError('피드백 일괄 저장 중 오류가 발생했습니다.');
        }
    }

    // 성공 메시지 표시
    function showSuccess(message) {
        successText.textContent = message;
        successMessage.classList.remove('hidden');
        setTimeout(() => {
            successMessage.classList.add('hidden');
        }, 3000);
    }

    // 에러 메시지 표시
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }
    
    }); // waitForFirebase().then() 종료
}); // DOMContentLoaded 종료
