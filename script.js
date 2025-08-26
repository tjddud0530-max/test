// 페이지 로드 시 실행
window.onload = () => {
    const clientId = document.querySelector('meta[name="google-client-id"]').content;
    const scopes = 'https://www.googleapis.com/auth/contacts.readonly';

    let tokenClient;
    let gapiInited = false;
    let gisInited = false;

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const getContactsBtn = document.getElementById('getContactsBtn');
    const welcomeMsg = document.getElementById('welcomeMsg');
    const contactsContainer = document.getElementById('contacts-container');

    // 이벤트 리스너 등록
    loginBtn.onclick = handleAuthClick;
    logoutBtn.onclick = handleSignoutClick;
    getContactsBtn.onclick = listContacts;

    // 1. GAPI 클라이언트 초기화
    gapi.load('client', initializeGapiClient);
    
    // 2. GIS 클라이언트 초기화
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        callback: (tokenResponse) => {
            // 토큰을 받으면 UI 업데이트
            if (tokenResponse && tokenResponse.access_token) {
                updateUi(true);
            }
        },
    });
    gisInited = true;

    // GAPI 클라이언트 초기화 함수
    async function initializeGapiClient() {
        await gapi.client.init({
            // API 키는 현재 필요하지 않음
            // apiKey: API_KEY, 
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/people/v1/rest'],
        });
        gapiInited = true;
    }

    // 로그인 버튼 클릭 시
    function handleAuthClick() {
        if (gapiInited && gisInited) {
            tokenClient.requestAccessToken();
        }
    }

    // 로그아웃 버튼 클릭 시
    function handleSignoutClick() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                gapi.client.setToken('');
                updateUi(false);
            });
        }
    }

    // 로그인 상태에 따라 UI 변경
    function updateUi(isLoggedIn) {
        if (isLoggedIn) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            getContactsBtn.style.display = 'inline-block';
            welcomeMsg.style.display = 'block';
            welcomeMsg.innerText = "🎉 로그인 되었습니다!";
            contactsContainer.innerText = '';
        } else {
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            getContactsBtn.style.display = 'none';
            welcomeMsg.style.display = 'none';
            contactsContainer.innerText = '';
        }
    }

    // 연락처 정보 가져오기
    async function listContacts() {
        contactsContainer.innerText = "연락처를 불러오는 중...";
        try {
            const response = await gapi.client.people.people.connections.list({
                'resourceName': 'people/me',
                'pageSize': 50, // 가져올 연락처 수
                'personFields': 'names,emailAddresses,phoneNumbers',
            });

            const connections = response.result.connections;
            if (!connections || connections.length === 0) {
                contactsContainer.innerText = '연락처를 찾을 수 없습니다.';
                return;
            }

            // 보기 쉽게 텍스트로 가공
            const contactList = connections.map(person => {
                const name = person.names && person.names.length > 0 ? person.names[0].displayName : '이름 없음';
                const email = person.emailAddresses && person.emailAddresses.length > 0 ? person.emailAddresses[0].value : '이메일 없음';
                const phone = person.phoneNumbers && person.phoneNumbers.length > 0 ? person.phoneNumbers[0].value : '전화번호 없음';
                return `이름: ${name}\n이메일: ${email}\n전화번호: ${phone}\n--------------------`;
            }).join('\n');

            contactsContainer.innerText = contactList;

        } catch (err) {
            contactsContainer.innerText = '연락처를 가져오는 데 실패했습니다: ' + err.message;
            console.error('Execute error', err);
        }
    }
};