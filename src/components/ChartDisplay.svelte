<script lang="ts">
  interface CurveChart {
    id: number;
    name: string;
    curves: Array<{ name: string }>;
  }

  interface ChartDataPoint {
    time: number;
    values: number[];
  }

  interface Props {
    charts: CurveChart[];
    chartData: Map<number, ChartDataPoint[]>;
    width?: number;
    height?: number;
    showLegend?: boolean;
    colors?: string[];
  }

  let { 
    charts,
    chartData,
    width = 600,
    height = 200,
    showLegend = true,
    colors = ['#fbbf24', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444']
  }: Props = $props();

  // 生成SVG路径
  function generateSVGPath(data: ChartDataPoint[], curveIndex: number, chartWidth: number, chartHeight: number) {
    if (!data || data.length === 0) return '';
    
    const padding = 40;
    const innerWidth = chartWidth - padding * 2;
    const innerHeight = chartHeight - padding * 2;
    
    // 计算数据范围
    const values = data.map(d => d.values[curveIndex] || 0);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    
    // 生成路径点
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * innerWidth;
      const y = padding + innerHeight - ((d.values[curveIndex] - minValue) / valueRange) * innerHeight;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }
</script>

<div class="space-y-4">
  {#each charts as chart (chart.id)}
    <div class="bg-black rounded border border-gray-700 p-4">
      <!-- 图表标题 -->
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-sm text-gray-300">{chart.name}</h3>
      </div>

      <!-- SVG图表 -->
      <div class="bg-gray-900 rounded p-2">
        <svg {width} {height} viewBox="0 0 {width} {height}" class="overflow-visible w-full">
          <!-- 网格线 -->
          {#each Array(10) as _, i}
            <line x1="40" y1={20 + i * 16} x2={width - 40} y2={20 + i * 16} stroke="#374151" stroke-width="0.5" opacity="0.3"/>
          {/each}
          {#each Array(13) as _, i}
            <line x1={40 + i * ((width - 80) / 12)} y1="20" x2={40 + i * ((width - 80) / 12)} y2={height - 20} stroke="#374151" stroke-width="0.5" opacity="0.3"/>
          {/each}

          <!-- 坐标轴 -->
          <line x1="40" y1={height - 20} x2={width - 40} y2={height - 20} stroke="#6b7280" stroke-width="1"/>
          <line x1="40" y1="20" x2="40" y2={height - 20} stroke="#6b7280" stroke-width="1"/>

          <!-- 曲线 -->
          {#if chartData.has(chart.id)}
            {@const data = chartData.get(chart.id)}
            {#each chart.curves as curve, curveIndex}
              <path
                d={generateSVGPath(data, curveIndex, width, height)}
                fill="none"
                stroke={colors[curveIndex % colors.length]}
                stroke-width="2"
              />
            {/each}
          {/if}

          <!-- Y轴标签 -->
          <text x="30" y="25" fill="#9ca3af" font-size="10" text-anchor="end">20</text>
          <text x="30" y="60" fill="#9ca3af" font-size="10" text-anchor="end">15</text>
          <text x="30" y="100" fill="#9ca3af" font-size="10" text-anchor="end">10</text>
          <text x="30" y="140" fill="#9ca3af" font-size="10" text-anchor="end">5</text>
          <text x="30" y={height - 20} fill="#9ca3af" font-size="10" text-anchor="end">0</text>

          <!-- X轴标签 -->
          <text x="80" y={height - 5} fill="#9ca3af" font-size="10" text-anchor="middle">0s</text>
          <text x={width * 0.33} y={height - 5} fill="#9ca3af" font-size="10" text-anchor="middle">3s</text>
          <text x={width * 0.53} y={height - 5} fill="#9ca3af" font-size="10" text-anchor="middle">6s</text>
          <text x={width * 0.73} y={height - 5} fill="#9ca3af" font-size="10" text-anchor="middle">9s</text>
          <text x={width - 40} y={height - 5} fill="#9ca3af" font-size="10" text-anchor="middle">12s</text>
        </svg>

        <!-- 图例 -->
        {#if showLegend}
          <div class="flex flex-wrap gap-4 mt-2 px-2">
            {#each chart.curves as curve, index}
              <div class="flex items-center gap-1">
                <div class="w-3 h-0.5" style="background-color: {colors[index % colors.length]}"></div>
                <span class="text-xs text-gray-300">{curve.name}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>