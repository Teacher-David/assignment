// Firebase v8 설정 및 초기화
(function() {
    'use strict';
    
    const firebaseConfig = {
        apiKey: "AIzaSyD-h4d5P87JgeBliBhnqeY59rTnhRHJHG0",
        authDomain: "gifted-5bd1f.firebaseapp.com",
        projectId: "gifted-5bd1f",
        storageBucket: "gifted-5bd1f.firebasestorage.app",
        messagingSenderId: "248172655860",
        appId: "1:248172655860:web:fe898a99a433efcb6e1aa1",
        measurementId: "G-4BT9GBHP3C"
    };

    let retryCount = 0;
    const maxRetries = 20;

    // Firebase 초기화 함수
    function initializeFirebase() {
        if (retryCount >= maxRetries) {
            console.error('Firebase 초기화에 실패했습니다. 최대 재시도 횟수를 초과했습니다.');
            return;
        }

        // Firebase 기본 객체 확인
        if (typeof firebase === 'undefined' || !firebase) {
            console.warn(`Firebase 라이브러리 로딩 중... (재시도 ${retryCount + 1}/${maxRetries})`);
            retryCount++;
            setTimeout(initializeFirebase, 500);
            return;
        }

        // Firebase 앱이 이미 초기화되었는지 확인
        if (firebase.apps && firebase.apps.length > 0) {
            console.log('Firebase 이미 초기화됨');
            window.auth = firebase.auth();
            window.db = firebase.firestore();
            console.log('Firebase 서비스 연결 완료');
            return;
        }

        // Firebase 서비스 함수들 확인
        if (typeof firebase.auth !== 'function' || typeof firebase.firestore !== 'function') {
            console.warn(`Firebase 서비스 로딩 중... (재시도 ${retryCount + 1}/${maxRetries})`);
            retryCount++;
            setTimeout(initializeFirebase, 500);
            return;
        }

        try {
            // Firebase 초기화
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase 앱 초기화 완료');
            
            // Firebase 서비스 초기화
            window.auth = firebase.auth();
            window.db = firebase.firestore();
            
            console.log('Firebase v8 초기화 완료');
            console.log('Auth:', typeof window.auth);
            console.log('Firestore:', typeof window.db);
            
        } catch (error) {
            console.error('Firebase 초기화 오류:', error);
            retryCount++;
            if (retryCount < maxRetries) {
                setTimeout(initializeFirebase, 500);
            }
        }
    }

    // 여러 초기화 시점 시도
    function startInitialization() {
        // 즉시 시도
        setTimeout(initializeFirebase, 100);
        
        // DOM 로드 후 시도
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(initializeFirebase, 100);
            });
        }
        
        // 윈도우 로드 후 시도
        window.addEventListener('load', function() {
            setTimeout(initializeFirebase, 100);
        });
    }

    startInitialization();
})();
