// 관리자 기능 로직 (2차 인증 및 명단 관리)
document.addEventListener('DOMContentLoaded', function() {
    let isAdminAuthenticated = false;
    let allStudentsAdmin = [];
    let csvData = [];
    const ADMIN_PASSWORD = '5552455'; // 관리자 비밀번호

    // Firebase 라이브러리 로딩 확인
    function waitForFirebase() {
        return new Promise((resolve) => {
            if (window.auth && window.db) {
                resolve();
                return;
            }
            
            // Firebase가 로드될 때까지 대기
            const checkFirebase = setInterval(() => {
                if (window.auth && window.db) {
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
        if (!window.auth || !window.db) {
            console.error('Firebase 초기화 실패');
            return;
        }

        // DOM 요소들
        const authOverlay = document.getElementById('authOverlay');
        const adminPassword = document.getElementById('adminPassword');
        const authCancelBtn = document.getElementById('authCancelBtn');
        const authConfirmBtn = document.getElementById('authConfirmBtn');
        const authError = document.getElementById('authError');
        const adminManagement = document.getElementById('adminManagement');
        
        // CSV 업로드 관련
        const csvFile = document.getElementById('csvFile');
        const csvPreview = document.getElementById('csvPreview');
        const csvPreviewBody = document.getElementById('csvPreviewBody');
        const csvCount = document.getElementById('csvCount');
        const cancelCsv = document.getElementById('cancelCsv');
        const uploadCsv = document.getElementById('uploadCsv');
        
        // 새 학생 추가 폼
        const addStudentForm = document.getElementById('addStudentForm');
        const newStudentName = document.getElementById('newStudentName');
        const newStudentPhone = document.getElementById('newStudentPhone');
        const newStudentClass = document.getElementById('newStudentClass');
        
        // 관리자 검색 및 필터
    const adminSearchInput = document.getElementById('adminSearchInput');
    const adminClassFilter = document.getElementById('adminClassFilter');
    const adminStudentList = document.getElementById('adminStudentList');
    
    // 학생 정보 수정 모달
    const editStudentModal = document.getElementById('editStudentModal');
    const editStudentForm = document.getElementById('editStudentForm');
    const editStudentName = document.getElementById('editStudentName');
    const editStudentPhone = document.getElementById('editStudentPhone');
    const editStudentClass = document.getElementById('editStudentClass');
    const editCancelBtn = document.getElementById('editCancelBtn');

    let currentEditingStudent = null;

    // 관리자 탭 클릭 시 2차 인증 확인
    document.getElementById('adminTab').addEventListener('click', function() {
        if (!isAdminAuthenticated) {
            showAuthOverlay();
        } else {
            loadAdminStudentList();
        }
    });

    // CSV 파일 선택 이벤트
    csvFile.addEventListener('change', handleCsvFile);
    cancelCsv.addEventListener('click', cancelCsvUpload);
    uploadCsv.addEventListener('click', processCsvUpload);

    // 드래그 앤 드롭 이벤트
    const dropZone = csvFile.parentElement.parentElement;
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'text/csv') {
            csvFile.files = files;
            handleCsvFile({ target: { files: files } });
        }
    });

    // CSV 파일 처리
    function handleCsvFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            showError('CSV 파일만 업로드 가능합니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const csvText = e.target.result;
            parseCsvData(csvText);
        };
        reader.readAsText(file, 'UTF-8');
    }

    // CSV 데이터 파싱
    function parseCsvData(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        csvData = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // CSV 파싱 (쉼표로 분리, 따옴표 고려)
            const columns = parseCSVLine(line);
            
            if (columns.length >= 3) {
                const name = columns[0].trim();
                const phoneNumber = columns[1].trim();
                const studentClass = columns[2].trim();
                
                // 유효성 검사
                const validation = validateStudentData(name, phoneNumber, studentClass, i + 1);
                
                csvData.push({
                    line: i + 1,
                    name: name,
                    phoneNumber: phoneNumber,
                    class: studentClass,
                    status: validation.status,
                    error: validation.error
                });
            } else {
                csvData.push({
                    line: i + 1,
                    name: columns[0] || '',
                    phoneNumber: columns[1] || '',
                    class: columns[2] || '',
                    status: 'error',
                    error: '데이터가 부족합니다 (이름, 전화번호, 반 필요)'
                });
            }
        }
        
        displayCsvPreview();
    }

    // CSV 라인 파싱 (쉼표와 따옴표 처리)
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    // 학생 데이터 유효성 검사
    function validateStudentData(name, phoneNumber, studentClass, lineNumber) {
        if (!name) {
            return { status: 'error', error: '이름이 없습니다' };
        }
        
        if (!phoneNumber) {
            return { status: 'error', error: '전화번호가 없습니다' };
        }
        
        // 전화번호 형식 검증
        const phoneRegex = /^010\d{8}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return { status: 'error', error: '전화번호 형식이 올바르지 않습니다 (01012345678)' };
        }
        
        if (!studentClass || (studentClass !== '아리스토텔레스' && studentClass !== '케플러')) {
            return { status: 'error', error: '반은 "아리스토텔레스" 또는 "케플러"여야 합니다' };
        }
        
        return { status: 'valid', error: null };
    }

    // CSV 미리보기 표시
    function displayCsvPreview() {
        csvPreviewBody.innerHTML = '';
        
        csvData.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = row.status === 'error' ? 'bg-red-50' : 'hover:bg-gray-50';
            
            tr.innerHTML = `
                <td class="px-4 py-2 text-sm text-gray-900">${row.name}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${row.phoneNumber}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${row.class}</td>
                <td class="px-4 py-2 text-sm">
                    ${row.status === 'valid' ? 
                        '<span class="text-green-600">✓ 유효</span>' : 
                        `<span class="text-red-600">✗ ${row.error}</span>`
                    }
                </td>
            `;
            
            csvPreviewBody.appendChild(tr);
        });
        
        csvCount.textContent = csvData.filter(row => row.status === 'valid').length;
        csvPreview.classList.remove('hidden');
    }

    // CSV 업로드 취소
    function cancelCsvUpload() {
        csvFile.value = '';
        csvData = [];
        csvPreview.classList.add('hidden');
    }

    // CSV 업로드 처리
    async function processCsvUpload() {
        const validData = csvData.filter(row => row.status === 'valid');
        
        if (validData.length === 0) {
            showError('업로드할 유효한 데이터가 없습니다.');
            return;
        }

        try {
            const batch = window.db.batch();
            let successCount = 0;
            let duplicateCount = 0;

            for (const student of validData) {
                // 중복 확인
                const existingDoc = await window.db.collection('students').doc(student.phoneNumber).get();
                if (existingDoc.exists) {
                    duplicateCount++;
                    continue;
                }

                const studentData = {
                    name: student.name,
                    phoneNumber: student.phoneNumber,
                    class: student.class
                };

                const docRef = window.db.collection('students').doc(student.phoneNumber);
                batch.set(docRef, studentData);
                successCount++;
            }

            if (successCount > 0) {
                await batch.commit();
                showSuccess(`${successCount}명의 학생이 성공적으로 등록되었습니다.${duplicateCount > 0 ? ` (${duplicateCount}명 중복으로 제외)` : ''}`);
                cancelCsvUpload();
                loadAdminStudentList();
            } else {
                showError('모든 학생이 이미 등록되어 있습니다.');
            }

        } catch (error) {
            console.error('CSV 업로드 오류:', error);
            showError('CSV 업로드 중 오류가 발생했습니다.');
        }
    }

    // 2차 인증 오버레이 표시
    function showAuthOverlay() {
        authOverlay.classList.remove('hidden');
        adminPassword.focus();
        hideAuthError();
    }

    // 2차 인증 오버레이 숨기기
    function hideAuthOverlay() {
        authOverlay.classList.add('hidden');
        adminPassword.value = '';
        hideAuthError();
    }

    // 취소 버튼
    authCancelBtn.addEventListener('click', function() {
        hideAuthOverlay();
        // 피드백 관리 탭으로 돌아가기
        document.getElementById('feedbackTab').click();
    });

    // 인증 확인 버튼
    authConfirmBtn.addEventListener('click', function() {
        authenticateAdmin();
    });

    // 비밀번호 입력 시 엔터 키 처리
    adminPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            authenticateAdmin();
        }
    });

    // 관리자 인증 함수
    function authenticateAdmin() {
        const password = adminPassword.value;
        
        if (password === ADMIN_PASSWORD) {
            isAdminAuthenticated = true;
            hideAuthOverlay();
            showAdminManagement();
            loadAdminStudentList();
        } else {
            showAuthError('비밀번호가 올바르지 않습니다.');
            adminPassword.value = '';
            adminPassword.focus();
        }
    }

    // 관리자 패널 표시
    function showAdminManagement() {
        adminManagement.classList.remove('hidden');
    }

    // 인증 에러 메시지 표시
    function showAuthError(message) {
        document.getElementById('authError').textContent = message;
        authError.classList.remove('hidden');
    }

    function hideAuthError() {
        authError.classList.add('hidden');
    }

    // 새 학생 추가 폼 처리
    addStudentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = newStudentName.value.trim();
        const phoneNumber = newStudentPhone.value.trim();
        const studentClass = newStudentClass.value;
        
        if (!name || !phoneNumber || !studentClass) {
            showError('모든 필드를 입력해주세요.');
            return;
        }

        // 전화번호 형식 검증
        const phoneRegex = /^010\d{8}$/;
        if (!phoneRegex.test(phoneNumber)) {
            showError('전화번호 형식이 올바르지 않습니다. (예: 01012345678)');
            return;
        }

        await addNewStudent(name, phoneNumber, studentClass);
    });

    // 새 학생 추가 함수
    async function addNewStudent(name, phoneNumber, studentClass) {
        try {
            // 이미 존재하는 전화번호인지 확인
            const existingDoc = await window.db.collection('students').doc(phoneNumber).get();
            if (existingDoc.exists) {
                showError('이미 등록된 전화번호입니다.');
                return;
            }

            // 새 학생 데이터
            const studentData = {
                name: name,
                phoneNumber: phoneNumber,
                class: studentClass
            };

            // Firestore에 추가
            await window.db.collection('students').doc(phoneNumber).set(studentData);
            
            showSuccess('새 학생이 성공적으로 추가되었습니다.');
            
            // 폼 초기화
            addStudentForm.reset();
            
            // 학생 목록 새로고침
            loadAdminStudentList();
            
        } catch (error) {
            console.error('학생 추가 오류:', error);
            showError('학생 추가 중 오류가 발생했습니다.');
        }
    }

    // 관리자용 학생 목록 로드
    async function loadAdminStudentList() {
        try {
            const snapshot = await window.db.collection('students').get();
            allStudentsAdmin = [];
            
            for (const doc of snapshot.docs) {
                const studentData = { id: doc.id, ...doc.data() };
                
                // 각 학생의 피드백 현황 조회
                const feedbackSnapshot = await window.db.collection('students').doc(doc.id).collection('feedback').get();
                const feedbackCount = feedbackSnapshot.size;
                const feedbackList = [];
                
                feedbackSnapshot.forEach(feedbackDoc => {
                    feedbackList.push(feedbackDoc.data().assignment);
                });
                
                studentData.feedbackCount = feedbackCount;
                studentData.feedbackList = feedbackList.sort();
                allStudentsAdmin.push(studentData);
            }

            allStudentsAdmin.sort((a, b) => a.name.localeCompare(b.name));
            displayAdminStudents(allStudentsAdmin);
        } catch (error) {
            console.error('학생 목록 로딩 오류:', error);
            showError('학생 목록을 불러오는 중 오류가 발생했습니다.');
        }
    }

    // 관리자용 학생 목록 표시
    function displayAdminStudents(students) {
        adminStudentList.innerHTML = '';
        
        if (students.length === 0) {
            adminStudentList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">검색 결과가 없습니다.</td></tr>';
            return;
        }

        students.forEach(student => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const feedbackStatus = student.feedbackList.length > 0 
                ? student.feedbackList.join(', ') 
                : '없음';
                
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${student.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${student.class}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${student.phoneNumber}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="text-xs ${student.feedbackCount > 0 ? 'text-green-600' : 'text-gray-400'}">
                        ${feedbackStatus} (${student.feedbackCount}/3)
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick="editStudent('${student.phoneNumber}')" 
                            class="text-blue-600 hover:text-blue-900">수정</button>
                    <button onclick="deleteStudent('${student.phoneNumber}', '${student.name}')" 
                            class="text-red-600 hover:text-red-900">삭제</button>
                </td>
            `;
            
            adminStudentList.appendChild(row);
        });
    }

    // 관리자 검색 및 필터링
    adminSearchInput.addEventListener('input', filterAdminStudents);
    adminClassFilter.addEventListener('change', filterAdminStudents);

    function filterAdminStudents() {
        const searchTerm = adminSearchInput.value.toLowerCase().trim();
        const selectedClass = adminClassFilter.value;

        let filteredStudents = allStudentsAdmin.filter(student => {
            const matchesSearch = !searchTerm || 
                student.name.toLowerCase().includes(searchTerm) ||
                student.phoneNumber.includes(searchTerm);
            
            const matchesClass = !selectedClass || student.class === selectedClass;

            return matchesSearch && matchesClass;
        });

        displayAdminStudents(filteredStudents);
    }

    // 전역 함수로 학생 수정 기능 노출
    window.editStudent = function(phoneNumber) {
        const student = allStudentsAdmin.find(s => s.phoneNumber === phoneNumber);
        if (!student) return;

        currentEditingStudent = student;
        editStudentName.value = student.name;
        editStudentPhone.value = student.phoneNumber;
        editStudentClass.value = student.class;
        
        editStudentModal.classList.remove('hidden');
        editStudentName.focus();
    };

    // 전역 함수로 학생 삭제 기능 노출
    window.deleteStudent = async function(phoneNumber, studentName) {
        if (!confirm(`정말로 ${studentName} 학생을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 학생의 모든 피드백 데이터도 함께 삭제됩니다.`)) {
            return;
        }

        try {
            // 학생의 피드백 서브컬렉션 먼저 삭제
            const feedbackRef = window.db.collection('students').doc(phoneNumber).collection('feedback');
            const feedbackSnapshot = await feedbackRef.get();
            
            const batch = window.db.batch();
            feedbackSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 학생 문서 삭제
            batch.delete(window.db.collection('students').doc(phoneNumber));
            
            await batch.commit();
            
            showSuccess(`${studentName} 학생이 성공적으로 삭제되었습니다.`);
            loadAdminStudentList();
            
        } catch (error) {
            console.error('학생 삭제 오류:', error);
            showError('학생 삭제 중 오류가 발생했습니다.');
        }
    };

    // 학생 정보 수정 모달 관련
    editCancelBtn.addEventListener('click', function() {
        editStudentModal.classList.add('hidden');
        currentEditingStudent = null;
    });

    editStudentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!currentEditingStudent) return;

        const newName = editStudentName.value.trim();
        const newClass = editStudentClass.value;
        
        if (!newName || !newClass) {
            showError('모든 필드를 입력해주세요.');
            return;
        }

        try {
            await window.db.collection('students').doc(currentEditingStudent.phoneNumber).update({
                name: newName,
                class: newClass
            });
            
            showSuccess('학생 정보가 성공적으로 수정되었습니다.');
            editStudentModal.classList.add('hidden');
            currentEditingStudent = null;
            loadAdminStudentList();
            
        } catch (error) {
            console.error('학생 정보 수정 오류:', error);
            showError('학생 정보 수정 중 오류가 발생했습니다.');
        }
    });

    // 페이지 새로고침 시 2차 인증 상태 초기화
    window.addEventListener('beforeunload', function() {
        isAdminAuthenticated = false;
    });

    // 유틸리티 함수들
    function showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        const successText = document.getElementById('successText');
        successText.textContent = message;
        successMessage.classList.remove('hidden');
        setTimeout(() => {
            successMessage.classList.add('hidden');
        }, 3000);
    }

    function showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }
    
    }); // waitForFirebase().then() 종료
}); // DOMContentLoaded 종료
