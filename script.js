document.getElementById('btn-generate').addEventListener('click', generateSeating);

function generateSeating() {
    // 1. 입력값 가져오기 및 파싱
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    
    const studentListStr = document.getElementById('student-list').value;
    const frontStr = document.getElementById('front-students').value;
    const avoidStr = document.getElementById('avoid-pairs').value;

    // 공백, 쉼표, 줄바꿈 등으로 깔끔하게 배열화 시키는 헬퍼 함수
    const parseNames = (str) => str.split(/[\s,\n]+/).filter(name => name.trim() !== "");

    let allStudents = parseNames(studentListStr);
    let frontStudents = parseNames(frontStr);
    
    // 기피 커플 파싱 [['A', 'B'], ['C', 'D']] 형태
    let avoidPairs = avoidStr.split(',').map(pair => {
        return pair.split('-').map(name => name.trim());
    }).filter(pair => pair.length === 2);

    const totalSeats = rows * cols;

    // 예외 처리
    if (allStudents.length === 0) {
        alert("학생 명단을 입력해주세요!");
        return;
    }
    if (allStudents.length > totalSeats) {
        alert(`좌석 수가 부족합니다! (학생 수: ${allStudents.length}명, 좌석 수: ${totalSeats}개)`);
        return;
    }
    if (frontStudents.length > cols) {
        alert(`앞자리 지정 학생이 첫 줄 좌석 수(${cols}개)보다 많습니다!`);
        return;
    }

    // 일반 학생 명단 분류 (전체 명단 - 앞자리 명단)
    let regularStudents = allStudents.filter(name => !frontStudents.includes(name));

    // 2. 자리 배치 셔플 알고리즘 (최대 100회 시도하여 기피 조건 만족 탐색)
    let grid = new Array(totalSeats).fill(null);
    let success = false;

    for (let attempt = 0; attempt < 100; attempt++) {
        grid.fill(null);

        // 앞자리 학생들을 1열(0 ~ cols-1)에 무작위 배치
        let frontSeats = Array.from({length: cols}, (_, i) => i);
        shuffleArray(frontSeats);
        frontStudents.forEach((student, index) => {
            grid[frontSeats[index]] = { name: student, isFront: true };
        });

        // 남은 자리 구하기
        let remainingSeats = [];
        for (let i = 0; i < totalSeats; i++) {
            if (grid[i] === null) remainingSeats.push(i);
        }
        shuffleArray(remainingSeats);

        // 일반 학생 배치
        let tempRegulars = [...regularStudents];
        shuffleArray(tempRegulars);
        tempRegulars.forEach((student, index) => {
            grid[remainingSeats[index]] = { name: student, isFront: false };
        });

        // 기피 조건 체크
        if (!checkAvoidPairs(grid, cols, rows, avoidPairs)) {
            success = true;
            break; // 걸리는 사람 없으면 바로 탈출!
        }
    }

    if (!success && avoidPairs.length > 0) {
        alert("⚠️ 모든 기피 조건을 만족하는 배치를 찾지 못했습니다. 가장 근접한 무작위 결과를 보여줍니다.");
    }

    // 3. 화면에 그리드 렌더링
    renderGrid(grid, rows, cols);
}

// 배열을 무작위로 섞는 함수 (Fisher-Yates Shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[array[j]]] = [array[j], array[i]];
    }
}

// 상하좌우에 기피 학생이 붙어있는지 체크하는 함수
function checkAvoidPairs(grid, cols, rows, avoidPairs) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const currentIdx = r * cols + c;
            if (!grid[currentIdx]) continue;

            const currentName = grid[currentIdx].name;

            // 체크할 인접 방향 (우측, 하단만 체크해도 전체 검사 가능)
            const directions = [
                { dr: 0, dc: 1 }, // 우
                { dr: 1, dc: 0 }  // 하
            ];

            for (let d of directions) {
                const nr = r + d.dr;
                const nc = c + d.dc;

                if (nr < rows && nc < cols) {
                    const nextIdx = nr * cols + nc;
                    if (grid[nextIdx]) {
                        const nextName = grid[nextIdx].name;
                        
                        // 기피 쌍에 해당하는지 확인
                        for (let pair of avoidPairs) {
                            if ((pair[0] === currentName && pair[1] === nextName) || 
                                (pair[1] === currentName && pair[0] === nextName)) {
                                return true; // 위반 발견!
                            }
                        }
                    }
                }
            }
        }
    }
    return false; // 위반 없음
}

// HTML에 자리 배치 레이아웃 그려주기
function renderGrid(grid, rows, cols) {
    const container = document.getElementById('classroom-grid');
    container.innerHTML = ''; // 기존 배치 초기화
    
    // CSS Grid 동적 설정
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    grid.forEach(cell => {
        const slot = document.createElement('div');
        slot.classList.add('desk-slot');

        if (cell) {
            slot.textContent = cell.name;
            slot.classList.add('occupied');
            if (cell.isFront) {
                slot.classList.add('front-fixed');
                slot.title = "앞자리 고정 학생";
            }
        } else {
            slot.textContent = "(빈자리)";
            slot.style.color = "#aaa";
        }
        
        container.appendChild(slot);
    });
}
