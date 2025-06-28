<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';

  let isCalculating = $state(false);
  let showResults = $state(false);
  let showCalculationResults = $state(false); // 新增：显示计算结果页面
  let selectedFile = $state<File | null>(null);
  let csvData = $state<string[][]>([]);
  let dataOut2 = $state<Array<{name: string, data: any[]}>>([]);

  // 计算按钮是否可用 - 只有上传文件后才能计算 - 使用 $derived 替代 $:
  const canCalculate = $derived(selectedFile !== null && csvData.length > 0);

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
    }
  ]);

  // 参数列表数据 - 左侧
  const leftParameterList = [
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
  ];

  // 参数列表数据 - 右侧
  const rightParameterList = [
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
  ];

  // 模态框状态
  let showParameterModal = $state(false);
  let parameterModalPosition = $state({ x: 100, y: 100 });
  let isDraggingParameterModal = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });

  // 生成模拟长曲线数据
  function generateLongCurveData(points = 500) {
    const data = [];
    for (let i = 0; i < points; i++) {
      const time = i * 0.1;
      data.push({
        time,
        value1: 10 + Math.sin(time * 0.1) * 5 + Math.random() * 2,
        value2: 5 + Math.cos(time * 0.15) * 3 + Math.random() * 1.5,
        value3: 15 + Math.sin(time * 0.08) * 4 + Math.random() * 1.8
      });
    }
    return data;
  }

  const longCurveData = generateLongCurveData();

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

        // 直接使用原始CSV数据，不进行转置
        csvData = fileData;
        showResults = true;
        console.log('文件读取成功，数据行数:', csvData.length);
        console.log('数据预览:', csvData.slice(0, 3));
        
      } catch (error) {
        console.error('文件读取错误:', error);
        alert('文件读取失败，请检查文件格式');
      }
    }
  }

  // 添加新列
  function addColumn() {
    if (csvData.length === 0) return;
    
    // 获取当前最大列数
    const maxColumns = Math.max(...csvData.map(row => row.length));
    const newColumnIndex = maxColumns + 1;
    
    csvData = csvData.map((row, rowIndex) => {
      if (rowIndex === 0) {
        // 第一行：添加新的列标题
        return [...row, `新列${newColumnIndex}`];
      } else {
        // 其他行：添加默认值0
        return [...row, '0'];
      }
    });
  }

  // 删除列
  function deleteColumn(columnIndex: number) {
    if (csvData.length === 0 || columnIndex <= 0) return; // 不能删除第一列
    
    // 删除指定列
    csvData = csvData.map(row => {
      return row.filter((_, index) => index !== columnIndex);
    });
  }

  // 将表格数据转换为后端需要的格式并保存到dataOut2
  function convertTableToBackendFormat() {
    if (csvData.length === 0) return [];
    
    const result = [];
    const headers = csvData[0]; // 第一行是列标题
    const dataRows = csvData.slice(1); // 其他行是数据
    
    // 遍历每一列，构建 {name: 列名, data: [该列所有数据]} 格式
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const columnName = headers[colIndex];
      const columnData = dataRows.map(row => {
        const value = row[colIndex] || '0';
        // 尝试转换为数字，如果失败则保持字符串
        const numValue = parseFloat(value);
        return isNaN(numValue) ? value : numValue;
      });
      
      result.push({
        name: columnName,
        data: columnData
      });
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
        return {
          success: true,
          message: '模拟计算完成（浏览器环境）',
          data: data.map((item, index) => ({
            ...item,
            calculated_result: Math.random() * 100,
            sequence: index + 1
          }))
        };
      }
    } catch (error) {
      console.error('计算调用失败:', error);
      // 如果Tauri调用失败，也返回模拟结果作为后备
      return {
        success: false,
        message: '计算失败，返回模拟结果',
        data: data.map((item, index) => ({
          ...item,
          calculated_result: Math.random() * 100,
          sequence: index + 1
        }))
      };
    }
  }

  async function handleCalculate() {
    if (!canCalculate) {
      alert('请先选择并上传文件');
      return;
    }
    
    isCalculating = true;
    
    try {
      // 将表格数据转换为后端需要的格式并保存到dataOut2
      dataOut2 = convertTableToBackendFormat();
      console.log('保存到dataOut2的数据格式:', dataOut2);
      
      // 验证数据格式
      if (dataOut2.length === 0) {
        throw new Error('没有有效的数据列');
      }

      // 调用后端计算函数
      const result = await callTransientCalculation(dataOut2);
      console.log('计算返回结果:', result);
      
      // 计算完成后显示结果页面
      showCalculationResults = true;
      
    } catch (error) {
      console.error('计算过程中出错:', error);
      alert(`计算失败: ${error.message}`);
    } finally {
      isCalculating = false;
    }
  }

  // 返回上一页面
  function handleGoBack() {
    showCalculationResults = false;
    showResults = true;
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
          curveCharts = presetData;
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

  // 打开参数选择弹窗
  function openParameterModal() {
    showParameterModal = true;
  }

  // 关闭弹窗
  function closeModals() {
    showParameterModal = false;
  }

  // 确认参数选择
  function confirmParameterSelection() {
    // 获取选中的参数
    const selectedParams = [
      ...leftParameterList.filter(p => p.selected),
      ...rightParameterList.filter(p => p.selected)
    ];
    
    if (selectedParams.length > 0) {
      // 创建新的曲线图
      const newChart = {
        id: Date.now(),
        name: `曲线图-${curveCharts.length + 1}`,
        curves: selectedParams.map(p => ({ name: p.name }))
      };
      curveCharts.push(newChart);
      
      // 重置选择状态
      leftParameterList.forEach(p => p.selected = false);
      rightParameterList.forEach(p => p.selected = false);
    }
    
    showParameterModal = false;
  }

  // 删除曲线图
  function deleteChart(chartId: number) {
    curveCharts = curveCharts.filter(chart => chart.id !== chartId);
  }

  // 模态框拖拽处理
  function handleModalMouseDown(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.x = event.clientX - rect.left;
    dragOffset.y = event.clientY - rect.top;
    isDraggingParameterModal = true;
  }

  function handleModalMouseMove(event: MouseEvent) {
    if (isDraggingParameterModal) {
      parameterModalPosition.x = event.clientX - dragOffset.x;
      parameterModalPosition.y = event.clientY - dragOffset.y;
    }
  }

  function handleModalMouseUp() {
    isDraggingParameterModal = false;
  }
</script>

<svelte:window 
  onmousemove={handleModalMouseMove} 
  onmouseup={handleModalMouseUp} 
/>

<div class="min-h-[calc(100vh-120px)] bg-gray-900 p-4 sm:p-6 lg:p-8">
  <div class="w-full max-w-[95%] mx-auto h-full">
    
    {#if showCalculationResults}
      <!-- 计算结果页面 - 类似实时计算页面的前2/3 -->
      <div class="flex flex-col xl:flex-row h-full gap-4">
        <!-- 左侧曲线组面板 - 1/3目录树 -->
        <div class="w-full xl:w-72 bg-gray-800 border border-gray-700 rounded-lg">
          <!-- 返回按钮 -->
          <div class="p-3 border-b border-gray-700">
            <button 
              class="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
              onclick={handleGoBack}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              返回
            </button>
          </div>

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

        <!-- 中间图表区域 - 2/3 -->
        <div class="flex-1 p-4 overflow-y-auto">
          <!-- 长曲线图展示 -->
          <div class="space-y-4">
            {#each curveCharts as chart, index}
              <div class="bg-black rounded border border-gray-700 p-4 h-48">
                <!-- 图表标题 -->
                <div class="flex justify-between items-center mb-2">
                  <h3 class="text-sm text-gray-300">{chart.name}</h3>
                </div>

                <!-- 长曲线图 -->
                <div class="h-full relative">
                  <!-- Y轴标签 -->
                  <div class="absolute left-1 top-2 text-xs text-gray-400">10.0</div>
                  <div class="absolute left-1 top-12 text-xs text-gray-400">5.0</div>
                  <div class="absolute left-1 top-20 text-xs text-gray-400">0.0</div>
                  <div class="absolute left-1 top-28 text-xs text-gray-400">-5.0</div>

                  <!-- X轴标签 -->
                  <div class="absolute bottom-1 left-8 right-8 flex justify-between text-xs text-gray-400">
                    <span>June</span>
                    <span>July</span>
                    <span>August</span>
                    <span>September</span>
                  </div>

                  <!-- 长曲线SVG -->
                  <svg class="w-full h-full" viewBox="0 0 800 160">
                    <!-- 网格线 -->
                    {#each Array(8) as _, i}
                      <line x1="30" y1={20 + i * 20} x2="770" y2={20 + i * 20} stroke="#374151" stroke-width="0.5" opacity="0.3"/>
                    {/each}
                    {#each Array(20) as _, i}
                      <line x1={30 + i * 37} y1="20" x2={30 + i * 37} y2="140" stroke="#374151" stroke-width="0.5" opacity="0.3"/>
                    {/each}

                    <!-- 长曲线 -->
                    <polyline
                      fill="none"
                      stroke="#fbbf24"
                      stroke-width="1.5"
                      points={longCurveData.slice(0, 100).map((d, i) => `${30 + i * 7.4},${140 - d.value1 * 6}`).join(' ')}
                    />
                  </svg>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <!-- 原始数据表格视图 -->
      <div class="p-6 h-full flex flex-col">
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
          <button
            class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={handleCalculate}
            disabled={!canCalculate || isCalculating}
            title={!canCalculate ? '请先上传文件' : ''}
          >
            {isCalculating ? '计算中...' : '计算'}
          </button>
        </div>

        <!-- 结果表格 -->
        <div class="bg-gray-800 rounded border border-gray-700 overflow-hidden flex-1">
          {#if showResults && csvData.length > 0}
            <div class="overflow-auto h-full">
              <table class="w-full text-sm">
                <!-- 表头 -->
                <thead class="bg-gray-700 sticky top-0">
                  <tr>
                    <!-- 动态生成表头 -->
                    {#each csvData[0] as header, i}
                      <th class="px-4 py-3 text-center font-medium text-gray-200 border-r border-gray-600 min-w-[120px] relative group">
                        <div class="flex items-center justify-center gap-2">
                          <!-- 列标题（可编辑） -->
                          <input 
                            type="text" 
                            bind:value={csvData[0][i]}
                            class="bg-transparent text-center focus:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-gray-200 font-medium"
                          />
                          <!-- 删除列按钮（第一列不能删除） -->
                          {#if i > 0}
                            <button 
                              class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition-opacity"
                              onclick={() => deleteColumn(i)}
                              title="删除此列"
                            >
                              ×
                            </button>
                          {/if}
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
                    <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors {rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                      <!-- 动态生成数据单元格 -->
                      {#each row as cell, cellIndex}
                        <td class="px-4 py-3 text-center text-white border-r border-gray-600">
                          <input 
                            type="text" 
                            bind:value={csvData[rowIndex + 1][cellIndex]}
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
                <p class="text-sm mt-2 text-gray-500">支持 .csv, .xlsx, .xls, .txt 格式</p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
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
      onmousedown={handleModalMouseDown}
    >
      <h3 class="text-lg font-medium text-gray-200">参数选择</h3>
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