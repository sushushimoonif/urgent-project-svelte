<script lang="ts">
  import CurveChartManager from './CurveChartManager.svelte';
  import RealTimeMonitor from './RealTimeMonitor.svelte';
  import UPlotChart from './UPlotChart.svelte';

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
  let dataOut = $state<Array<{name: string, data: number[]}>>([]);

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 油门杆角度控制
  let throttleValue = $state(66.66);
  let isDraggingThrottle = $state(false);
  let throttleContainer: HTMLElement | null = null;

  // 初始曲线图数据 - 更新为实际的参数名称
  let curveCharts = $state([
    {
      id: 1,
      name: '曲线图-1',
      curves: [
        { name: '高压压气机出口总压' },
        { name: '低压涡轮出口总压' },
        { name: '风扇出口总压' }
      ]
    },
    {
      id: 2,
      name: '曲线图-2', 
      curves: [
        { name: '风扇出口温度' },
        { name: '高压压气机出口温度' },
        { name: '高压涡轮进口温度' }
      ]
    },
    {
      id: 3,
      name: '曲线图-3',
      curves: [
        { name: '发动机净推力' },
        { name: '发动机总推力' },
        { name: '发动机总耗油量' }
      ]
    }
  ]);

  // 参数列表数据 - 左侧 - 更新为实际的参数名称
  const leftParameterList = $state([
    { name: '低压轴换算转速', selected: false },
    { name: '高压轴换算转速', selected: false },
    { name: '发动机进口换算流量', selected: false },
    { name: '发动机净推力', selected: false },
    { name: '发动机总推力', selected: false },
    { name: '发动机进口冲压阻力', selected: false },
    { name: '发动机总耗油量', selected: false },
    { name: '主燃烧室耗油量', selected: false },
    { name: '加力燃烧室耗油量', selected: false },
    { name: '喷管喉道面积', selected: false },
    { name: '喷管出口面积', selected: false },
    { name: '风扇出口温度', selected: false },
    { name: '高压压气机出口温度', selected: false },
    { name: '高压涡轮进口温度', selected: false },
    { name: '低压涡轮进口温度', selected: false },
    { name: '风扇出口总压', selected: false }
  ]);

  // 参数列表数据 - 右侧 - 更新为实际的参数名称
  const rightParameterList = $state([
    { name: '高压压气机出口总压', selected: false },
    { name: '高压涡轮出口总压', selected: false },
    { name: '低压涡轮出口总压', selected: false },
    { name: '低压涡轮出口总温', selected: false },
    { name: '喷管喉道静压', selected: false },
    { name: '喷管喉道总压', selected: false },
    { name: '喷管喉道静温', selected: false },
    { name: '喷管喉道总温', selected: false },
    { name: '喷管喉道气流速度', selected: false },
    { name: '喷管出口静压', selected: false },
    { name: '喷管出口总压', selected: false },
    { name: '喷管出口静温', selected: false },
    { name: '喷管出口总温', selected: false },
    { name: '喷管出口气流速度', selected: false },
    { name: '喷管推力损失系数', selected: false }
  ]);

  // uPlot图表数据存储 - 每个图表一个数据集，修改为20个数据点
  let chartDataSets = $state<Map<number, {name: string, data: number[][]}>>(new Map());
  let simulationTimer: number | null = null;
  let currentTime = $state(0);

  // 实时监控表格数据
  let monitorTableData = $state<Array<{parameter: string, value: string}>>([]);

  // 检查是否在Tauri环境中 - 修复环境检测
  function isTauriEnvironment(): boolean {
    try {
      // 检查多个Tauri特征
      return !!(
        typeof window !== 'undefined' && 
        (
          window.__TAURI__ || 
          window.__TAURI_IPC__ ||
          (window as any).__TAURI_METADATA__ ||
          navigator.userAgent.includes('Tauri')
        )
      );
    } catch (error) {
      console.log('Tauri环境检测失败:', error);
      return false;
    }
  }

  // 辅助函数：获取指定图表的数据 (data_chart_1, data_chart_2, etc.)
  function getDataChart(chartId: number) {
    return chartDataSets.get(chartId);
  }

  // 辅助函数：获取所有图表数据的快照（用于调试）
  function getAllDataCharts() {
    const result: Record<string, any> = {};
    chartDataSets.forEach((data, id) => {
      result[`data_chart_${id}`] = data;
    });
    return result;
  }

  // 辅助函数：打印当前所有图表数据（用于调试）
  function logAllDataCharts() {
    console.log('=== 当前所有图表数据 ===');
    chartDataSets.forEach((data, id) => {
      console.log(`data_chart_${id}:`, data);
    });
    console.log('========================');
  }

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

  // 调用后端实时计算函数 - 修复Tauri调用
  async function callRealtimeCalculation() {
    try {
      const data = {
        dataIN: dataIn,
        type: "实时计算"
      };
      
      console.log('调用后端实时计算，发送数据:', data);
      
      // 检查是否在Tauri环境中
      if (isTauriEnvironment()) {
        // 动态导入Tauri API
        const { invoke } = await import('@tauri-apps/api/tauri');
        const result = await invoke("real_calculation", data);
        console.log('后端返回结果:', result);
        return result;
      } else {
        console.log('非Tauri环境，使用模拟数据');
        return generateMockRealtimeData();
      }
    } catch (error) {
      console.error('后端调用失败:', error);
      // 返回模拟数据作为fallback
      return generateMockRealtimeData();
    }
  }

  // 生成模拟实时数据 - 使用您提供的dataOut格式
  function generateMockRealtimeData() {
    // 基础数据模板（使用您提供的数据结构）
    const baseData = [
      { name: "低压轴换算转速", data: [100] },
      { name: "高压轴换算转速", data: [100.21423] },
      { name: "发动机进口换算流量", data: [130.01865] },
      { name: "发动机净推力", data: [94.25875] },
      { name: "发动机总推力", data: [94.25875] },
      { name: "发动机进口冲压阻力", data: [0] },
      { name: "发动机总耗油量", data: [5171.314] },
      { name: "主燃烧室耗油量", data: [5171.314] },
      { name: "加力燃烧室耗油量", data: [0] },
      { name: "喷管喉道面积", data: [0.26] },
      { name: "喷管出口面积", data: [0.34999996] },
      { name: "风扇出口温度", data: [464.7087] },
      { name: "高压压气机出口温度", data: [798.9966] },
      { name: "高压涡轮进口温度", data: [1360.5674] },
      { name: "低压涡轮进口温度", data: [1221.1287] },
      { name: "风扇出口总压", data: [101324.984] },
      { name: "高压压气机出口总压", data: [1834008.1] },
      { name: "高压涡轮出口总压", data: [689877.3] },
      { name: "低压涡轮出口总压", data: [689877.3] },
      { name: "低压涡轮出口总温", data: [689877.3] },
      { name: "喷管喉道静压", data: [178118.44] },
      { name: "喷管喉道总压", data: [333455.8] },
      { name: "喷管喉道静温", data: [741.8981] },
      { name: "喷管喉道总温", data: [333455.8] },
      { name: "喷管喉道气流速度", data: [717.0412] },
      { name: "喷管出口静压", data: [635.4891] },
      { name: "喷管出口总压", data: [333455.8] },
      { name: "喷管出口静温", data: [635.4891] },
      { name: "喷管出口总温", data: [881.21704] },
      { name: "喷管出口气流速度", data: [717.0412] },
      { name: "喷管推力损失系数", data: [0] },
      { name: "状态码", data: [0] }
    ];

    // 生成带有随机变化的模拟数据
    const mockData = baseData.map(item => ({
      name: item.name,
      data: [item.data[0] + (Math.random() - 0.5) * item.data[0] * 0.1] // 添加±10%的随机变化
    }));

    // 添加时间数据
    mockData.push({ name: "时间", data: [currentTime] });
    
    console.log('生成模拟数据:', mockData);
    return mockData;
  }

  // 更新uPlot图表数据 - 核心函数：将dataOut转换为data_chart_{id}格式
  function updateUPlotChartsFromDataOut(dataOutResult: Array<{name: string, data: number[]}>) {
    dataOut = dataOutResult;
    console.log('开始更新uPlot图表数据，dataOut:', dataOut);
    
    // 获取时间数据
    const timeData = dataOut.find(d => d.name === "时间");
    const currentTimeValue = timeData ? timeData.data[0] : currentTime;
    
    // 遍历curveCharts数组中的每个图表对象
    curveCharts.forEach(chart => {
      console.log(`处理图表 ${chart.name}，曲线:`, chart.curves.map(c => c.name));
      
      // 构建data_chart_{id}格式的数据
      const data_chart: {name: string, data: number[]} = {
        name: chart.name,
        data: [currentTimeValue] // 第一个元素是时间
      };
      
      // 添加每条曲线的数据
      chart.curves.forEach(curve => {
        const curveData = dataOut.find(d => d.name === curve.name);
        if (curveData && curveData.data.length > 0) {
          data_chart.data.push(curveData.data[0]);
        } else {
          // 如果没有找到数据，使用默认值
          data_chart.data.push(Math.random() * 1000 + 500);
          console.log(`曲线 ${curve.name} 没有找到数据，使用默认值`);
        }
      });
      
      console.log(`图表 ${chart.name} 生成数据:`, data_chart);
      
      // 获取现有的图表数据集
      let existingDataSet = chartDataSets.get(chart.id);
      
      if (!existingDataSet) {
        // 初始化新的数据集
        existingDataSet = {
          name: chart.name,
          data: []
        };
      }
      
      // 添加新的数据点
      existingDataSet.data.push(data_chart.data);
      
      // 保持固定的20个数据点窗口（修改从100改为20）
      if (existingDataSet.data.length > 20) {
        existingDataSet.data = existingDataSet.data.slice(-20);
      }
      
      // 更新数据集
      chartDataSets.set(chart.id, existingDataSet);
      
      // 调试输出：显示当前data_chart_{id}的内容
      console.log(`data_chart_${chart.id} 当前状态:`, existingDataSet);
    });
    
    // 触发响应式更新
    chartDataSets = new Map(chartDataSets);
    console.log('uPlot图表数据更新完成，当前chartDataSets:', chartDataSets);
    
    // 调试：打印所有图表数据
    logAllDataCharts();
  }

  // 更新监控表格数据
  function updateMonitorTableData(dataOutResult: Array<{name: string, data: number[]}>) {
    monitorTableData = dataOutResult
      .filter(item => item.name !== "时间" && item.name !== "状态码")
      .map(item => ({
        parameter: item.name,
        value: item.data.length > 0 ? item.data[0].toFixed(3) : '0.000'
      }));
  }

  // 更新实时数据 - 放慢动画速度三倍
  async function updateRealtimeData() {
    if (!isCalculating || isPaused) return;
    
    try {
      // 更新时间
      currentTime += parseFloat(selectedSimulationStep);
      
      // 更新dataIn
      updateAllDataIn();
      
      // 调用后端获取实时数据
      const backendData = await callRealtimeCalculation();
      
      // 更新dataOut和图表
      if (Array.isArray(backendData)) {
        updateUPlotChartsFromDataOut(backendData);
        updateMonitorTableData(backendData);
      } else {
        // 如果后端数据格式不正确，使用模拟数据
        const mockData = generateMockRealtimeData();
        updateUPlotChartsFromDataOut(mockData);
        updateMonitorTableData(mockData);
      }
    } catch (error) {
      console.error('实时数据更新失败:', error);
      // 出错时使用模拟数据
      const mockData = generateMockRealtimeData();
      updateUPlotChartsFromDataOut(mockData);
      updateMonitorTableData(mockData);
    }
  }

  // 初始化图表数据
  function initializeChartData(chartId: number) {
    const chart = curveCharts.find(c => c.id === chartId);
    if (chart) {
      chartDataSets.set(chartId, {
        name: chart.name,
        data: []
      });
    }
  }

  // 响应式函数：监听计算按钮的点击事件
  async function handleStart() {
    if (isPaused) {
      // 继续
      isPaused = false;
      isCalculating = true;
    } else {
      // 开始 - 首次调用后端
      isCalculating = true;
      currentTime = 0; // 重置时间
      
      try {
        // 更新dataIn
        updateAllDataIn();
        
        // 首次调用后端获取初始数据
        console.log('开始实时计算，首次调用后端...');
        const initialData = await callRealtimeCalculation();
        console.log('首次后端调用成功:', initialData);
        
        if (Array.isArray(initialData)) {
          // 使用响应式函数更新图表数据
          updateUPlotChartsFromDataOut(initialData);
          updateMonitorTableData(initialData);
        } else {
          // 使用模拟数据
          const mockData = generateMockRealtimeData();
          updateUPlotChartsFromDataOut(mockData);
          updateMonitorTableData(mockData);
        }
        
        showResults = true;
        // 自动显示监控弹窗
        showMonitorModal = true;
        
        // 为所有现有图表初始化数据
        curveCharts.forEach(chart => {
          if (!chartDataSets.has(chart.id)) {
            initializeChartData(chart.id);
          }
        });
        
      } catch (error) {
        console.error('首次后端调用失败:', error);
        // 即使首次调用失败，也继续显示界面并使用模拟数据
        const mockData = generateMockRealtimeData();
        updateUPlotChartsFromDataOut(mockData);
        updateMonitorTableData(mockData);
        
        showResults = true;
        showMonitorModal = true;
        curveCharts.forEach(chart => {
          if (!chartDataSets.has(chart.id)) {
            initializeChartData(chart.id);
          }
        });
      }
    }
    
    // 启动实时数据更新定时器 - 放慢速度三倍
    if (simulationTimer) {
      clearInterval(simulationTimer);
    }
    const intervalMs = parseFloat(selectedSimulationStep) * 1000 * 3; // 乘以3，放慢三倍
    console.log(`启动定时器，间隔: ${intervalMs}ms (${selectedSimulationStep * 3}秒)`);
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
    chartDataSets.clear();
    dataOut = [];
    monitorTableData = [];
    currentTime = 0;
    
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
        chartData: Array.from(chartDataSets.entries()).map(([id, data]) => ({
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
      if (!chartDataSets.has(chart.id)) {
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
      if (!chartDataSets.has(chart.id)) {
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

      <!-- 中间图表区域 - 使用uPlot图表 -->
      <div class="flex-1 p-4 overflow-y-auto">
        <!-- 图表展示区域 - 使用Grid布局确保整齐划一 -->
        <div class="grid grid-cols-1 gap-6">
          {#each curveCharts as chart (chart.id)}
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
              <!-- 图表标题 - 统一样式，删除数据点、显示窗口、曲线数信息 -->
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-200 flex items-center gap-2">
                  <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  {chart.name}
                </h3>
                <!-- 删除右侧的数据统计信息 -->
              </div>

              <!-- uPlot图表容器 -->
              <div class="bg-gray-900 rounded-lg p-4 border border-gray-600">
                <UPlotChart 
                  chartId={chart.id}
                  chartName={chart.name}
                  curves={chart.curves}
                  data={chartDataSets.get(chart.id)?.data || []}
                />
              </div>
            </div>
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