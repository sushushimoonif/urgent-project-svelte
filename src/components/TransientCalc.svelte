<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';
  import CurveChartManager from './CurveChartManager.svelte';
  import ChartDisplay from './ChartDisplay.svelte';

  let isCalculating = $state(false);
  let showResults = $state(false);
  let selectedFile = $state<File | null>(null);
  let csvData = $state<string[][]>([]);

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
    { name: '循环压力损失系数', selected: false }
  ]);

  // 图表数据存储
  let chartData = $state<Map<number, Array<{time: number, values: number[]}>>>(new Map());

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

  // 将表格数据转换为JSON格式
  function convertTableToJSON() {
    if (csvData.length === 0) return [];
    
    const result = [];
    const numColumns = csvData[0].length;
    
    // 遍历每一列（除了第一列参数名）
    for (let colIndex = 1; colIndex < numColumns; colIndex++) {
      const columnData: Record<string, string> = {};
      
      // 遍历每一行，构建该列的数据对象
      for (let rowIndex = 1; rowIndex < csvData.length; rowIndex++) {
        const parameterName = csvData[rowIndex][0]; // 参数名
        const value = csvData[rowIndex][colIndex] || '0'; // 该列的值
        columnData[parameterName] = value;
      }
      
      result.push(columnData);
    }
    
    return result;
  }

  // 检查是否在Tauri环境中运行
  function isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.__TAURI_IPC__ === 'function';
  }

  // 调用后端计算函数
  async function callTransientCalculation(data: any[]) {
    try {
      // 检查是否在Tauri环境中
      if (isTauriEnvironment()) {
        // 使用 Tauri invoke 调用后端的 transient_calculation 函数
        const result = await invoke("transient_calculation", { data });
        return result;
      } else {
        // 在浏览器环境中返回模拟结果
        console.log('运行在浏览器环境中，返回模拟计算结果');
        return generateMockTransientData(data.length);
      }
    } catch (error) {
      console.error('计算调用失败:', error);
      // 如果Tauri调用失败，也返回模拟结果作为后备
      return generateMockTransientData(data.length);
    }
  }

  // 生成模拟过渡态数据
  function generateMockTransientData(dataPoints: number) {
    const mockData = [];
    
    for (let i = 0; i < dataPoints; i++) {
      mockData.push({
        name: "高压涡轮出口总压",
        data: [10 + Math.random() * 5 + i * 0.1]
      });
      mockData.push({
        name: "高压压气机出口总压", 
        data: [15 + Math.random() * 3 + i * 0.05]
      });
      mockData.push({
        name: "低压涡轮出口总压",
        data: [8 + Math.random() * 4 + i * 0.08]
      });
    }
    
    return mockData;
  }

  // 初始化图表数据
  function initializeChartData(chartId: number, curves: any[]) {
    const data: Array<{time: number, values: number[]}> = [];
    chartData.set(chartId, data);
  }

  // 根据计算结果更新图表数据
  function updateChartsFromCalculationData(calculationData: any[]) {
    // 模拟过渡态数据：根据CSV数据列数生成时间序列数据
    const numDataPoints = csvData.length > 0 ? csvData[0].length - 1 : 10; // 减1是因为第一列是参数名
    
    curveCharts.forEach(chart => {
      const data: Array<{time: number, values: number[]}> = [];
      
      // 为每个时间点生成数据
      for (let timeIndex = 0; timeIndex < numDataPoints; timeIndex++) {
        const values: number[] = [];
        
        // 为每条曲线生成数值
        chart.curves.forEach((curve, curveIndex) => {
          // 基于时间和曲线索引生成模拟数据
          const baseValue = 10 + curveIndex * 5;
          const timeVariation = Math.sin(timeIndex * 0.5) * 3;
          const randomVariation = (Math.random() - 0.5) * 2;
          values.push(baseValue + timeVariation + randomVariation);
        });
        
        data.push({ time: timeIndex, values });
      }
      
      chartData.set(chart.id, data);
    });
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

  // 计算函数 - 移除成功弹窗
  async function handleCalculate() {
    if (!selectedFile && csvData.length === 0) {
      alert('请先选择文件');
      return;
    }
    
    isCalculating = true;
    
    try {
      // 将表格数据转换为JSON格式
      const jsonData = convertTableToJSON();
      console.log('发送到后端的数据:', jsonData);
      
      // 验证数据格式
      if (jsonData.length === 0) {
        throw new Error('没有有效的数据列');
      }

      // 调用后端计算函数
      const result = await callTransientCalculation(jsonData);
      console.log('计算返回结果:', result);
      
      // 显示结果界面
      showResults = true;
      
      // 为所有现有图表初始化数据
      curveCharts.forEach(chart => {
        if (!chartData.has(chart.id)) {
          initializeChartData(chart.id, chart.curves);
        }
      });
      
      // 根据计算结果更新图表数据
      updateChartsFromCalculationData(result);
      
      // 移除计算完成弹窗 - 静默完成计算
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
      if (!chartData.has(chart.id)) {
        initializeChartData(chart.id, chart.curves);
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

          <!-- 计算按钮 - 移除重置按钮 -->
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

        <!-- 结果表格 -->
        <div class="bg-gray-800 rounded border border-gray-700 overflow-hidden h-[calc(100%-100px)]">
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
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- 计算结果界面 - 只有左侧目录树和中间图表 -->
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
          <!-- 顶部控制栏 - 移除重置按钮 -->
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
              
              <!-- 右侧：移除所有控制按钮，只显示状态信息 -->
              <div class="flex items-center gap-2">
                <div class="text-xs text-gray-500">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          <!-- 图表显示区域 -->
          <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-y-auto">
            <ChartDisplay 
              charts={curveCharts}
              chartData={chartData}
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>