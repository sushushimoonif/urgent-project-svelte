<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { writable } from 'svelte/store';

  interface Curve {
    name: string;
  }

  interface Props {
    chartId: number;
    chartName: string;
    curves: Curve[];
    data: number[][];
    xRange?: number[] | null;
    syncGroup?: string;
    useSubplots?: boolean; // 新增：是否使用子图模式
  }

  let { 
    chartId, 
    chartName, 
    curves, 
    data, 
    xRange, 
    syncGroup = 'default',
    useSubplots = true // 默认启用子图模式
  }: Props = $props();

  let chartContainer: HTMLDivElement;
  let fullscreenChartContainer: HTMLDivElement;
  let uplot: any = null;
  let uPlot: any = null;
  let isLoading = $state(true);
  let loadError = $state(false);
  let isFullscreen = $state(false);
  
  // 游标同步相关状态
  let cursorSyncStore: any = null;
  let isUpdatingCursor = $state(false);
  
  // 缩放状态管理
  let originalXRange = $state<[number, number] | null>(null);
  let originalYRange = $state<[number, number] | null>(null);
  let isZoomed = $state(false);

  // Tooltip状态
  let showTooltip = $state(false);
  let tooltipPosition = $state({ x: 0, y: 0 });
  let tooltipData = $state<{
    time: string;
    values: Array<{ name: string; value: string; color: string }>;
  }>({
    time: "",
    values: [],
  });

  // 颜色配置
  const colors = [
    "#3b82f6", // 蓝色
    "#ef4444", // 红色
    "#10b981", // 绿色
    "#f59e0b", // 黄色
    "#8b5cf6", // 紫色
    "#f97316", // 橙色
  ];

  // 全局游标同步存储
  const globalCursorStores = new Map<string, any>();
  
  function getCursorSyncStore(group: string) {
    if (!globalCursorStores.has(group)) {
      globalCursorStores.set(group, writable({
        idx: null,
        left: 0,
        top: 0,
        sourceChartId: null
      }));
    }
    return globalCursorStores.get(group);
  }

  // 全屏切换函数
  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    setTimeout(() => {
      initChart();
    }, 300);
  }

  // 动态加载uPlot库
  async function loadUPlot() {
    if (typeof window === "undefined") return;

    try {
      isLoading = true;
      loadError = false;

      if ((window as any).uPlot) {
        uPlot = (window as any).uPlot;
        console.log("uPlot库已存在");
        initChart();
        return;
      }

      const script = document.createElement("script");
      script.src = "/lib/uPlot.iife.js";
      script.onload = () => {
        uPlot = (window as any).uPlot;
        if (uPlot) {
          console.log("uPlot库加载成功");
          initChart();
        } else {
          console.error("uPlot库加载后未找到uPlot对象");
          loadError = true;
        }
        isLoading = false;
      };
      script.onerror = () => {
        console.error("uPlot库加载失败");
        loadError = true;
        isLoading = false;
      };

      const existingScript = document.querySelector('script[src="/lib/uPlot.iife.js"]');
      if (!existingScript) {
        document.head.appendChild(script);
      } else {
        if ((window as any).uPlot) {
          uPlot = (window as any).uPlot;
          initChart();
          isLoading = false;
        } else {
          existingScript.addEventListener("load", () => {
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
      console.error("uPlot库加载失败:", error);
      loadError = true;
      isLoading = false;
    }
  }

  // 初始化图表
  function initChart() {
    const currentContainer = isFullscreen ? fullscreenChartContainer : chartContainer;
    
    if (!uPlot || !currentContainer) {
      console.log("uPlot或容器未准备好", { uPlot: !!uPlot, container: !!currentContainer, isFullscreen });
      return;
    }

    // 清理现有图表
    if (uplot) {
      uplot.destroy();
      uplot = null;
    }

    if (useSubplots) {
      initSubplotChart(currentContainer);
    } else {
      initSingleChart(currentContainer);
    }
  }

  // 初始化子图模式
  function initSubplotChart(container: HTMLElement) {
    const containerWidth = isFullscreen ? window.innerWidth - 100 : (container.clientWidth || 800);
    const totalHeight = isFullscreen ? window.innerHeight - 200 : 400;
    const subplotHeight = Math.floor(totalHeight / curves.length);
    
    // 构建多子图的series配置
    const series = [
      {
        label: "时间",
        stroke: "transparent",
        fill: "transparent",
      }
    ];

    // 为每个曲线创建一个series
    curves.forEach((curve, index) => {
      series.push({
        label: curve.name,
        stroke: colors[index % colors.length],
        width: 2,
        fill: "transparent",
        scale: `y${index}`, // 每个曲线使用独立的Y轴刻度
        points: {
          show: false,
        },
      });
    });

    // 构建多个Y轴配置
    const axes = [
      // X轴配置
      {
        label: "时间 (秒)",
        labelSize: 12,
        labelFont: "12px monospace",
        stroke: "#e5e7eb",
        grid: {
          show: true,
          stroke: "#4b5563",
          width: 1,
        },
        ticks: {
          show: true,
          stroke: "#d1d5db",
          width: 1,
          size: 8,
        },
        splits: (u: any, axisIdx: number, scaleMin: number, scaleMax: number, foundIncr: number) => {
          const customIncr = foundIncr * 2;
          const splits = [];
          let val = Math.ceil(scaleMin / customIncr) * customIncr;
          while (val <= scaleMax) {
            splits.push(val);
            val += customIncr;
          }
          return splits;
        },
      }
    ];

    // 为每个曲线创建独立的Y轴
    curves.forEach((curve, index) => {
      axes.push({
        scale: `y${index}`,
        label: curve.name,
        labelSize: 10,
        labelFont: "10px monospace",
        stroke: colors[index % colors.length],
        side: 3, // 左侧
        size: 60,
        grid: {
          show: index === 0, // 只在第一个子图显示网格
          stroke: "#374151",
          width: 1,
        },
        ticks: {
          show: true,
          stroke: colors[index % colors.length],
          width: 1,
        },
        // 设置子图的垂直位置
        space: (self: any, axisIdx: number, scaleMin: number, scaleMax: number, plotDim: number) => {
          return subplotHeight;
        }
      });
    });

    // 构建scales配置
    const scales: any = {
      x: {
        time: false,
        auto: !xRange || xRange.length !== 2,
        ...(xRange && xRange.length === 2 ? { range: () => xRange } : {}),
      }
    };

    // 为每个曲线创建独立的Y轴刻度
    curves.forEach((curve, index) => {
      scales[`y${index}`] = {
        auto: true,
        range: (u: any, dataMin: number, dataMax: number) => {
          const range = dataMax - dataMin;
          const margin = range * 0.1;
          return [dataMin - margin, dataMax + margin];
        },
      };
    });

    const opts = {
      width: containerWidth,
      height: totalHeight,
      series: series,
      axes: axes,
      scales: scales,
      legend: {
        show: false,
      },
      cursor: {
        show: true,
        sync: {
          key: syncGroup,
        },
        drag: {
          setScale: false,
          x: true,
          y: false,
        },
        points: {
          show: true,
          size: 6,
          width: 1,
          stroke: (u: any, seriesIdx: number) => {
            return series[seriesIdx]?.stroke || "#666";
          },
          fill: "#1f2937",
        },
      },
      hooks: {
        setSelect: [
          (u: any) => {
            const select = u.select;
            const { left, top, width, height } = select;
            
            if (width > 10) {
              if (!isZoomed) {
                const xScale = u.scales.x;
                originalXRange = [xScale.min, xScale.max];
                isZoomed = true;
              }
              
              const xMin = u.posToVal(left, 'x');
              const xMax = u.posToVal(left + width, 'x');
              
              u.setScale('x', { min: xMin, max: xMax });
              u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
            }
          }
        ],
        setCursor: [
          (u: any) => {
            const { left, top, idx } = u.cursor;
            
            if (isUpdatingCursor) return;
            
            if (cursorSyncStore && idx !== null && idx !== undefined) {
              cursorSyncStore.set({
                idx,
                left,
                top,
                sourceChartId: chartId
              });
            }

            if (idx !== null && idx !== undefined && data[idx]) {
              showTooltip = true;

              const rect = u.root.getBoundingClientRect();
              tooltipPosition = {
                x: left + rect.left,
                y: top + rect.top,
              };

              const timeValue = data[idx][0];
              const values = curves.map((curve, index) => ({
                name: curve.name,
                value: data[idx][index + 1]?.toFixed(3) || "0.000",
                color: colors[index % colors.length],
              }));

              tooltipData = {
                time: `时间: ${timeValue.toFixed(3)}s`,
                values: values,
              };
            } else {
              showTooltip = false;
            }
          },
        ],
        // 自定义绘制钩子 - 实现子图分离
        draw: [
          (u: any) => {
            const { ctx, bbox } = u;
            const { left, top, width, height } = bbox;
            
            // 绘制子图分隔线
            ctx.save();
            ctx.strokeStyle = "#4b5563";
            ctx.lineWidth = 1;
            
            for (let i = 1; i < curves.length; i++) {
              const y = top + (i * subplotHeight);
              ctx.beginPath();
              ctx.moveTo(left, y);
              ctx.lineTo(left + width, y);
              ctx.stroke();
            }
            
            ctx.restore();
          }
        ]
      },
    };

    try {
      cursorSyncStore = getCursorSyncStore(syncGroup);
      
      const transformedData = transformDataForSubplots(data);
      uplot = new uPlot(opts, transformedData, container);
      
      // 游标同步订阅
      const unsubscribe = cursorSyncStore.subscribe((syncData: any) => {
        if (syncData.sourceChartId !== chartId && syncData.idx !== null && uplot) {
          isUpdatingCursor = true;
          
          try {
            uplot.setCursor({
              left: syncData.left,
              top: syncData.top,
              idx: syncData.idx
            });
            
            if (data[syncData.idx]) {
              showTooltip = true;
              
              const rect = uplot.root.getBoundingClientRect();
              tooltipPosition = {
                x: syncData.left + rect.left,
                y: syncData.top + rect.top,
              };
              
              const timeValue = data[syncData.idx][0];
              const values = curves.map((curve, index) => ({
                name: curve.name,
                value: data[syncData.idx][index + 1]?.toFixed(3) || "0.000",
                color: colors[index % colors.length],
              }));
              
              tooltipData = {
                time: `时间: ${timeValue.toFixed(3)}s`,
                values: values,
              };
            }
          } catch (error) {
            console.error(`图表 ${chartName} 游标同步失败:`, error);
          } finally {
            setTimeout(() => {
              isUpdatingCursor = false;
            }, 10);
          }
        }
      });
      
      (uplot as any)._cursorUnsubscribe = unsubscribe;
      container.addEventListener('dblclick', handleDoubleClick);
      
      console.log(`子图模式图表 ${chartName} 初始化成功，子图数量: ${curves.length}`);
      isLoading = false;
    } catch (error) {
      console.error(`子图模式图表 ${chartName} 初始化失败:`, error);
      loadError = true;
      isLoading = false;
    }
  }

  // 初始化单图模式（原有功能）
  function initSingleChart(container: HTMLElement) {
    // 原有的单图初始化逻辑...
    const series = [
      {
        label: "时间",
        stroke: "transparent",
        fill: "transparent",
      },
      ...curves.map((curve, index) => ({
        label: curve.name,
        stroke: colors[index % colors.length],
        width: 1,
        fill: "transparent",
        points: {
          show: false,
        },
      })),
    ];

    const opts = {
      width: isFullscreen ? window.innerWidth - 100 : (container.clientWidth || 800),
      height: isFullscreen ? window.innerHeight - 200 : 300,
      series: series,
      axes: [
        {
          label: "时间 (秒)",
          labelSize: 12,
          labelFont: "12px monospace",
          stroke: "#e5e7eb",
          grid: {
            show: true,
            stroke: "#4b5563",
            width: 1,
          },
          ticks: {
            show: true,
            stroke: "#d1d5db",
            width: 1,
            size: 8,
          },
        },
        {
          label: "数值",
          labelSize: 12,
          labelFont: "12px monospace",
          stroke: "#9ca3af",
          grid: {
            show: true,
            stroke: "#374151",
            width: 1,
          },
          ticks: {
            show: true,
            stroke: "#6b7280",
            width: 1,
          },
        },
      ],
      legend: {
        show: false,
      },
      cursor: {
        show: true,
        sync: {
          key: syncGroup,
        },
        drag: {
          setScale: false,
          x: true,
          y: false,
        },
        points: {
          show: true,
          size: 6,
          width: 1,
          stroke: (u: any, seriesIdx: number) => {
            return series[seriesIdx]?.stroke || "#666";
          },
          fill: "#1f2937",
        },
      },
      scales: {
        x: {
          time: false,
          auto: !xRange || xRange.length !== 2,
          ...(xRange && xRange.length === 2 ? { range: () => xRange } : {}),
        },
        y: {
          auto: true,
          range: (u: any, dataMin: number, dataMax: number) => {
            const range = dataMax - dataMin;
            const margin = range * 0.1;
            return [dataMin - margin, dataMax + margin];
          },
        },
      },
      hooks: {
        setSelect: [
          (u: any) => {
            const select = u.select;
            const { left, top, width, height } = select;
            
            if (width > 10) {
              if (!isZoomed) {
                const xScale = u.scales.x;
                originalXRange = [xScale.min, xScale.max];
                isZoomed = true;
              }
              
              const xMin = u.posToVal(left, 'x');
              const xMax = u.posToVal(left + width, 'x');
              
              u.setScale('x', { min: xMin, max: xMax });
              u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
            }
          }
        ],
        setCursor: [
          (u: any) => {
            const { left, top, idx } = u.cursor;
            
            if (isUpdatingCursor) return;
            
            if (cursorSyncStore && idx !== null && idx !== undefined) {
              cursorSyncStore.set({
                idx,
                left,
                top,
                sourceChartId: chartId
              });
            }

            if (idx !== null && idx !== undefined && data[idx]) {
              showTooltip = true;

              const rect = u.root.getBoundingClientRect();
              tooltipPosition = {
                x: left + rect.left,
                y: top + rect.top,
              };

              const timeValue = data[idx][0];
              const values = curves.map((curve, index) => ({
                name: curve.name,
                value: data[idx][index + 1]?.toFixed(3) || "0.000",
                color: colors[index % colors.length],
              }));

              tooltipData = {
                time: `时间: ${timeValue.toFixed(3)}s`,
                values: values,
              };
            } else {
              showTooltip = false;
            }
          },
        ],
      },
    };

    try {
      cursorSyncStore = getCursorSyncStore(syncGroup);
      
      const transformedData = transformDataForUPlot(data);
      uplot = new uPlot(opts, transformedData, container);
      
      const unsubscribe = cursorSyncStore.subscribe((syncData: any) => {
        if (syncData.sourceChartId !== chartId && syncData.idx !== null && uplot) {
          isUpdatingCursor = true;
          
          try {
            uplot.setCursor({
              left: syncData.left,
              top: syncData.top,
              idx: syncData.idx
            });
            
            if (data[syncData.idx]) {
              showTooltip = true;
              
              const rect = uplot.root.getBoundingClientRect();
              tooltipPosition = {
                x: syncData.left + rect.left,
                y: syncData.top + rect.top,
              };
              
              const timeValue = data[syncData.idx][0];
              const values = curves.map((curve, index) => ({
                name: curve.name,
                value: data[syncData.idx][index + 1]?.toFixed(3) || "0.000",
                color: colors[index % colors.length],
              }));
              
              tooltipData = {
                time: `时间: ${timeValue.toFixed(3)}s`,
                values: values,
              };
            }
          } catch (error) {
            console.error(`图表 ${chartName} 游标同步失败:`, error);
          } finally {
            setTimeout(() => {
              isUpdatingCursor = false;
            }, 10);
          }
        }
      });
      
      (uplot as any)._cursorUnsubscribe = unsubscribe;
      container.addEventListener('dblclick', handleDoubleClick);
      
      console.log(`单图模式图表 ${chartName} 初始化成功`);
      isLoading = false;
    } catch (error) {
      console.error(`单图模式图表 ${chartName} 初始化失败:`, error);
      loadError = true;
      isLoading = false;
    }
  }

  // 双击重置缩放
  function handleDoubleClick(event: MouseEvent) {
    if (uplot && isZoomed && originalXRange) {
      uplot.setScale('x', { min: originalXRange[0], max: originalXRange[1] });
      isZoomed = false;
      originalXRange = null;
      console.log(`图表 ${chartName} 缩放已重置`);
      event.preventDefault();
    }
  }

  // 转换数据为子图格式
  function transformDataForSubplots(inputData: number[][]): number[][] {
    if (!inputData || inputData.length === 0) {
      return [[], ...curves.map(() => [])];
    }

    const timeData = inputData.map((row) => row[0] || 0);
    const seriesData = curves.map((_, index) => {
      return inputData.map((row) => row[index + 1] || 0);
    });

    return [timeData, ...seriesData];
  }

  // 转换数据为uPlot格式（单图模式）
  function transformDataForUPlot(inputData: number[][]): number[][] {
    if (!inputData || inputData.length === 0) {
      return [[], ...curves.map(() => [])];
    }

    const timeData = inputData.map((row) => row[0] || 0);
    const seriesData = curves.map((_, index) => {
      return inputData.map((row) => row[index + 1] || 0);
    });

    return [timeData, ...seriesData];
  }

  function updateChart() {
    if (!uplot || !data) return;

    try {
      const transformedData = useSubplots ? transformDataForSubplots(data) : transformDataForUPlot(data);

      setTimeout(() => {
        uplot.setData(transformedData);

        if (data.length > 20) {
          const latestTime = data[data.length - 1][0];
          setTimeout(() => {
            uplot.setScale("x", {
              min: 0,
              max: latestTime,
            });
          }, 150);
        }
        
        setTimeout(() => {
          console.log(`🔄 updateChart: 图表 ${chartName} 数据更新完成`);
        }, 20);
      }, 100);

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
      initChart();
    }
  });

  function handleResize() {
    if (uplot) {
      const currentContainer = isFullscreen ? fullscreenChartContainer : chartContainer;
      if (!currentContainer) return;
      
      const newWidth = isFullscreen ? window.innerWidth - 100 : currentContainer.clientWidth;
      const newHeight = isFullscreen ? window.innerHeight - 200 : (useSubplots ? 400 : 300);
      
      uplot.setSize({
        width: newWidth,
        height: newHeight
      });
    }
  }

  onMount(() => {
    console.log(`开始加载图表 ${chartName}，子图模式: ${useSubplots}`);
    loadUPlot();
    window.addEventListener("resize", handleResize);
  });

  onDestroy(() => {
    if (uplot) {
      if ((uplot as any)._cursorUnsubscribe) {
        (uplot as any)._cursorUnsubscribe();
      }
      
      const currentContainer = isFullscreen ? fullscreenChartContainer : chartContainer;
      if (currentContainer) {
        currentContainer.removeEventListener('dblclick', handleDoubleClick);
      }
      
      uplot.destroy();
      uplot = null;
    }

    window.removeEventListener("resize", handleResize);
  });
</script>

<!-- uPlot CSS样式 -->
<svelte:head>
  <link rel="stylesheet" href="/lib/uPlot.min.css" />
</svelte:head>

<!-- 全屏模态框 -->
{#if isFullscreen}
  <div class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-8">
    <div class="w-full h-full bg-gray-900 rounded-lg border border-gray-600 relative">
      <!-- 全屏模式下的标题栏 -->
      <div class="flex justify-between items-center p-4 border-b border-gray-700">
        <h3 class="text-xl font-semibold text-gray-200 flex items-center gap-2">
          <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          {chartName} - 全屏查看 {useSubplots ? '(子图模式)' : '(单图模式)'}
        </h3>
        <button 
          class="text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-700 transition-colors"
          onclick={toggleFullscreen}
          title="退出全屏"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 全屏图表容器 -->
      <div class="p-4" style="height: calc(100% - 80px);">
        <div
          bind:this={fullscreenChartContainer}
          class="w-full bg-gray-900 rounded border border-gray-600 relative"
          style="height: calc(100vh - 200px);"
        >
          {#if isLoading}
            <div class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="text-lg">加载图表中...</p>
              </div>
            </div>
          {:else if loadError}
            <div class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded">
              <div class="text-center">
                <div class="text-red-500 text-4xl mb-4">⚠️</div>
                <p class="text-lg">图表加载失败</p>
                <button 
                  class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  onclick={() => loadUPlot()}
                >
                  重试
                </button>
              </div>
            </div>
          {:else if !uplot}
            <div class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded">
              <div class="text-center">
                <div class="text-gray-500 text-4xl mb-4">📊</div>
                <p class="text-lg">准备图表中...</p>
                <p class="text-sm text-gray-500 mt-2">数据点: {data?.length || 0}</p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- 正常模式 -->
  <div class="w-full h-full relative">
    <!-- 控制按钮 - 右上角悬浮 -->
    <div class="absolute top-2 right-2 z-10 flex gap-1">
      <!-- 子图模式切换按钮 -->
      <button 
        class="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-300 hover:text-white transition-colors flex items-center justify-center shadow-lg {useSubplots ? 'bg-blue-600 text-white' : ''}"
        onclick={() => { useSubplots = !useSubplots; initChart(); }}
        title={useSubplots ? '切换到单图模式' : '切换到子图模式'}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
        </svg>
      </button>
      
      <!-- 全屏按钮 -->
      <button 
        class="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-300 hover:text-white transition-colors flex items-center justify-center shadow-lg"
        onclick={toggleFullscreen}
        title="全屏查看"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
        </svg>
      </button>
    </div>

    <!-- 图表容器 -->
    <div
      bind:this={chartContainer}
      class="w-full bg-gray-900 rounded border border-gray-600 relative"
      style="min-height: {useSubplots ? '400px' : '300px'}; height: {useSubplots ? '400px' : '300px'};"
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
    
    <!-- 自定义Tooltip -->
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
              <div class="w-3 h-0.5 rounded" style="background-color: {item.color};"></div>
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
  </div>
{/if}