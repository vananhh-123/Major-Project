import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuizService } from '../../../services/quiz.service';

@Component({
  selector: 'app-quiz-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quiz-edit.html',
  styleUrls: ['./quiz-edit.css'],
})
export class QuizEdit implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizService = inject(QuizService);
  private cd = inject(ChangeDetectorRef);

  quizId: string = '';
  isLoading: boolean = true;
  quizData: any = {
    title: '',
    level: 'Mid',
    description: '',
    image: '',
    coverFileName: '',
    visibility: 'public'
  };

  questions: any[] = [];
  currentQuestionIndex = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.quizId = params.get('id') || '';
      if (this.quizId) {
        this.fetchQuizData();
      }
    });
  }

  fetchQuizData() {
    this.isLoading = true;
    this.quizService.getQuiz(this.quizId).subscribe({
      next: (quiz: any) => {
        this.quizData = {
          title: quiz.title || '',
          description: quiz.description || '',
          level: quiz.level || 'Mid',
          visibility: quiz.visibility || 'public',
          image: quiz.cover_image || '/Space.png',
          coverFileName: quiz.cover_image ? 'Cover Uploaded' : ''
        };

        if (quiz.questions && quiz.questions.length > 0) {
          this.questions = quiz.questions.map((q: any) => {
            let options = [];
            try {
              const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
              // format options properly with isCorrect
              options = parsed.map((opt: any) => ({
                text: opt.text || '',
                isCorrect: opt.is_correct !== undefined ? opt.is_correct : (opt.isCorrect || false)
              }));
              
              // Ensure we always have 4 options
              while (options.length < 4) {
                options.push({ text: '', isCorrect: false });
              }
            } catch(e) {
              options = [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
              ];
            }
            return {
              questionText: q.content,
              timeLimit: q.time_limit,
              points: q.points,
              allowMultiple: q.multiple_correct,
              options: options
            };
          });
        } else {
          this.addQuestion(); // Add a blank question if none exist
        }
        
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching quiz', err);
        alert('Failed to load quiz');
        this.router.navigate(['/app/dashboard']);
      }
    });
  }

  selectLevel(l: string) {
    this.quizData.level = l;
  }

  onCoverImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.quizData.coverFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.quizData.image = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  addQuestion() {
    this.questions.push({
      questionText: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      timeLimit: 20,
      points: 100,
      allowMultiple: false
    });
    this.currentQuestionIndex = this.questions.length - 1;
  }

  duplicateQuestion(index: number) {
    const questionToDuplicate = this.questions[index];
    // Deep copy
    const duplicatedOption = questionToDuplicate.options.map((o: any) => ({...o}));
    const newQuestion = {
        ...questionToDuplicate,
        options: duplicatedOption
    };
    this.questions.splice(index + 1, 0, newQuestion);
    this.currentQuestionIndex = index + 1;
  }

  removeQuestion(index: number) {
    if (this.questions.length > 1) {
      this.questions.splice(index, 1);
      if (this.currentQuestionIndex >= this.questions.length) {
        this.currentQuestionIndex = this.questions.length - 1;
      }
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) this.currentQuestionIndex--;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) this.currentQuestionIndex++;
  }

  cancelEdit() {
    if (confirm('Are you sure you want to discard your changes?')) {
      this.router.navigate(['/app/quiz-detail', this.quizId]);
    }
  }

  toggleOptionCorrect(optIndex: number) {
    const currentQ = this.questions[this.currentQuestionIndex];
    if (!currentQ.allowMultiple) {
      if (!currentQ.options[optIndex].isCorrect) {
        currentQ.options.forEach((o: any, idx: number) => {
            o.isCorrect = (idx === optIndex);
        });
      } else {
        currentQ.options[optIndex].isCorrect = false;
      }
    } else {
      currentQ.options[optIndex].isCorrect = !currentQ.options[optIndex].isCorrect;
    }
  }

  onAllowMultipleChange() {
     const currentQ = this.questions[this.currentQuestionIndex];
     if (!currentQ.allowMultiple) {
        const correctCount = currentQ.options.filter((o: any) => o.isCorrect).length;
        if (correctCount > 1) {
            let firstKept = false;
            currentQ.options.forEach((o: any) => {
                if (o.isCorrect && !firstKept) {
                    firstKept = true;
                } else if (o.isCorrect) {
                    o.isCorrect = false;
                }
            });
        }
     }
  }

  saveQuiz() {
    // Validate inputs briefly
    if (!this.quizData.title.trim()) {
      alert('Please enter a quiz title.');
      return;
    }
    
    // Format payload matching backend CreateQuizInput (which maps to UpdateQuiz)
    const payload = {
      title: this.quizData.title,
      description: this.quizData.description,
      level: this.quizData.level,
      visibility: this.quizData.visibility || 'public',
      cover_image: this.quizData.image,
      questions: this.questions.map(q => ({
        content: q.questionText,
        time_limit: Number(q.timeLimit) || 20,
        points: Number(q.points) || 100,
        multiple_correct: q.allowMultiple || false,
        answers: q.options.map((opt: any) => ({
          text: opt.text,
          is_correct: opt.isCorrect
        }))
      }))
    };

    this.quizService.updateQuiz(this.quizId, payload).subscribe({
      next: (res) => {
        alert('Quiz updated successfully!');
        this.router.navigate(['/app/quiz-detail', this.quizId]);
      },
      error: (err) => {
        console.error('Failed to update quiz', err);
        alert('Failed to update quiz. Please try again.');
      }
    });
  }
}

