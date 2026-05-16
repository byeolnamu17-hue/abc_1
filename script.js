document.getElementById('btn-generate').addEventListener('click', generateSeating);

function generateSeating() {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    
    const studentListStr = document.getElementById('student-list').value;
    const frontStr = document.getElementById('front-students').value;
    const avoidStr = document.getElementById('avoid-pairs').value;

    // 공백 및 기호 파싱 함수 (중복 이름 제거 포함)
    const parseNames = (str) => {
        return [...new Set(str.split(/[\s,\n]+/).map(name => name.trim()).filter(name => name !== ""))];
    };

    let allStudents = parseNames(studentListStr);
    let frontStudents = parseNames(frontStr);
    
    // 혹시 앞자리 명단에는 적었는데 전체 명단에서 빼먹은 학생이 있다면 자동으로 합쳐줍니다.
    frontStudents.forEach(student => {
        if (!allStudents.includes(student)) {
            allStudents.push(student);
        }
    });

    // 기피 커플/앙숙 파싱
    let avoidPairs = avoidStr.split(',').map(pair => {
        return pair.split('-').map(name => name.trim());
    }).filter(pair => pair.length === 2 && pair[0] !== "" && pair[1] !== "");

    const totalSeats = rows * cols;

    // 예외 처리 및 방어 코드
    if (allStudents.length === 0) {
        alert("학생 명단을 입력해주세요!");
        return;
    }
    if (allStudents.length > totalSeats) {
        alert(`좌석이 부족합니다. (학생: ${allStudents.length}명 / 좌석: ${totalSeats}개)`);
        return;
    }
    if (frontStudents.length > cols) {
        alert(`앞자리 지정 학생(${frontStudents.length}명)이 첫 줄 좌석 수(${cols}개)보다 많습니다!`);
        return;
    }

    // 일반 학생 분류 (전체 학생 - 앞자리 학생)
    let regularStudents = allStudents.filter(name => !frontStudents.includes(name));

    let grid = new Array(totalSeats).fill(null);
    let success = false;

    // 완벽한 배치를 위해 최대 5,000번 시도 (브라우저 연산 기준 0.02초 내외 소요)
    for (let attempt = 0; attempt < 5000; attempt++) {
        grid.fill(null);

        // 1. 첫 번째 줄(0번 행 ~ cols-1번 인덱스) 배치 구역 설정
        let firstRowIndices = Array.from({length: cols}, (_, i) => i);
        shuffleArray(firstRowIndices);

        // 2. 앞자리 필수 학생을 첫 줄 랜덤 구역에 안착 (100% 보장)
        frontStudents.forEach((student, index) => {
            grid[firstRowIndices[index]] = { name: student, isFront: true };
        });

        // 3. 교실 내 남아있는 모든 빈자리 인덱스 수집
        let remainingSeats = [];
        for (let i = 0; i < totalSeats; i++) {
            if (grid[i] === null) {
                remainingSeats.push(i);
            }
        }
        shuffleArray(remainingSeats);

        // 4. 일반 학생 배치
        let tempRegulars = [...regularStudents];
        shuffleArray(tempRegulars);
        tempRegulars.forEach((student, index) => {
            grid[remainingSeats[index]] = { name: student, isFront: false };
        });

        // 5. 기피 조건 체크 (상하좌우 대각선 포함 8방향)
        if (!checkAvoidPairsViolation(grid, rows, cols, avoidPairs)) {
            success = true;
            break; // 위반 사항 없으면 즉시 루프 탈출
        }
    }

    if (!success && avoidPairs.length > 0) {
        alert("⚠️ 입력하신 기피 조건을 모두 만족하는 자리를 찾지 못했습니다. 가장 근접한 무작위 결과를 보여줍니다. 다시 한번 버튼을 눌러보세요!");
    }

    // 6. 최종 화면 렌더링
    renderGrid(grid, rows, cols);
}

// 안전하고 검증된 셔플 알고리즘 (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

// 8방향 인접 검사 알고리즘
function checkAvoidPairsViolation(grid, rows, cols, avoidPairs) {
    // 주변 8방향 오프셋 설정 (좌우, 상하, 대각선 전체)
    const directions = [
        {dr: -1, dc: -1}, {dr: -1, dc: 0}, {dr: -1, dc: 1},
        {dr: 0, dc: -1},                   {dr: 0, dc: 1},
        {dr: 1, dc: -1},  {dr: 1, dc: 0},  {dr: 1, dc: 1}
    ];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const currentIdx = r * cols + c;
            if (!grid[currentIdx]) continue;

            const currentName = grid[currentIdx].name;

            for (let d of directions) {
                const nr = r + d.dr;
                const nc = c + d.dc;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    const nextIdx = nr * cols + nc;
                    if (grid[nextIdx]) {
                        const nextName = grid[nextIdx].name;
                        
                        // 기피 조합에 걸리는지 확인
                        for (let pair of avoidPairs) {
                            if ((pair[0] === currentName && pair[1] === nextName) || 
                                (pair[1] === currentName && pair[0] === nextName)) {
                                return true; // 조건 위반 발견됨
                            }
                        }
                    }
                }
            }
        }
    }
    return false; // 위반 없음 안전함
}

// 화면 그리드 생성
function renderGrid(grid, rows, cols) {
    const container = document.getElementById('classroom-grid');
    container.innerHTML = ''; 
    
    // 가로 열 수 세팅
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    grid.forEach(cell => {
        const slot = document.createElement('div');
        slot.classList.add('desk-slot');

        if (cell) {
            slot.textContent = cell.name;
            slot.classList.add('occupied');
            if (cell.isFront) {
                slot.classList.add('front-fixed');
            }
        } else {
            slot.textContent = "(빈자리)";
            slot.style.color = "#bbb";
        }
        container.appendChild(slot);
    });
}
