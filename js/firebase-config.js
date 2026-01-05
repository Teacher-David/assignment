// Firebase v8 설정 및 초기화
(function() {
    'use strict';
    
    const firebaseConfig = {
          apiKey: "AIzaSyD3FQSeyPeI7BCQVLe5CyAym-hR7x-2G8s",
          authDomain: "myweb-5e309.firebaseapp.com",
          projectId: "myweb-5e309",
          storageBucket: "myweb-5e309.firebasestorage.app",
          messagingSenderId: "417447127215",
          appId: "1:417447127215:web:739aa4152da19629564c5a"
    };    let retryCount = 0;
    const maxRetries = 10; // 재시도 횟수 줄임
    let initializationPromise = null;    // Firebase 초기화 함수
    function initializeFirebase() {
        return new Promise((resolve, reject) => {
            if (retryCount >= maxRetries) {
                const error = 'Firebase 초기화에 실패했습니다. 최대 재시도 횟수를 초과했습니다.';
                console.error(error);
                reject(new Error(error));
                return;
            }

            // Firebase 기본 객체 확인
            if (typeof firebase === 'undefined' || !firebase) {
                console.warn(`Firebase 라이브러리 로딩 중... (재시도 ${retryCount + 1}/${maxRetries})`);
                retryCount++;
                setTimeout(() => {
                    initializeFirebase().then(resolve).catch(reject);
                }, 300);
                return;
            }

            // Firebase 앱이 이미 초기화되었는지 확인
            if (firebase.apps && firebase.apps.length > 0) {
                console.log('Firebase 이미 초기화됨');
                window.auth = firebase.auth();
                window.db = firebase.firestore();
                console.log('Firebase 서비스 연결 완료');
                resolve();
                return;
            }

            // Firebase 서비스 함수들 확인
            if (typeof firebase.auth !== 'function' || typeof firebase.firestore !== 'function') {
                console.warn(`Firebase 서비스 로딩 중... (재시도 ${retryCount + 1}/${maxRetries})`);
                retryCount++;
                setTimeout(() => {
                    initializeFirebase().then(resolve).catch(reject);
                }, 300);
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
                
                resolve();
                
            } catch (error) {
                console.error('Firebase 초기화 오류:', error);
                retryCount++;
                if (retryCount < maxRetries) {
                    setTimeout(() => {
                        initializeFirebase().then(resolve).catch(reject);
                    }, 300);
                } else {
                    reject(error);
                }
            }
        });
    }    // 전역에서 접근 가능한 초기화 함수
    window.waitForFirebaseInit = function() {
        if (initializationPromise) {
            return initializationPromise;
        }
        
        initializationPromise = initializeFirebase();
        return initializationPromise;
    };

    // 여러 초기화 시점 시도
    function startInitialization() {
        // 즉시 시도
        setTimeout(() => {
            window.waitForFirebaseInit().catch(console.error);
        }, 100);
        
        // DOM 로드 후 시도
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    window.waitForFirebaseInit().catch(console.error);
                }, 100);
            });
        }
        
        // 윈도우 로드 후 시도
        window.addEventListener('load', function() {
            setTimeout(() => {
                window.waitForFirebaseInit().catch(console.error);
            }, 100);
        });
    }

    startInitialization();
})();

