// UI 제어 및 이벤트 리스너 등록
document.getElementById('btn-generate').addEventListener('click', generateSeating);

const btnToggleConfig = document.getElementById('btn-toggle-config');
const configPanel = document.getElementById('config-panel');
const mainContent = document.getElementById('main-content');

btnToggleConfig.addEventListener('click', () => {
    if (configPanel.classList.contains('hidden')) {
        configPanel.classList.remove('hidden');
        mainContent.classList.remove('centered');
        btnToggleConfig.textContent = '👁️ 설정창 숨기기';
    } else {
        configPanel.classList.add('hidden');
        mainContent.classList.add('centered');
        btnToggleConfig.textContent = '👁️ 설정창 보이기';
    }
});

function generateSeating() {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    
    const studentListStr = document.getElementById('student-list').value;
    const frontStr = document.getElementById('front-students').value;
    const avoidStr = document.getElementById('avoid-pairs').value;

    const parseNames = (str) => {
        return [...new Set(str.split(/[\s,\n]+/).map(name => name.trim()).filter(name => name !== ""))];
    };

    let allStudents = parseNames(studentListStr);
    let frontStudents = parseNames(frontStr);
    
    // 앞자리 지정 학생이 전체 명단에 누락되었다면 포함시킴
    frontStudents.forEach(student => {
        if (!allStudents.includes(student)) {
            allStudents.push(student);
        }
    });

    let avoidPairs = avoidStr.split(',').map(pair => {
        return pair.split('-').map(name => name.trim());
    }).filter(pair => pair.length === 2 && pair[0] !== "" && pair[1] !== "");

    const totalSeats = rows * cols;
    const emptySeatCount = totalSeats - allStudents.length;

    if (allStudents.length === 0) {
        alert("학생 명단을 입력해주세요!");
        return;
    }
    if (emptySeatCount < 0) {
        alert(`좌석이 부족합니다. (학생: ${allStudents.length}명 / 좌석: ${totalSeats}개)`);
        return;
    }

    // 1. 빈자리를 [가장 오른쪽 열]의 [맨 뒷행]부터 순차적으로 고정 지정
    let emptyIndices = [];
    let foundBoxes = 0;
    for (let c = cols - 1; c >= 0; c--) {
        for (let r = rows - 1; r >= 0; r--) {
            if (foundBoxes < emptySeatCount) {
                emptyIndices.push(r * cols + c);
                foundBoxes++;
            }
        }
    }

    // 2. 첫 번째 줄(row = 0) 중에서 빈자리로 잠기지 않은 유효한 앞자리 좌석 찾기
    let availableFrontIndices = [];
    for (let c = 0; c < cols; c++) {
        let firstRowIdx = 0 * cols + c;
        if (!emptyIndices.includes(firstRowIdx)) {
            availableFrontIndices.push(firstRowIdx);
        }
    }

    if (frontStudents.length > availableFrontIndices.length) {
        alert(`오른쪽 빈자리를 제외하면 첫 줄 유효 좌석은 ${availableFrontIndices.length}개입니다.\n앞자리 지정 학생(${frontStudents.length}명)이 더 많습니다.`);
        return;
    }

    let regularStudents = allStudents.filter(name => !frontStudents.includes(name));
    let grid = new Array(totalSeats).fill(null);
    let success = false;

    // 조건 만족을 위한 시뮬레이션 루프 (최대 5,000회)
    for (let attempt = 0; attempt < 5000; attempt++) {
        grid.fill(null);

        // 빈자리 먼저 배치 구조에 락(Lock) 걸기
        emptyIndices.forEach(idx => {
            grid[idx] = { name: "(빈자리)", isFront: false, isEmpty: true };
        });

        // 앞자리 고정 학생 배치
        let tempFrontSeats = [...availableFrontIndices];
        shuffleArray(tempFrontSeats);
        frontStudents.forEach((student, index) => {
            grid[tempFrontSeats[index]] = { name: student, isFront: true, isEmpty: false };
        });

        // 남은 일반 좌석 인덱스 추출
        let remainingActiveSeats = [];
        for (let i = 0; i < totalSeats; i++) {
            if (grid[i] === null) {
                remainingActiveSeats.push(i);
            }
        }
        shuffleArray(remainingActiveSeats);

        // 일반 학생 무작위 배치
        let tempRegulars = [...regularStudents];
        shuffleArray(tempRegulars);
        tempRegulars.forEach((student, index) => {
            grid[remainingActiveSeats[index]] = { name: student, isFront: false, isEmpty: false };
        });

        // 8방향 기피 조합 검사
        if (!checkAvoidPairsViolation(grid, rows, cols, avoidPairs)) {
            success = true;
            break;
        }
    }

    if (!success && avoidPairs.length > 0) {
        alert("⚠️ 모든 기피 조합을 만족하는 자리를 찾지 못했습니다. 다시 한번 배치하기 버튼을 눌러보세요!");
    }

    renderGrid(grid, rows, cols);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function checkAvoidPairsViolation(grid, rows, cols, avoidPairs) {
    const directions = [
        {dr: -1, dc: -1}, {dr: -1, dc: 0}, {dr: -1, dc: 1},
        {dr: 0, dc: -1},                   {dr: 0, dc: 1},
        {dr: 1, dc: -1},  {dr: 1, dc: 0},  {dr: 1, dc: 1}
    ];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const currentIdx = r * cols + c;
            if (!grid[currentIdx] || grid[currentIdx].isEmpty) continue;

            const currentName = grid[currentIdx].name;

            for (let d of directions) {
                const nr = r + d.dr;
                const nc = c + d.dc;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    const nextIdx = nr * cols + nc;
                    if (grid[nextIdx] && !grid[nextIdx].isEmpty) {
                        const nextName = grid[nextIdx].name;
                        
                        for (let pair of avoidPairs) {
                            if ((pair[0] === currentName && pair[1] === nextName) || 
                                (pair[1] === currentName && pair[0] === nextName)) {
                                return true; 
                            }
                        }
                    }
                }
            }
        }
    }
    return false;
}

function renderGrid(grid, rows, cols) {
    const container = document.getElementById('classroom-grid');
    container.innerHTML = ''; 
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    grid.forEach(cell => {
        const slot = document.createElement('div');
        slot.classList.add('desk-slot');

        if (cell) {
            if (cell.isEmpty) {
                slot.textContent = "";
                slot.classList.add('empty-fixed'); // 우측 끝 빈자리는 투명하게
            } else {
                slot.textContent = cell.name;
                slot.classList.add('occupied');
                if (cell.isFront) {
                    slot.classList.add('front-fixed'); // 교사용 화면 확인용 녹색 테두리
                }
            }
        }
        container.appendChild(slot);
    });
}
