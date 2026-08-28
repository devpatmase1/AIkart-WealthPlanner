/* ==========================================================================
   WealthPlanner - High-Precision Zero-Dependency Chart Engine (Audit Hardened)
   ========================================================================== */

const ChartEngine = {

  // 1. Standalone Doughnut Chart (with 0-value placeholder state)
  drawDoughnut(canvasId, labels, values, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 220;
    const height = rect.height || 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.65;

    ctx.clearRect(0, 0, width, height);

    const total = values.reduce((a, b) => a + b, 0);
    
    // Empty Slate Ring
    if (total === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.arc(centerX, centerY, innerRadius, 2 * Math.PI, 0, true);
      ctx.closePath();
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();

      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Enter Values', centerX, centerY);
      return;
    }

    let startAngle = -Math.PI / 2;

    values.forEach((val, idx) => {
      if (val <= 0) return;
      const sliceAngle = (val / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = colors[idx] || '#6366f1';
      ctx.fill();

      startAngle = endAngle;
    });
  },

  // 2. Standalone Stacked Horizontal Bar Chart (with 0-value placeholder)
  drawStackedBar(canvasId, fixedVal, surplusVal) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 500;
    const height = rect.height || 80;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const total = fixedVal + surplusVal;
    const barHeight = 22;
    const barY = 16;

    if (total <= 0) {
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(0, barY, width, barHeight, 6);
      ctx.fill();

      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Monthly Outflow Baseline: 0', 0, barY + barHeight + 18);
      return;
    }

    const fixedWidth = (fixedVal / total) * width;
    const surplusWidth = (surplusVal / total) * width;

    if (fixedWidth > 0) {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(0, barY, fixedWidth, barHeight, [6, 0, 0, 6]);
      ctx.fill();
    }

    if (surplusWidth > 0) {
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(fixedWidth, barY, surplusWidth, barHeight, [0, 6, 6, 0]);
      ctx.fill();
    }

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Living Outflows: ${Math.round(fixedVal).toLocaleString()}`, 0, barY + barHeight + 20);
    ctx.fillStyle = '#059669';
    ctx.fillText(`Investable Surplus: ${Math.round(surplusVal).toLocaleString()}`, Math.min(width - 160, fixedWidth), barY + barHeight + 20);
  },

  // 3. Standalone Scatter Risk vs Return Chart
  drawScatter(canvasId, items) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 600;
    const height = rect.height || 260;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padding = 40;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    for (let x = 0; x <= 10; x += 2) {
      const px = padding + (x / 10) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(px, padding);
      ctx.lineTo(px, height - padding);
      ctx.stroke();

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Risk ${x}`, px - 12, height - padding + 18);
    }

    for (let y = 0; y <= 30; y += 10) {
      const py = (height - padding) - (y / 30) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(padding, py);
      ctx.lineTo(width - padding, py);
      ctx.stroke();

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${y}%`, 10, py + 4);
    }

    items.forEach(item => {
      const px = padding + (item.riskNum / 10) * (width - 2 * padding);
      const py = (height - padding) - (item.returnNum / 30) * (height - 2 * padding);

      ctx.beginPath();
      ctx.arc(px, py, 7, 0, 2 * Math.PI);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();

      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(item.name.split(' ')[0], px + 10, py + 4);
    });
  },

  // 4. Standalone SIP Growth Line Chart
  drawLineChart(canvasId, labels, nominal, real, invested) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 600;
    const height = rect.height || 280;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padding = 45;
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...nominal, ...real, ...invested, 1000);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const yVal = (maxVal / 4) * i;
      const py = (height - padding) - (i / 4) * (height - 2 * padding);

      ctx.beginPath();
      ctx.moveTo(padding, py);
      ctx.lineTo(width - padding, py);
      ctx.stroke();

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${Math.round(yVal / 1000)}k`, 8, py + 4);
    }

    function plotLine(data, color, isDashed = false) {
      if (!data || data.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      if (isDashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);

      data.forEach((val, idx) => {
        const px = padding + (idx / Math.max(1, data.length - 1)) * (width - 2 * padding);
        const py = (height - padding) - (val / maxVal) * (height - 2 * padding);

        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    plotLine(nominal, '#4f46e5');
    plotLine(real, '#059669');
    plotLine(invested, '#94a3b8', true);

    ctx.setLineDash([]);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#4f46e5';
    ctx.fillText('● Nominal Growth', padding, 20);
    ctx.fillStyle = '#059669';
    ctx.fillText('● Real Purchasing Power', padding + 140, 20);
    ctx.fillStyle = '#64748b';
    ctx.fillText('- - Total Invested', padding + 310, 20);
  }
};
