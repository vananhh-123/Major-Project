const fs = require('fs');
let code = fs.readFileSync('src/app/features/game/multi/game-room/game-room.ts', 'utf8');
code = code.replace(
  `this.lastAnswerResult = msg.data.result;\r\n                if (this.lastAnswerResult && this.lastAnswerResult.totalScore)`,
  `this.lastAnswerResult = msg.data;\r\n                if (this.lastAnswerResult && this.lastAnswerResult.totalScore !== undefined)`
);
code = code.replace(
  `this.lastAnswerResult = msg.data.result;\n                if (this.lastAnswerResult && this.lastAnswerResult.totalScore)`,
  `this.lastAnswerResult = msg.data;\n                if (this.lastAnswerResult && this.lastAnswerResult.totalScore !== undefined)`
);
fs.writeFileSync('src/app/features/game/multi/game-room/game-room.ts', code);
