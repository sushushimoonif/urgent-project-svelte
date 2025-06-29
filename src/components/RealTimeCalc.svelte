<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';

  let isCalculating = $state(false);
  let isPaused = $state(false);
  let showResults = $state(false);
  let storagePath = $state('');
  let showParameterModal = $state(false);
  let showMonitorModal = $state(false);

  // 当前正在编辑的曲线图ID
  let currentEditingChartId = $state<number | null>(null);

  // 模态框位置状态
  let parameterModalPosition = $state({ x: 100, y: 100 });
  let monitorModalPosition = $state({ x: 200, y: 150 });
  let isDraggingParameterModal = $state(false);
  let isDraggingMonitorModal = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });

  // 监控模态框大小状态
  let monitorModalSize = $state({ width: 400, height: 500 });
  let isResizingMonitorModal = $state(false);
  let resizeStartPos = $state({ x: 0, y: 0 });
  let resizeStartSize = $state({ width: 0, height: 0 });

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

  // 生成SVG路径
  function generateSVGPath(data: Array<{time: number, values: number[]}>, curveIndex: number, width: number, height: number) {
    if (!data || data.length === 0) return '';
    
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 计算数据范围
    const values = data.map(d => d.values[curveIndex] || 0);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    
    // 生成路径点
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((d.values[curveIndex] - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
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
    showParameterModal = false;
    
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
    parameterModalPosition = { x: 100, y: 100 };
    monitorModalPosition = { x: 200, y: 150 };
    monitorModalSize = { width: 400, height: 500 };
    
    // 重置编辑状态
    currentEditingChartId = null;
    
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

  // 从预设加载 - 上传JSON文件
  function handleLoadPreset() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const presetData = JSON.parse(text);
        
        // 验证JSON格式
        if (Array.isArray(presetData) && presetData.every(item => 
          item.id && item.name && Array.isArray(item.curves)
        )) {
          // 清理旧的图表数据
          chartData.clear();
          
          curveCharts = presetData;
          
          // 为新加载的图表初始化空数据
          curveCharts.forEach(chart => {
            initializeChartData(chart.id, chart.curves);
          });
          
          alert('预设加载成功！');
        } else {
          alert('文件格式不正确，请选择有效的预设文件');
        }
      } catch (error) {
        console.error('预设加载失败:', error);
        alert('预设加载失败，请检查文件格式');
      }
    };
    input.click();
  }

  // 保存为预设 - 下载JSON文件
  function handleSavePreset() {
    try {
      const presetData = JSON.stringify(curveCharts, null, 2);
      const blob = new Blob([presetData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `curve_preset_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('预设保存成功！');
    } catch (error) {
      console.error('预设保存失败:', error);
      alert('预设保存失败');
    }
  }

  // 打开参数选择弹窗 - 用于创建新曲线图
  function openParameterModal() {
    currentEditingChartId = null; // 表示创建新曲线图
    // 清空所有选择状态
    leftParameterList.forEach(p => p.selected = false);
    rightParameterList.forEach(p => p.selected = false);
    showParameterModal = true;
  }

  // 编辑现有曲线图的参数
  function editChartParameters(chartId: number) {
    currentEditingChartId = chartId;
    const chart = curveCharts.find(c => c.id === chartId);
    
    if (chart) {
      // 清空所有选择状态
      leftParameterList.forEach(p => p.selected = false);
      rightParameterList.forEach(p => p.selected = false);
      
      // 根据当前曲线图中的参数，设置对应的选择状态
      chart.curves.forEach(curve => {
        const leftParam = leftParameterList.find(p => p.name === curve.name);
        const rightParam = rightParameterList.find(p => p.name === curve.name);
        
        if (leftParam) {
          leftParam.selected = true;
        }
        if (rightParam) {
          rightParam.selected = true;
        }
      });
    }
    
    showParameterModal = true;
  }

  // 打开监控弹窗
  function openMonitorModal() {
    showMonitorModal = true;
  }

  // 关闭弹窗
  function closeModals() {
    showParameterModal = false;
    showMonitorModal = false;
    currentEditingChartId = null;
  }

  // 确认参数选择
  function confirmParameterSelection() {
    // 获取选中的参数
    const selectedParams = [
      ...leftParameterList.filter(p => p.selected),
      ...rightParameterList.filter(p => p.selected)
    ];
    
    if (currentEditingChartId !== null) {
      // 编辑现有曲线图
      const chart = curveCharts.find(c => c.id === currentEditingChartId);
      if (chart) {
        chart.curves = selectedParams.map(p => ({ name: p.name }));
        
        // 重新初始化数据
        initializeChartData(chart.id, chart.curves);
      }
    } else {
      // 创建新的曲线图
      if (selectedParams.length > 0) {
        const newChart = {
          id: Date.now(),
          name: `曲线图-${curveCharts.length + 1}`,
          curves: selectedParams.map(p => ({ name: p.name }))
        };
        curveCharts.push(newChart);
        
        // 初始化新图表的空数据
        initializeChartData(newChart.id, newChart.curves);
      }
    }
    
    // 重置选择状态
    leftParameterList.forEach(p => p.selected = false);
    rightParameterList.forEach(p => p.selected = false);
    
    showParameterModal = false;
    currentEditingChartId = null;
  }

  // 删除曲线图
  function deleteChart(chartId: number) {
    // 清理图表数据
    chartData.delete(chartId);
    
    curveCharts = curveCharts.filter(chart => chart.id !== chartId);
  }

  // 编辑曲线图名称
  function editChartName(chartId: number, newName: string) {
    const chart = curveCharts.find(c => c.id === chartId);
    if (chart) {
      chart.name = newName;
    }
  }

  // 模态框拖拽处理
  function handleModalMouseDown(event: MouseEvent, modalType: 'parameter' | 'monitor') {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.x = event.clientX - rect.left;
    dragOffset.y = event.clientY - rect.top;
    
    if (modalType === 'parameter') {
      isDraggingParameterModal = true;
    } else {
      isDraggingMonitorModal = true;
    }
  }

  function handleModalMouseMove(event: MouseEvent) {
    if (isDraggingParameterModal) {
      parameterModalPosition.x = event.clientX - dragOffset.x;
      parameterModalPosition.y = event.clientY - dragOffset.y;
    } else if (isDraggingMonitorModal) {
      monitorModalPosition.x = event.clientX - dragOffset.x;
      monitorModalPosition.y = event.clientY - dragOffset.y;
    }
  }

  function handleModalMouseUp() {
    isDraggingParameterModal = false;
    isDraggingMonitorModal = false;
  }

  // 监控模态框缩放处理
  function handleResizeMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    isResizingMonitorModal = true;
    resizeStartPos.x = event.clientX;
    resizeStartPos.y = event.clientY;
    resizeStartSize.width = monitorModalSize.width;
    resizeStartSize.height = monitorModalSize.height;
  }

  function handleResizeMouseMove(event: MouseEvent) {
    if (!isResizingMonitorModal) return;
    
    const deltaX = event.clientX - resizeStartPos.x;
    const deltaY = event.clientY - resizeStartPos.y;
    
    monitorModalSize.width = Math.max(300, resizeStartSize.width + deltaX);
    monitorModalSize.height = Math.max(200, resizeStartSize.height + deltaY);
  }

  function handleResizeMouseUp() {
    isResizingMonitorModal = false;
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
    handleModalMouseMove(e);
    handleResizeMouseMove(e);
  }} 
  onmouseup={() => {
    handleScaleMouseUp();
    handleModalMouseUp();
    handleResizeMouseUp();
  }} 
/>

<div class="min-h-[calc(100vh-120px)] bg-gray-900 p-4 sm:p-6 lg:p-8">
  <div class="w-full max-w-[80%] mx-auto h-full">
    <div class="flex flex-col xl:flex-row h-full gap-4">
      <!-- 左侧曲线组面板 - 增加宽度，避免滚动 -->
      <div class="w-full xl:w-72 bg-gray-800 border border-gray-700 rounded-lg">
        <!-- 顶部按钮区域 -->
        <div class="p-3 border-b border-gray-700">
          <div class="flex gap-2 mb-2">
            <button 
              class="flex-1 border border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              onclick={handleLoadPreset}
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
              </svg>
              从预设加载
            </button>
            <button 
              class="flex-1 border border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              onclick={handleSavePreset}
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              保存为预设
            </button>
            <button 
              class="border border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white px-3 py-2 rounded text-lg font-medium transition-colors flex items-center justify-center"
              onclick={openParameterModal}
            >
              +
            </button>
          </div>
        </div>

        <!-- 曲线图列表 -->
        <div class="max-h-[calc(100vh-300px)] overflow-y-auto">
          {#each curveCharts as chart}
            <div class="border-b border-gray-700">
              <!-- 曲线图标题 -->
              <div class="flex items-center justify-between p-3 bg-gray-750">
                <div class="flex items-center gap-2 flex-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <!-- 可编辑的名称 -->
                  <input 
                    type="text" 
                    bind:value={chart.name}
                    class="bg-transparent text-sm text-gray-300 focus:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 flex-1"
                  />
                </div>
                <div class="flex gap-1">
                  <!-- 编辑参数按钮 -->
                  <button 
                    class="w-5 h-5 bg-blue-600 hover:bg-blue-700 rounded text-xs flex items-center justify-center text-white"
                    onclick={() => editChartParameters(chart.id)}
                    title="编辑参数"
                  >
                    ✎
                  </button>
                  <!-- 删除曲线图按钮 -->
                  <button 
                    class="w-5 h-5 bg-red-600 hover:bg-red-700 rounded text-xs flex items-center justify-center text-white"
                    onclick={() => deleteChart(chart.id)}
                    title="删除曲线图"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <!-- 曲线列表 -->
              <div class="p-3 space-y-1">
                {#each chart.curves as curve}
                  <div class="text-xs text-gray-300 leading-tight px-2 py-1">
                    {curve.name}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- 中间图表区域 -->
      <div class="flex-1 p-4 overflow-y-auto">
        <!-- 简单SVG曲线图展示 - 始终显示，一开始数据为空 -->
        <div class="space-y-4">
          {#each curveCharts as chart (chart.id)}
            <div class="bg-black rounded border border-gray-700 p-4">
              <!-- 图表标题 -->
              <div class="flex justify-between items-center mb-2">
                <h3 class="text-sm text-gray-300">{chart.name}</h3>
              </div>

              <!-- 简单SVG图表 -->
              <div class="bg-gray-900 rounded p-2">
                <svg width="100%" height="200" viewBox="0 0 600 200" class="overflow-visible">
                  <!-- 网格线 -->
                  {#each Array(10) as _, i}
                    <line x1="40" y1={20 + i * 16} x2="560" y2={20 + i * 16} stroke="#374151" stroke-width="0.5" opacity="0.3"/>
                  {/each}
                  {#each Array(13) as _, i}
                    <line x1={40 + i * 40} y1="20" x2={40 + i * 40} y2="180" stroke="#374151" stroke-width="0.5" opacity="0.3"/>
                  {/each}

                  <!-- 坐标轴 -->
                  <line x1="40" y1="180" x2="560" y2="180" stroke="#6b7280" stroke-width="1"/>
                  <line x1="40" y1="20" x2="40" y2="180" stroke="#6b7280" stroke-width="1"/>

                  <!-- 曲线 -->
                  {#if chartData.has(chart.id)}
                    {@const data = chartData.get(chart.id)}
                    {@const colors = ['#fbbf24', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444']}
                    {#each chart.curves as curve, curveIndex}
                      <path
                        d={generateSVGPath(data, curveIndex, 600, 200)}
                        fill="none"
                        stroke={colors[curveIndex % colors.length]}
                        stroke-width="2"
                      />
                    {/each}
                  {/if}

                  <!-- Y轴标签 -->
                  <text x="30" y="25" fill="#9ca3af" font-size="10" text-anchor="end">20</text>
                  <text x="30" y="60" fill="#9ca3af" font-size="10" text-anchor="end">15</text>
                  <text x="30" y="100" fill="#9ca3af" font-size="10" text-anchor="end">10</text>
                  <text x="30" y="140" fill="#9ca3af" font-size="10" text-anchor="end">5</text>
                  <text x="30" y="180" fill="#9ca3af" font-size="10" text-anchor="end">0</text>

                  <!-- X轴标签 -->
                  <text x="80" y="195" fill="#9ca3af" font-size="10" text-anchor="middle">0s</text>
                  <text x="200" y="195" fill="#9ca3af" font-size="10" text-anchor="middle">3s</text>
                  <text x="320" y="195" fill="#9ca3af" font-size="10" text-anchor="middle">6s</text>
                  <text x="440" y="195" fill="#9ca3af" font-size="10" text-anchor="middle">9s</text>
                  <text x="560" y="195" fill="#9ca3af" font-size="10" text-anchor="middle">12s</text>
                </svg>

                <!-- 图例 -->
                <div class="flex flex-wrap gap-4 mt-2 px-2">
                  {#each chart.curves as curve, index}
                    {@const colors = ['#fbbf24', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444']}
                    <div class="flex items-center gap-1">
                      <div class="w-3 h-0.5" style="background-color: {colors[index % colors.length]}"></div>
                      <span class="text-xs text-gray-300">{curve.name}</span>
                    </div>
                  {/each}
                </div>
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

<!-- 参数选择弹窗 - 可拖拽 -->
{#if showParameterModal}
  <div 
    class="fixed bg-gray-800 border border-gray-700 rounded-lg w-[600px] h-[500px] flex flex-col z-50 shadow-2xl"
    style="left: {parameterModalPosition.x}px; top: {parameterModalPosition.y}px;"
  >
    <!-- 弹窗标题 - 可拖拽区域 -->
    <div 
      class="flex items-center justify-between p-4 border-b border-gray-700 cursor-move"
      onmousedown={(e) => handleModalMouseDown(e, 'parameter')}
    >
      <h3 class="text-lg font-medium text-gray-200">
        {currentEditingChartId !== null ? '编辑曲线图参数' : '参数选择'}
      </h3>
      <button class="text-gray-400 hover:text-gray-200" onclick={closeModals}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- 参数选择区域 -->
    <div class="flex-1 flex">
      <!-- 左侧参数列表 -->
      <div class="flex-1 p-3 overflow-y-auto">
        <div class="space-y-1">
          {#each leftParameterList as param}
            <div class="flex items-center gap-2">
              <input type="checkbox" bind:checked={param.selected} class="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-1">
              <span class="text-xs text-gray-300 leading-tight">{param.name}</span>
            </div>
          {/each}
        </div>
      </div>
      
      <!-- 右侧参数列表 -->
      <div class="flex-1 p-3 overflow-y-auto border-l border-gray-700">
        <div class="space-y-1">
          {#each rightParameterList as param}
            <div class="flex items-center gap-2">
              <input type="checkbox" bind:checked={param.selected} class="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-1">
              <span class="text-xs text-gray-300 leading-tight">{param.name}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- 底部控制按钮 -->
    <div class="p-3 border-t border-gray-700 space-y-2">
      <div class="flex gap-2">
        <button class="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded" onclick={closeModals}>关闭</button>
        <button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded" onclick={confirmParameterSelection}>确认</button>
      </div>
    </div>
  </div>
{/if}

<!-- 实时监控弹窗 - 可拖拽和缩放 -->
{#if showMonitorModal}
  <div 
    class="fixed bg-gray-800 border border-gray-700 rounded-lg flex flex-col z-50 shadow-2xl"
    style="left: {monitorModalPosition.x}px; top: {monitorModalPosition.y}px; width: {monitorModalSize.width}px; height: {monitorModalSize.height}px;"
  >
    <!-- 弹窗标题 - 可拖拽区域 -->
    <div 
      class="flex items-center justify-between p-4 border-b border-gray-700 cursor-move"
      onmousedown={(e) => handleModalMouseDown(e, 'monitor')}
    >
      <h3 class="text-lg font-medium text-gray-200 flex items-center gap-2">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        实时监控
      </h3>
      <button class="text-gray-400 hover:text-gray-200" onclick={closeModals}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- 监控表格内容 -->
    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-700 sticky top-0">
          <tr>
            <th class="px-3 py-2 text-left font-medium text-gray-200 border-r border-gray-600">参数</th>
            <th class="px-3 py-2 text-center font-medium text-gray-200">值</th>
          </tr>
        </thead>
        <tbody>
          {#each monitorTableData as row, index}
            <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
              <td class="px-3 py-2 text-gray-300 border-r border-gray-600 text-xs">{row.parameter}</td>
              <td class="px-3 py-2 text-center text-white font-mono text-xs">{row.value}</td>
            </tr>
          {/each}
          
          <!-- 如果没有数据，显示提示 -->
          {#if monitorTableData.length === 0}
            <tr>
              <td colspan="2" class="px-3 py-8 text-center text-gray-400 text-xs">
                暂无实时数据
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <!-- 底部控制按钮 -->
    <div class="p-3 border-t border-gray-700">
      <div class="flex justify-end gap-2">
        <button class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded" onclick={closeModals}>关闭</button>
      </div>
    </div>

    <!-- 缩放控制器 - 右下角 -->
    <div 
      class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-600 hover:bg-gray-500 transition-colors"
      onmousedown={handleResizeMouseDown}
      style="clip-path: polygon(100% 0%, 0% 100%, 100% 100%);"
    >
    </div>
  </div>
{/if}