const fs = require('fs');
let code = fs.readFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.css', 'utf8');

code = code.replace(
  /\.ans-icon\s*\{[^}]*\}/,
  \.ans-icon {
  font-family: 'Inter', sans-serif;
  position: absolute;
  right: -5px;
  bottom: -20px;
  font-size: 80px;
  font-weight: 900;
  color: rgba(255,255,255,0.15);
  pointer-events: none;
  z-index: 0;
}\
);

code = code.replace(
  /\.focus-bg-icon\s*\{[^}]*\}/,
  \.focus-bg-icon {
  font-family: 'Inter', sans-serif;
  position: absolute;
  bottom: -20px;
  right: -5px;
  font-size: 80px;
  font-weight: 900;
  color: rgba(255,255,255,0.15);
  pointer-events: none;
  z-index: 0;
}\
);

fs.writeFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.css', code);
