// Google Cloud Console에서 발급받은 클라이언트 ID를 여기에 붙여넣으세요.
const CLIENT_ID = '1054924979449-k0csmdg3tji9ia6oo5mabrui9hal4pgf'; 
const SCOPES = 'https://www.googleapis.com/auth/contacts.readonly';

let tokenClient;

// --- 당원 DB 및 정규화 함수 (이전과 동일) ---
function normalizePhoneNumber(phone) {
    if (!phone) return null;
    let normalized = phone.replace(/[^\d]/g, '');
    if (normalized.startsWith('8210')) {
        normalized = '010' + normalized.substring(4);
    }
    return normalized;
}
const partyMemberDB = [
    { name: '유재권', phone: '01074010329' },
    { name: '임준석', phone: '010-3974-1899' },
    { name: '부동산', phone: '+821086706522' }
];
const normalizedPartyDB = partyMemberDB.map(member => ({...member, normalizedPhone: normalizePhoneNumber(member.phone)}));
const partyPhoneSet = new Set(normalizedPartyDB.map(member => member.normalizedPhone));
let userContacts = [];

// --- Google API 초기화 관련 함수들 (수정됨) ---

function gapiLoaded() {
    gapi.load('client:oauth2', initializeGapiClient);
}

async function initializeGapiClient() {
    // People API 라이브러리만 로드합니다. init은 사용하지 않습니다.
    await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/people/v1/rest');
}

function gisLoaded() {
    // 로그인 및 토큰 요청을 담당하는 클라이언트 초기화
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            // 로그인 및 권한 동의 성공 시, 이 콜백이 실행됨
            if (tokenResponse && tokenResponse.access_token) {
                // 받은 토큰으로 gapi 클라이언트를 인증하고 연락처를 불러옴
                gapi.client.setToken(tokenResponse);
                fetchContacts();
            }
        },
    });

    // 화면에 표시될 로그인 버튼 초기화
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
      use_fedcm_for_prompt: false
    });
}

function handleCredentialResponse(response) {
    // 사용자가 기본 정보로 로그인에 성공하면, 추가 권한(연락처)을 요청
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

async function fetchContacts() {
    // ... (이하 연락처를 불러오고 매칭하는 코드는 이전과 동일) ...
    document.getElementById('main-content').innerHTML = '<p>연락처를 불러오는 중...</p>';
    try {
        const response = await gapi.client.people.people.connections.list({
            resourceName: 'people/me',
            personFields: 'names,phoneNumbers',
        });
        const connections = response.result.connections;
        if (connections && connections.length > 0) {
            userContacts = connections.map(person => ({
                savedName: person.names && person.names.length > 0 ? person.names[0].displayName : '이름 없음',
                phone: person.phoneNumbers && person.phoneNumbers.length > 0 ? person.phoneNumbers[0].value : null,
                normalizedPhone: normalizePhoneNumber(person.phoneNumbers && person.phoneNumbers.length > 0 ? person.phoneNumbers[0].value : null)
            })).filter(contact => contact.normalizedPhone);
        }
        document.querySelector('.g_id_signin').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('find-button').addEventListener('click', displayResults);
        alert(`총 ${userContacts.length}개의 유효한 연락처를 불러왔습니다. '당원 찾기' 버튼을 눌러주세요.`);
    } catch (err) {
        alert(`연락처를 불러오는 중 오류가 발생했습니다: ${err.message}`);
    }
}

function displayResults() {
    // ... (결과를 화면에 표시하는 코드는 이전과 동일) ...
    const politicianViewDiv = document.getElementById('politician-view');
    const supporterViewDiv = document.getElementById('supporter-view');
    politicianViewDiv.innerHTML = '<h2>[후보자 시점 리스트]</h2>';
    supporterViewDiv.innerHTML = '<h2>[사용자(지지자) 시점 리스트]</h2>';
    const matches = [];
    userContacts.forEach(contact => {
        if (partyPhoneSet.has(contact.normalizedPhone)) {
            const partyMemberInfo = normalizedPartyDB.find(member => member.normalizedPhone === contact.normalizedPhone);
            matches.push({ supporterContact: contact, partyMember: partyMemberInfo });
        }
    });
    if (matches.length > 0) {
        matches.forEach(match => {
            politicianViewDiv.innerHTML += `<div class="contact"><div class="contact-name">${match.partyMember.name} (당원DB)</div><div>${match.partyMember.phone}</div></div>`;
            supporterViewDiv.innerHTML += `<div class="contact"><div class="contact-name">${match.supporterContact.savedName} (내가 저장한 이름)</div><div>${match.supporterContact.phone}</div></div>`;
        });
    } else {
        politicianViewDiv.innerHTML += '<p>지지자의 연락처에서 일치하는 당원을 찾지 못했습니다.</p>';
        supporterViewDiv.innerHTML += '<p>당신의 연락처에 있는 당원을 찾지 못했습니다.</p>';
    }
}
