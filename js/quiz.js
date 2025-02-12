// State variables
let categories = [];
let currentCategory = null;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft;
let userAnswers = [];
let totalPoints = 0;
let currentPoints = 0;

// Progress tracking
let quizProgress = {
    highScore: 0,
    gamesPlayed: 0,
    totalCorrectAnswers: 0,
    categoryScores: {} // Track scores per category
};

// Settings
let quizSettings = {
    shuffleOptions: true,
    enableSound: true,
    enableParticles: true,
    autoNext: false,
    autoNextDelay: 3
};

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('quizSettings');
    const savedProgress = localStorage.getItem('quizProgress');

    if (savedSettings) {
        quizSettings = { ...quizSettings, ...JSON.parse(savedSettings) };
        document.getElementById('shuffleOptions').checked = quizSettings.shuffleOptions;
        document.getElementById('enableSound').checked = quizSettings.enableSound;
        document.getElementById('enableParticles').checked = quizSettings.enableParticles;
        document.getElementById('autoNext').checked = quizSettings.autoNext;
        document.getElementById('autoNextDelay').value = quizSettings.autoNextDelay;
    }

    if (savedProgress) {
        quizProgress = JSON.parse(savedProgress);
    }
}

// Load categories and questions from JSON
async function loadCategories() {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        categories = data.categories;
        displayCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function displayCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = categories.map(category => `
        <div class="col-md-4">
            <div class="card category-card h-100" onclick="selectCategory('${category.id}')">
                <div class="card-body text-center">
                    <i class="fa-solid fa-${category.icon}"></i>
                    <h5 class="card-title">${category.name}</h5>
                    <div class="category-stats">
                        <small>Meilleur score: ${getHighScoreForCategory(category.id)}</small>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function getHighScoreForCategory(categoryId) {
    return quizProgress.categoryScores?.[categoryId]?.highScore || 0;
}

function selectCategory(categoryId) {
    currentCategory = categories.find(c => c.id === categoryId);
    questions = currentCategory.questions;
    document.querySelector('.category-title').textContent = currentCategory.name;
    document.getElementById('total-questions').textContent = questions.length;
    startQuiz();
}

// Quiz navigation functions
function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    //totalPoints = 0;
    currentPoints = 0;
    userAnswers = [];
    transitionScreens('welcome-screen', 'instructions-screen');
}

function hideScreen(screenId) {
    document.getElementById(screenId).classList.add('d-none');
}

function showScreen(screenId) {
    const screen = document.getElementById(screenId);
    screen.classList.remove('d-none');
    void screen.offsetWidth;
    screen.classList.add('fade-enter');
    setTimeout(() => {
        screen.classList.remove('fade-enter');
        screen.style.opacity = '1';  // <-- Ajoute cette ligne
    }, 50);
}

function transitionScreens(hideId, showId) {
    const currentScreen = document.getElementById(hideId);
    currentScreen.style.opacity = '0';
    setTimeout(() => {
        hideScreen(hideId);
        showScreen(showId);
    }, 500);
}

function returnToHome() {
    transitionScreens('instructions-screen', 'welcome-screen');
}

function startQuestions() {
    document.getElementById('points-display').style.display = 'block'; // Ou 'inline', 'inline-block' en fonction du contexte
    transitionScreens('instructions-screen', 'quiz-screen');
    loadQuestion();
}

// Question handling
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
    
document.getElementById('validate-btn').classList.remove('d-none');
document.getElementById('validate-btn').disabled = true; // Désactiver jusqu'à ce qu'une option soit sélectionnée
document.getElementById('next-btn').classList.add('d-none'); // Cacher le bouton "Suivant"

    resetTimer();
    updateValidateButton();
}

function getShuffledOptions(question) {
    const options = [];
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach(letter => {
        if (question[`${letter}`]) {
            options.push({ letter, text: question[`${letter}`] });
        }
    });
    return quizSettings.shuffleOptions ? shuffleArray(options) : options;
}

function toggleOption(button) {
    const question = questions[currentQuestionIndex];

    if (question.correct.length === 1) {
        document.querySelectorAll('.option-btn.selected').forEach(btn =>
            btn.classList.remove('selected'));
    }
    button.classList.toggle('selected');

    // Activer ou désactiver le bouton "Valider"
    updateValidateButton();
}

function updateValidateButton() {
    const validateBtn = document.getElementById('validate-btn');
    validateBtn.disabled = !document.querySelector('.option-btn.selected');
}

function validateAnswer() {
    clearInterval(timer);
    const question = questions[currentQuestionIndex];
    const selectedOptions = Array.from(document.querySelectorAll('.option-btn.selected'))
        .map(btn => btn.getAttribute('data-option'));

    const isCorrect = arraysEqual(selectedOptions.sort(), question.correct.sort());
    userAnswers[currentQuestionIndex] = selectedOptions;

    if (isCorrect) {
    score++;  // Ajoute un point pour chaque bonne réponse
    const timeBonus = calculateTimeBonus();  // Calcule un bonus en fonction du temps restant
    totalPoints += timeBonus;  // Ajoute le bonus de temps au total des points
    updatePoints(timeBonus);  // Mettez à jour l'affichage des points (si nécessaire)
    playSound('correct-sound');
     } else {
    playSound('wrong-sound');
     }

    showAnswerFeedback();
    updateNavigationButtons();

    if (quizSettings.autoNext && currentQuestionIndex < questions.length - 1) {
        setTimeout(nextQuestion, quizSettings.autoNextDelay * 1000);
        document.getElementById("next-btn").classList.add("d-none");
    }
    
    if (!quizSettings.autoNext) {
        document.getElementById('points-display').style.display = 'none';
        document.getElementById("next-btn").classList.remove("d-none");
    }
}

function showAnswerFeedback() {
    const question = questions[currentQuestionIndex];
    document.querySelectorAll('.option-btn').forEach(btn => {
        const option = btn.getAttribute('data-option');
        if (question.correct.includes(option)) {
            btn.classList.add('correct');
        } else if (btn.classList.contains('selected')) {
            btn.classList.add('incorrect');
        }
        btn.disabled = true;
    });
}

function updateNavigationButtons() {
    document.getElementById('validate-btn').classList.add('d-none');
    const nextBtn = document.getElementById('next-btn');
    nextBtn.classList.remove('d-none');
    nextBtn.textContent = currentQuestionIndex === questions.length - 1 ?
        'Voir le résultat' : 'Suivant';
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        showResults();
    }
}

// Timer functions
function resetTimer() {
    timeLeft = 120;
    if (timer) clearInterval(timer);
    timer = setInterval(updateTimer, 1000);
    updateTimer();
}

function updateTimer() {
    const timerElement = document.getElementById('timer');
    timerElement.textContent = `${timeLeft}s`;

    const progressBar = document.querySelector('.progress-bar');
    const progressPercentage = (timeLeft / 120) * 100;
    progressBar.style.width = `${progressPercentage}%`;

    if (timeLeft >= 1 && timeLeft <= 10) {
    timerElement.classList.add('timer-warning');
    playSound('tick-sound');
     } else {
    timerElement.classList.remove('timer-warning');
    }

    if (timeLeft <= 0) {
        clearInterval(timer);
        validateAnswer();
    }

    timeLeft--;
}

// Results handling
function showResults() {
    transitionScreens('quiz-screen', 'results-screen');
    updateResultsDisplay();
    updateProgress();
}

function updateResultsDisplay() {
    document.getElementById('final-score').textContent = score;
    document.getElementById('max-score').textContent = questions.length;
    document.getElementById('total-points').textContent = totalPoints;
    document.getElementById('score-progress').style.width =
        `${(score / questions.length) * 100}%`;

    const detailedResults = document.getElementById('detailed-results');
    detailedResults.innerHTML = questions.map((question, index) => {
        const isCorrect = arraysEqual(userAnswers[index].sort(), question.correct.sort());
        return `
            <div class="question-review ${isCorrect ? 'correct' : 'incorrect'}">
                <h5>Question ${index + 1}</h5>
                <p>${question.question}</p>
                <p><strong>Votre réponse:</strong> ${userAnswers[index].map(opt =>
                    question[`${opt}`]).join(', ')}</p>
                <p><strong>Bonne réponse:</strong> ${question.correct.map(opt =>
                    question[`${opt}`]).join(', ')}</p>
            </div>
        `;
    }).join('');
}

function updateProgress() {
    if (!quizProgress.categoryScores[currentCategory.id]) {
        quizProgress.categoryScores[currentCategory.id] = {
            highScore: 0,
            gamesPlayed: 0,
            totalCorrectAnswers: 0
        };
    }

    const categoryProgress = quizProgress.categoryScores[currentCategory.id];
    categoryProgress.gamesPlayed++;
    categoryProgress.totalCorrectAnswers += score;
    if (score > categoryProgress.highScore) {
        categoryProgress.highScore = score;
    }

    quizProgress.gamesPlayed++;
    quizProgress.totalCorrectAnswers += score;
    if (score > quizProgress.highScore) {
        quizProgress.highScore = score;
    }

    localStorage.setItem('quizProgress', JSON.stringify(quizProgress));
}

// Export functions
function exportPDF() {
    const { jsPDF } = window.jspdf;
const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
});

const pageWidth = doc.internal.pageSize.getWidth();
const margin = 20;

// Ajouter un logo (Assurez-vous que l'image est accessible)
const logoUrl = 'infas.png'; // Remplacez par le chemin correct de votre logo
const logoWidth = 30, logoHeight = 30;

const addLogoAndTitle = (callback) => {
    const img = new Image();
    img.src = logoUrl;
    img.onload = () => {
        //doc.addImage(img, 'PNG', (pageWidth / 2) - (logoWidth / 2), margin, logoWidth, logoHeight);
        callback();
    };
};

const generatePDF = () => {
    // Titre centré
    doc.setFont("helvetica", "normal");
    doc.setFontSize(24);
    doc.setTextColor(33, 150, 243);
    doc.text("Résultats du Quiz", pageWidth / 2, margin + 40, { align: "center" });

    // Informations générales
    doc.setFontSize(16);
    doc.setTextColor(70, 70, 70);
    doc.text(`Catégorie: ${currentCategory.name}`, pageWidth / 2, margin + 55, { align: "center" });

    // Score
    doc.setFontSize(14);
    doc.text(`Score: ${score}/${questions.length}`, pageWidth / 2, margin + 65, { align: "center" });
    doc.text(`Points totaux: ${totalPoints}`, pageWidth / 2, margin + 75, { align: "center" });

    // Espacement avant le tableau
    let startY = margin + 85;

    // Générer les données du tableau
    let tableData = questions.map((question, index) => {
    const isCorrect = arraysEqual(userAnswers[index].sort(), question.correct.sort());
    return [
        `Q${index + 1}`, // Numéro de la question
        doc.splitTextToSize(question.question.replace(/<[^>]*>/g, ''), 60),
        doc.splitTextToSize(userAnswers[index].map(opt => question[`${opt}`]).join(', '), 40),
        doc.splitTextToSize(question.correct.map(opt => question[`${opt}`]).join(', '), 40),
        isCorrect ? "CORRECT" : "INCORRECT" // État en majuscules
    ];
});

    // Appliquer un tableau avec un fond coloré
    doc.autoTable({
    startY: startY,
    head: [["#", "Question", "Votre réponse", "Bonne réponse", "État"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [33, 150, 243], textColor: 255, halign: "center" },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
        4: { cellWidth: 25, halign: "center" } // Largeur ajustée pour "État"
    },
    didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
            if (data.cell.text[0] === "CORRECT") {
                data.cell.styles.fontSize = 14;
                data.cell.styles.textColor = [0, 200, 0]; // Vert
                data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.text[0] === "INCORRECT") {
                data.cell.styles.fontSize = 14;
                data.cell.styles.textColor = [200, 0, 0]; // Rouge
                data.cell.styles.fontStyle = 'bold';
            }
        }
    }
});

    // Sauvegarde du fichier PDF
    doc.save(`quiz-results-${currentCategory.id}-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Charger le logo avant de générer le PDF
addLogoAndTitle(generatePDF);
}


// Utility functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function arraysEqual(a, b) {
    return Array.isArray(a) && Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

function calculateTimeBonus() {
    return Math.max(10, Math.floor((timeLeft / 120) * 100));
}

function playSound(soundId) {
    if (quizSettings.enableSound) {
        const sound = document.getElementById(soundId);
        sound.currentTime = 0;
        sound.play().catch(error => console.warn('Error playing sound:', error));
    }
}

function resetProgress() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser votre progression ? Cette action est irréversible.')) {
        quizProgress = {
            highScore: 0,
            gamesPlayed: 0,
            totalCorrectAnswers: 0,
            categoryScores: {}
        };
        //document.getElementById('total-points').textContent = 0;
        localStorage.removeItem('quizProgress');
        alert('Progression réinitialisée avec succès !');
        document.getElementById('points-display').style.display = 'none';
        location.reload();
        //restartQuiz();
    }
}

function saveSettings() {
    quizSettings.shuffleOptions = document.getElementById('shuffleOptions').checked;
    quizSettings.enableSound = document.getElementById('enableSound').checked;
    quizSettings.enableParticles = document.getElementById('enableParticles').checked;
    quizSettings.autoNext = document.getElementById('autoNext').checked;
    quizSettings.autoNextDelay = parseInt(document.getElementById('autoNextDelay').value);
    localStorage.setItem('quizSettings', JSON.stringify(quizSettings));

    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    modal.hide();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM chargé, démarrage de l'initialisation...");
    document.getElementById('points-display').style.display = 'none';
    loadSettings();
    loadCategories();
    setupEventListeners();
});

function restartQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    //totalPoints = 0;
    currentPoints = 0;
    
    document.getElementById('current-points').textContent = '0';
    document.getElementById('points-display').style.display = 'none';
    transitionScreens('results-screen', 'welcome-screen');
   updateNavigationButtons();
}

function createParticles() {
    tsParticles.load("points-particles", {
        particles: {
            number: {
                value: 30,
                density: {
                    enable: true,
                    area: 800
                }
            },
            color: {
                value: "#ffc107" // warning color
            },
            shape: {
                type: "star"
            },
            opacity: {
                value: 0.8,
                random: true,
                animation: {
                    enable: true,
                    speed: 1,
                    minimumValue: 0.1,
                    sync: false
                }
            },
            size: {
                value: 5,
                random: true
            },
            move: {
                enable: true,
                speed: 3,
                direction: "top",
                random: true,
                straight: false,
                outModes: {
                    default: "out"
                }
            }
        },
        interactivity: {
            detectsOn: "window",
            events: {
                onHover: {
                    enable: true,
                    mode: "repulse"
                }
            }
        },
        detectRetina: true
    });

    // Masquer les particules après 3 secondes en modifiant l'opacité
    setTimeout(() => {
        tsParticles.load("points-particles", {
            particles: {
                opacity: {
                    value: 0, // Rendre les particules invisibles
                    animation: {
                        enable: false // Désactiver l'animation de l'opacité
                    }
                }
            }
        });
    }, 3000); // 3000ms = 3 secondes
}

// Points and Animation Functions
function updatePoints(points) {
    currentPoints += points;
    //totalPoints += points;

    // Update points display
    const pointsValue = document.querySelector('.points-value');
    const pointsBadge = document.querySelector('.points-badge');
    const currentPointsDisplay = document.getElementById('current-points');

    pointsValue.textContent = totalPoints;
    currentPointsDisplay.textContent = currentPoints;

    // Animate points value
    pointsValue.classList.add('points-added');
    pointsBadge.classList.add('points-updated');

    // Create floating points popup
    const popup = document.createElement('div');
    popup.className = 'points-popup';
    popup.textContent = `+${points}`;
    pointsValue.parentElement.appendChild(popup);

    // Play sound effect
    if (quizSettings.enableSound) {
        const pointsSound = document.getElementById('points-sound');
        pointsSound.currentTime = 0;
        pointsSound.play().catch(error => {
            console.warn('Error playing points sound:', error);
        });
    }

    // Remove animation classes
    setTimeout(() => {
        pointsValue.classList.remove('points-added');
        pointsBadge.classList.remove('points-updated');
        popup.remove();
    }, 1000);

    // Trigger particle effect
    if (quizSettings.enableParticles) {
        createParticles();
    }
}

// Event listeners setup
function setupEventListeners() {
    document.getElementById('return-button').addEventListener('click', returnToHome);
    document.getElementById('continue-button').addEventListener('click', startQuestions);
    document.getElementById('validate-btn').addEventListener('click', validateAnswer);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
    document.getElementById('restart-button').addEventListener('click', restartQuiz);
    document.getElementById('export-pdf-button').addEventListener('click', exportPDF);
    document.getElementById('reset-progress-button').addEventListener('click', resetProgress);
    document.getElementById('save-settings-button').addEventListener('click', saveSettings);
}