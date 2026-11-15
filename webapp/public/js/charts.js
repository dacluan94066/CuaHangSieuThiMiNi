import { money, number } from './format.js';

let chartPromise;
export function loadChartLibrary() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!chartPromise) {
    chartPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js';
      script.referrerPolicy = 'no-referrer';
      const timer = setTimeout(() => { script.remove(); reject(new Error('CDN chưa sẵn sàng')); }, 7000);
      script.onload = () => { clearTimeout(timer); if (window.Chart) resolve(window.Chart); else reject(new Error('Không tải được Chart.js')); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Không tải được Chart.js')); };
      document.head.append(script);
    }).catch(error => { chartPromise = undefined; throw error; });
  }
  return chartPromise;
}

export async function createChart(canvas, type, labels, values, { currency = false, horizontal = false } = {}) {
  const Chart = await loadChartLibrary();
  if (!canvas.isConnected) return null;
  const doughnut = type === 'doughnut';
  return new Chart(canvas, {
    type,
    data: { labels, datasets: [{ label: currency ? 'Doanh thu thực thu' : 'Số lượng', data: values, backgroundColor: doughnut ? ['#2458d6', '#5b8ff9', '#48b5a3', '#efb55a', '#9578d3', '#ea8392'] : '#3970e6', borderRadius: doughnut ? 0 : 5, borderWidth: 0, maxBarThickness: horizontal ? 20 : 50 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 350 },
      indexAxis: horizontal ? 'y' : 'x', cutout: doughnut ? '72%' : undefined,
      plugins: {
        legend: { display: doughnut, position: 'bottom', labels: { usePointStyle: true, boxWidth: 7, padding: 16, color: '#526078', font: { family: 'Segoe UI, sans-serif', size: 10 } } },
        tooltip: { callbacks: { label: context => `${context.label}: ${currency ? money(context.raw) : number(context.raw)}` } }
      },
      scales: doughnut ? {} : {
        x: { beginAtZero: horizontal, grid: { display: horizontal, color: '#f0f3f8' }, border: { display: false }, ticks: { color: '#758199', font: { size: 10 }, ...(horizontal ? { precision: 0 } : {}) } },
        y: { beginAtZero: true, grid: { display: !horizontal, color: '#edf1f6' }, border: { display: false }, ticks: { color: '#758199', font: { size: 10 }, ...(currency ? { callback: value => `${number(value / 1000)}k` } : { precision: 0 }) } }
      }
    }
  });
}
