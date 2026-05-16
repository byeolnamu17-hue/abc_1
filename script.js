document.addEventListener('DOMContentLoaded', () => {
    const btnToggleConfig = document.getElementById('btn-toggle-config');
    const configPanel = document.getElementById('config-panel');

    if (btnToggleConfig && configPanel) {
        btnToggleConfig.addEventListener('click', () => {
            configPanel.classList.toggle('hidden');
        });
    }

    // [변경] 배치하기 클릭 시 바로 실행되지 않고 슬롯머신 애니메이션 함수 호출
    document.getElementById('btn-generate').addEventListener('click', startShuffleAnimation);
});

// [변경] 학생들이 완전히 속아 넘어갈 수밖에 없는 역동적 셔플 애니메이션 로직
function startShuffleAnimation() {
    const studentListStr = document.getElementById('student-list').value.trim();
    if (studentListStr === "") {
        alert("학생 명단을 입력해주세요!");
        return;
    }

    const btnGenerate = document.getElementById('btn-generate');
    const shuffleInput = document.getElementById('shuffle-count');
    
    let totalShuffles = parseInt(shuffleInput.value) || 5;
    if (totalShuffles < 1) totalShuffles = 1;
    if (totalShuffles > 30) totalShuffles = 30; // 과부하 방지 최대 30회 제한

    btnGenerate.disabled = true; // 셔플 중 버튼 비활성화
    let currentShuffle = 0;

    // 타이머 인터벌을 돌려 다다다닥 바뀌는 효과 연출 (각 셔플당 0.12초 딜레이)
    const shuffleInterval = setInterval(() => {
        currentShuffle++;
        
        // 마지막 셔플 회차일 때 true를 던져서 최종 경고문 팝업을 허용
        const isFinal = (currentShuffle === totalShuffles);
        
        generateSeating(isFinal);

        if (currentShuffle >= totalShuffles) {
            clearInterval(shuffleInterval);
            btnGenerate.disabled = false; // 완료 후 버튼 원복
        }
    }, 120);
}

// 기존 로직 유지하되 애니메이션 중간 과정에서 불필요한 Alert창이 뜨지 않도록 파라미터(isFinal) 적용
function generateSeating(isFinal = true) {
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

    if (emptySeatCount < 0) {
        if (isFinal) alert(`좌석이 부족합니다. (학생: ${studentCount}명 / 좌석: ${totalSeats}개)`);
        return;
    }

    // 오른쪽 열의 맨 아래 행부터 위로 올라오는 격리 빈자리 인덱스 연산
    let emptyIndices = [];
    let count = 0;
    for (let c = cols - 1; c >= 0; c--) {
        for (let r = rows - 1; r >= 0; r--) {
            if (count < emptySeatCount) {
                emptyIndices.push(r * cols + c);
                count++;
            }
        }
    }

    let regularStudents = allStudents.filter(name => !frontStudents.includes(name));
    let grid = new Array(totalSeats).fill(null);
    let success = false;

    for (let attempt = 0; attempt < 5000; attempt++) {
        grid.fill(null);

        emptyIndices.forEach(idx => {
            grid[idx] = { name: "", isFront: false, isEmpty: true };
        });

        let allowedFrontIndices = [];
        for (let c = 0; c < cols; c++) {
            let idx = 0 * cols + c;
            if (!emptyIndices.includes(idx)) {
                allowedFrontIndices.push(idx);
            }
        }

        if (frontStudents.length > allowedFrontIndices.length) {
            if (isFinal) alert(`오른쪽 지정 빈자리를 제외하면 첫 줄 자리가 부족합니다.`);
            return;
        }

        let tempFrontSeats = [...allowedFrontIndices];
        shuffleArray(tempFrontSeats);
        frontStudents.forEach((student, index) => {
            grid[tempFrontSeats[index]] = { name: student, isFront: true, isEmpty: false };
        });

        let remainingActiveSeats = [];
        for (let i = 0; i < totalSeats; i++) {
            if (grid[i] === null) {
                remainingActiveSeats.push(i);
            }
        }
        shuffleArray(remainingActiveSeats);

        let tempRegulars = [...regularStudents];
        shuffleArray(tempRegulars);
        tempRegulars.forEach((student, index) => {
            grid[remainingActiveSeats[index]] = { name: student, isFront: false, isEmpty: false };
        });

        if (!checkAvoidPairsViolation(grid, rows, cols, avoidPairs)) {
            success = true;
            break;
        }
    }

    // 최종 셔플 완료 시점에만 조건 실패 안내 출력
    if (!success && avoidPairs.length > 0 && isFinal) {
        alert("⚠️ 기피 조건이 너무 까다로워 완벽히 분리하지 못했습니다. 다시 셔플 버튼을 눌러보세요!");
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
