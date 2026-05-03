const fs = require('fs');
let code = fs.readFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.ts', 'utf8');

code = code.replace(
  '  get currentQuestion(): Question | null {',
  '  get nonHostPlayersCount(): number {\n    return this.players.filter(p => !p.isHost).length;\n  }\n\n  get currentQuestion(): Question | null {'
);

code = code.replace(
  '        this.startCountdown();',
  '        if (this.isHost) { this.prepareQuestion(); }'
);
code = code.replace(
  '          this.startCountdown();',
  '          this.startCountdown();'
); // do nothing

code = code.replace(
  '      this.startCountdown();',
  '      this.prepareQuestion();' // inside nextQuestionOrEnd
);

// We also need to remove the this.ws.sendQuestion block from showQuestion
code = code.replace(/\s*if \(this\.isHost\) \{\s*this\.ws\.sendQuestion\([\s\S]*?\}\s*/, '\n');

code = code.replace(
  '  private startCountdown(): void {',
  \  private prepareQuestion(): void {
    if (!this.isHost) return;
    const q = this.currentQuestion;
    if (!q) return;

    this.ws.sendQuestion(this.gamePin, this.currentUserId, {
      index:          this.currentQuestionIdx,
      content:        q.content,
      answers:        q.options.map(o => ({ text: o.text })),
      timeLimit:      q.time_limit,
      points:         q.points,
      multipleCorrect: q.multiple_correct
    });
    this.startCountdown();
  }

  private startCountdown(): void {\
);

fs.writeFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.ts', code);
