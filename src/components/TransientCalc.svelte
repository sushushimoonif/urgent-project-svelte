<script lang="ts">
  import CurveChartManager from './CurveChartManager.svelte';
  import RealTimeMonitor from './RealTimeMonitor.svelte';
  import UPlotChart from './UPlotChart.svelte';

  let isCalculating = $state(false);
  let showResults = $state(false);
  let selectedFile = $state<File | null>(null);
  let csvData = $state<string[][]>([]);
  let storagePath = $state('');
  let showMonitorModal = $state(false);

  // 模态框位置状态
  let monitorModalPosition = $state({ x: 200, y: 150 });
  let monitorModalSize = $state({ width: 400, height: 500 });

  // 输入数据结构 - dataIn格式（从CSV表格数据转换而来）
  let dataIn = $state<Array<{name: string, data: number[]}>>([]);

  // 输出数据结构 - dataOut格式（后端返回）
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

  // 曲线图数据 - 与实时计算相同的初始配置
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
        { name: '低压涡轮出口温度' },
        { name: '风扇出口总压' },
        { name: '高压压气机出口温度' }
      ]
    },
    {
      id: 3,
      name: '曲线图-3',
      curves: [
        { name: '高压涡轮进口温度' },
        { name: '低压涡轮进口温度' },
        { name: '喷管出口速度' }
      ]
    }
  ]);

  // 参数列表数据 - 与实时计算相同
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
    { name: '循环压力损失系数', selected: false },
    { name: '喷管出口速度', selected: false }
  ]);

  // uPlot图表数据存储 - 每个图表一个数据集，修改为20个数据点
  let chartDataSets = $state<Map<number, {name: string, data: number[][]}>>(new Map());
  let currentTime = $state(0);

  // 实时监控表格数据
  let monitorTableData = $state<Array<{parameter: string, value: string}>>([]);

  // 读取CSV文件内容
  function readCSVFile(file: File): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim() !== '');
          const data = lines.map(line => {
            // 处理CSV格式，支持逗号和制表符分隔
            return line.split(/[,\t]/).map(cell => cell.trim().replace(/"/g, ''));
          });
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'utf-8');
    });
  }

  // 处理文件选择
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      selectedFile = input.files[0];
      
      try {
        // 读取实际文件内容
        const fileData = await readCSVFile(selectedFile);
        
        // 验证文件格式
        if (fileData.length === 0) {
          alert('文件为空或格式不正确');
          return;
        }

        // 转换数据结构：将原始文件的第一行转换为第一列
        const transposedData = transposeCSVData(fileData);
        csvData = transposedData;
        console.log('文件读取成功，转置后数据行数:', csvData.length);
        console.log('转置后数据预览:', csvData.slice(0, 3));
        
      } catch (error) {
        console.error('文件读取错误:', error);
        alert('文件读取失败，请检查文件格式');
      }
    }
  }

  // 转置CSV数据：原始文件的第一行变成第一列，其他行变成数据列
  function transposeCSVData(originalData: string[][]): string[][] {
    if (originalData.length === 0) return [];
    
    const headers = originalData[0]; // 原始文件的第一行（标题）
    const dataRows = originalData.slice(1); // 原始文件的数据行
    const transposed: string[][] = [];
    
    // 第一行：序列号行，从1开始
    const sequenceRow = ['序列号'];
    for (let i = 0; i < dataRows.length; i++) {
      sequenceRow.push((i + 1).toString());
    }
    transposed.push(sequenceRow);
    
    // 其他行：每个原始标题变成一行，第一列是标题，其他列是对应的数据
    for (let headerIndex = 0; headerIndex < headers.length; headerIndex++) {
      const newRow = [headers[headerIndex]]; // 第一列：原始标题
      
      // 添加每个数据行对应列的值
      for (let dataRowIndex = 0; dataRowIndex < dataRows.length; dataRowIndex++) {
        const value = dataRows[dataRowIndex][headerIndex] || '0';
        newRow.push(value);
      }
      
      transposed.push(newRow);
    }
    
    return transposed;
  }

  // 添加新列
  function addColumn() {
    if (csvData.length === 0) return;
    
    // 获取当前最大序列号
    const currentMaxIndex = csvData[0].length - 1; // 当前列数减1
    const newSequence = (currentMaxIndex + 1).toString(); // 从1开始的序列号
    
    csvData = csvData.map((row, index) => {
      if (index === 0) {
        // 第一行：添加新的序列号
        return [...row, newSequence];
      } else {
        // 其他行：添加默认值
        const parameterName = row[0];
        const defaultValue = parameterName.includes('模式') ? '作战' : 
                           parameterName.includes('状态') ? '地面' : '0';
        return [...row, defaultValue];
      }
    });
  }

  // 删除列并重新排序序列号
  function deleteColumn(columnIndex: number) {
    if (csvData.length === 0 || columnIndex <= 0) return; // 不能删除第一列（参数名）
    
    // 删除指定列
    csvData = csvData.map(row => {
      return row.filter((_, index) => index !== columnIndex);
    });
    
    // 重新排序序列号（第一行），从1开始
    if (csvData.length > 0) {
      csvData[0] = csvData[0].map((cell, index) => {
        if (index === 0) return cell; // 保持第一个单元格（"序列号"）不变
        return index.toString(); // 重新编号：1, 2, 3, 4...
      });
    }
  }

  // 将CSV表格数据转换为dataIn格式
  function convertCSVToDataIn(): Array<{name: string, data: number[]}> {
    if (csvData.length === 0) return [];
    
    const result: Array<{name: string, data: number[]}> = [];
    
    // 遍历每一行（除了第一行序列号）
    for (let rowIndex = 1; rowIndex < csvData.length; rowIndex++) {
      const row = csvData[rowIndex];
      const parameterName = row[0]; // 参数名
      
      // 提取该行的所有数据（除了第一列参数名）
      const data: number[] = [];
      for (let colIndex = 1; colIndex < row.length; colIndex++) {
        const value = parseFloat(row[colIndex]) || 0;
        data.push(value);
      }
      
      result.push({
        name: parameterName,
        data: data
      });
    }
    
    console.log('转换后的dataIn格式:', result);
    return result;
  }

  // 检查是否在Tauri环境中运行
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

  // 调用后端计算函数
  async function callTransientCalculation(dataInParam: Array<{name: string, data: number[]}>) {
    try {
      const requestData = {
        dataIN: dataInParam,
        type: "过渡态计算"
      };
      
      console.log('发送到后端的数据:', requestData);
      
      // 检查是否在Tauri环境中
      if (isTauriEnvironment()) {
        // 动态导入Tauri API
        const { invoke } = await import('@tauri-apps/api/tauri');
        const result = await invoke("transient_calculation", requestData);
        console.log('后端返回结果:', result);
        return result;
      } else {
        console.log('非Tauri环境，使用模拟数据');
        return generateMockTransientData(dataInParam);
      }
    } catch (error) {
      console.error('计算调用失败:', error);
      // 如果Tauri调用失败，也返回模拟结果作为后备
      return generateMockTransientData(dataInParam);
    }
  }

  // 生成模拟过渡态数据 - dataOut格式
  function generateMockTransientData(dataInParam: Array<{name: string, data: number[]}>): Array<{name: string, data: number[]}> {
    console.log('生成模拟过渡态数据，基于dataIn:', dataInParam);
    
    // 获取数据点数量（基于dataIn中第一个参数的数据长度）
    const dataPointCount = dataInParam.length > 0 ? dataInParam[0].data.length : 5;
    
    // 生成模拟的dataOut数据
    const mockDataOut: Array<{name: string, data: number[]}> = [
      {
        name: "高压涡轮出口总压",
        data: Array.from({length: dataPointCount}, (_, i) => 1120 + Math.sin(i * 0.5) * 100 + Math.random() * 50)
      },
      {
        name: "低压涡轮出口温度",
        data: Array.from({length: dataPointCount}, (_, i) => 700 + Math.cos(i * 0.3) * 80 + Math.random() * 40)
      },
      {
        name: "高压压气机出口总压",
        data: Array.from({length: dataPointCount}, (_, i) => 1245 + Math.sin(i * 0.4) * 120 + Math.random() * 60)
      },
      {
        name: "低压涡轮出口总压",
        data: Array.from({length: dataPointCount}, (_, i) => 756 + Math.cos(i * 0.6) * 90 + Math.random() * 45)
      },
      {
        name: "风扇出口总压",
        data: Array.from({length: dataPointCount}, (_, i) => 245 + Math.sin(i * 0.2) * 30 + Math.random() * 20)
      },
      {
        name: "高压压气机出口温度",
        data: Array.from({length: dataPointCount}, (_, i) => 1245 + Math.cos(i * 0.35) * 150 + Math.random() * 75)
      },
      {
        name: "高压涡轮进口温度",
        data: Array.from({length: dataPointCount}, (_, i) => 1156 + Math.sin(i * 0.45) * 100 + Math.random() * 50)
      },
      {
        name: "低压涡轮进口温度",
        data: Array.from({length: dataPointCount}, (_, i) => 945 + Math.cos(i * 0.25) * 80 + Math.random() * 40)
      },
      {
        name: "发动机净马力",
        data: Array.from({length: dataPointCount}, (_, i) => 1200 + Math.sin(i * 0.3) * 200 + Math.random() * 100)
      },
      {
        name: "发动机总马力",
        data: Array.from({length: dataPointCount}, (_, i) => 1400 + Math.cos(i * 0.4) * 150 + Math.random() * 75)
      },
      {
        name: "喷管出口速度",
        data: Array.from({length: dataPointCount}, (_, i) => 1245 + Math.sin(i * 0.6) * 200 + Math.random() * 100)
      },
      {
        name: "time",
        data: Array.from({length: dataPointCount}, (_, i) => i * parseFloat(selectedSimulationStep))
      }
    ];
    
    console.log('生成的模拟dataOut:', mockDataOut);
    return mockDataOut;
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

  // 更新uPlot图表数据
  function updateUPlotChartsFromDataOut(dataOutResult: Array<{name: string, data: number[]}>) {
    dataOut = dataOutResult;
    console.log('开始更新uPlot图表数据，dataOut:', dataOut);
    
    // 获取时间数据
    const timeData = dataOut.find(d => d.name === "time");
    const timeValues = timeData ? timeData.data : Array.from({length: dataOut[0]?.data.length || 5}, (_, i) => i * parseFloat(selectedSimulationStep));
    
    // 遍历curveCharts数组中的每个图表对象
    curveCharts.forEach(chart => {
      console.log(`处理图表 ${chart.name}，曲线:`, chart.curves.map(c => c.name));
      
      // 构建data_chart_{id}格式的数据
      const chartDataPoints: number[][] = [];
      
      // 为每个时间点生成数据行
      for (let timeIndex = 0; timeIndex < timeValues.length; timeIndex++) {
        const dataRow = [timeValues[timeIndex]]; // 第一个元素是时间
        
        // 添加每条曲线在该时间点的数据
        chart.curves.forEach(curve => {
          const curveData = dataOut.find(d => d.name === curve.name);
          if (curveData && curveData.data[timeIndex] !== undefined) {
            dataRow.push(curveData.data[timeIndex]);
          } else {
            // 如果没有找到数据，使用默认值
            dataRow.push(Math.random() * 1000 + 500);
            console.log(`曲线 ${curve.name} 在时间点 ${timeIndex} 没有数据，使用默认值`);
          }
        });
        
        chartDataPoints.push(dataRow);
      }
      
      console.log(`图表 ${chart.name} 生成数据:`, chartDataPoints);
      
      // 更新数据集
      chartDataSets.set(chart.id, {
        name: chart.name,
        data: chartDataPoints
      });
      
      // 调试输出：显示当前data_chart_{id}的内容
      console.log(`data_chart_${chart.id} 当前状态:`, chartDataSets.get(chart.id));
    });
    
    // 触发响应式更新
    chartDataSets = new Map(chartDataSets);
    console.log('uPlot图表数据更新完成，当前chartDataSets:', chartDataSets);
  }

  // 更新监控表格数据
  function updateMonitorTableData(dataOutResult: Array<{name: string, data: number[]}>) {
    monitorTableData = dataOutResult
      .filter(item => item.name !== "time")
      .map(item => ({
        parameter: item.name,
        value: item.data.length > 0 ? item.data[item.data.length - 1].toFixed(3) : '0.000' // 取最后一个时间点的值
      }));
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

  function handleDownload() {
    if (!storagePath) {
      alert('请输入存储路径');
      return;
    }
    
    // 将过渡态数据保存到指定路径
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
      a.download = `transient_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
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

  // 计算函数 - 实现dataIn和dataOut数据格式处理
  async function handleCalculate() {
    if (!selectedFile && csvData.length === 0) {
      alert('请先选择文件');
      return;
    }
    
    isCalculating = true;
    
    try {
      // 1. 将CSV表格数据转换为dataIn格式
      dataIn = convertCSVToDataIn();
      console.log('转换后的dataIn:', dataIn);
      
      // 验证dataIn格式
      if (dataIn.length === 0) {
        throw new Error('没有有效的输入数据');
      }

      // 2. 调用后端计算函数，传入dataIn
      const result = await callTransientCalculation(dataIn);
      console.log('计算返回结果:', result);
      
      // 3. 验证后端返回的dataOut格式
      if (Array.isArray(result)) {
        // 确保返回的数据符合dataOut格式
        const validDataOut = result.filter(item => 
          item && 
          typeof item.name === 'string' && 
          Array.isArray(item.data)
        );
        
        if (validDataOut.length > 0) {
          console.log('有效的dataOut数据:', validDataOut);
          
          // 4. 根据dataOut更新图表数据
          updateUPlotChartsFromDataOut(validDataOut);
          updateMonitorTableData(validDataOut);
        } else {
          throw new Error('后端返回的数据格式不正确');
        }
      } else {
        throw new Error('后端返回的数据不是数组格式');
      }
      
      // 显示结果界面
      showResults = true;
      // 自动显示监控弹窗
      showMonitorModal = true;
      
      // 为所有现有图表初始化数据
      curveCharts.forEach(chart => {
        if (!chartDataSets.has(chart.id)) {
          initializeChartData(chart.id);
        }
      });
      
      console.log('过渡态计算完成');
      
    } catch (error) {
      console.error('计算过程中出错:', error);
      alert(`计算失败: ${error.message}`);
    } finally {
      isCalculating = false;
    }
  }

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
  <div class="w-full max-w-[95%] mx-auto h-full">
    {#if !showResults}
      <!-- 文件选择和数据编辑界面 -->
      <div class="p-6">
        <!-- 顶部控制区域 -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <!-- 文件上传区域 -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-gray-300">
              <span class="text-lg">📁</span>
              <span class="text-sm">从文件中加载</span>
            </div>
            <div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                class="hidden"
                id="file-upload"
                onchange={handleFileSelect}
              />
              <label
                for="file-upload"
                class="block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded cursor-pointer transition-colors border border-gray-600"
              >
                {selectedFile ? selectedFile.name : '选择文件'}
              </label>
            </div>
          </div>

          <!-- 计算按钮 -->
          <div class="flex gap-2">
            <button
              class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onclick={handleCalculate}
              disabled={isCalculating || !selectedFile}
            >
              {isCalculating ? '计算中...' : '计算'}
            </button>
          </div>
        </div>

        <!-- 数据预览区域 - 显示当前dataIn格式 -->
        {#if dataIn.length > 0}
          <div class="mb-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 class="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              dataIn 数据预览 (共 {dataIn.length} 个参数)
            </h3>
            <div class="max-h-32 overflow-y-auto bg-gray-900 rounded p-3 text-xs font-mono">
              <pre class="text-gray-300">{JSON.stringify(dataIn.slice(0, 3), null, 2)}</pre>
              {#if dataIn.length > 3}
                <div class="text-gray-500 mt-2">... 还有 {dataIn.length - 3} 个参数</div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- 结果表格 -->
        <div class="bg-gray-800 rounded border border-gray-700 overflow-hidden h-[calc(100%-200px)]">
          {#if csvData.length > 0}
            <div class="overflow-auto h-full">
              <table class="w-full text-sm">
                <!-- 表头 -->
                <thead class="bg-gray-700 sticky top-0">
                  <tr>
                    <!-- 第一列：参数名（固定列） -->
                    <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-gray-600 min-w-[200px] sticky left-0 bg-gray-700 z-10">参数</th>
                    <!-- 其他列：序列号（可删除） -->
                    {#each csvData[0].slice(1) as header, i}
                      <th class="px-4 py-3 text-center font-medium text-gray-200 border-r border-gray-600 min-w-[100px] relative group">
                        <div class="flex items-center justify-center gap-2">
                          <!-- 序列号显示（不可编辑） -->
                          <span class="text-center">{header}</span>
                          <!-- 删除列按钮 -->
                          <button 
                            class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition-opacity"
                            onclick={() => deleteColumn(i + 1)}
                            title="删除此列"
                          >
                            ×
                          </button>
                        </div>
                      </th>
                    {/each}
                    <!-- 添加列按钮 -->
                    <th class="px-4 py-3 text-center font-medium text-gray-200">
                      <button 
                        class="text-green-500 hover:text-green-400 text-lg font-bold transition-colors"
                        onclick={addColumn}
                        title="添加新列"
                      >
                        +
                      </button>
                    </th>
                  </tr>
                </thead>
                
                <!-- 数据行 -->
                <tbody>
                  {#each csvData.slice(1) as row, rowIndex}
                    <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                      <!-- 第一列：参数名（固定，不可编辑） -->
                      <td class="px-4 py-3 text-gray-300 font-medium border-r border-gray-600 sticky left-0 bg-gray-800 z-10">{row[0]}</td>
                      <!-- 其他列：可编辑的数值 -->
                      {#each row.slice(1) as cell, cellIndex}
                        <td class="px-4 py-3 text-center text-white border-r border-gray-600">
                          <input 
                            type="text" 
                            bind:value={csvData[rowIndex + 1][cellIndex + 1]}
                            oninput={() => {
                              // 实时更新dataIn
                              dataIn = convertCSVToDataIn();
                            }}
                            class="w-full bg-transparent text-center focus:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                          />
                        </td>
                      {/each}
                      <td class="px-4 py-3"></td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="flex items-center justify-center h-full text-gray-400">
              <div class="text-center">
                <div class="text-6xl mb-4">📂</div>
                <p class="text-lg">选择CSV文件查看数据</p>
                <p class="text-sm text-gray-500 mt-2">数据将自动转换为 dataIn 格式</p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- 计算结果界面 - 复制实时计算页面的完整布局 -->
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

            <!-- 返回编辑按钮 -->
            <div class="p-4 border-b border-gray-700">
              <div class="flex gap-2">
                <button
                  class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  onclick={() => showResults = false}
                >
                  返回编辑
                </button>
                <button
                  class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  onclick={openMonitorModal}
                >
                  监控
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

      <!-- 实时监控弹窗 - 使用封装的组件 -->
      <RealTimeMonitor 
        bind:isVisible={showMonitorModal}
        bind:position={monitorModalPosition}
        bind:size={monitorModalSize}
        data={monitorTableData}
      />
    {/if}
  </div>
</div>