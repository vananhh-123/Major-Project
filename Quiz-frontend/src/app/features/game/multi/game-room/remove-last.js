const fs = require('fs');
let code = fs.readFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.html', 'utf8');

code = code.substring(0, code.lastIndexOf('</div>'));
fs.writeFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.html', code);
