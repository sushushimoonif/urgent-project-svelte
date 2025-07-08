<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { writable } from 'svelte/store';

  interface Curve {
    name: string;
    unit?: string; // 单位
    scale?: string; // 对应的Y轴标识
    yAxisLabel?: string; // Y轴标签
  }

  interface Props {
    chartId: number;
    chartName: string;
    curves: Curve[];
    data: number[][];
    xRange?: number[] | null;
    syncGroup?: string;
  }

  let { chartId, chartName, curves, data, xRange, syncGroup = 'default' }: Props = $props();

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
  let originalYRanges = $state<Map<string, [number, number]>>(new Map());
  let isZoomed = $state(false);

  // Tooltip状态
  let showTooltip = $state(false);
  let tooltipPosition = $state({ x: 0, y: 0 });
  let tooltipData = $state<{
    time: string;
    values: Array<{ name: string; value: string; color: string; unit?: string }>;
  }>({
    time: "",
    values: [],
  });

  // 颜色和线型配置
  const colors = [
    "#3b82f6", // 蓝色
    "#ef4444", // 红色
    "#10b981", // 绿色
    "#f59e0b", // 黄色
    "#8b5cf6", // 紫色
    "#f97316", // 橙色
    "#06b6d4", // 青色
    "#84cc16", // 绿黄色
  ];

  const strokeDashArrays = [
    null,        // 实线
    [5, 5],      // 短虚线
    [10, 5],     // 长虚线
    [15, 3, 3, 3], // 点划线
    [20, 5, 5, 5, 5, 5], // 长点划线
    [3, 3],      // 点线
    [8, 3, 3, 3], // 短点划线
    [12, 8],     // 长短线
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

  // 自动分组曲线到不同Y轴
  function groupCurvesByScale(curves: Curve[], data: number[][]) {
    if (!data || data.length === 0) return new Map();
    
    const groups = new Map<string, {
      curves: Array<{curve: Curve, index: number}>,
      dataRange: [number, number],
      unit: string,
      label: string
    }>();

    curves.forEach((curve, index) => {
      // 计算该曲线的数据范围
      const values = data.map(row => row[index + 1] || 0).filter(v => !isNaN(v));
      if (values.length === 0) return;
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
      
      // 根据数量级和单位自动分组
      let scaleKey = curve.scale || 'auto';
      let yAxisLabel = curve.yAxisLabel || '';
      let unit = curve.unit || '';
      
      if (scaleKey === 'auto') {
        // 根据平均值的数量级自动分组
        if (avgValue < 1) {
          scaleKey = 'small'; // 小数值
          yAxisLabel = yAxisLabel || '小数值参数';
        } else if (avgValue < 100) {
          scaleKey = 'medium'; // 中等数值
          yAxisLabel = yAxisLabel || '中等数值参数';
        } else if (avgValue < 10000) {
          scaleKey = 'large'; // 大数值
          yAxisLabel = yAxisLabel || '大数值参数';
        } else {
          scaleKey = 'xlarge'; // 超大数值
          yAxisLabel = yAxisLabel || '超大数值参数';
        }
        
        // 根据参数名称进一步细分
        if (curve.name.includes('温度')) {
          scaleKey = 'temperature';
          yAxisLabel = '温度 (K)';
          unit = 'K';
        } else if (curve.name.includes('压') || curve.name.includes('压力')) {
          scaleKey = 'pressure';
          yAxisLabel = '压力 (kPa)';
          unit = 'kPa';
        } else if (curve.name.includes('转速')) {
          scaleKey = 'speed';
          yAxisLabel = '转速 (rpm)';
          unit = 'rpm';
        } else if (curve.name.includes('流量')) {
          scaleKey = 'flow';
          yAxisLabel = '流量 (kg/s)';
          unit = 'kg/s';
        } else if (curve.name.includes('推力') || curve.name.includes('马力')) {
          scaleKey = 'power';
          yAxisLabel = '功率/推力';
          unit = 'kN/kW';
        } else if (curve.name.includes('面积')) {
          scaleKey = 'area';
          yAxisLabel = '面积 (m²)';
          unit = 'm²';
        } else if (curve.name.includes('速度')) {
          scaleKey = 'velocity';
          yAxisLabel = '速度 (m/s)';
          unit = 'm/s';
        }
      }

      if (!groups.has(scaleKey)) {
        groups.set(scaleKey, {
          curves: [],
          dataRange: [min, max],
          unit: unit,
          label: yAxisLabel
        });
      }

      const group = groups.get(scaleKey)!;
      group.curves.push({ curve, index });
      
      // 更新组的数据范围
      group.dataRange[0] = Math.min(group.dataRange[0], min);
      group.dataRange[1] = Math.max(group.dataRange[1], max);
    });

    return groups;
  }

  // 全屏切换
  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    setTimeout(() => {
      initChart();
    }, 300);
  }

  // 动态加载uPlot
  async function loadUPlot() {
    if (typeof window === "undefined") return;

    try {
      isLoading = true;
      loadError = false;

      if ((window as any).uPlot) {
        uPlot = (window as any).uPlot;
        initChart();
        return;
      }

      const script = document.createElement("script");
      script.src = "/lib/uPlot.iife.js";
      script.onload = () => {
        uPlot = (window as any).uPlot;
        if (uPlot) {
          initChart();
        } else {
          loadError = true;
        }
        isLoading = false;
      };
      script.onerror = () => {
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

  // 初始化多Y轴图表
  function initChart() {
    const currentContainer = isFullscreen ? fullscreenChartContainer : chartContainer;
    
    if (!uPlot || !currentContainer || !data || data.length === 0) {
      return;
    }

    // 清理现有图表
    if (uplot) {
      if ((uplot as any)._cursorUnsubscribe) {
        (uplot as any)._cursorUnsubscribe();
      }
      uplot.destroy();
      uplot = null;
    }

    // 按Y轴分组曲线
    const curveGroups = groupCurvesByScale(curves, data);
    console.log(`图表 ${chartName} 曲线分组:`, curveGroups);

    // 构建series配置
    const series = [
      {
        label: "时间",
        stroke: "transparent",
        fill: "transparent",
      }
    ];

    // 构建scales配置
    const scales: any = {
      x: {
        time: false,
        auto: !xRange || xRange.length !== 2,
        ...(xRange && xRange.length === 2 ? { range: () => xRange } : {}),
      }
    };

    // 构建axes配置
    const axes = [
      {
        label: "时间 (秒)",
        labelSize: 14,
        labelFont: "14px monospace",
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

    // 为每个曲线组创建Y轴和series
    let axisIndex = 1;
    curveGroups.forEach((group, scaleKey) => {
      // 创建Y轴scale
      scales[scaleKey] = {
        auto: true,
        range: (u: any, dataMin: number, dataMax: number) => {
          const range = dataMax - dataMin;
          const margin = range * 0.1;
          return [dataMin - margin, dataMax + margin];
        },
      };

      // 创建Y轴配置
      const yAxisConfig: any = {
        scale: scaleKey,
        label: group.label,
        labelSize: 12,
        labelFont: "12px monospace",
        stroke: colors[axisIndex % colors.length],
        grid: {
          show: axisIndex === 1, // 只有第一个Y轴显示网格
          stroke: "#374151",
          width: 1,
        },
        ticks: {
          show: true,
          stroke: colors[axisIndex % colors.length],
          width: 1,
        },
        side: axisIndex % 2 === 1 ? 1 : 3, // 奇数轴在右侧，偶数轴在左侧
      };

      axes.push(yAxisConfig);

      // 为该组的每条曲线创建series
      group.curves.forEach(({ curve, index }, curveIndex) => {
        const colorIndex = (axisIndex - 1) * 3 + curveIndex;
        const strokeDash = strokeDashArrays[curveIndex % strokeDashArrays.length];
        
        series.push({
          label: curve.name,
          scale: scaleKey,
          stroke: colors[colorIndex % colors.length],
          width: 2,
          fill: "transparent",
          dash: strokeDash,
          points: {
            show: false,
          },
        });
      });

      axisIndex++;
    });

    // uPlot配置
    const opts = {
      width: isFullscreen ? window.innerWidth - 100 : (currentContainer.clientWidth || 800),
      height: isFullscreen ? window.innerHeight - 200 : 400, // 增加高度以容纳多个Y轴
      series: series,
      axes: axes,
      scales: scales,
      legend: {
        show: true,
        live: true,
        markers: {
          width: 2,
          dash: "solid",
        },
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
          size: 8,
          width: 2,
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
                
                // 保存所有Y轴的原始范围
                curveGroups.forEach((group, scaleKey) => {
                  const yScale = u.scales[scaleKey];
                  if (yScale) {
                    originalYRanges.set(scaleKey, [yScale.min, yScale.max]);
                  }
                });
                
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
              const values: Array<{ name: string; value: string; color: string; unit?: string }> = [];
              
              // 按组收集tooltip数据
              let seriesIndex = 1; // 跳过时间轴
              curveGroups.forEach((group, scaleKey) => {
                group.curves.forEach(({ curve, index }) => {
                  const value = data[idx][index + 1];
                  if (value !== undefined) {
                    values.push({
                      name: curve.name,
                      value: value.toFixed(3),
                      color: series[seriesIndex]?.stroke || "#666",
                      unit: curve.unit
                    });
                  }
                  seriesIndex++;
                });
              });

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
      // 初始化游标同步
      cursorSyncStore = getCursorSyncStore(syncGroup);
      
      // 转换数据格式
      const transformedData = transformDataForUPlot(data, curveGroups);
      uplot = new uPlot(opts, transformedData, currentContainer);
      
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
              const values: Array<{ name: string; value: string; color: string; unit?: string }> = [];
              
              let seriesIndex = 1;
              curveGroups.forEach((group, scaleKey) => {
                group.curves.forEach(({ curve, index }) => {
                  const value = data[syncData.idx][index + 1];
                  if (value !== undefined) {
                    values.push({
                      name: curve.name,
                      value: value.toFixed(3),
                      color: series[seriesIndex]?.stroke || "#666",
                      unit: curve.unit
                    });
                  }
                  seriesIndex++;
                });
              });
              
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
      
      // 双击重置缩放
      currentContainer.addEventListener('dblclick', handleDoubleClick);
      
      console.log(`多Y轴图表 ${chartName} 初始化成功`);
      isLoading = false;
    } catch (error) {
      console.error(`图表 ${chartName} 初始化失败:`, error);
      loadError = true;
      isLoading = false;
    }
  }

  // 双击重置缩放
  function handleDoubleClick(event: MouseEvent) {
    if (uplot && isZoomed) {
      if (originalXRange) {
        uplot.setScale('x', { min: originalXRange[0], max: originalXRange[1] });
      }
      
      // 重置所有Y轴
      originalYRanges.forEach((range, scaleKey) => {
        uplot.setScale(scaleKey, { min: range[0], max: range[1] });
      });
      
      isZoomed = false;
      originalXRange = null;
      originalYRanges.clear();
      
      event.preventDefault();
    }
  }

  // 转换数据为uPlot格式
  function transformDataForUPlot(inputData: number[][], curveGroups: Map<string, any>): number[][] {
    if (!inputData || inputData.length === 0) {
      return [[], ...curves.map(() => [])];
    }

    // 时间轴数据
    const timeData = inputData.map((row) => row[0] || 0);
    const result = [timeData];

    // 按组顺序添加曲线数据
    curveGroups.forEach((group, scaleKey) => {
      group.curves.forEach(({ curve, index }: any) => {
        const seriesData = inputData.map((row) => row[index + 1] || 0);
        result.push(seriesData);
      });
    });

    return result;
  }

  // 响应式更新
  $effect(() => {
    if (data && uplot) {
      const curveGroups = groupCurvesByScale(curves, data);
      const transformedData = transformDataForUPlot(data, curveGroups);
      
      setTimeout(() => {
        uplot.setData(transformedData);
      }, 100);
    }
  });

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
      const newHeight = isFullscreen ? window.innerHeight - 200 : 400;
      
      uplot.setSize({
        width: newWidth,
        height: newHeight
      });
    }
  }

  onMount(() => {
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

<svelte:head>
  <link rel="stylesheet" href="/lib/uPlot.min.css" />
</svelte:head>

<!-- 全屏模态框 -->
{#if isFullscreen}
  <div class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-8">
    <div class="w-full h-full bg-gray-900 rounded-lg border border-gray-600 relative">
      <div class="flex justify-between items-center p-4 border-b border-gray-700">
        <h3 class="text-xl font-semibold text-gray-200 flex items-center gap-2">
          <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          {chartName} - 多Y轴全屏查看
        </h3>
        <button 
          class="text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-700 transition-colors"
          onclick={toggleFullscreen}
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
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
                <p class="text-lg">加载多Y轴图表中...</p>
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
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- 正常模式 -->
  <div class="w-full h-full relative">
    <!-- 控制按钮 -->
    <div class="absolute top-2 right-2 z-10 flex gap-1">
      <button 
        class="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-300 hover:text-white transition-colors flex items-center justify-center shadow-lg"
        onclick={toggleFullscreen}
        title="全屏查看多Y轴图表"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
        </svg>
      </button>
    </div>

    <!-- 图表容器 -->
    <div
      bind:this={chartContainer}
      class="w-full h-96 bg-gray-900 rounded border border-gray-600 relative"
      style="min-height: 400px;"
    >
      {#if isLoading}
        <div class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p class="text-sm">加载多Y轴图表中...</p>
          </div>
        </div>
      {:else if loadError}
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
        <div class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 rounded">
          <div class="text-center">
            <div class="text-gray-500 text-2xl mb-2">📊</div>
            <p class="text-sm">准备多Y轴图表中...</p>
          </div>
        </div>
      {/if}
    </div>
    
    <!-- 增强的Tooltip - 显示单位信息 -->
    {#if showTooltip}
      <div
        class="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg pointer-events-none max-w-xs"
        style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; background-color: rgba(31, 41, 55, 0.95); backdrop-filter: blur(4px);"
      >
        <!-- 时间显示 -->
        <div class="text-xs text-gray-300 font-mono mb-2 border-b border-gray-600 pb-1">
          {tooltipData.time}
        </div>

        <!-- 曲线数据 - 按Y轴分组显示 -->
        <div class="space-y-1 max-h-48 overflow-y-auto">
          {#each tooltipData.values as item}
            <div class="flex items-center gap-2 text-xs">
              <!-- 颜色指示器 -->
              <div
                class="w-3 h-0.5 rounded flex-shrink-0"
                style="background-color: {item.color};"
              ></div>
              <!-- 参数名称 -->
              <span class="text-gray-300 flex-1 truncate text-left" title={item.name}>
                {item.name}
              </span>
              <!-- 数值和单位 -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <span class="text-white font-mono">
                  {item.value}
                </span>
                {#if item.unit}
                  <span class="text-gray-400 text-xs">
                    {item.unit}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
</script>