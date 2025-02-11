// State management
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft;
let userAnswers = [];
let totalPoints = 0;
let currentPoints = 0;
let selectedCategories = [];
let currentDifficulty = 'easy';
let startTime;
let questionTimes = [];

// Statistics tracking
let quizStats = {
    gamesPlayed: 0,
    highScore: 0,
    totalCorrectAnswers: 0,
    averageTime: 0,
    categoryStats: {},
    difficultyStats: {},
    progressHistory: []
};

// Settings
let quizSettings = {
    shuffleQuestions: true,
    shuffleOptions: true,
    enableSound: true,
    enableParticles: true,
    autoNext: false,
    autoNextDelay: 3
};

// Charts references
let performanceChart = null;
let categoryChart = null;
let timeChart = null;
let progressChart = null;

// Load settings and stats from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('quizSettings');
    const savedStats = localStorage.getItem('quizStats');

    if (savedSettings) {
        quizSettings = { ...quizSettings, ...JSON.parse(savedSettings) };
        updateSettingsUI();
    }

    if (savedStats) {
        quizStats = JSON.parse(savedStats);
    }
}

function updateSettingsUI() {
    document.getElementById('shuffleQuestions').checked = quizSettings.shuffleQuestions;
    document.getElementById('shuffleOptions').checked = quizSettings.shuffleOptions;
    document.getElementById('enableSound').checked = quizSettings.enableSound;
    document.getElementById('enableParticles').checked = quizSettings.enableParticles;
    document.getElementById('autoNext').checked = quizSettings.autoNext;
    document.getElementById('autoNextDelay').value = quizSettings.autoNextDelay;
}

// Load and filter questions
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        const allQuestions = await response.json();

        // Filter by selected categories and difficulty
        questions = allQuestions.filter(q =>
            (selectedCategories.length === 0 || selectedCategories.includes(q.category)) &&
            q.difficulty === currentDifficulty
        );

        if (quizSettings.shuffleQuestions) {
            questions = shuffleArray([...questions]);
        }

        document.getElementById('total-questions').textContent = questions.length;
        updateCategoriesUI(allQuestions);
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function updateCategoriesUI(questions) {
    const categories = [...new Set(questions.map(q => q.category))];
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = `btn btn-outline-primary category-item ${selectedCategories.includes(category) ? 'selected' : ''}`;
        btn.textContent = category;
        btn.onclick = () => toggleCategory(category);
        container.appendChild(btn);
    });
}

function toggleCategory(category) {
    const index = selectedCategories.indexOf(category);
    if (index === -1) {
        selectedCategories.push(category);
    } else {
        selectedCategories.splice(index, 1);
    }
    loadQuestions();
    updateCategoriesUI(questions);
}

// Quiz navigation
function startQuiz() {
    currentDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
    transitionScreens('welcome-screen', 'instructions-screen');
}

function returnToHome() {
    transitionScreens('instructions-screen', 'welcome-screen');
}

function startQuestions() {
    startTime = Date.now();
    transitionScreens('instructions-screen', 'quiz-screen');
    loadQuestion();
}

// Question management
function loadQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('question-text').innerHTML = question.question;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    const options = getShuffledOptions(question);
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-light option-btn';
        button.setAttribute('data-option', option.letter);
        button.innerHTML = option.text;
        button.addEventListener('click', () => toggleOption(button));
        optionsContainer.appendChild(button);
    });

    // Reset timer
    timeLeft = 120;
    updateTimer();
    if (timer) clearInterval(timer);
    timer = setInterval(updateTimer, 1000);

    // Update validate button state
    const validateBtn = document.getElementById('validate-btn');
    validateBtn.disabled = true;
    validateBtn.classList.remove('d-none');
    document.getElementById('next-btn').classList.add('d-none');
}

function validateAnswer() {
    clearInterval(timer);
    const question = questions[currentQuestionIndex];
    const selectedOptions = Array.from(document.querySelectorAll('.option-btn.selected'))
        .map(btn => btn.getAttribute('data-option'));

    const isCorrect = arraysEqual(selectedOptions.sort(), question.correct.sort());
    userAnswers[currentQuestionIndex] = {
        selected: selectedOptions,
        correct: isCorrect,
        time: 120 - timeLeft
    };

    // Update statistics
    questionTimes.push(120 - timeLeft);
    updateCategoryStats(question.category, isCorrect);
    updateDifficultyStats(question.difficulty, isCorrect);

    if (isCorrect) {
        score++;
        const timeBonus = calculateTimeBonus();
        updatePoints(timeBonus);
        playSound('correct-sound');
    } else {
        playSound('wrong-sound');
    }

    // Show correct/incorrect answers
    document.querySelectorAll('.option-btn').forEach(btn => {
        const option = btn.getAttribute('data-option');
        if (question.correct.includes(option)) {
            btn.classList.add('correct');
        } else if (btn.classList.contains('selected')) {
            btn.classList.add('incorrect');
        }
        btn.disabled = true;
    });

    // Show explanation if available
    if (question.explanation) {
        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'alert alert-info mt-3';
        explanationDiv.innerHTML = question.explanation;
        document.getElementById('question-container').appendChild(explanationDiv);
    }

    document.getElementById('validate-btn').classList.add('d-none');
    document.getElementById('next-btn').classList.remove('d-none');

    if (currentQuestionIndex === questions.length - 1) {
        document.getElementById('next-btn').textContent = 'Voir le résultat';
    }

    if (quizSettings.autoNext && currentQuestionIndex < questions.length - 1) {
        setTimeout(nextQuestion, quizSettings.autoNextDelay * 1000);
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        showResults();
    }
}

// Results and Statistics
function showResults() {
    transitionScreens('quiz-screen', 'results-screen');

    // Update quiz statistics
    quizStats.gamesPlayed++;
    quizStats.highScore = Math.max(quizStats.highScore, score);
    quizStats.totalCorrectAnswers += score;
    quizStats.averageTime = questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length;
    quizStats.progressHistory.push({
        date: new Date().toISOString(),
        score: score,
        totalQuestions: questions.length
    });

    // Save statistics
    localStorage.setItem('quizStats', JSON.stringify(quizStats));

    // Update UI
    updateResultsUI();
    createResultsCharts();
    generateResultsQRCode();
}

function updateResultsUI() {
    document.getElementById('final-score').textContent = score;
    document.getElementById('max-score').textContent = questions.length;
    document.getElementById('total-points').textContent = totalPoints;

    const detailedResults = document.getElementById('detailed-results');
    detailedResults.innerHTML = questions.map((question, index) => {
        const answer = userAnswers[index];
        return `
            <div class="question-review ${answer.correct ? 'correct' : 'incorrect'}">
                <h5>Question ${index + 1}</h5>
                <p>${question.question}</p>
                <p><strong>Votre réponse:</strong> ${answer.selected.map(opt => question[`option_${opt}`]).join(', ')}</p>
                <p><strong>Bonne réponse:</strong> ${question.correct.map(opt => question[`option_${opt}`]).join(', ')}</p>
                <p><strong>Temps:</strong> ${answer.time} secondes</p>
                <p><strong>Explication:</strong> ${question.explanation || 'Aucune explication disponible'}</p>
            </div>
        `;
    }).join('');
}

function createResultsCharts() {
    // Performance Chart
    const perfCtx = document.getElementById('performanceChart').getContext('2d');
    performanceChart = createPerformanceChart(perfCtx, {
        labels: quizStats.progressHistory.map(h => new Date(h.date).toLocaleDateString()),
        scores: quizStats.progressHistory.map(h => (h.score / h.totalQuestions) * 100)
    });

    // Category Chart
    const catCtx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = createCategoryChart(catCtx, {
        categories: Object.keys(quizStats.categoryStats),
        successRates: Object.values(quizStats.categoryStats).map(s => s.successRate)
    });

    // Time Chart
    const timeCtx = document.getElementById('timeChart').getContext('2d');
    timeChart = createTimeChart(timeCtx, {
        questions: questions.map((_, i) => `Q${i + 1}`),
        times: questionTimes
    });
}

function generateResultsQRCode() {
    const resultsData = {
        score,
        totalQuestions: questions.length,
        date: new Date().toISOString()
    };
    generateQRCode(resultsData, document.getElementById('qr-code'));
}

// PDF Export
async function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Configuration
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(33, 150, 243);
    doc.text("Résultats du Quiz", pageWidth / 2, y, { align: "center" });

    // Basic Info
    y += 20;
    doc.setFontSize(14);
    doc.setTextColor(70, 70, 70);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, margin, y);
    y += 10;
    doc.text(`Score: ${score}/${questions.length} (${Math.round(score/questions.length*100)}%)`, margin, y);
    y += 10;
    doc.text(`Points totaux: ${totalPoints}`, margin, y);

    // Category Performance
    y += 20;
    doc.setFontSize(16);
    doc.setTextColor(33, 150, 243);
    doc.text("Performance par catégorie", margin, y);
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(0);

    Object.entries(quizStats.categoryStats).forEach(([category, stats]) => {
        y += 8;
        if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        doc.text(`${category}: ${Math.round(stats.successRate)}% de réussite`, margin, y);
    });

    // Detailed Questions Review
    y += 20;
    doc.setFontSize(16);
    doc.setTextColor(33, 150, 243);
    doc.text("Détail des questions", margin, y);

    questions.forEach((question, index) => {
        y += 15;
        if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }

        const answer = userAnswers[index];
        doc.setFontSize(12);
        doc.setTextColor(0);

        // Question
        const questionText = `Q${index + 1}: ${question.question.replace(/<[^>]*>/g, '')}`;
        const splitQuestion = doc.splitTextToSize(questionText, pageWidth - 2 * margin);
        doc.text(splitQuestion, margin, y);
        y += splitQuestion.length * 7;

        // User's answer vs Correct answer
        doc.setTextColor(answer.correct ? 0, 128, 0 : 255, 0, 0);
        const userAnswer = `Votre réponse: ${answer.selected.map(opt => question[`option_${opt}`]).join(', ')}`;
        const splitUserAnswer = doc.splitTextToSize(userAnswer, pageWidth - 2 * margin);
        doc.text(splitUserAnswer, margin, y);
        y += splitUserAnswer.length * 7;

        doc.setTextColor(0, 128, 0);
        const correctAnswer = `Réponse correcte: ${question.correct.map(opt => question[`option_${opt}`]).join(', ')}`;
        const splitCorrectAnswer = doc.splitTextToSize(correctAnswer, pageWidth - 2 * margin);
        doc.text(splitCorrectAnswer, margin, y);
        y += splitCorrectAnswer.length * 7;

        // Time taken
        doc.setTextColor(0);
        doc.text(`Temps: ${answer.time} secondes`, margin, y);
        y += 7;

        // Explanation if available
        if (question.explanation) {
            const explanation = `Explication: ${question.explanation}`;
            const splitExplanation = doc.splitTextToSize(explanation, pageWidth - 2 * margin);
            doc.text(splitExplanation, margin, y);
            y += splitExplanation.length * 7;
        }
    });

    // Add performance charts
    y += 15;
    if (y > pageHeight - 100) {
        doc.addPage();
        y = margin;
    }

    doc.setFontSize(16);
    doc.setTextColor(33, 150, 243);
    doc.text("Graphiques de performance", margin, y);
    y += 15;

    // Convert charts to images and add them to PDF
    const chartImages = [
        await html2canvas(document.getElementById('performanceChart')),
        await html2canvas(document.getElementById('categoryChart')),
        await html2canvas(document.getElementById('timeChart'))
    ];

    chartImages.forEach((canvas, index) => {
        if (y > pageHeight - 80) {
            doc.addPage();
            y = margin;
        }
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', margin, y, pageWidth - 2 * margin, 60);
        y += 70;
    });

    // Add QR code
    const qrCanvas = await html2canvas(document.getElementById('qr-code'));
    const qrData = qrCanvas.toDataURL('image/png');
    doc.addImage(qrData, 'PNG', pageWidth - 50, pageHeight - 50, 30, 30);

    // Save the PDF
    doc.save(`quiz-results-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Utility functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getShuffledOptions(question) {
    const options = [];
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach(letter => {
        if (question[`option_${letter}`]) {
            options.push({
                letter,
                text: question[`option_${letter}`]
            });
        }
    });
    return quizSettings.shuffleOptions ? shuffleArray([...options]) : options;
}

function calculateTimeBonus() {
    return Math.max(10, Math.floor((timeLeft / 120) * 100));
}

function playSound(soundId) {
    if (quizSettings.enableSound) {
        const sound = document.getElementById(soundId);
        sound.currentTime = 0;
        sound.play().catch(error => {
            console.warn('Error playing sound:', error);
        });
    }
}

function updateCategoryStats(category, isCorrect) {
    if (!quizStats.categoryStats[category]) {
        quizStats.categoryStats[category] = { total: 0, correct: 0, successRate: 0 };
    }
    const stats = quizStats.categoryStats[category];
    stats.total++;
    if (isCorrect) stats.correct++;
    stats.successRate = (stats.correct / stats.total) * 100;
}

function updateDifficultyStats(difficulty, isCorrect) {
    if (!quizStats.difficultyStats[difficulty]) {
        quizStats.difficultyStats[difficulty] = { total: 0, correct: 0, successRate: 0 };
    }
    const stats = quizStats.difficultyStats[difficulty];
    stats.total++;
    if (isCorrect) stats.correct++;
    stats.successRate = (stats.correct / stats.total) * 100;
}

function arraysEqual(a, b) {
    return Array.isArray(a) && Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadQuestions();
    setupEventListeners();
});

function setupEventListeners() {
    // Welcome screen buttons
    document.getElementById('start-button').addEventListener('click', startQuiz);
    document.getElementById('return-button').addEventListener('click', returnToHome);
    document.getElementById('continue-button').addEventListener('click', startQuestions);

    // Quiz screen buttons
    document.getElementById('validate-btn').addEventListener('click', validateAnswer);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);

    // Results screen buttons
    document.getElementById('restart-button').addEventListener('click', restartQuiz);
    document.getElementById('export-pdf-button').addEventListener('click', exportPDF);
    document.getElementById('export-json-button').addEventListener('click', exportResults);
    document.getElementById('reset-progress-button').addEventListener('click', resetProgress);
    document.getElementById('revision-mode-button').addEventListener('click', enableRevisionMode);

    // Settings
    document.getElementById('save-settings-button').addEventListener('click', saveSettings);
}

function enableRevisionMode() {
    // Disable timer and scoring
    clearInterval(timer);
    document.querySelector('.progress').style.display = 'none';
    document.getElementById('timer').style.display = 'none';

    // Show all explanations
    questions.forEach((question, index) => {
        if (question.explanation) {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'alert alert-info mt-3';
            explanationDiv.innerHTML = `<strong>Question ${index + 1}:</strong> ${question.explanation}`;
            document.getElementById('detailed-results').appendChild(explanationDiv);
        }
    });
}

function exportResults() {
    const results = {
        score,
        totalQuestions: questions.length,
        totalPoints,
        answers: userAnswers,
        stats: quizStats,
        timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}