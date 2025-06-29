<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import uPlot from 'uplot';

  interface ChartData {
    name: string;
    data: number[][];
  }

  interface Props {
    chartId: number;
    chartName: string;
    curves: Array<{ name: string }>;
    data: ChartData[];
    width?: number;
    height?: number;
    maxDataPoints?: number;
  }

  let {
    chartId,
    chartName,
    curves,
    data = [],
    width = 800,
    height = 300,
    maxDataPoints = 100
  }: Props = $props();

  let chartContainer: HTMLDivElement;
  let uplotInstance: uPlot | null = null;
  let currentData: (number | null)[][] = [];

  // 颜色配置
  const colors = ['#fbbf24', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

  // 初始化图表配置
  function createChartConfig(): uPlot.Options {
    const series: uPlot.Series[] = [
      {
        label: "时间",
        stroke: "transparent",
        fill: "transparent"
      }
    ];

    // 为每条曲线添加配置
    curves.forEach((curve, index) => {
      series.push({
        label: curve.name,
        stroke: colors[index % colors.length],
        width: 2,
        fill: "transparent",
        points: {
          show: true,
          size: 4,
          stroke: colors[index % colors.length],
          fill: "#ffffff"
        }
      });
    });

    return {
      title: chartName,
      width,
      height,
      series,
      scales: {
        x: {
          time: false,
          auto: true,
          range: (u, min, max) => {
            // 固定显示窗口为最新100个数据点
            const dataLength = u.data[0].length;
            if (dataLength > maxDataPoints) {
              const start = dataLength - maxDataPoints;
              return [u.data[0][start], u.data[0][dataLength - 1]];
            }
            return [min, max];
          }
        },
        y: {
          auto: true,
          range: (u, min, max) => {
            // y轴根据数据范围自动调整刻度
            const padding = (max - min) * 0.1;
            return [min - padding, max + padding];
          }
        }
      },
      axes: [
        {
          label: "时间 (秒)",
          labelSize: 14,
          labelFont: "600 14px system-ui",
          stroke: "#9ca3af",
          grid: {
            show: true,
            stroke: "#374151",
            width: 1
          }
        },
        {
          label: "数值",
          labelSize: 14,
          labelFont: "600 14px system-ui",
          stroke: "#9ca3af",
          side: 3,
          grid: {
            show: true,
            stroke: "#374151",
            width: 1
          }
        }
      ],
      legend: {
        show: true,
        live: true,
        markers: {
          show: true,
          width: 2,
          stroke: (u, seriesIdx) => colors[(seriesIdx - 1) % colors.length],
          fill: (u, seriesIdx) => colors[(seriesIdx - 1) % colors.length]
        }
      },
      cursor: {
        show: true,
        sync: {
          key: `chart-${chartId}`
        },
        drag: {
          setScale: false
        },
        points: {
          show: true,
          size: 6,
          stroke: (u, seriesIdx) => colors[(seriesIdx - 1) % colors.length],
          fill: "#ffffff"
        }
      },
      hooks: {
        setCursor: [
          (u) => {
            // 鼠标悬停显示数据点详情
            if (u.cursor.idx !== null) {
              const tooltip = document.getElementById(`tooltip-${chartId}`);
              if (tooltip) {
                const x = u.data[0][u.cursor.idx];
                let content = `时间: ${x?.toFixed(3)}s<br>`;
                
                curves.forEach((curve, index) => {
                  const value = u.data[index + 1][u.cursor.idx];
                  if (value !== null && value !== undefined) {
                    content += `${curve.name}: ${value.toFixed(3)}<br>`;
                  }
                });
                
                tooltip.innerHTML = content;
                tooltip.style.display = 'block';
                tooltip.style.left = `${u.cursor.left + 10}px`;
                tooltip.style.top = `${u.cursor.top - 10}px`;
              }
            }
          }
        ]
      }
    };
  }

  // 转换数据格式为uPlot格式
  function convertDataForUPlot(inputData: ChartData[]): (number | null)[][] {
    console.log(`转换图表 ${chartName} 的数据:`, inputData);
    
    // 查找时间数据
    const timeData = inputData.find(d => d.name === 'time');
    if (!timeData || !timeData.data || timeData.data.length === 0) {
      console.log(`图表 ${chartName} 没有找到时间数据`);
      return [[], ...curves.map(() => [])];
    }

    // 提取时间序列
    const timeValues = timeData.data.map(point => point[0]);
    const result: (number | null)[][] = [timeValues];

    // 为每条曲线提取数据
    curves.forEach(curve => {
      const curveData = inputData.find(d => d.name === curve.name);
      if (curveData && curveData.data) {
        const values = curveData.data.map(point => point[1]);
        result.push(values);
      } else {
        // 如果没有找到对应曲线数据，填充null
        result.push(new Array(timeValues.length).fill(null));
      }
    });

    console.log(`图表 ${chartName} 转换后的数据:`, result);
    return result;
  }

  // 更新图表数据
  function updateChart(newData: ChartData[]) {
    if (!uplotInstance) return;

    const convertedData = convertDataForUPlot(newData);
    currentData = convertedData;

    // 实现曲线平滑的左移动画效果
    uplotInstance.setData(convertedData, false);
    
    // 保持曲线连续性，自动滚动到最新数据
    if (convertedData[0].length > maxDataPoints) {
      const start = convertedData[0].length - maxDataPoints;
      const end = convertedData[0].length - 1;
      uplotInstance.setScale('x', {
        min: convertedData[0][start],
        max: convertedData[0][end]
      });
    }
  }

  // 隐藏tooltip
  function hideTooltip() {
    const tooltip = document.getElementById(`tooltip-${chartId}`);
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  onMount(() => {
    if (chartContainer) {
      const config = createChartConfig();
      uplotInstance = new uPlot(config, currentData, chartContainer);
      
      // 添加鼠标离开事件监听
      chartContainer.addEventListener('mouseleave', hideTooltip);
    }
  });

  onDestroy(() => {
    if (uplotInstance) {
      uplotInstance.destroy();
    }
    if (chartContainer) {
      chartContainer.removeEventListener('mouseleave', hideTooltip);
    }
  });

  // 响应式更新数据
  $effect(() => {
    if (data && data.length > 0) {
      updateChart(data);
    }
  });
</script>

<div class="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg relative">
  <!-- 图表标题 -->
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold text-gray-200 flex items-center gap-2">
      <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      {chartName}
    </h3>
    <div class="text-sm text-gray-400">
      {curves.length} 条曲线
    </div>
  </div>

  <!-- uPlot图表容器 -->
  <div class="bg-gray-900 rounded-lg p-4 border border-gray-600 relative">
    <div bind:this={chartContainer} class="uplot-container"></div>
    
    <!-- Tooltip -->
    <div 
      id="tooltip-{chartId}"
      class="absolute bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white shadow-lg pointer-events-none z-10"
      style="display: none;"
    ></div>
  </div>
</div>

<style>
  :global(.uplot) {
    background: transparent !important;
  }
  
  :global(.uplot .u-title) {
    color: #f3f4f6 !important;
    font-size: 16px !important;
    margin-bottom: 10px !important;
  }
  
  :global(.uplot .u-legend) {
    color: #d1d5db !important;
    background: #1f2937 !important;
    border: 1px solid #374151 !important;
    border-radius: 6px !important;
    padding: 8px !important;
    margin-top: 10px !important;
  }
  
  :global(.uplot .u-legend .u-series) {
    color: #f3f4f6 !important;
  }
  
  :global(.uplot .u-legend .u-off > *) {
    opacity: 0.3 !important;
  }
  
  :global(.uplot .u-cursor-pt) {
    border-width: 2px !important;
  }
  
  :global(.uplot .u-select) {
    background: rgba(59, 130, 246, 0.1) !important;
  }
  
  .uplot-container {
    width: 100%;
    height: 100%;
  }
</style>