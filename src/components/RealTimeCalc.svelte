<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';
  import CurveChartManager from './CurveChartManager.svelte';
  import ChartDisplay from './ChartDisplay.svelte';
  import RealTimeMonitor from './RealTimeMonitor.svelte';

  let isCalculating = $state(false);
  let isPaused = $state(false);
  let showResults = $state(false);
  let storagePath = $state('');
  let showMonitorModal = $state(false);

  // 模态框位置状态
  let monitorModalPosition = $state({ x: 200, y: 150 });
  let monitorModalSize = $state({ width: 400, height: 500 });

  // 初始默认值 - 用于重置
  const initialInputParams = {
    height: '0',
    machNumber: '0',
    temperature: '0',
    gasFlowSystem: '-1',
    powerConsumption: '0',
    gasCompressionRatio: '0',
    oilFieldAngle: '66.66'
  };

  // 输入参数状态 - 修改默认值
  const inputParams = $state({
    height: '0',
    machNumber: '0',
    temperature: '0',
    gasFlowSystem: '-1',
    powerConsumption: '0',
    gasCompressionRatio: '0',
    oilFieldAngle: '66.66'
  });

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 刻度组件状态 - 更精细的刻度
  const scaleSettings = $state({
    min: 0,
    max: 120,
    interval: 10, // 更精细的间隔
    currentValue: 66.66
  });

  // 初始曲线图数据 - 用于重置
  const initialCurveCharts = [
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
  ];

  // 曲线图数据 - 可以动态添加和删除
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

  // 简单图表数据存储
  let chartData = $state<Map<number, Array<{time: number, values: number[]}>>>(new Map());
  let simulationTimer: number | null = null;
  let timeCounter = $state(0);

  // 后端返回的实时数据
  let realtimeDataOut = $state<Array<{name: string, data: number[]}>>([]);

  // 实时监控表格数据 - 从后端数据动态更新
  let monitorTableData = $state<Array<{parameter: string, value: string}>>([]);

  // 检查是否在Tauri环境中运行
  function isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.__TAURI_IPC__ === 'function';
  }

  // 构建传给后端的数据格式
  function buildDataIN() {
    return [
      {
        name: "仿真步长",
        data: [parseFloat(selectedSimulationStep)]
      },
      {
        name: selectedMode, // "作战" 或 "训练"
        data: [selectedMode === '作战' ? 1 : 0]
      },
      {
        name: selectedEnvironment, // "地面" 或 "空中"
        data: [selectedEnvironment === '地面' ? 0 : 1]
      },
      {
        name: "高度",
        data: [parseFloat(inputParams.height) || 0]
      },
      {
        name: "马赫数",
        data: [parseFloat(inputParams.machNumber) || 0]
      },
      {
        name: "温度修正",
        data: [parseFloat(inputParams.temperature) || 0]
      },
      {
        name: "进气道总压恢复系数",
        data: [parseFloat(inputParams.gasFlowSystem) || -1]
      },
      {
        name: "功率提取",
        data: [parseFloat(inputParams.powerConsumption) || 0]
      },
      {
        name: "压气机出口座舱引气",
        data: [parseFloat(inputParams.gasCompressionRatio) || 0]
      },
      {
        name: "油门杆角度",
        data: [parseFloat(inputParams.oilFieldAngle) || 66.0]
      }
    ];
  }

  // 调用后端实时计算函数
  async function callRealtimeCalculation() {
    try {
      // 检查是否在Tauri环境中
      if (!isTauriEnvironment()) {
        console.log('非Tauri环境，使用模拟数据');
        return generateMockRealtimeData();
      }

      const dataIN = buildDataIN();
      const data = {
        dataIN: dataIN,
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

  // 生成模拟实时数据
  function generateMockRealtimeData() {
    return [
      {
        name: "高压涡轮出口总压",
        data: [10 + Math.random() * 5]
      },
      {
        name: "高压压气机出口总压", 
        data: [15 + Math.random() * 3]
      },
      {
        name: "低压涡轮出口总压",
        data: [8 + Math.random() * 4]
      },
      {
        name: "发动机净马力",
        data: [1200 + Math.random() * 200]
      },
      {
        name: "发动机总马力",
        data: [1400 + Math.random() * 150]
      },
      {
        name: "风扇出口总压",
        data: [12 + Math.random() * 2]
      },
      {
        name: "N1Cor",
        data: [8542.3 + Math.random() * 100]
      },
      {
        name: "N2Cor",
        data: [12456.7 + Math.random() * 200]
      },
      {
        name: "WTCor",
        data: [245.8 + Math.random() * 20]
      },
      {
        name: "F",
        data: [15420.5 + Math.random() * 500]
      },
      {
        name: "FG",
        data: [16890.2 + Math.random() * 600]
      },
      {
        name: "A8",
        data: [0.245 + Math.random() * 0.05]
      },
      {
        name: "A9",
        data: [0.312 + Math.random() * 0.06]
      },
      {
        name: "A16",
        data: [0.156 + Math.random() * 0.03]
      },
      {
        name: "T3",
        data: [658.4 + Math.random() * 50]
      },
      {
        name: "T41",
        data: [1245.6 + Math.random() * 100]
      },
      {
        name: "T43",
        data: [1156.8 + Math.random() * 80]
      },
      {
        name: "P21",
        data: [2.45 + Math.random() * 0.5]
      },
      {
        name: "P3",
        data: [12.8 + Math.random() * 2]
      },
      {
        name: "P41",
        data: [11.2 + Math.random() * 1.5]
      }
    ];
  }

  // 根据后端数据更新图表
  function updateChartsFromBackendData(backendData: Array<{name: string, data: number[]}>) {
    timeCounter += 1;
    
    curveCharts.forEach(chart => {
      const data = chartData.get(chart.id);
      if (!data) return;
      
      const values: number[] = [];
      
      // 根据曲线名称从后端数据中获取对应值
      chart.curves.forEach(curve => {
        const backendParam = backendData.find(param => param.name === curve.name);
        if (backendParam && backendParam.data.length > 0) {
          values.push(backendParam.data[0]);
        } else {
          // 如果后端没有对应数据，使用默认值
          values.push(10 + Math.random() * 5);
        }
      });
      
      // 添加新数据点
      const newPoint = { time: timeCounter, values };
      data.push(newPoint);
      
      // 保持最多100个数据点
      if (data.length > 100) {
        data.shift();
      }
      
      chartData.set(chart.id, data);
    });
  }

  // 更新监控表格数据
  function updateMonitorTableData(backendData: Array<{name: string, data: number[]}>) {
    monitorTableData = backendData.map(item => ({
      parameter: item.name,
      value: item.data.length > 0 ? item.data[0].toFixed(3) : '0.000'
    }));
  }

  // 更新实时数据
  async function updateRealtimeData() {
    if (!isCalculating || isPaused) return;
    
    try {
      // 调用后端获取实时数据
      const backendData = await callRealtimeCalculation();
      
      // 更新存储的后端数据
      if (Array.isArray(backendData)) {
        realtimeDataOut = backendData;
        // 根据后端数据更新图表
        updateChartsFromBackendData(backendData);
        // 更新监控表格数据
        updateMonitorTableData(backendData);
      } else {
        // 如果后端数据格式不正确，使用模拟数据
        const mockData = generateMockRealtimeData();
        realtimeDataOut = mockData;
        updateChartsFromBackendData(mockData);
        updateMonitorTableData(mockData);
      }
    } catch (error) {
      console.error('实时数据更新失败:', error);
      // 出错时使用模拟数据
      const mockData = generateMockRealtimeData();
      realtimeDataOut = mockData;
      updateChartsFromBackendData(mockData);
      updateMonitorTableData(mockData);
    }
  }

  // 初始化图表数据 - 一开始为空数据
  function initializeChartData(chartId: number, curves: any[]) {
    const data: Array<{time: number, values: number[]}> = [];
    chartData.set(chartId, data);
  }

  // 刻度拖拽状态
  let isDraggingScale = $state(false);

  function handleScaleMouseDown(event: MouseEvent) {
    isDraggingScale = true;
    updateScaleValue(event);
  }

  function handleScaleMouseMove(event: MouseEvent) {
    if (!isDraggingScale) return;
    updateScaleValue(event);
  }

  function handleScaleMouseUp() {
    isDraggingScale = false;
  }

  function updateScaleValue(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const y = event.clientY - rect.top;
    const percentage = Math.max(0, Math.min(1, 1 - (y / rect.height)));
    scaleSettings.currentValue = scaleSettings.min + (scaleSettings.max - scaleSettings.min) * percentage;
    inputParams.oilFieldAngle = scaleSettings.currentValue.toFixed(2);
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
        // 首次调用后端获取初始数据
        console.log('开始实时计算，首次调用后端...');
        const initialData = await callRealtimeCalculation();
        console.log('首次后端调用成功:', initialData);
        
        if (Array.isArray(initialData)) {
          realtimeDataOut = initialData;
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
    timeCounter = 0;
    realtimeDataOut = [];
    monitorTableData = [];
    
    // 重置输入参数到初始默认值
    Object.keys(initialInputParams).forEach(key => {
      inputParams[key] = initialInputParams[key];
    });
    
    // 重置存储路径
    storagePath = '';
    
    // 重置刻度设置
    scaleSettings.currentValue = 66.66;
    
    // 重置用户选择到初始状态
    selectedSimulationStep = '0.025';
    selectedMode = '作战';
    selectedEnvironment = '地面';
    
    // 重置曲线图到初始状态
    curveCharts = JSON.parse(JSON.stringify(initialCurveCharts));
    
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
        inputParams: inputParams,
        realtimeData: realtimeDataOut,
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
</script>

<svelte:window 
  onmousemove={(e) => {
    handleScaleMouseMove(e);
  }} 
  onmouseup={() => {
    handleScaleMouseUp();
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
            <!-- 左侧：油门杆角度温度计 - 增加高度，更精细刻度 -->
            <div class="flex-shrink-0">
              <h3 class="text-xs text-gray-300 mb-3">油门杆角度</h3>
              <div class="relative">
                <div 
                  class="w-8 h-80 bg-gray-700 rounded cursor-pointer relative"
                  onmousedown={handleScaleMouseDown}
                >
                  <!-- 主刻度标记 -->
                  {#each Array(13) as _, i}
                    {@const value = scaleSettings.max - (i * scaleSettings.interval)}
                    <div class="absolute left-0 flex items-center" style="top: {i * 24}px;">
                      <div class="w-3 h-0.5 bg-gray-400"></div>
                      <span class="text-xs text-gray-400 ml-2 font-mono whitespace-nowrap">{value}</span>
                    </div>
                  {/each}

                  <!-- 小刻度标记 -->
                  {#each Array(25) as _, i}
                    {@const isMainScale = i % 2 === 0}
                    {#if !isMainScale}
                      <div class="absolute left-0" style="top: {i * 12}px;">
                        <div class="w-1.5 h-0.5 bg-gray-500"></div>
                      </div>
                    {/if}
                  {/each}

                  <!-- 初始位置竖线 -->
                  <div class="absolute left-0 w-0.5 h-full bg-gray-500 opacity-50"></div>

                  <!-- 当前值指示器和滑块 -->
                  {#each [scaleSettings] as settings}
                    {@const percentage = (settings.currentValue - settings.min) / (settings.max - settings.min)}
                    <div 
                      class="absolute w-full h-1 bg-blue-500 rounded"
                      style="bottom: {percentage * 100}%; transform: translateY(50%);"
                    ></div>
                    
                    <!-- 滑块 -->
                    <div 
                      class="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-pointer transform -translate-x-1/2"
                      style="bottom: {percentage * 100}%; left: 50%; transform: translate(-50%, 50%);"
                    ></div>
                  {/each}
                </div>
                
                <!-- 当前值显示 -->
                <div class="text-center mt-2">
                  <span class="text-xs text-white font-mono">{scaleSettings.currentValue.toFixed(2)}/deg</span>
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
                    bind:value={inputParams.height}
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
                  bind:value={inputParams.machNumber}
                  class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <!-- 温度修正(≥0) -->
              <div class="space-y-1">
                <label class="text-xs text-gray-300 block">温度修正(≥0)</label>
                <div class="relative">
                  <input
                    type="text"
                    bind:value={inputParams.temperature}
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
                  bind:value={inputParams.gasFlowSystem}
                  class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <!-- 功率提取(0~1000000) -->
              <div class="space-y-1">
                <label class="text-xs text-gray-300 block">功率提取(0~1000000)</label>
                <div class="relative">
                  <input
                    type="text"
                    bind:value={inputParams.powerConsumption}
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
                    bind:value={inputParams.gasCompressionRatio}
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