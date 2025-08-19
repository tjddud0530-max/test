// 1단계에서 발급받은 클라이언트 ID를 여기에 붙여넣으세요.
const CLIENT_ID = 'YOUR_CLIENT_ID'; 
const SCOPES = 'https://www.googleapis.com/auth/contacts.readonly';

let tokenClient;

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/people/v1/rest'],
    });
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
    // People API에 대한 권한을 추가로 요청
    tokenClient.requestAccessToken();
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

// 스크립트 로딩을 위해 전역 콜백 함수로 노출
window.gapiLoaded = gapiLoaded;
window.gisLoaded = gisLoaded;
window.handleCredentialResponse = handleCredentialResponse;
