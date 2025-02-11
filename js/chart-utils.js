// Chart configuration and utility functions
const chartColors = {
    primary: '#0d6efd',
    success: '#198754',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#0dcaf0'
};

function createPerformanceChart(ctx, data) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Score',
                data: data.scores,
                borderColor: chartColors.primary,
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Progression des scores'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function createCategoryChart(ctx, data) {
    return new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.categories,
            datasets: [{
                label: 'Taux de réussite par catégorie',
                data: data.successRates,
                backgroundColor: `${chartColors.success}40`,
                borderColor: chartColors.success,
                pointBackgroundColor: chartColors.success
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function createTimeChart(ctx, data) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.questions,
            datasets: [{
                label: 'Temps moyen (secondes)',
                data: data.times,
                backgroundColor: chartColors.warning
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Temps moyen par question'
                }
            }
        }
    });
}

function generateQRCode(data, element) {
    const qr = new QRCode(element, {
        text: JSON.stringify(data),
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function exportChartAsPNG(chart) {
    return chart.toBase64Image();
}

// Export functions
export {
    createPerformanceChart,
    createCategoryChart,
    createTimeChart,
    generateQRCode,
    exportChartAsPNG,
    chartColors
};
