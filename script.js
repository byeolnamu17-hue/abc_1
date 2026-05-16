// 1. 토글 버튼 이벤트 리스너 등록 (가장 확실한 방법으로 돔 제어)
const btnToggleConfig = document.getElementById('btn-toggle-config');
const configPanel = document.getElementById('config-panel');

btnToggleConfig.addEventListener('click', () => {
    configPanel.classList.toggle('hidden');
});

document.getElementById('btn-generate').addEventListener('click', generateSeating);

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
    
    // 안전 장치: 앞자리 명단에는 적었으나 전체 명단에 빠뜨린 학생 구제
    frontStudents.forEach(student => {
        if (!allStudents.includes(student)) {
            allStudents.push(student);
        }
    });

    let avoidPairs = avoidStr.split(',').map(pair => {
        return pair.split('-').map(name => name.trim());
    }).filter(pair => pair.length === 2 && pair[0] !== "" && pair[1] !== "");

    const totalSeats = rows * cols;
    const studentCount = allStudents.length;
    const emptySeatCount = totalSeats - studentCount;

    if (studentCount === 0) {
        alert("학생 명단을 입력해주세요!");
        return;
    }
    if (emptySeatCount < 0) {
        alert(`좌석이 부족합니다. (학생: ${studentCount}명 / 좌석: ${totalSeats}개)`);
        return;
    }

    // [핵심 변경] 빈자리의 위치를 수학적으로 고정 (0부터 전체학생수-1 까지만 학생이 앉을 수 있음)
    // 예: 30개 좌석 중 학생이 29명이면 0~28번 인덱스만 사용하고 29번(맨 오른쪽 아래)은 무조건 빈자리 락(Lock)
    let regularStudents = allStudents.filter(name => !frontStudents.includes(name));
    let grid = new Array(totalSeats).fill(null);
    let success = false;

    // 조건 부합을 위한 5,000번의 고속 셔플 시뮬레이션
    for (let attempt = 0; attempt < 5000; attempt++) {
        grid.fill(null);

        // 뒷자리부터 부족한 만큼 빈자리 인덱스로 락 걸기
        for (let i = 0; i < emptySeatCount; i++) {
            grid[totalSeats - 1 - i] = { name: "", isFront: false, isEmpty: true };
        }

        // 첫 줄(인덱스 0 ~ cols-1) 중에서 빈자리 락이 안 걸린 순수한 앞자리 탐색
        let allowedFrontIndices = [];
        for (let i = 0; i < cols; i++) {
            if (i < studentCount) { 
                allowedFrontIndices.push(i);
            }
        }

        if (frontStudents.length > allowedFrontIndices.length) {
            alert(`첫 줄에 배치할 수 있는 자리가 부족합니다.`);
            return;
        }

        // 앞자리 필수 학생 배치
        let tempFrontSeats = [...allowedFrontIndices];
        shuffleArray(tempFrontSeats);
        frontStudents.forEach((student, index) => {
            grid[tempFrontSeats[index]] = { name: student, isFront: true, isEmpty: false };
        });

        // 학생들이 앉을 수 있는 구역 중 아직 비어있는 인덱스들 확보
        let remainingActiveSeats = [];
        for (let i = 0; i < studentCount; i++) {
            if (grid[i] === null) {
                remainingActiveSeats.push(i);
            }
        }
        shuffleArray(remainingActiveSeats);

        // 일반 학생 배치
        let tempRegulars = [...regularStudents];
        shuffleArray(tempRegulars);
        tempRegulars.forEach((student, index) => {
            grid[remainingActiveSeats[index]] = { name: student, isFront: false, isEmpty: false };
        });

        // 8방향 철저 검증 (걸리는 조합 없으면 매칭 종료)
        if (!checkAvoidPairsViolation(grid, rows, cols, avoidPairs)) {
            success = true;
            break;
        }
    }

    if (!success && avoidPairs.length > 0) {
        alert("⚠️ 현재 조건으로는 모든 기피 대상을 떨어뜨릴 수 없어 가장 근접한 랜덤 배치를 보여줍니다. 다시 한번 버튼을 눌러보세요!");
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
                slot.textContent = "(빈자리)";
                slot.classList.add('empty-fixed'); 
            } else {
                slot.textContent = cell.name;
                slot.classList.add('occupied');
                if (cell.isFront) {
                    slot.classList.add('front-fixed'); 
                }
            }
        }
        container.appendChild(slot);
    });
}
