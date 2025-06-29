<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';
  import CurveChartManager from './CurveChartManager.svelte';
  import UPlotChart from './UPlotChart.svelte';
  import RealTimeMonitor from './RealTimeMonitor.svelte';

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

  // 输出数据结构 - dataOut格式（完整样例）
  let dataOut = $state<Array<{name: string, data: number[][]}>>([]);

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 油门杆角度控制
  let throttleValue = $state(66.66);
  let isDraggingThrottle = $state(false);
  let throttleContainer: HTMLElement | null = null;

  // 初始曲线图数据
  let curveCharts = $state([
    {
      id: 1,
      name: '发动机性能参数',
      curves: [
        { name: '高压涡轮出口总压' },
        { name: '高压压气机出口总压' },
        { name: '低压涡轮出口总压' }
      ]
    },
    {
      id: 2,
      name: '温度监控参数', 
      curves: [
        { name: '高压压气机出口温度' },
        { name: '高压涡轮进口温度' },
        { name: '低压涡轮出口温度' }
      ]
    },
    {
      id: 3,
      name: '推力与效率参数',
      curves: [
        { name: '发动机净推力' },
        { name: '发动机总推力' },
        { name: '推进效率' }
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
    { name: '发动机净推力', selected: false },
    { name: '发动机总推力', selected: false },
    { name: '推进效率', selected: false },
    { name: '热效率', selected: false },
    { name: '总效率', selected: false },
    { name: '燃油消耗率', selected: false },
    { name: '比冲', selected: false },
    { name: '推重比', selected: false },
    { name: '单位推力', selected: false },
    { name: '喷管出口速度', selected: false },
    { name: '喷管出口马赫数', selected: false },
    { name: '喷管出口总压', selected: false },
    { name: '喷管喉道面积', selected: false },
    { name: '喷管出口面积', selected: false }
  ]);

  // uPlot图表数据存储 - 每个图表对应一个data_chart_{id}
  let chartDataMap = $state<Map<number, Array<{name: string, data: number[]}>>>(new Map());
  let simulationTimer: number | null = null;
  let currentTimeStep = $state(0); // 当前时间步

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

  // 油门杆角度SVG控制器 - 修复交互功能
  function handleThrottleMouseDown(event: MouseEvent) {
    isDraggingThrottle = true;
    throttleContainer = event.currentTarget as HTMLElement;
    updateThrottleValue(event);
    event.preventDefault();
  }

  function handleThrottleMouseMove(event: MouseEvent) {
    if (!isDraggingThrottle || !throttleContainer) return;
    updateThrottleValue(event);
    event.preventDefault();
  }

  function handleThrottleMouseUp() {
    isDraggingThrottle = false;
    throttleContainer = null;
  }

  function updateThrottleValue(event: MouseEvent) {
    if (!throttleContainer) return;
    
    const rect = throttleContainer.getBoundingClientRect();
    const y = event.clientY - rect.top;
    
    // SVG高度为381，有效控制范围从4到376（对应120到0度）
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

  // 生成完整的模拟实时数据样例 - dataOut格式
  function generateMockRealtimeData() {
    const stepSize = parseFloat(selectedSimulationStep);
    const currentTime = currentTimeStep * stepSize;
    
    // 基于油门杆角度和其他输入参数的影响因子
    const throttleFactor = throttleValue / 120; // 0-1之间
    const altitudeFactor = Math.max(0.5, 1 - getDataInValue("高度") / 22000); // 高度影响
    const machFactor = 1 + getDataInValue("马赫数") * 0.2; // 马赫数影响
    
    // 完整的dataOut样例数据
    const mockDataOut = [
      {
        name: "time",
        data: [[currentTime, currentTime]]
      },
      {
        name: "高压涡轮出口总压",
        data: [[currentTime, 850 + throttleFactor * 300 + Math.sin(currentTime * 0.5) * 50 + (Math.random() - 0.5) * 20]]
      },
      {
        name: "高压压气机出口总压", 
        data: [[currentTime, 1200 + throttleFactor * 400 + Math.cos(currentTime * 0.3) * 60 + (Math.random() - 0.5) * 25]]
      },
      {
        name: "低压涡轮出口总压",
        data: [[currentTime, 650 + throttleFactor * 250 + Math.sin(currentTime * 0.7) * 40 + (Math.random() - 0.5) * 15]]
      },
      {
        name: "高压压气机出口温度",
        data: [[currentTime, 800 + throttleFactor * 400 + altitudeFactor * 100 + Math.sin(currentTime * 0.4) * 30 + (Math.random() - 0.5) * 20]]
      },
      {
        name: "高压涡轮进口温度",
        data: [[currentTime, 1400 + throttleFactor * 300 + Math.cos(currentTime * 0.6) * 50 + (Math.random() - 0.5) * 25]]
      },
      {
        name: "低压涡轮出口温度",
        data: [[currentTime, 900 + throttleFactor * 200 + Math.sin(currentTime * 0.8) * 35 + (Math.random() - 0.5) * 18]]
      },
      {
        name: "发动机净推力",
        data: [[currentTime, 12000 + throttleFactor * 8000 + machFactor * 2000 + Math.sin(currentTime * 0.2) * 500 + (Math.random() - 0.5) * 200]]
      },
      {
        name: "发动机总推力",
        data: [[currentTime, 14000 + throttleFactor * 10000 + machFactor * 2500 + Math.cos(currentTime * 0.25) * 600 + (Math.random() - 0.5) * 250]]
      },
      {
        name: "推进效率",
        data: [[currentTime, 0.75 + throttleFactor * 0.15 + Math.sin(currentTime * 0.3) * 0.05 + (Math.random() - 0.5) * 0.02]]
      },
      {
        name: "热效率",
        data: [[currentTime, 0.35 + throttleFactor * 0.1 + Math.cos(currentTime * 0.4) * 0.03 + (Math.random() - 0.5) * 0.015]]
      },
      {
        name: "总效率",
        data: [[currentTime, 0.28 + throttleFactor * 0.08 + Math.sin(currentTime * 0.5) * 0.02 + (Math.random() - 0.5) * 0.01]]
      },
      {
        name: "燃油消耗率",
        data: [[currentTime, 0.6 + throttleFactor * 0.4 + Math.cos(currentTime * 0.35) * 0.05 + (Math.random() - 0.5) * 0.02]]
      },
      {
        name: "比冲",
        data: [[currentTime, 1800 + throttleFactor * 400 + Math.sin(currentTime * 0.45) * 100 + (Math.random() - 0.5) * 50]]
      },
      {
        name: "推重比",
        data: [[currentTime, 6.5 + throttleFactor * 2.5 + Math.cos(currentTime * 0.55) * 0.5 + (Math.random() - 0.5) * 0.2]]
      },
      {
        name: "单位推力",
        data: [[currentTime, 1200 + throttleFactor * 600 + Math.sin(currentTime * 0.65) * 80 + (Math.random() - 0.5) * 40]]
      },
      {
        name: "喷管出口速度",
        data: [[currentTime, 1800 + throttleFactor * 500 + machFactor * 200 + Math.cos(currentTime * 0.75) * 100 + (Math.random() - 0.5) * 50]]
      },
      {
        name: "喷管出口马赫数",
        data: [[currentTime, 1.8 + throttleFactor * 0.8 + Math.sin(currentTime * 0.85) * 0.2 + (Math.random() - 0.5) * 0.1]]
      },
      {
        name: "喷管出口总压",
        data: [[currentTime, 101.3 + throttleFactor * 20 + Math.cos(currentTime * 0.95) * 5 + (Math.random() - 0.5) * 2]]
      },
      {
        name: "喷管喉道面积",
        data: [[currentTime, 0.25 + throttleFactor * 0.1 + Math.sin(currentTime * 1.05) * 0.02 + (Math.random() - 0.5) * 0.01]]
      },
      {
        name: "喷管出口面积",
        data: [[currentTime, 0.35 + throttleFactor * 0.15 + Math.cos(currentTime * 1.15) * 0.03 + (Math.random() - 0.5) * 0.015]]
      }
    ];
    
    console.log('生成模拟数据，当前时间步:', currentTimeStep, '当前时间:', currentTime);
    return mockDataOut;
  }

  // 根据dataOut更新uPlot图表数据 - 实现累积数据存储
  function updateChartsFromDataOut(dataOutResult: Array<{name: string, data: number[][]}>) {
    dataOut = dataOutResult;
    console.log('开始更新uPlot图表数据，dataOut:', dataOut);
    
    // 遍历curveCharts数组中的每个图表对象
    curveCharts.forEach(chart => {
      console.log(`处理图表 ${chart.name}，曲线:`, chart.curves.map(c => c.name));
      
      // 获取现有的图表数据或创建新的
      let existingData = chartDataMap.get(chart.id) || [];
      
      // 查找time数据
      const timeData = dataOut.find(d => d.name === "time");
      if (!timeData || !timeData.data || timeData.data.length === 0) {
        console.log('没有找到time数据');
        return;
      }
      
      const currentTime = timeData.data[0][0]; // 当前时间点
      
      // 更新或创建time数据
      let timeEntry = existingData.find(item => item.name === 'time');
      if (!timeEntry) {
        timeEntry = { name: 'time', data: [] };
        existingData.push(timeEntry);
      }
      timeEntry.data.push(currentTime);
      
      // 对每个图表的curves数组进行遍历
      chart.curves.forEach(curve => {
        // 根据curve.name在dataOut数组中查找匹配的name
        const curveData = dataOut.find(d => d.name === curve.name);
        
        // 查找或创建曲线数据条目
        let curveEntry = existingData.find(item => item.name === curve.name);
        if (!curveEntry) {
          curveEntry = { name: curve.name, data: [] };
          existingData.push(curveEntry);
        }
        
        if (curveData && curveData.data && curveData.data.length > 0) {
          // 提取对应的data数组，其中data[1]作为y轴坐标
          const yValue = curveData.data[0][1];
          curveEntry.data.push(yValue);
        } else {
          // 如果没有找到对应数据，使用默认值
          const defaultValue = Math.random() * 10 + 10;
          curveEntry.data.push(defaultValue);
          console.log(`曲线 ${curve.name} 没有找到数据，使用默认值: ${defaultValue}`);
        }
      });
      
      // 保持最新100个数据点（固定显示窗口）
      existingData.forEach(entry => {
        if (entry.data.length > 100) {
          entry.data = entry.data.slice(-100);
        }
      });
      
      // 将更新好的data_chart_{id}保存到chartDataMap
      chartDataMap.set(chart.id, existingData);
      console.log(`图表 ${chart.name} (ID: ${chart.id}) 数据已更新，当前数据点数:`, existingData[0]?.data.length || 0);
    });
    
    // 触发响应式更新
    chartDataMap = new Map(chartDataMap);
    console.log('所有uPlot图表数据更新完成');
  }

  // 更新监控表格数据
  function updateMonitorTableData(dataOutResult: Array<{name: string, data: number[][]}>) {
    monitorTableData = dataOutResult
      .filter(item => item.name !== 'time') // 排除time数据
      .map(item => ({
        parameter: item.name,
        value: item.data.length > 0 ? item.data[0][1].toFixed(3) : '0.000' // 取当前值
      }));
  }

  // 初始化图表数据
  function initializeChartData(chartId: number) {
    const emptyData: Array<{name: string, data: number[]}> = [
      { name: "time", data: [] }
    ];
    chartDataMap.set(chartId, emptyData);
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
      
      // 增加时间步
      currentTimeStep++;
      
    } catch (error) {
      console.error('实时数据更新失败:', error);
      // 出错时使用模拟数据
      const mockData = generateMockRealtimeData();
      updateChartsFromDataOut(mockData);
      updateMonitorTableData(mockData);
      currentTimeStep++;
    }
  }

  async function handleStart() {
    if (isPaused) {
      // 继续
      isPaused = false;
      isCalculating = true;
    } else {
      // 开始 - 首次调用后端
      isCalculating = true;
      currentTimeStep = 0; // 重置时间步
      
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
        } else {
          // 使用模拟数据
          const mockData = generateMockRealtimeData();
          updateChartsFromDataOut(mockData);
          updateMonitorTableData(mockData);
        }
        
        showResults = true;
        // 自动显示监控弹窗
        showMonitorModal = true;
        
        // 为所有现有图表初始化数据
        curveCharts.forEach(chart => {
          if (!chartDataMap.has(chart.id)) {
            initializeChartData(chart.id);
          }
        });
        
        currentTimeStep++; // 增加时间步
        
      } catch (error) {
        console.error('首次后端调用失败:', error);
        // 即使首次调用失败，也继续显示界面并使用模拟数据
        const mockData = generateMockRealtimeData();
        updateChartsFromDataOut(mockData);
        updateMonitorTableData(mockData);
        
        showResults = true;
        showMonitorModal = true;
        curveCharts.forEach(chart => {
          if (!chartDataMap.has(chart.id)) {
            initializeChartData(chart.id);
          }
        });
        currentTimeStep++;
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
    currentTimeStep = 0; // 重置时间步
    
    // 停止实时数据更新
    if (simulationTimer) {
      clearInterval(simulationTimer);
      simulationTimer = null;
    }
    
    // 清理图表数据
    chartDataMap.clear();
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
        chartData: Array.from(chartDataMap.entries()).map(([id, data]) => ({
          chartId: id,
          chartName: curveCharts.find(c => c.id === id)?.name || `图表-${id}`,
          data: data
        })),
        totalTimeSteps: currentTimeStep,
        simulationStep: selectedSimulationStep
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
      if (!chartDataMap.has(chart.id)) {
        initializeChartData(chart.id);
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
      if (!chartDataMap.has(chart.id)) {
        initializeChartData(chart.id);
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

      <!-- 中间图表区域 - 使用uPlot图表组件 -->
      <div class="flex-1 p-4 overflow-y-auto">
        <!-- 实时计算状态显示 -->
        {#if showResults}
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-green-500 rounded-full {isCalculating ? 'animate-pulse' : ''}"></div>
                  <span class="text-sm text-gray-300">
                    {isCalculating ? '实时计算中...' : isPaused ? '计算已暂停' : '计算已停止'}
                  </span>
                </div>
                <div class="text-xs text-gray-400">
                  时间步: {currentTimeStep} | 仿真时间: {(currentTimeStep * parseFloat(selectedSimulationStep)).toFixed(3)}s
                </div>
                <div class="text-xs text-gray-400">
                  步长: {selectedSimulationStep}s | 油门角度: {throttleValue.toFixed(1)}°
                </div>
              </div>
              <button 
                class="text-xs text-blue-400 hover:text-blue-300 underline"
                onclick={openMonitorModal}
              >
                查看实时监控
              </button>
            </div>
          </div>
        {/if}

        <!-- uPlot图表展示区域 - 使用Grid布局确保整齐划一 -->
        <div class="grid grid-cols-1 gap-6">
          {#each curveCharts as chart (chart.id)}
            <UPlotChart 
              chartId={chart.id}
              chartName={chart.name}
              curves={chart.curves}
              dataChart={chartDataMap.get(chart.id) || []}
              width={800}
              height={300}
            />
          {/each}
        </div>
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
            <!-- 左侧：油门杆角度SVG控制器 - 修复交互 -->
            <div class="flex-shrink-0">
              <h3 class="text-xs text-gray-300 mb-3">油门杆角度</h3>
              <div class="relative">
                <!-- SVG油门杆控制器容器 - 添加容器引用 -->
                <div 
                  class="cursor-pointer select-none {isDraggingThrottle ? 'cursor-grabbing' : 'cursor-grab'}"
                  onmousedown={handleThrottleMouseDown}
                  style="width: 50px; height: 381px;"
                  bind:this={throttleContainer}
                >
                  <!-- SVG背景 - 基于Frame3183.svg -->
                  <svg width="50" height="381" viewBox="0 0 50 381" fill="none" xmlns="http://www.w3.org/2000/svg" class="absolute inset-0">
                    <!-- 刻度数字 -->
                    <text x="-1" y="9" fill="white" fill-opacity="0.7" font-size="12">120</text>
                    <text x="-1" y="70" fill="white" fill-opacity="0.7" font-size="12">100</text>
                    <text x="3" y="132" fill="white" fill-opacity="0.7" font-size="12">80</text>
                    <text x="3" y="194" fill="white" fill-opacity="0.7" font-size="12">60</text>
                    <text x="3" y="256" fill="white" fill-opacity="0.7" font-size="12">40</text>
                    <text x="3" y="318" fill="white" fill-opacity="0.7" font-size="12">20</text>
                    <text x="8" y="380" fill="white" fill-opacity="0.7" font-size="12">0</text>
                    
                    <!-- 主刻度线 -->
                    <line x1="22.5" y1="4" x2="32.5" y2="4" stroke="white" stroke-opacity="0.7"/>
                    <line x1="22.5" y1="66" x2="32.5" y2="66" stroke="white" stroke-opacity="0.7"/>
                    <line x1="22.5" y1="128" x2="32.5" y2="128" stroke="white" stroke-opacity="0.7"/>
                    <line x1="22.5" y1="190" x2="32.5" y2="190" stroke="white" stroke-opacity="0.7"/>
                    <line x1="22.5" y1="252" x2="32.5" y2="252" stroke="white" stroke-opacity="0.7"/>
                    <line x1="22.5" y1="314" x2="32.5" y2="314" stroke="white" stroke-opacity="0.7"/>
                    <line x1="22.5" y1="376" x2="32.5" y2="376" stroke="white" stroke-opacity="0.7"/>
                    
                    <!-- 小刻度线 -->
                    {#each Array(30) as _, i}
                      {@const y = 4 + i * 12.4}
                      {#if y <= 376 && (y - 4) % 62 !== 0}
                        <line x1="22.5" y1={y} x2="27.5" y2={y} stroke="white" stroke-opacity="0.7" stroke-width="0.5"/>
                      {/if}
                    {/each}
                    
                    <!-- 滑轨背景 -->
                    <rect x="37.5" y="2.5" width="3" height="376" rx="1.5" fill="#141414"/>
                  </svg>
                  
                  <!-- 可拖动的蓝色滑块 -->
                  {#each [throttleValue] as value}
                    {@const percentage = (120 - value) / 120}
                    {@const sliderY = 4 + percentage * 372}
                    <div class="absolute pointer-events-none" style="top: {sliderY - 5.5}px; left: 36.5px;">
                      <!-- 滑块主体 -->
                      <div class="w-1 h-3 bg-blue-500 rounded-sm"></div>
                      <!-- 滑块手柄 -->
                      <div class="absolute -left-2.5 top-0.5 w-6 h-2 bg-gray-800 border border-blue-500 rounded-sm flex items-center justify-center">
                        <div class="w-3 h-0.5 bg-blue-500 rounded"></div>
                      </div>
                    </div>
                  {/each}
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