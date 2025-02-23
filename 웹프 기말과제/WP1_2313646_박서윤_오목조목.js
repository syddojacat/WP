const boardSize = 19;
let board = [];
let currentPlayer = 'black';  // 흑이 항상 선공
let players = { black: '', white: '' };
let moveHistory = [];
let playerData = {};

async function loadInitialData() {
    try {
        const response = await fetch('WP1_2313646_박서윤_오목조목.json');
        const data = await response.json();
        if (!localStorage.getItem('playerData')) {
            localStorage.setItem('playerData', JSON.stringify(data));
        }
        playerData = JSON.parse(localStorage.getItem('playerData'));
        displayPlayerList();
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
}

function savePlayerData() {
    localStorage.setItem('playerData', JSON.stringify(playerData));
}

function displayPlayerList() {
    const playerList = document.getElementById('playerList');
    const sortedPlayers = Object.entries(playerData)
        .sort(([nameA, statsA], [nameB, statsB]) => {
            const winRateA = statsA.wins / (statsA.wins + statsA.losses || 1);
            const winRateB = statsB.wins / (statsB.wins + statsB.losses || 1);
            return winRateB - winRateA;
        });

    playerList.innerHTML = '<ol>' +
        sortedPlayers.map(([name, { wins, losses }]) => {
            const totalGames = wins + losses;
            const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
            return `<li>${name}: ${wins}승 ${losses}패 (승률: ${winRate}%)</li>`;
        }).join('') +
        '</ol>';
}

function startScreen() {
    location.reload();
}

function startGame() {
    const blackPlayer = document.getElementById('blackPlayer').value.trim();
    const whitePlayer = document.getElementById('whitePlayer').value.trim();

    if (!blackPlayer || !whitePlayer) {
        alert('두 플레이어의 이름을 입력해주세요!');
        return;
    }

    if (!playerData[blackPlayer]) playerData[blackPlayer] = { wins: 0, losses: 0 };
    if (!playerData[whitePlayer]) playerData[whitePlayer] = { wins: 0, losses: 0 };
    savePlayerData();

    players.black = blackPlayer;
    players.white = whitePlayer;

    document.getElementById('currentPlayer').textContent = `${players.black}(흑)`;
    initializeBoard();

    document.querySelector('.board').style.display = 'grid';
    document.querySelector('.info').style.display = 'block';
    document.querySelector('.controls').style.display = 'block';
    document.querySelector('.player-setup').style.display = 'none';
    document.getElementById('playerList').style.display = 'none';
    document.getElementById('playerListTitle').style.display = 'none';

    document.getElementById('instructionText').style.display = 'block';
}

function initializeBoard() {
    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    moveHistory = [];
    currentPlayer = 'black';
    createBoard();
}

function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(event) {
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (board[row][col] !== null) return;

    if (currentPlayer === 'black' && isForbidden(row, col, currentPlayer)) {
        alert('금수입니다! 다른 곳에 놓아주세요.');
        return;
    }

    // 돌 놓기
    board[row][col] = currentPlayer;
    moveHistory.push({ row, col, player: currentPlayer });

    const stone = document.createElement('div');
    stone.classList.add('stone', currentPlayer);
    event.target.appendChild(stone);

    if (checkWin(row, col, currentPlayer)) {
        updateWinRecord(currentPlayer);
        return;
    }

    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    document.getElementById('currentPlayer').textContent = `${players[currentPlayer]}(${currentPlayer === 'black' ? '흑' : '백'})`;
}

function checkWin(row, col, player) {
    const directions = [
        { dr: 0, dc: 1 },  // 가로
        { dr: 1, dc: 0 },  // 세로
        { dr: 1, dc: 1 },  // 대각선 \
        { dr: 1, dc: -1 }, // 대각선 /
    ];

    for (const { dr, dc } of directions) {
        let count = 1;

        for (let dir = -1; dir <= 1; dir += 2) {
            let r = row + dr * dir;
            let c = col + dc * dir;

            while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
                count++;
                r += dr * dir;
                c += dc * dir;
            }
        }

        if (count >= 5) return true;
    }

    return false;
}

function updateWinRecord(winner) {
    const winnerName = players[winner];
    const loserName = players[winner === 'black' ? 'white' : 'black'];

    playerData[winnerName].wins++;
    playerData[loserName].losses++;
    savePlayerData();

    alert(`${winnerName} 승리!
        
확인 버튼을 누르면 시작 페이지로 돌아갑니다.`);
    location.reload();
}

function undoMove() {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory.pop();
    board[lastMove.row][lastMove.col] = null;

    const cell = document.querySelector(`.cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`);
    cell.innerHTML = '';

    currentPlayer = lastMove.player;
    document.getElementById('currentPlayer').textContent = `${players[currentPlayer]}(${currentPlayer === 'black' ? '흑' : '백'})`;
}

// 금수 확인 함수 (삼삼, 사사, 장목 금지)
function isForbidden(row, col, player) {
    const forbiddenMoves = {
        삼삼: countPatterns(row, col, player, 3) >= 2,  // 3-3 금지
        사사: countPatterns(row, col, player, 4) >= 2,  // 4-4 금지
        장목: countPatterns(row, col, player, 6) > 0,   // 6목 금지
    };

    return forbiddenMoves.삼삼 || forbiddenMoves.사사 || forbiddenMoves.장목;
}

// 특정 패턴 카운트 함수
function countPatterns(row, col, player, length) {
    const directions = [
        { dr: 0, dc: 1 }, // 가로
        { dr: 1, dc: 0 }, // 세로
        { dr: 1, dc: 1 }, // 대각선 \
        { dr: 1, dc: -1 }, // 대각선 /
    ];

    let patternCount = 0;

    for (const { dr, dc } of directions) {
        let count = 1;
        for (let step = 1; step < length; step++) {
            const r = row + dr * step;
            const c = col + dc * step;
            if (r < 0 || r >= boardSize || c < 0 || c >= boardSize || board[r][c] !== player) {
                break;
            }
            count++;
        }
        for (let step = 1; step < length; step++) {
            const r = row - dr * step;
            const c = col - dc * step;
            if (r < 0 || r >= boardSize || c < 0 || c >= boardSize || board[r][c] !== player) {
                break;
            }
            count++;
        }
        if (count === length) {
            patternCount++;
        }
    }

    return patternCount;
}

// 초기화
loadInitialData();
