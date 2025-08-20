// Google Cloud Console에서 발급받은 클라이언트 ID를 여기에 붙여넣으세요.
const CLIENT_ID = '1054924979449-k0csmdg3tji9ia6oo5mabrui9hal4pgf'; 
const SCOPES = 'https://www.googleapis.com/auth/contacts.readonly';

let tokenClient;
let gapiClientInitialized = false;
let userContacts = []; // 불러온 사용자 연락처를 저장할 배열

// --- 전화번호 정규화 함수 ---
function normalizePhoneNumber(phone) {
    if (!phone) return null;
    let normalized = phone.replace(/[^\d]/g, ''); // 숫자 이외의 문자 모두 제거
    if (normalized.startsWith('8210')) {
        normalized = '010' + normalized.substring(4);
    }
    return normalized;
}

// 미리 당원 DB의 전화번호를 정규화 해둡니다.
const partyMemberDB = [
    { name: '유재권', phone: '01074010329' },
    { name: '임준석', phone: '010-3974-1899' },
    { name: '부동산', phone: '+821086706522' }
];
const normalizedPartyDB = partyMemberDB.map(member => ({
    ...member,
    normalizedPhone: normalizePhoneNumber(member.phone)
}));
const partyPhoneSet = new Set(normalizedPartyDB.map(member => member.normalizedPhone));


// --- Google API 초기화 관련 함수들 ---
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/people/v1/rest'],
    });
    gapiClientInitialized = true;
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                fetchContacts();
            }
        },
    });
    
    // FedCM UI가 아닌, 기존 팝업 방식을 사용하도록 명시합니다.
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
      use_fedcm_for_prompt: false 
    });
}

// --- 로그인 및 연락처 불러오기 ---
function handleCredentialResponse(response) {
    const checkGapiClient = setInterval(() => {
        if (gapiClientInitialized) {
            clearInterval(checkGapiClient);
            tokenClient.requestAccessToken();
        }
    }, 100);
}

async function fetchContacts() {
    document.getElementById('main-content').innerHTML = '<p>연락처를 불러오는 중...</p>';
    try {
        const response = await gapi.client.people.people.connections.list({
            resourceName: 'people/me',
            personFields: 'names,phoneNumbers',
        });

        const connections = response.result.connections;
        if (connections && connections.length > 0) {
            userContacts = connections.map(person => {
                const name = person.names && person.names.length > 0 ? person.names[0].displayName : '이름 없음';
                const phone = person.phoneNumbers && person.phoneNumbers.length > 0 ? person.phoneNumbers[0].value : null;
                return {
                    savedName: name,
                    phone: phone,
                    normalizedPhone: normalizePhoneNumber(phone)
                };
            }).filter(contact => contact.normalizedPhone); // 정규화된 번호가 있는 연락처만 필터링
        }
        
        document.querySelector('.g_id_signin').style.display = 'none'; // 로그인 버튼 숨기기
        document.getElementById('main-content').style.display = 'block'; // 당원찾기 버튼 보이기
        document.getElementById('find-button').addEventListener('click', displayResults);
        alert(`총 ${userContacts.length}개의 유효한 연락처를 불러왔습니다. '당원 찾기' 버튼을 눌러주세요.`);

    } catch (err) {
        alert(`연락처를 불러오는 중 오류가 발생했습니다: ${err.message}`);
    }
}


// --- 당원 매칭 및 결과 표시 ---
function displayResults() {
    const politicianViewDiv = document.getElementById('politician-view');
    const supporterViewDiv = document.getElementById('supporter-view');

    politicianViewDiv.innerHTML = '<h2>[후보자 시점 리스트]</h2>';
    supporterViewDiv.innerHTML = '<h2>[사용자(지지자) 시점 리스트]</h2>';

    const matches = [];

    userContacts.forEach(contact => {
        if (partyPhoneSet.has(contact.normalizedPhone)) {
            // 당원 DB에서 원본 정보 찾기
            const partyMemberInfo = normalizedPartyDB.find(
                member => member.normalizedPhone === contact.normalizedPhone
            );
            matches.push({
                supporterContact: contact,
                partyMember: partyMemberInfo
            });
        }
    });

    if (matches.length > 0) {
        matches.forEach(match => {
            // 후보자 시점 결과 추가
            politicianViewDiv.innerHTML += `
                <div class="contact">
                    <div class="contact-name">${match.partyMember.name} (당원DB)</div>
                    <div>${match.partyMember.phone}</div>
                </div>
            `;
            // 지지자 시점 결과 추가
            supporterViewDiv.innerHTML += `
                <div class="contact">
                    <div class="contact-name">${match.supporterContact.savedName} (내가 저장한 이름)</div>
                    <div>${match.supporterContact.phone}</div>
                </div>
            `;
        });
    } else {
        politicianViewDiv.innerHTML += '<p>지지자의 연락처에서 일치하는 당원을 찾지 못했습니다.</p>';
        supporterViewDiv.innerHTML += '<p>당신의 연락처에 있는 당원을 찾지 못했습니다.</p>';
    }
}
