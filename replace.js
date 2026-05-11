const fs = require('fs');
let code = fs.readFileSync('src/app/features/game/result/result.ts', 'utf8');

const newInit = `
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isSolo = params['isSolo'] === 'true';
      this.isOwner = params['role'] === 'host';

      if (params['quizId']) {
          this.quizId = params['quizId'];
      }

      if (params['score']) {
         this.quizResult.totalPoints = Number(params['score']);
      }
      if (params['totalQuestions']) {
         this.quizResult.totalQuestions = Number(params['totalQuestions']);
      }
      if (params['totalCorrect']) {
         this.quizResult.correctAnswers = Number(params['totalCorrect']);
         if (this.quizResult.totalQuestions > 0) {
            this.quizResult.accuracy = Math.round((this.quizResult.correctAnswers / this.quizResult.totalQuestions) * 100);
         }
      }
      if (params['bestStreak']) {
         this.quizResult.bestStreak = Number(params['bestStreak']);
      }
      if (params['totalTime']) {
         let totalTime = Number(params['totalTime']);
         let average = this.quizResult.totalQuestions > 0 ? (totalTime / this.quizResult.totalQuestions) : 0;
         this.quizResult.avgTime = average.toFixed(1) + 's';
      }

      // Multi mode: extract actual leaderboard instead of dummy data
      if (!this.isSolo) {
         try {
             const scoresStr = sessionStorage.getItem('finalScores');
             if (scoresStr) {
                 const finalScores = JSON.parse(scoresStr);
                 if (Array.isArray(finalScores) && finalScores.length > 0) {
                     this.leaderboard = finalScores.map((fs: any, index: number) => ({
                         rank: index + 1,
                         name: fs.username || fs.id,
                         points: fs.score,
                         avatar: '/assets/images/user.png',
                         badge: index === 0 ? 'WINNER' : ''
                     }));
                 }
             }
         } catch (e) {
             console.error("Failed to parse leaderboard scores from session", e);
         }
      }

      this.saveResultToDatabase();
    });
  }
`;

code = code.replace(/ngOnInit\(\): void \{[\s\S]*?saveResultToDatabase\(\);\s+\}\);\s+\}/, newInit.trim());
fs.writeFileSync('src/app/features/game/result/result.ts', code);
