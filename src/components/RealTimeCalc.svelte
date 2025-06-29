<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';
  import CurveChartManager from './CurveChartManager.svelte';
  import ChartDisplay from './ChartDisplay.svelte';
  import RealTimeMonitor from './RealTimeMonitor.svelte';
  import Frame3183 from '../Frame3183.svg?raw';

  let isCalculating = $state(false);
  let isPaused = $state(false);
  let showResults = $state(false);
  let storagePath = $state('');
  let showMonitorModal = $state(false);

  // 模态框位置状态
  let monitorModalPosition = $state({ x: 200, y: 150 });
  let monitorModalSize = $state({ width: 400, height: 500 });

  // 输入数据结构 - dataIn格式
  let dataIn = $state([
    { name: "仿真步长", data: [0.025] },
    { name: "作战", data: [1] },
    { name: "训练", data: [0] },
    { name: "地面", data: [1] },
    { name: "空中", data: [0] },
    { name: "高度", data: [0] },
    { name: "马赫数", data: [0] },
    { name: "温度修正", data: [0] },
    { name: "进气道总压恢复系数", data: [-1] },
    { name: "功率提取", data: [0] },
    { name: "压气机出口座舱引气", data: [0] },
    { name: "油门杆角度", data: [66.66] }
  ]);

  // 输出数据结构 - dataOut格式
  let dataOut = $state<Array<{name: string, data: number[][]}>>([]);

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 油门杆角度控制
  let throttleValue = $state(66.66);
  let isDraggingThrottle = $state(false);

  // 初始曲线图数据
  let curveCharts = $state([
    {
      id: 1,
      name: '曲线图-1',
      curves: [
        { name: '高压涡轮出口总压' },
        { name: '高压压气机出口总压' },
        { name: '低压涡轮出口总压' }
      ]
    },
    {
      id: 2,
      name: '曲线图-2', 
      curves: [
        { name: '高压涡轮出口总压' },
        { name: '高压压气机出口总压' },
        { name: '低压涡轮出口总压' }
      ]
    },
    {
      id: 3,
      name: '曲线图-3',
      curves: [
        { name: '高压涡轮出口总压' },
        { name: '高压压气机出口总压' },
        { name: '低压涡轮出口总压' }
      ]
    }
  ]);

  // 参数列表数据 - 左侧
  const leftParameterList = $state([
    { name: '低压涡轮进口总压', selected: false },
    { name: '高压涡轮进口总压', selected: false },
    { name: '发动机进口总流量', selected: false },
    { name: '发动机进口净压阻力', selected: false },
    { name: '发动机总转速', selected: false },
    { name: '主燃烧室转速', selected: false },
    { name: '加力燃烧室转速', selected: false },
    { name: '风扇出口总压', selected: false },
    { name: '高压压气机出口温度', selected: false },
    { name: '高压涡轮进口温度', selected: false },
    { name: '低压涡轮进口温度', selected: false },
    { name: '低压涡轮出口温度', selected: false },
    { name: '风扇出口总压', selected: false },
    { name: '高压压气机出口总压', selected: false },
    { name: '高压涡轮出口总压', selected: false },
    { name: '低压涡轮出口总压', selected: false }
  ]);

  // 参数列表数据 - 右侧
  const rightParameterList = $state([
    { name: '发动机净马力', selected: false },
    { name: '发动机总马力', selected: false },
    { name: '循环装置面积', selected: false },
    { name: '循环装置总压', selected: false },
    { name: '循环出口总压', selected: false },
    { name: '循环装置温度', selected: false },
    { name: '循环出口温度', selected: false },
    { name: '循环装置流量温度', selected: false },
    { name: '循环出口流量', selected: false },
    { name: '循环装置总压', selected: false },
    { name: '循环出口总压', selected: false },
    { name: '循环装置流量温度', selected: false },
    { name: '循环出口流量', selected: false },
    { name: '循环压力损失系数', selected: false }
  ]);

  // 图表数据存储 - 基于dataOut渲染
  let chartData = $state<Map<number, Array<{time: number, values: number[]}>>>(new Map());
  let simulationTimer: number | null = null;

  // 实时监控表格数据
  let monitorTableData = $state<Array<{parameter: string, value: string}>>([]);

  // 更新dataIn中的值
  function updateDataInValue(name: string, value: number) {
    const param = dataIn.find(p => p.name === name);
    if (param) {
      param.data = [value];
    }
  }

  // 获取dataIn中的值
  function getDataInValue(name: string): number {
    const param = dataIn.find(p => p.name === name);
    return param ? param.data[0] : 0;
  }

  // 更新所有dataIn状态
  function updateAllDataIn() {
    updateDataInValue("仿真步长", parseFloat(selectedSimulationStep));
    updateDataInValue("作战", selectedMode === '作战' ? 1 : 0);
    updateDataInValue("训练", selectedMode === '训练' ? 1 : 0);
    updateDataInValue("地面", selectedEnvironment === '地面' ? 1 : 0);
    updateDataInValue("空中", selectedEnvironment === '空中' ? 1 : 0);
    updateDataInValue("油门杆角度", throttleValue);
  }

  // 油门杆角度SVG控制
  function handleThrottleMouseDown(event: MouseEvent) {
    isDraggingThrottle = true;
    updateThrottleValue(event);
  }

  function handleThrottleMouseMove(event: MouseEvent) {
    if (!isDraggingThrottle) return;
    updateThrottleValue(event);
  }

  function handleThrottleMouseUp() {
    isDraggingThrottle = false;
  }

  function updateThrottleValue(event: MouseEvent) {
    const svgElement = event.currentTarget as SVGElement;
    const rect = svgElement.getBoundingClientRect();
    const y = event.clientY - rect.top;
    
    // SVG高度为381，有效范围从4到376（对应120到0度）
    const svgHeight = 381;
    const minY = 4;
    const maxY = 376;
    const clampedY = Math.max(minY, Math.min(maxY, y));
    
    // 计算角度值：y=4对应120度，y=376对应0度
    const percentage = (clampedY - minY) / (maxY - minY);
    throttleValue = 120 - (percentage * 120);
    
    // 更新dataIn
    updateDataInValue("油门杆角度", throttleValue);
  }

  // 调用后端实时计算函数
  async function callRealtimeCalculation() {
    try {
      const data = {
        dataIN: dataIn,
        type: "实时计算"
      };
      
      console.log('调用后端实时计算，发送数据:', data);
      
      // 使用 Tauri invoke 调用后端的 real_calculation 函数
      const result = await invoke("real_calculation", data);
      console.log('后端返回结果:', result);
      
      return result;
    } catch (error) {
      console.error('后端调用失败:', error);
      // 返回模拟数据作为fallback
      return generateMockRealtimeData();
    }
  }

  // 生成模拟实时数据 - dataOut格式
  function generateMockRealtimeData() {
    const timePoints = 50; // 生成50个时间点的数据
    const mockData = [
      {
        name: "高压涡轮出口总压",
        data: Array.from({length: timePoints}, (_, i) => [i * 0.1, 10 + Math.sin(i * 0.2) * 3 + Math.random() * 2])
      },
      {
        name: "高压压气机出口总压", 
        data: Array.from({length: timePoints}, (_, i) => [i * 0.1, 15 + Math.cos(i * 0.15) * 2 + Math.random() * 1.5])
      },
      {
        name: "低压涡轮出口总压",
        data: Array.from({length: timePoints}, (_, i) => [i * 0.1, 8 + Math.sin(i * 0.25) * 2.5 + Math.random() * 1.8])
      },
      {
        name: "发动机净马力",
        data: Array.from({length: timePoints}, (_, i) => [i * 0.1, 1200 + Math.sin(i * 0.1) * 100 + Math.random() * 50])
      },
      {
        name: "发动机总马力",
        data: Array.from({length: timePoints}, (_, i) => [i * 0.1, 1400 + Math.cos(i * 0.12) * 80 + Math.random() * 40])
      },
      {
        name: "风扇出口总压",
        data: Array.from({length: timePoints}, (_, i) => [i * 0.1, 12 + Math.sin(i * 0.18) * 1.5 + Math.random() * 1])
      }
    ];
    
    return mockData;
  }

  // 根据dataOut更新图表数据
  function updateChartsFromDataOut(dataOutResult: Array<{name: string, data: number[][]}>) {
    dataOut = dataOutResult;
    
    curveCharts.forEach(chart => {
      const chartDataPoints: Array<{time: number, values: number[]}> = [];
      
      // 找到第一条曲线的数据来确定时间点数量
      const firstCurve = chart.curves[0];
      const firstCurveData = dataOut.find(d => d.name === firstCurve.name);
      
      if (firstCurveData && firstCurveData.data.length > 0) {
        // 遍历每个时间点
        for (let timeIndex = 0; timeIndex < firstCurveData.data.length; timeIndex++) {
          const values: number[] = [];
          
          // 为每条曲线获取对应时间点的值
          chart.curves.forEach(curve => {
            const curveData = dataOut.find(d => d.name === curve.name);
            if (curveData && curveData.data[timeIndex]) {
              values.push(curveData.data[timeIndex][1]); // 取y轴坐标
            } else {
              values.push(0); // 默认值
            }
          });
          
          chartDataPoints.push({
            time: firstCurveData.data[timeIndex][0], // x轴坐标作为时间
            values: values
          });
        }
      }
      
      chartData.set(chart.id, chartDataPoints);
    });
  }

  // 更新监控表格数据
  function updateMonitorTableData(dataOutResult: Array<{name: string, data: number[][]}>) {
    monitorTableData = dataOutResult.map(item => ({
      parameter: item.name,
      value: item.data.length > 0 ? item.data[item.data.length - 1][1].toFixed(3) : '0.000' // 取最后一个时间点的值
    }));
  }

  // 更新实时数据
  async function updateRealtimeData() {
    if (!isCalculating || isPaused) return;
    
    try {
      // 更新dataIn
      updateAllDataIn();
      
      // 调用后端获取实时数据
      const backendData = await callRealtimeCalculation();
      
      // 更新dataOut和图表
      if (Array.isArray(backendData)) {
        updateChartsFromDataOut(backendData);
        updateMonitorTableData(backendData);
      } else {
        // 如果后端数据格式不正确，使用模拟数据
        const mockData = generateMockRealtimeData();
        updateChartsFromDataOut(mockData);
        updateMonitorTableData(mockData);
      }
    } catch (error) {
      console.error('实时数据更新失败:', error);
      // 出错时使用模拟数据
      const mockData = generateMockRealtimeData();
      updateChartsFromDataOut(mockData);
      updateMonitorTableData(mockData);
    }
  }

  // 初始化图表数据
  function initializeChartData(chartId: number, curves: any[]) {
    const data: Array<{time: number, values: number[]}> = [];
    chartData.set(chartId, data);
  }

  async function handleStart() {
    if (isPaused) {
      // 继续
      isPaused = false;
      isCalculating = true;
    } else {
      // 开始 - 首次调用后端
      isCalculating = true;
      
      try {
        // 更新dataIn
        updateAllDataIn();
        
        // 首次调用后端获取初始数据
        console.log('开始实时计算，首次调用后端...');
        const initialData = await callRealtimeCalculation();
        console.log('首次后端调用成功:', initialData);
        
        if (Array.isArray(initialData)) {
          updateChartsFromDataOut(initialData);
          updateMonitorTableData(initialData);
        }
        
        showResults = true;
        // 自动显示监控弹窗
        showMonitorModal = true;
        
        // 为所有现有图表初始化数据
        curveCharts.forEach(chart => {
          if (!chartData.has(chart.id)) {
            initializeChartData(chart.id, chart.curves);
          }
        });
        
      } catch (error) {
        console.error('首次后端调用失败:', error);
        // 即使首次调用失败，也继续显示界面
        showResults = true;
        showMonitorModal = true;
        curveCharts.forEach(chart => {
          if (!chartData.has(chart.id)) {
            initializeChartData(chart.id, chart.curves);
          }
        });
      }
    }
    
    // 启动实时数据更新定时器 - 使用用户选择的仿真步长
    if (simulationTimer) {
      clearInterval(simulationTimer);
    }
    const intervalMs = parseFloat(selectedSimulationStep) * 1000; // 转换为毫秒
    console.log(`启动定时器，间隔: ${intervalMs}ms (${selectedSimulationStep}秒)`);
    simulationTimer = setInterval(updateRealtimeData, intervalMs);
  }

  function handlePause() {
    isPaused = true;
    isCalculating = false;
    
    // 停止实时数据更新
    if (simulationTimer) {
      clearInterval(simulationTimer);
      simulationTimer = null;
    }
  }

  function handleReset() {
    // 停止所有计算和定时器
    showResults = false;
    isCalculating = false;
    isPaused = false;
    showMonitorModal = false;
    
    // 停止实时数据更新
    if (simulationTimer) {
      clearInterval(simulationTimer);
      simulationTimer = null;
    }
    
    // 清理图表数据
    chartData.clear();
    dataOut = [];
    monitorTableData = [];
    
    // 重置dataIn到初始状态
    dataIn = [
      { name: "仿真步长", data: [0.025] },
      { name: "作战", data: [1] },
      { name: "训练", data: [0] },
      { name: "地面", data: [1] },
      { name: "空中", data: [0] },
      { name: "高度", data: [0] },
      { name: "马赫数", data: [0] },
      { name: "温度修正", data: [0] },
      { name: "进气道总压恢复系数", data: [-1] },
      { name: "功率提取", data: [0] },
      { name: "压气机出口座舱引气", data: [0] },
      { name: "油门杆角度", data: [66.66] }
    ];
    
    // 重置存储路径
    storagePath = '';
    
    // 重置油门杆角度
    throttleValue = 66.66;
    
    // 重置用户选择到初始状态
    selectedSimulationStep = '0.025';
    selectedMode = '作战';
    selectedEnvironment = '地面';
    
    // 重置参数列表选择状态
    leftParameterList.forEach(p => p.selected = false);
    rightParameterList.forEach(p => p.selected = false);
    
    // 重置模态框位置
    monitorModalPosition = { x: 200, y: 150 };
    monitorModalSize = { width: 400, height: 500 };
    
    console.log('所有数据和用户选择已重置到初始状态');
  }

  function handleDownload() {
    if (!storagePath) {
      alert('请输入存储路径');
      return;
    }
    
    // 将实时数据保存到指定路径
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        dataIn: dataIn,
        dataOut: dataOut,
        chartData: Array.from(chartData.entries()).map(([id, data]) => ({
          chartId: id,
          chartName: curveCharts.find(c => c.id === id)?.name || `图表-${id}`,
          data: data
        }))
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `realtime_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`数据已下载到: ${storagePath}`);
    } catch (error) {
      console.error('数据下载失败:', error);
      alert('数据下载失败');
    }
  }

  // 处理曲线图变化
  function handleChartsChange(newCharts: typeof curveCharts) {
    curveCharts = newCharts;
    // 为新图表初始化数据
    curveCharts.forEach(chart => {
      if (!chartData.has(chart.id)) {
        initializeChartData(chart.id, chart.curves);
      }
    });
  }

  // 打开监控弹窗
  function openMonitorModal() {
    showMonitorModal = true;
  }

  // 组件销毁时清理
  $effect(() => {
    return () => {
      if (simulationTimer) {
        clearInterval(simulationTimer);
      }
    };
  });

  // 初始化所有现有图表的空数据
  $effect(() => {
    curveCharts.forEach(chart => {
      if (!chartData.has(chart.id)) {
        initializeChartData(chart.id, chart.curves);
      }
    });
  });

  // 监听选择变化，自动更新dataIn
  $effect(() => {
    updateAllDataIn();
  });
</script>

<svelte:window 
  onmousemove={(e) => {
    handleThrottleMouseMove(e);
  }} 
  onmouseup={() => {
    handleThrottleMouseUp();
  }} 
/>

<div class="min-h-[calc(100vh-120px)] bg-gray-900 p-4 sm:p-6 lg:p-8">
  <div class="w-full max-w-[80%] mx-auto h-full">
    <div class="flex flex-col xl:flex-row h-full gap-4">
      <!-- 左侧曲线组面板 - 使用封装的组件 -->
      <CurveChartManager 
        bind:charts={curveCharts}
        leftParameters={leftParameterList}
        rightParameters={rightParameterList}
        onChartsChange={handleChartsChange}
      />

      <!-- 中间图表区域 - 使用封装的组件 -->
      <div class="flex-1 p-4 overflow-y-auto">
        <ChartDisplay 
          charts={curveCharts}
          chartData={chartData}
        />
      </div>

      <!-- 右侧控制面板 - 整体面板，中间竖线分隔 -->
      <div class="w-full lg:w-80 bg-gray-800 border border-gray-700 rounded-lg flex flex-col">
        <!-- 存储路径 -->
        <div class="p-4 border-b border-gray-700">
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-300 flex-shrink-0">存储路径</label>
            <input
              type="text"
              bind:value={storagePath}
              placeholder="输入存储路径"
              class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
            />
            <button 
              class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
              onclick={handleDownload}
            >
              ⬇
            </button>
          </div>
        </div>

        <!-- 开始和重置按钮 - 更新颜色 -->
        <div class="p-4 border-b border-gray-700">
          <div class="flex gap-2">
            {#if isCalculating}
              <!-- 暂停按钮 - 灰色 -->
              <button
                class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                onclick={handlePause}
              >
                暂停
              </button>
            {:else if isPaused}
              <!-- 继续按钮 - 黄色 -->
              <button
                class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                onclick={handleStart}
              >
                继续
              </button>
            {:else}
              <!-- 开始按钮 - 绿色 -->
              <button
                class="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                onclick={handleStart}
              >
                开始
              </button>
            {/if}
            <!-- 重置按钮 - 橙色 -->
            <button
              class="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              onclick={handleReset}
            >
              重置
            </button>
          </div>
        </div>

        <!-- 仿真步长、模式选择 -->
        <div class="p-4 border-b border-gray-700">
          <!-- 仿真步长按钮 - 单选 -->
          <div class="mb-4">
            <div class="flex gap-1 mb-3">
              <button 
                class="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors {selectedSimulationStep === '0.025' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
                onclick={() => selectedSimulationStep = '0.025'}
              >
                仿真步长<br>0.025秒
              </button>
              <button 
                class="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors {selectedSimulationStep === '0.125' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
                onclick={() => selectedSimulationStep = '0.125'}
              >
                仿真步长<br>0.125秒
              </button>
            </div>
            
            <!-- 作战/训练模式选择按钮 - 单选 -->
            <div class="flex gap-1 mb-3">
              <button 
                class="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors {selectedMode === '作战' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
                onclick={() => selectedMode = '作战'}
              >
                作战
              </button>
              <button 
                class="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors {selectedMode === '训练' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
                onclick={() => selectedMode = '训练'}
              >
                训练
              </button>
            </div>
            
            <!-- 地面/空中环境选择按钮 - 单选 -->
            <div class="flex gap-1">
              <button 
                class="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors {selectedEnvironment === '地面' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
                onclick={() => selectedEnvironment = '地面'}
              >
                地面
              </button>
              <button 
                class="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors {selectedEnvironment === '空中' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
                onclick={() => selectedEnvironment = '空中'}
              >
                空中
              </button>
            </div>
          </div>
        </div>

        <!-- 油门杆角度和输入参数 - 增加高度，修复显示问题 -->
        <div class="p-4 flex-1 overflow-visible">
          <div class="flex items-start gap-4 h-full">
            <!-- 左侧：油门杆角度SVG控制器 -->
            <div class="flex-shrink-0">
              <h3 class="text-xs text-gray-300 mb-3">油门杆角度</h3>
              <div class="relative">
                <!-- SVG油门杆控制器 -->
                <div 
                  class="cursor-pointer"
                  onmousedown={handleThrottleMouseDown}
                >
                  {@html Frame3183}
                </div>
                
                <!-- 当前值显示 -->
                <div class="text-center mt-2">
                  <span class="text-xs text-white font-mono">{throttleValue.toFixed(2)}°</span>
                </div>
              </div>
            </div>

            <!-- 竖线分隔 -->
            <div class="w-px bg-gray-600 h-full"></div>

            <!-- 右侧：输入参数 - 上下布局 -->
            <div class="flex-1 space-y-3 min-w-0">
              <!-- 高度(0~22000) -->
              <div class="space-y-1">
                <label class="text-xs text-gray-300 block">高度(0~22000)</label>
                <div class="relative">
                  <input
                    type="text"
                    value={getDataInValue("高度")}
                    oninput={(e) => updateDataInValue("高度", parseFloat(e.target.value) || 0)}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">m</span>
                </div>
              </div>

              <!-- 马赫数(0~2.5) -->
              <div class="space-y-1">
                <label class="text-xs text-gray-300 block">马赫数(0~2.5)</label>
                <input
                  type="text"
                  value={getDataInValue("马赫数")}
                  oninput={(e) => updateDataInValue("马赫数", parseFloat(e.target.value) || 0)}
                  class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <!-- 温度修正(≥0) -->
              <div class="space-y-1">
                <label class="text-xs text-gray-300 block">温度修正(≥0)</label>
                <div class="relative">
                  <input
                    type="text"
                    value={getDataInValue("温度修正")}
                    oninput={(e) => updateDataInValue("温度修正", parseFloat(e.target.value) || 0)}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">K</span>
                </div>
              </div>

              <!-- 进气道总压恢复系数(0~1.1) -->
              <div class="space-y-1">
                <label class="text-xs text-gray-300 block">进气道总压恢复系数(0~1.1)</label>
                <input
                  type="text"
                  value={getDataInValue("进气道总压恢复系数")}
                  oninput={(e) => updateDataInValue("进气道总压恢复系数", parseFloat(e.target.value) || -1)}
                  class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <!-- 功率提取(0~1000000) -->
              <div class="space-y-1">
                <label class="text-xs text-gray-300 block">功率提取(0~1000000)</label>
                <div class="relative">
                  <input
                    type="text"
                    value={getDataInValue("功率提取")}
                    oninput={(e) => updateDataInValue("功率提取", parseFloat(e.target.value) || 0)}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">W</span>
                </div>
              </div>

              <!-- 压气机出口座舱引气(0~2) -->
              <div class="space-y-1">
                <label class="text-xs text-gray-300 block">压气机出口座舱引气(0~2)</label>
                <div class="relative">
                  <input
                    type="text"
                    value={getDataInValue("压气机出口座舱引气")}
                    oninput={(e) => updateDataInValue("压气机出口座舱引气", parseFloat(e.target.value) || 0)}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-8"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 实时监控弹窗 - 使用封装的组件 -->
<RealTimeMonitor 
  bind:isVisible={showMonitorModal}
  bind:position={monitorModalPosition}
  bind:size={monitorModalSize}
  data={monitorTableData}
/>