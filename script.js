const pickContactsBtn = document.getElementById('pickContactsBtn');
const contactsResult = document.getElementById('contactsResult');

pickContactsBtn.addEventListener('click', async () => {
    // Contact Picker API가 지원되는 브라우저인지 확인
    if ('contacts' in navigator && 'select' in navigator.contacts) {
        try {
            // 요청할 연락처 정보 속성 정의 (이름, 이메일, 전화번호)
            const props = ['name', 'email', 'tel'];
            // 여러 연락처를 선택할 수 있도록 옵션 설정
            const opts = { multiple: true };

            // 연락처 선택 창 열기
            const contacts = await navigator.contacts.select(props, opts);

            // 사용자가 연락처를 선택했는지 확인
            if (contacts.length > 0) {
                // 결과를 예쁘게 JSON 형식으로 변환하여 화면에 표시
                contactsResult.textContent = JSON.stringify(contacts, null, 2);
            } else {
                contactsResult.textContent = '선택된 연락처가 없습니다.';
            }
        } catch (error) {
            // 사용자가 선택을 취소하거나 오류가 발생한 경우
            contactsResult.textContent = `오류가 발생했습니다: ${error.message}`;
        }
    } else {
        contactsResult.textContent = '이 브라우저는 Contact Picker API를 지원하지 않습니다.';
    }
});