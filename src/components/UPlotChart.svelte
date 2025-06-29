<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface ChartData {
    name: string;
    data: number[];
  }

  interface Props {
    chartId: number;
    chartName: string;
    curves: Array<{ name: string }>;
    dataChart: ChartData[];
    width?: number;
    height?: number;
  }

  let { 
    chartId,
    chartName,
    curves,
    dataChart = $bindable(),
    width = 800,
    height = 300
  }: Props = $props();

  let chartContainer: HTMLDivElement;
  let uplotInstance: any = null;
  let uPlot: any = null;

  // 颜色配置
  const colors = ['#fbbf24', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

  // 动态加载uPlot
  async function loadUPlot() {
    if (typeof window !== 'undefined') {
      // 加载uPlot库
      const script = document.createElement('script');
      script.src = '/lib/uPlot.iife.js';
      script.onload = () => {
        uPlot = (window as any).uPlot;
        initChart();
      };
      document.head.appendChild(script);

      // 加载CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/lib/uPlot.min.css';
      document.head.appendChild(link);
    }
  }

  // 创建uPlot配置
  function createUPlotConfig() {
    if (!uPlot) return null;

    const series: any[] = [
      {
        label: "时间",
        stroke: "transparent",
        fill: "transparent"
      }
    ];

    // 为每条曲线添加series配置
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
          fill: colors[index % colors.length]
        }
      });
    });

    const config = {
      title: chartName,
      width: width,
      height: height,
      series: series,
      axes: [
        {
          label: "时间 (秒)",
          stroke: "#9ca3af",
          grid: {
            show: true,
            stroke: "#374151",
            width: 1
          },
          ticks: {
            show: true,
            stroke: "#6b7280"
          }
        },
        {
          label: "数值",
          stroke: "#9ca3af",
          grid: {
            show: true,
            stroke: "#374151",
            width: 1
          },
          ticks: {
            show: true,
            stroke: "#6b7280"
          },
          scale: "y",
          side: 3
        }
      ],
      scales: {
        x: {
          time: false,
          auto: true,
          range: (u: any, dataMin: number, dataMax: number) => {
            // 固定显示窗口为最新100个数据点
            const data = u.data[0];
            if (data && data.length > 100) {
              const start = data[data.length - 100];
              const end = data[data.length - 1];
              return [start, end];
            }
            return [dataMin, dataMax];
          }
        },
        y: {
          auto: true,
          range: (u: any, dataMin: number, dataMax: number) => {
            // y轴根据数据范围自动调整刻度
            const padding = (dataMax - dataMin) * 0.1;
            return [dataMin - padding, dataMax + padding];
          }
        }
      },
      cursor: {
        show: true,
        x: true,
        y: true,
        points: {
          show: true
        },
        drag: {
          setScale: false
        }
      },
      legend: {
        show: true,
        live: true,
        markers: {
          show: true,
          width: 2,
          stroke: (u: any, seriesIdx: number) => colors[(seriesIdx - 1) % colors.length],
          fill: (u: any, seriesIdx: number) => colors[(seriesIdx - 1) % colors.length]
        }
      },
      plugins: []
    };

    return config;
  }

  // 转换数据格式为uPlot格式
  function convertDataForUPlot(chartData: ChartData[]): number[][] {
    if (!chartData || chartData.length === 0) {
      return [[], ...curves.map(() => [])];
    }

    // 查找time数据
    const timeData = chartData.find(item => item.name === 'time');
    if (!timeData || !timeData.data || timeData.data.length === 0) {
      return [[], ...curves.map(() => [])];
    }

    // 提取时间轴数据
    const timeValues = timeData.data;
    
    // 为每条曲线提取数据
    const seriesData = curves.map(curve => {
      const curveData = chartData.find(item => item.name === curve.name);
      if (curveData && curveData.data) {
        return curveData.data;
      }
      return new Array(timeValues.length).fill(0);
    });

    return [timeValues, ...seriesData];
  }

  // 初始化图表
  function initChart() {
    if (!chartContainer || !uPlot) return;

    const config = createUPlotConfig();
    if (!config) return;

    const data = convertDataForUPlot(dataChart);
    
    try {
      uplotInstance = new uPlot(config, data, chartContainer);
    } catch (error) {
      console.error('uPlot初始化失败:', error);
    }
  }

  // 更新图表数据
  function updateChart() {
    if (!uplotInstance) return;

    try {
      const data = convertDataForUPlot(dataChart);
      uplotInstance.setData(data);
    } catch (error) {
      console.error('uPlot数据更新失败:', error);
    }
  }

  // 监听数据变化
  $effect(() => {
    if (uplotInstance && dataChart) {
      updateChart();
    }
  });

  onMount(() => {
    loadUPlot();
  });

  onDestroy(() => {
    if (uplotInstance) {
      try {
        uplotInstance.destroy();
      } catch (error) {
        console.error('uPlot销毁失败:', error);
      }
      uplotInstance = null;
    }
  });
</script>

<div class="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
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
  <div class="bg-gray-900 rounded-lg p-4 border border-gray-600">
    <div bind:this={chartContainer} class="uplot-container w-full h-full"></div>
  </div>

  <!-- 可交互图例 - 显示当前值 -->
  <div class="mt-4 bg-gray-750 rounded-lg p-3 border border-gray-600">
    <div class="flex flex-wrap gap-4">
      {#each curves as curve, index}
        {@const color = colors[index % colors.length]}
        {@const currentValue = dataChart.find(item => item.name === curve.name)?.data?.slice(-1)[0] || 0}
        <div class="flex items-center gap-2 bg-gray-800 rounded px-3 py-2 border border-gray-600">
          <div class="w-3 h-3 rounded-full" style="background-color: {color}"></div>
          <span class="text-sm text-gray-300 font-medium">{curve.name}</span>
          <span class="text-xs text-gray-400 font-mono bg-gray-700 px-2 py-1 rounded">
            {currentValue.toFixed(2)}
          </span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  :global(.uplot) {
    background: #111827 !important;
    color: #f3f4f6 !important;
    border-radius: 8px;
  }

  :global(.uplot .u-title) {
    color: #f3f4f6 !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    margin-bottom: 12px !important;
  }

  :global(.uplot .u-legend) {
    background: #1f2937 !important;
    border: 1px solid #374151 !important;
    border-radius: 6px !important;
    padding: 8px !important;
    margin-top: 8px !important;
  }

  :global(.uplot .u-legend th) {
    color: #d1d5db !important;
    font-weight: 500 !important;
    padding: 4px 8px !important;
  }

  :global(.uplot .u-legend td) {
    color: #9ca3af !important;
    font-family: 'Courier New', monospace !important;
    padding: 4px 8px !important;
  }

  :global(.uplot .u-cursor-pt) {
    border-width: 2px !important;
  }

  :global(.uplot .u-axis) {
    color: #9ca3af !important;
  }

  :global(.uplot .u-axis text) {
    fill: #9ca3af !important;
  }

  :global(.uplot .u-cursor-x) {
    border-right: 1px dashed #fbbf24 !important;
  }

  :global(.uplot .u-cursor-y) {
    border-bottom: 1px dashed #fbbf24 !important;
  }

  .uplot-container {
    min-height: 300px;
  }
</style>