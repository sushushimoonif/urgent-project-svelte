<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  interface Curve {
    name: string;
  }

  interface Props {
    chartId: number;
    chartName: string;
    curves: Curve[];
    data: number[][];
    xRange?: number[] | null; // 可选
  }

  let { chartId, chartName, curves, data, xRange }: Props = $props();

  let chartContainer: HTMLDivElement;
  let fullscreenChartContainer: HTMLDivElement;
  let uplot: any = null;
  let uPlot: any = null;
  let isLoading = $state(true);
  let loadError = $state(false);
  let isFullscreen = $state(false);
  
  // 缩放状态管理
  let originalXRange = $state<[number, number] | null>(null);
  let originalYRange = $state<[number, number] | null>(null);
  let isZoomed = $state(false);

  // Tooltip状态 - 修改位置为鼠标左上方，半透明度改为70%
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

  // 全屏切换函数
  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    
    // 延迟重新初始化图表，确保容器准备好
    setTimeout(() => {
      // 重新初始化图表以适应新容器
      initChart();
    }, 300);
  }

  // 动态加载uPlot库
  async function loadUPlot() {
    if (typeof window === "undefined") return;

    try {
      isLoading = true;
      loadError = false;

      // 检查uPlot是否已经加载
      if ((window as any).uPlot) {
        uPlot = (window as any).uPlot;
        console.log("uPlot库已存在");
        initChart();
        return;
      }

      // 动态创建script标签加载uPlot
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

      // 检查script是否已经存在
      const existingScript = document.querySelector(
        'script[src="/lib/uPlot.iife.js"]',
      );
      if (!existingScript) {
        document.head.appendChild(script);
      } else {
        // 如果script已存在，等待加载完成
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
    // 根据当前模式选择正确的容器
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

    // 构建series配置
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

    // uPlot配置
    const opts = {
      // title: chartName,
      width: isFullscreen ? window.innerWidth - 100 : (currentContainer.clientWidth || 800),
      height: isFullscreen ? window.innerHeight - 200 : 300,
      series: series,
      axes: [
  {
    label: "时间 (秒)",
    labelSize: 12,
    labelFont: "12px monospace",
    stroke: "#e5e7eb", // 改为浅灰色提升对比度
    grid: {
      show: true,
      stroke: "#4b5563", // 加深网格线颜色
      width: 1,
    },
    ticks: {
      show: true,
      stroke: "#d1d5db", // 刻度线颜色调整为浅灰
      width: 1,
      size: 8,          // 适当增加刻度线长度
    },
          // 增大X轴刻度间隔
          splits: (
            u: any,
            axisIdx: number,
            scaleMin: number,
            scaleMax: number,
            foundIncr: number,
            foundSpace: number,
          ) => {
            // 将刻度间隔增大2倍，使滚动更慢
            const customIncr = foundIncr * 2;
            const splits = [];
            let val = Math.ceil(scaleMin / customIncr) * customIncr;
            while (val <= scaleMax) {
              splits.push(val);
              val += customIncr;
            }
            return splits;
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
        show: false, // 删除图例
      },
      cursor: {
        show: true,
        sync: {
          key: `chart-${chartId}`,
        },
        drag: {
          setScale: true, // 启用拖拽缩放
          x: true,        // 允许X轴缩放
          y: true,        // 允许Y轴缩放
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
          ...(xRange && xRange.length === 2
            ? {
                range: () => xRange,
              }
            : {}),
        },
        y: {
          auto: true,
          range: (u: any, dataMin: number, dataMax: number) => {
            // 自动调整Y轴范围，添加10%的边距
            const range = dataMax - dataMin;
            const margin = range * 0.1;
            return [dataMin - margin, dataMax + margin];
          },
        },
      },
      select: {
        show: true,
        left: 0,
        width: 0,
        top: 0,
        height: 0,
      },
      hooks: {
        setSelect: [
          (u: any) => {
            // 当用户完成框选时触发
            const { left, top, width, height } = u.select;
            
            if (width > 10 && height > 10) { // 最小选择区域
              // 保存原始范围（如果还没保存的话）
              if (!isZoomed) {
                const xScale = u.scales.x;
                const yScale = u.scales.y;
                originalXRange = [xScale.min, xScale.max];
                originalYRange = [yScale.min, yScale.max];
                isZoomed = true;
              }
              
              // 计算选择区域对应的数据范围
              const plotRect = u.bbox;
              const xMin = u.posToVal(left, 'x');
              const xMax = u.posToVal(left + width, 'x');
              const yMin = u.posToVal(top + height, 'y');
              const yMax = u.posToVal(top, 'y');
              
              // 应用新的缩放范围
              u.setScale('x', { min: xMin, max: xMax });
              u.setScale('y', { min: yMin, max: yMax });
              
              console.log(`图表 ${chartName} 缩放到范围: X[${xMin.toFixed(2)}, ${xMax.toFixed(2)}], Y[${yMin.toFixed(2)}, ${yMax.toFixed(2)}]`);
            }
            
            // 清除选择框
            u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
          }
        ],
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
                y: top, // 鼠标Y位置作为小框左上角
              };

              // 构建tooltip数据
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
              // 隐藏tooltip
              showTooltip = false;
            }
          },
        ],
      },
    };

    try {
      // 创建uPlot实例
      const transformedData = transformDataForUPlot(data);
      uplot = new uPlot(opts, transformedData, currentContainer);
      
      // 添加双击事件监听器来重置缩放
      currentContainer.addEventListener('dblclick', handleDoubleClick);
      
      console.log(`图表 ${chartName} 初始化成功，数据点数: ${data.length}, 全屏模式: ${isFullscreen}`);
      isLoading = false;
    } catch (error) {
      console.error(`图表 ${chartName} 初始化失败:`, error);
      loadError = true;
      isLoading = false;
    }
  }

  // 双击重置缩放
  function handleDoubleClick(event: MouseEvent) {
    if (uplot && isZoomed && originalXRange && originalYRange) {
      // 重置到原始范围
      uplot.setScale('x', { min: originalXRange[0], max: originalXRange[1] });
      uplot.setScale('y', { min: originalYRange[0], max: originalYRange[1] });
      
      // 重置缩放状态
      isZoomed = false;
      originalXRange = null;
      originalYRange = null;
      
      console.log(`图表 ${chartName} 缩放已重置`);
      event.preventDefault();
    }
  }

  // 将数据转换为uPlot格式
  function transformDataForUPlot(inputData: number[][]): number[][] {
    if (!inputData || inputData.length === 0) {
      // 返回空数据结构
      return [[], ...curves.map(() => [])];
    }

    // 提取时间轴数据（第一列）
    const timeData = inputData.map((row) => row[0] || 0);

    // 提取每条曲线的数据（从第二列开始）
    const seriesData = curves.map((_, index) => {
      return inputData.map((row) => row[index + 1] || 0);
    });

    return [timeData, ...seriesData];
  }

  function updateChart() {
    if (!uplot || !data) return;

    try {
      const transformedData = transformDataForUPlot(data);

      // 使用 setTimeout 来延迟更新，使动画更平滑
      setTimeout(() => {
        uplot.setData(transformedData);

        // 从第 10 秒开始，固定左边界为 0
        if (data.length > 20) {
          const latestTime = data[data.length - 1][0];
          const windowSize =
            (data[data.length - 1][0] -
              data[Math.max(0, data.length - 20)][0]) *
            1.5;

          // 增大窗口大小，平滑滚动
          setTimeout(() => {
            uplot.setScale("x", {
              min: 0, // 固定最左边为0
              max: latestTime,
            });
          }, 150); // 增加延迟，使滚动平滑
        }
      }, 100); // 延迟100ms，平滑动画

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
    if (uplot) {
      const currentContainer = isFullscreen ? fullscreenChartContainer : chartContainer;
      if (!currentContainer) return;
      
      const newWidth = isFullscreen ? window.innerWidth - 100 : currentContainer.clientWidth;
      const newHeight = isFullscreen ? window.innerHeight - 200 : 300;
      
      uplot.setSize({
        width: newWidth,
        height: newHeight
      });
    }
  }

  onMount(() => {
    console.log(`开始加载图表 ${chartName}`);
    loadUPlot();

    // 监听窗口大小变化
    window.addEventListener("resize", handleResize);
  });

  onDestroy(() => {
    if (uplot) {
      // 移除事件监听器
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
          {chartName} - 全屏查看
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
    <!-- 放大缩小按钮 - 右上角悬浮 -->
    <div class="absolute top-2 right-2 z-10 flex gap-1">
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
    class="w-full h-80 bg-gray-900 rounded border border-gray-600 relative"
    style="min-height: 300px;"
  >
    {#if isLoading}
      <!-- 加载状态 -->
      <div
        class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded"
      >
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"
          ></div>
          <p class="text-sm">加载图表中...</p >
        </div>
      </div>
    {:else if loadError}
      <!-- 错误状态 -->
      <div
        class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded"
      >
        <div class="text-center">
          <div class="text-red-500 text-2xl mb-2">⚠️</div>
          <p class="text-sm">图表加载失败</p >
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
      <div
        class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded"
      >
        <div class="text-center">
          <div class="text-gray-500 text-2xl mb-2">📊</div>
          <p class="text-sm">准备图表中...</p >
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
      <div
        class="text-xs text-gray-300 font-mono mb-2 border-b border-gray-600 pb-1"
      >
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
  </div>
{/if}
