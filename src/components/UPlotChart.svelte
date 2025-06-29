<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  interface Curve {
    name: string;
  }

  interface Props {
    chartId: number;
    chartName: string;
    curves: Curve[];
    data: number[][];
  }

  let { chartId, chartName, curves, data }: Props = $props();

  let chartContainer: HTMLDivElement;
  let uplot: any = null;
  let uPlot: any = null;

  // 颜色配置
  const colors = [
    '#3b82f6', // 蓝色
    '#ef4444', // 红色
    '#10b981', // 绿色
    '#f59e0b', // 黄色
    '#8b5cf6', // 紫色
    '#f97316', // 橙色
  ];

  // 动态加载uPlot库
  async function loadUPlot() {
    if (typeof window === 'undefined') return;
    
    try {
      // 动态导入uPlot
      const uPlotModule = await import('/lib/uPlot.iife.js');
      uPlot = (window as any).uPlot;
      
      if (!uPlot) {
        console.error('uPlot未能正确加载');
        return;
      }
      
      console.log('uPlot库加载成功');
      initChart();
    } catch (error) {
      console.error('uPlot库加载失败:', error);
    }
  }

  // 初始化图表
  function initChart() {
    if (!uPlot || !chartContainer) return;

    // 清理现有图表
    if (uplot) {
      uplot.destroy();
      uplot = null;
    }

    // 构建series配置
    const series = [
      {
        label: "时间",
        stroke: "transparent",
        fill: "transparent"
      },
      ...curves.map((curve, index) => ({
        label: curve.name,
        stroke: colors[index % colors.length],
        width: 2,
        fill: "transparent",
        points: {
          show: false
        }
      }))
    ];

    // uPlot配置
    const opts = {
      title: chartName,
      width: chartContainer.clientWidth || 800,
      height: 300,
      series: series,
      axes: [
        {
          label: "时间 (秒)",
          labelSize: 12,
          labelFont: "12px monospace",
          stroke: "#9ca3af",
          grid: {
            show: true,
            stroke: "#374151",
            width: 1
          },
          ticks: {
            show: true,
            stroke: "#6b7280",
            width: 1
          }
        },
        {
          label: "数值",
          labelSize: 12,
          labelFont: "12px monospace",
          stroke: "#9ca3af",
          grid: {
            show: true,
            stroke: "#374151",
            width: 1
          },
          ticks: {
            show: true,
            stroke: "#6b7280",
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
          stroke: (u: any, seriesIdx: number) => {
            return series[seriesIdx]?.stroke || "#666";
          },
          fill: (u: any, seriesIdx: number) => {
            return series[seriesIdx]?.stroke || "#666";
          }
        }
      },
      cursor: {
        show: true,
        sync: {
          key: `chart-${chartId}`,
        },
        drag: {
          setScale: false,
        },
        points: {
          show: true,
          size: 6,
          width: 2,
          stroke: (u: any, seriesIdx: number) => {
            return series[seriesIdx]?.stroke || "#666";
          },
          fill: "#1f2937"
        }
      },
      scales: {
        x: {
          time: false,
          auto: true,
          range: (u: any, dataMin: number, dataMax: number) => {
            // 固定显示最新100个数据点的时间窗口
            if (data.length > 100) {
              const latestTime = dataMax;
              const windowSize = data.length > 1 ? (data[data.length - 1][0] - data[Math.max(0, data.length - 100)][0]) : 10;
              return [latestTime - windowSize, latestTime];
            }
            return [dataMin, dataMax];
          }
        },
        y: {
          auto: true,
          range: (u: any, dataMin: number, dataMax: number) => {
            // 自动调整Y轴范围，添加10%的边距
            const range = dataMax - dataMin;
            const margin = range * 0.1;
            return [dataMin - margin, dataMax + margin];
          }
        }
      },
      plugins: [
        {
          hooks: {
            setCursor: [
              (u: any) => {
                // 自定义tooltip逻辑可以在这里实现
              }
            ]
          }
        }
      ]
    };

    try {
      // 创建uPlot实例
      uplot = new uPlot(opts, transformDataForUPlot(data), chartContainer);
      console.log(`图表 ${chartName} 初始化成功`);
    } catch (error) {
      console.error(`图表 ${chartName} 初始化失败:`, error);
    }
  }

  // 将数据转换为uPlot格式
  function transformDataForUPlot(inputData: number[][]): number[][] {
    if (!inputData || inputData.length === 0) {
      // 返回空数据结构
      return [[], ...curves.map(() => [])];
    }

    // 提取时间轴数据（第一列）
    const timeData = inputData.map(row => row[0] || 0);
    
    // 提取每条曲线的数据（从第二列开始）
    const seriesData = curves.map((_, index) => {
      return inputData.map(row => row[index + 1] || 0);
    });

    return [timeData, ...seriesData];
  }

  // 更新图表数据
  function updateChart() {
    if (!uplot || !data) return;

    try {
      const transformedData = transformDataForUPlot(data);
      uplot.setData(transformedData);
      
      // 如果数据超过100个点，自动滚动到最新数据
      if (data.length > 100) {
        const latestTime = data[data.length - 1][0];
        const windowSize = data[data.length - 1][0] - data[Math.max(0, data.length - 100)][0];
        uplot.setScale('x', {
          min: latestTime - windowSize,
          max: latestTime
        });
      }
    } catch (error) {
      console.error(`图表 ${chartName} 数据更新失败:`, error);
    }
  }

  // 响应式更新数据
  $effect(() => {
    if (data && uplot) {
      updateChart();
    }
  });

  // 响应式更新曲线配置
  $effect(() => {
    if (curves && uplot) {
      // 如果曲线配置发生变化，重新初始化图表
      initChart();
    }
  });

  // 窗口大小变化时重新调整图表大小
  function handleResize() {
    if (uplot && chartContainer) {
      uplot.setSize({
        width: chartContainer.clientWidth,
        height: 300
      });
    }
  }

  onMount(() => {
    loadUPlot();
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    if (uplot) {
      uplot.destroy();
      uplot = null;
    }
    
    window.removeEventListener('resize', handleResize);
  });
</script>

<!-- uPlot CSS样式 -->
<svelte:head>
  <link rel="stylesheet" href="/lib/uPlot.min.css">
</svelte:head>

<div class="w-full h-full">
  <!-- 图表容器 -->
  <div 
    bind:this={chartContainer}
    class="w-full h-80 bg-gray-900 rounded border border-gray-600"
    style="min-height: 300px;"
  >
    {#if !uplot}
      <!-- 加载状态 -->
      <div class="flex items-center justify-center h-full text-gray-400">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p class="text-sm">加载图表中...</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- 图表信息 -->
  <div class="mt-2 flex justify-between items-center text-xs text-gray-400">
    <div>
      数据点: {data.length} | 显示窗口: {Math.min(data.length, 100)} 点
    </div>
    <div>
      {#if data.length > 0}
        最新时间: {data[data.length - 1]?.[0]?.toFixed(3)}s
      {/if}
    </div>
  </div>
</div>