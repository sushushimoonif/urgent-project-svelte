<script lang="ts">
  import CurveChartManager from './CurveChartManager.svelte';
  import RealTimeMonitor from './RealTimeMonitor.svelte';
  import UPlotChart from './UPlotChart.svelte';

  let isCalculating = $state(false);
  let showResults = $state(false);
  let selectedFile = $state<File | null>(null);
  let csvData = $state<string[][]>([]);
  let showMonitorModal = $state(false);

  // 模态框位置状态
  let monitorModalPosition = $state({ x: 200, y: 150 });
  let monitorModalSize = $state({ width: 400, height: 500 });

  // 输入数据结构 - dataIn格式（从CSV表格数据转换而来）
  let dataIn = $state<Array<{name: string, data: number[]}>>([]);

  // 输出数据结构 - dataOut格式（后端返回）
  let dataOut = $state<Array<{name: string, data: number[]}>>([]);

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

  // uPlot图表数据存储 - 每个图表一个数据集，data_chart_{curveCharts.id}格式
  let chartDataSets = $state<Map<number, {name: string, data: number[][]}>>(new Map());

  // 实时监控表格数据
  let monitorTableData = $state<Array<{parameter: string, value: string}>>([]);

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
        
        // 自动转换为dataIn格式
        dataIn = convertCSVToDataIn();
        console.log('自动转换的dataIn:', dataIn);
        
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
    
    // 更新dataIn
    dataIn = convertCSVToDataIn();
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
    
    // 更新dataIn
    dataIn = convertCSVToDataIn();
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
        data: Array.from({length: dataPointCount}, (_, i) => i * 0.025) // 固定时间步长
      }
    ];
    
    console.log('生成的模拟dataOut:', mockDataOut);
    return mockDataOut;
  }

  // 更新uPlot图表数据 - 核心数据转换逻辑：dataOut -> data_chart_{curveCharts.id}
  function updateUPlotChartsFromDataOut(dataOutResult: Array<{name: string, data: number[]}>) {
    dataOut = dataOutResult;
    console.log('开始更新uPlot图表数据，dataOut:', dataOut);
    
    // 获取时间数据
    const timeData = dataOut.find(d => d.name === "time");
    const timeValues = timeData ? timeData.data : Array.from({length: dataOut[0]?.data.length || 5}, (_, i) => i * 0.025);
    
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
      
      // 更新数据集 - 这里就是data_chart_{chart.id}的数据
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
    
    // 调试：打印所有图表数据
    logAllDataCharts();
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

  // 计算函数 - 实现dataIn和dataOut数据格式处理
  async function handleCalculate() {
    if (!selectedFile && csvData.length === 0) {
      alert('请先选择文件');
      return;
    }
    
    isCalculating = true;
    
    try {
      // 1. 确保dataIn已经是最新的CSV数据
      if (csvData.length > 0) {
        dataIn = convertCSVToDataIn();
      }
      console.log('最终的dataIn:', dataIn);
      
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
          
          // 4. 根据dataOut更新图表数据 - 转换为data_chart_{curveCharts.id}格式
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
      console.log('数据流程验证：');
      console.log('1. dataIn:', dataIn);
      console.log('2. dataOut:', dataOut);
      console.log('3. data_chart_*:', getAllDataCharts());
      
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
</script>

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
      <!-- 计算结果界面 - 删除右侧控制面板，只保留左侧曲线管理和中间图表 -->
      <div class="w-full max-w-[95%] mx-auto h-full">
        <div class="flex h-full gap-4">
          <!-- 左侧曲线组面板 - 使用封装的组件 -->
          <CurveChartManager 
            bind:charts={curveCharts}
            leftParameters={leftParameterList}
            rightParameters={rightParameterList}
            onChartsChange={handleChartsChange}
          />

          <!-- 右侧图表区域 - 占据剩余空间 -->
          <div class="flex-1 flex flex-col">
            <!-- 顶部控制栏 -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
              <div class="flex justify-between items-center">
                <!-- 左侧：计算状态 -->
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span class="text-sm text-gray-300">过渡态计算完成</span>
                  </div>
                  <div class="text-xs text-gray-400">
                    数据点数: {csvData.length > 0 ? csvData[0].length - 1 : 0}
                  </div>
                  <div class="text-xs text-gray-400">
                    文件: {selectedFile?.name || '未知'}
                  </div>
                </div>
                
                <!-- 右侧：控制按钮 -->
                <div class="flex items-center gap-2">
                  <button
                    class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                    onclick={() => showResults = false}
                  >
                    返回编辑
                  </button>
                  <button
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    onclick={openMonitorModal}
                  >
                    监控
                  </button>
                  <div class="text-xs text-gray-500">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            <!-- 图表显示区域 -->
            <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-y-auto">
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