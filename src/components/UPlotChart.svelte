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
  
  // Tooltip状态 - 修改位置为鼠标左上方，半透明度改为70%
  let showTooltip = $state(false);
  let tooltipPosition = $state({ x: 0, y: 0 });
  let tooltipData = $state<{time: string, values: Array<{name: string, value: string, color: string}>}>({
    time: '',
    values: []
  });

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
            width: 1,
            // 增大X轴刻度跨度，使滚动更慢
            size: 20
          },
          // 增大X轴刻度间隔
          splits: (u: any, axisIdx: number, scaleMin: number, scaleMax: number, foundIncr: number, foundSpace: number) => {
            // 将刻度间隔增大2倍，使滚动更慢
            const customIncr = foundIncr * 2;
            const splits = [];
            let val = Math.ceil(scaleMin / customIncr) * customIncr;
            while (val <= scaleMax) {
              splits.push(val);
              val += customIncr;
            }
            return splits;
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
        show: false // 删除图例
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
            // 固定显示最新20个数据点的时间窗口，增大时间跨度使滚动更慢
            if (data.length > 20) {
              const latestTime = dataMax;
              // 增大窗口大小，使X轴跨度更大
              const windowSize = data.length > 1 ? (data[data.length - 1][0] - data[Math.max(0, data.length - 20)][0]) * 1.5 : 15;
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
      hooks: {
        setCursor: [
          (u: any) => {
            const { left, top, idx } = u.cursor;
            
            if (idx !== null && idx !== undefined && data[idx]) {
              // 显示tooltip
              showTooltip = true;
              
              // 计算tooltip位置（小框的左上方为鼠标位置）
              const rect = chartContainer.getBoundingClientRect();
              tooltipPosition = {
                x: left, // 鼠标X位置作为小框左上角
                y: top   // 鼠标Y位置作为小框左上角
              };
              
              // 构建tooltip数据
              const timeValue = data[idx][0];
              const values = curves.map((curve, index) => ({
                name: curve.name,
                value: data[idx][index + 1]?.toFixed(3) || '0.000',
                color: colors[index % colors.length]
              }));
              
              tooltipData = {
                time: `时间: ${timeValue.toFixed(3)}s`,
                values: values
              };
            } else {
              // 隐藏tooltip
              showTooltip = false;
            }
          }
        ]
      }
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

  // 更新图表数据 - 放慢动画速度三倍
  function updateChart() {
    if (!uplot || !data) return;

    try {
      const transformedData = transformDataForUPlot(data);
      
      // 使用setTimeout来放慢动画速度（延迟更新）
      setTimeout(() => {
        uplot.setData(transformedData);
        
        // 如果数据超过20个点，自动滚动到最新数据
        if (data.length > 20) {
          const latestTime = data[data.length - 1][0];
          // 增大窗口大小，使滚动更慢
          const windowSize = (data[data.length - 1][0] - data[Math.max(0, data.length - 20)][0]) * 1.5;
          
          // 平滑滚动到新位置
          setTimeout(() => {
            uplot.setScale('x', {
              min: latestTime - windowSize,
              max: latestTime
            });
          }, 150); // 增加延迟到150ms，使滚动更慢
        }
      }, 100); // 增加延迟到100ms，使动画更平滑
      
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

<div class="w-full h-full relative">
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

  <!-- 自定义Tooltip - 半透明小框，位置在鼠标左上方，透明度70% -->
  {#if showTooltip}
    <div 
      class="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg pointer-events-none"
      style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; background-color: rgba(31, 41, 55, 0.7); backdrop-filter: blur(4px);"
    >
      <!-- 时间显示 -->
      <div class="text-xs text-gray-300 font-mono mb-2 border-b border-gray-600 pb-1">
        {tooltipData.time}
      </div>
      
      <!-- 曲线数据 -->
      <div class="space-y-1">
        {#each tooltipData.values as item}
          <div class="flex items-center gap-2 text-xs">
            <!-- 颜色指示器 -->
            <div 
              class="w-3 h-0.5 rounded"
              style="background-color: {item.color};"
            ></div>
            <!-- 参数名称 -->
            <span class="text-gray-300 flex-1 truncate" title={item.name}>
              {item.name}
            </span>
            <!-- 数值 -->
            <span class="text-white font-mono">
              {item.value}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 删除图表信息栏（数据点、显示窗口、曲线数等信息） -->
</div>