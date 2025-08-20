const CLIENT_ID = '1054924979449-k0csmdg3tji9ia6oo5mabrui9hal4pgf'; 
const SCOPES = 'https://www.googleapis.com/auth/contacts.readonly';

let tokenClient;
let gapiClientInitialized = false; // gapi 초기화 상태를 추적하는 변수 추가

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/people/v1/rest'],
    });
    gapiClientInitialized = true; // 초기화 완료 상태로 변경
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                listContacts();
            }
        },
    });
}

// 구글 로그인 성공 시 호출되는 함수
function handleCredentialResponse(response) {
    // gapi.client가 초기화될 때까지 기다렸다가 다음을 실행
    const checkGapiClient = setInterval(() => {
        if (gapiClientInitialized) {
            clearInterval(checkGapiClient);
            tokenClient.requestAccessToken();
        }
    }, 100); // 0.1초마다 확인
}

// 연락처 목록을 불러오는 함수
async function listContacts() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = "<h2>연락처 목록:</h2>";
    try {
        const response = await gapi.client.people.people.connections.list({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,phoneNumbers',
        });

        const connections = response.result.connections;
        if (connections && connections.length > 0) {
            connections.forEach(person => {
                const name = person.names && person.names.length > 0 ? person.names[0].displayName : '이름 없음';
                const phone = person.phoneNumbers && person.phoneNumbers.length > 0 ? person.phoneNumbers[0].value : '전화번호 없음';
                
                const contactDiv = document.createElement('div');
                contactDiv.className = 'contact';
                contactDiv.innerHTML = `<div class="contact-name">${name}</div><div>${phone}</div>`;
                resultDiv.appendChild(contactDiv);
            });
        } else {
            resultDiv.innerHTML += '<p>연락처가 없습니다.</p>';
        }
    } catch (err) {
        resultDiv.innerHTML = `<p>오류 발생: ${err.message}</p>`;
    }
}
