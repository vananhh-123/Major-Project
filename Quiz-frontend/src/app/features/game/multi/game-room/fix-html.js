const fs = require('fs');
let code = fs.readFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.html', 'utf8');

// remove General Knowledge
code = code.replace(/<div class="player-quiz-title">[^<]*<\/div>/g, '');

// Host submissions
code = code.replace(/<strong>\{\{\s*submissionsCount\s*\}\}<\/strong>\s*\/\s*\{\{\s*players\.length\s*\}\}/g, '<strong>{{ submissionsCount }}</strong> / {{ nonHostPlayersCount }}');
code = code.replace(/\[style\.width\.\%\]="players\.length \? \(submissionsCount \/ players\.length\) \* 100 : 0"/g, '[style.width.%]="nonHostPlayersCount ? (submissionsCount / nonHostPlayersCount) * 100 : 0"');

// Fix answer icons across both Host and Player
code = code.replace(/<span class="material-icons ans-icon">\{\{ answerIcons\[i\] \}\}<\/span>/g, '<span class="ans-icon">{{ getLetter(i) }}</span>');

code = code.replace(/<span class="material-icons focus-bg-icon">\{\{ answerIcons\[i\] \}\}<\/span>/g, '<span class="focus-bg-icon">{{ getLetter(i) }}</span>');

// Replace any leftover {{ answerIcons[i] }} that doesn't have the exact text.
code = code.replace(/\{\{\s*answerIcons\[i\]\s*\}\}/g, '{{ getLetter(i) }}');

fs.writeFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.html', code);
