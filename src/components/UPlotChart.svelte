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
  let isLoading = $state(true);
  let loadError = $state(false);

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
      isLoading = true;
      loadError = false;
      
      // 检查uPlot是否已经加载
      if ((window as any).uPlot) {
        uPlot = (window as any).uPlot;
        console.log('uPlot库已存在');
        initChart();
        return;
      }
      
      // 动态创建script标签加载uPlot
      const script = document.createElement('script');
      script.src = '/lib/uPlot.iife.js';
      script.onload = () => {
        uPlot = (window as any).uPlot;
        if (uPlot) {
          console.log('uPlot库加载成功');
          initChart();
        } else {
          console.error('uPlot库加载后未找到uPlot对象');
          loadError = true;
        }
        isLoading = false;
      };
      script.onerror = () => {
        console.error('uPlot库加载失败');
        loadError = true;
        isLoading = false;
      };
      
      // 检查script是否已经存在
      const existingScript = document.querySelector('script[src="/lib/uPlot.iife.js"]');
      if (!existingScript) {
        document.head.appendChild(script);
      } else {
        // 如果script已存在，等待加载完成
        if ((window as any).uPlot) {
          uPlot = (window as any).uPlot;
          initChart();
          isLoading = false;
        } else {
          existingScript.addEventListener('load', () => {
            uPlot = (window as any).uPlot;
            if (uPlot) {
              initChart();
            } else {
              loadError = true;
            }
            isLoading = false;
          });
        }
      }
    } catch (error) {
      console.error('uPlot库加载失败:', error);
      loadError = true;
      isLoading = false;
    }
  }

  // 初始化图表
  function initChart() {
    if (!uPlot || !chartContainer) {
      console.log('uPlot或容器未准备好');
      return;
    }

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
      const transformedData = transformDataForUPlot(data);
      uplot = new uPlot(opts, transformedData, chartContainer);
      console.log(`图表 ${chartName} 初始化成功，数据点数: ${data.length}`);
      isLoading = false;
    } catch (error) {
      console.error(`图表 ${chartName} 初始化失败:`, error);
      loadError = true;
      isLoading = false;
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
      
      console.log(`图表 ${chartName} 数据更新成功，当前数据点: ${data.length}`);
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
      console.log(`图表 ${chartName} 曲线配置变化，重新初始化`);
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
    console.log(`开始加载图表 ${chartName}`);
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
    class="w-full h-80 bg-gray-900 rounded border border-gray-600 relative"
    style="min-height: 300px;"
  >
    {#if isLoading}
      <!-- 加载状态 -->
      <div class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p class="text-sm">加载图表中...</p>
        </div>
      </div>
    {:else if loadError}
      <!-- 错误状态 -->
      <div class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded">
        <div class="text-center">
          <div class="text-red-500 text-2xl mb-2">⚠️</div>
          <p class="text-sm">图表加载失败</p>
          <button 
            class="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
            onclick={() => loadUPlot()}
          >
            重试
          </button>
        </div>
      </div>
    {:else if !uplot}
      <!-- 等待初始化 -->
      <div class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded">
        <div class="text-center">
          <div class="text-gray-500 text-2xl mb-2">📊</div>
          <p class="text-sm">准备图表中...</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- 图表信息 -->
  <div class="mt-2 flex justify-between items-center text-xs text-gray-400">
    <div class="flex items-center gap-4">
      <span>数据点: {data.length}</span>
      <span>显示窗口: {Math.min(data.length, 100)} 点</span>
      <span>曲线数: {curves.length}</span>
    </div>
    <div class="flex items-center gap-2">
      {#if data.length > 0}
        <span>最新时间: {data[data.length - 1]?.[0]?.toFixed(3)}s</span>
      {/if}
      {#if uplot}
        <div class="w-2 h-2 bg-green-500 rounded-full" title="图表已就绪"></div>
      {:else if isLoading}
        <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="加载中"></div>
      {:else if loadError}
        <div class="w-2 h-2 bg-red-500 rounded-full" title="加载失败"></div>
      {/if}
    </div>
  </div>
</div>