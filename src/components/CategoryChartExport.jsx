import { useEffect, useRef } from 'react';
import { getCategoryColor } from '../utils/categoryConfig';
import { useCurrency } from '../context/CurrencyContext';

const CategoryChartExport = ({ categoryBreakdown, onCanvasReady }) => {
    const { formatCurrency: fc } = useCurrency();
    const canvasRef = useRef(null);
    const totalSpend = categoryBreakdown.reduce((s, c) => s + c.amount, 0);

    const themeColors = {
        bg: '#0a0e1a',
        text: '#e4e4e7',
        textSecondary: '#a1a1aa',
        border: '#27272a',
    };

    useEffect(() => {
        if (!canvasRef.current || !categoryBreakdown.length) return;

        const canvas = canvasRef.current;
        const width = 1200;
        const height = 800;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Background
        ctx.fillStyle = themeColors.bg;
        ctx.fillRect(0, 0, width, height);

        // Header
        ctx.fillStyle = themeColors.text;
        ctx.font = 'bold 32px Arial';
        ctx.fillText('Spending by Category', 40, 50);

        ctx.font = '16px Arial';
        ctx.fillStyle = themeColors.textSecondary;
        ctx.fillText(
            new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) +
            ' — Actual spending breakdown',
            40,
            85
        );

        // Draw Pie Chart
        const centerX = 320;
        const centerY = 380;
        const radius = 140;

        let currentAngle = -Math.PI / 2;
        const total = totalSpend;

        categoryBreakdown.forEach((item) => {
            const sliceAngle = (item.amount / total) * 2 * Math.PI;

            // Draw pie slice
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(centerX, centerY);
            ctx.fillStyle = getCategoryColor(item.category);
            ctx.fill();

            // Draw border
            ctx.strokeStyle = themeColors.bg;
            ctx.lineWidth = 2;
            ctx.stroke();

            currentAngle += sliceAngle;
        });

        // Draw center circle for donut effect
        ctx.beginPath();
        ctx.arc(centerX, centerY, 70, 0, 2 * Math.PI);
        ctx.fillStyle = themeColors.bg;
        ctx.fill();

        // Total Spending
        ctx.font = '12px Arial';
        ctx.fillStyle = themeColors.textSecondary;
        ctx.textAlign = 'center';
        ctx.fillText('TOTAL SPENDING', centerX, centerY - 20);

        ctx.font = 'bold 40px JetBrains Mono, monospace';
        ctx.fillStyle = themeColors.text;
        ctx.fillText(fc(totalSpend), centerX, centerY + 30);

        // Legend
        const legendX = 600;
        let legendY = 120;
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';

        categoryBreakdown.forEach((item) => {
            // Color box
            ctx.fillStyle = getCategoryColor(item.category);
            ctx.fillRect(legendX, legendY - 12, 16, 16);

            // Category name
            ctx.fillStyle = themeColors.text;
            ctx.font = '16px Arial';
            ctx.fillText(item.category, legendX + 28, legendY);

            // Amount
            ctx.fillStyle = themeColors.textSecondary;
            ctx.font = '14px JetBrains Mono, monospace';
            ctx.textAlign = 'right';
            ctx.fillText(fc(item.amount), width - 60, legendY);

            // Percentage
            ctx.fillText(item.percentage + '%', width - 20, legendY);

            ctx.textAlign = 'left';
            legendY += 50;
        });

        // Footer
        ctx.font = '12px Arial';
        ctx.fillStyle = themeColors.textSecondary;
        ctx.textAlign = 'right';
        ctx.fillText('SpendLens • Exported ' + new Date().toLocaleDateString('en-IN'), width - 40, height - 20);

        // Call callback when ready
        if (onCanvasReady) {
            onCanvasReady(canvas);
        }
    }, [categoryBreakdown, fc]);

    return <canvas ref={canvasRef} style={{ display: 'none' }} />;
};

export default CategoryChartExport;
