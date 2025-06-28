<script lang="ts">
  let isCalculating = $state(false);
  let isPaused = $state(false);
  let showResults = $state(false);
  let storagePath = $state('');
  let showParameterModal = $state(false);
  let showMonitorModal = $state(false);

  // 模态框位置状态
  let parameterModalPosition = $state({ x: 100, y: 100 });
  let monitorModalPosition = $state({ x: 200, y: 150 });
  let isDraggingParameterModal = $state(false);
  let isDraggingMonitorModal = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });

  // 输入参数状态
  const inputParams = $state({
    height: '21980.33',
    machNumber: '21980.33',
    temperature: '102534.11',
    gasFlowSystem: '102534.11',
    powerConsumption: '123444.33',
    gasCompressionRatio: '122444.33',
    oilFieldAngle: '66.66'
  });

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 刻度组件状态
  const scaleSettings = $state({
    min: 0,
    max: 120,
    interval: 20,
    currentValue: 66.66
  });

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

  // 实时监控表格数据
  const monitorTableData = [
    { parameter: 'N1Cor', value: '8542.3' },
    { parameter: 'N2Cor', value: '12456.7' },
    { parameter: 'WTCor', value: '245.8' },
    { parameter: 'F', value: '15420.5' },
    { parameter: 'FG', value: '16890.2' },
    { parameter: 'A8', value: '0.245' },
    { parameter: 'A9', value: '0.312' },
    { parameter: 'A16', value: '0.156' },
    { parameter: 'T3', value: '658.4' },
    { parameter: 'T41', value: '1245.6' },
    { parameter: 'T43', value: '1156.8' },
    { parameter: 'P21', value: '2.45' },
    { parameter: 'P3', value: '12.8' },
    { parameter: 'P41', value: '11.2' },
    { parameter: 'P43', value: '3.8' },
    { parameter: 'T6', value: '945.2' },
    { parameter: 'P6', value: '2.1' },
    { parameter: 'P8', value: '1.8' },
    { parameter: 'T38', value: '1089.5' },
    { parameter: 'T8', value: '856.3' }
  ];

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
      // 开始
      isCalculating = true;
      await new Promise(resolve => setTimeout(resolve, 1000));
      showResults = true;
    }
  }

  function handlePause() {
    isPaused = true;
    isCalculating = false;
  }

  function handleReset() {
    showResults = false;
    isCalculating = false;
    isPaused = false;
    // 重置输入参数
    Object.keys(inputParams).forEach(key => {
      inputParams[key] = '';
    });
    storagePath = '';
    scaleSettings.currentValue = 0;
  }

  function handleDownload() {
    if (!storagePath) {
      alert('请输入存储路径');
      return;
    }
    alert(`数据已下载到: ${storagePath}`);
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

  // 打开监控弹窗
  function openMonitorModal() {
    showMonitorModal = true;
  }

  // 关闭弹窗
  function closeModals() {
    showParameterModal = false;
    showMonitorModal = false;
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

  // 添加参数到曲线图
  function addParameterToChart(chartId: number) {
    openParameterModal();
    // 这里可以设置一个标记，表示是为特定图表添加参数
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
</script>

<svelte:window 
  onmousemove={(e) => {
    handleScaleMouseMove(e);
    handleModalMouseMove(e);
  }} 
  onmouseup={() => {
    handleScaleMouseUp();
    handleModalMouseUp();
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
                  <!-- 添加参数按钮 -->
                  <button 
                    class="w-5 h-5 bg-green-600 hover:bg-green-700 rounded text-xs flex items-center justify-center text-white"
                    onclick={() => addParameterToChart(chart.id)}
                    title="添加参数"
                  >
                    +
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
        {#if showResults}
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
        {:else}
          <div class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <div class="text-6xl mb-4">📊</div>
              <p class="text-lg">点击开始按钮查看曲线图</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- 右侧控制面板 -->
      <div class="w-full lg:w-80 flex flex-col gap-4">
        <!-- 存储路径 - 所有内容在一行显示 -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
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

        <!-- 开始和重置按钮 -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div class="flex gap-2">
            {#if isCalculating}
              <button
                class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                onclick={handlePause}
              >
                暂停
              </button>
            {:else if isPaused}
              <button
                class="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                onclick={handleStart}
              >
                继续
              </button>
            {:else}
              <button
                class="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                onclick={handleStart}
              >
                开始
              </button>
            {/if}
            <button
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              onclick={handleReset}
            >
              重置
            </button>
          </div>
        </div>

        <!-- 仿真步长、模式选择 -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <!-- 仿真步长按钮 - 单选 -->
          <div class="mb-3">
            <div class="flex gap-1 mb-2">
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
            <div class="flex gap-1 mb-2">
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

        <!-- 油门杆角度和输入参数 - 修复显示问题 -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 overflow-visible">
          <div class="flex items-start gap-4">
            <!-- 左侧：油门杆角度温度计 -->
            <div class="flex-shrink-0">
              <h3 class="text-xs text-gray-300 mb-2">油门杆角度</h3>
              <div class="relative">
                <div 
                  class="w-8 h-40 bg-gray-700 rounded cursor-pointer relative"
                  onmousedown={handleScaleMouseDown}
                >
                  <!-- 刻度标记 - 确保完全可见 -->
                  {#each Array(7) as _, i}
                    {@const value = scaleSettings.max - (i * scaleSettings.interval)}
                    <div class="absolute left-0 flex items-center" style="top: {i * 32}px;">
                      <div class="w-2 h-0.5 bg-gray-400"></div>
                      <span class="text-xs text-gray-400 ml-2 font-mono whitespace-nowrap">{value}</span>
                    </div>
                  {/each}

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
            <div class="w-px bg-gray-600 h-48"></div>

            <!-- 右侧：输入参数 - 确保完全可见 -->
            <div class="flex-1 space-y-2 min-w-0">
              <!-- 高度 -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-300 w-16 flex-shrink-0">高度</label>
                <div class="relative flex-1 min-w-0">
                  <input
                    type="text"
                    bind:value={inputParams.height}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">m</span>
                </div>
              </div>

              <!-- 马赫数 -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-300 w-16 flex-shrink-0">马赫数</label>
                <input
                  type="text"
                  bind:value={inputParams.machNumber}
                  class="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <!-- 温度修正 -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-300 w-16 flex-shrink-0">温度修正</label>
                <div class="relative flex-1 min-w-0">
                  <input
                    type="text"
                    bind:value={inputParams.temperature}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">K</span>
                </div>
              </div>

              <!-- 进气道总压恢复系数 -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-300 w-16 flex-shrink-0">进气道</label>
                <div class="relative flex-1 min-w-0">
                  <input
                    type="text"
                    bind:value={inputParams.gasFlowSystem}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">m</span>
                </div>
              </div>

              <!-- 功率提取 -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-300 w-16 flex-shrink-0">功率提取</label>
                <div class="relative flex-1 min-w-0">
                  <input
                    type="text"
                    bind:value={inputParams.powerConsumption}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">W</span>
                </div>
              </div>

              <!-- 压气机中间级引气 -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-300 w-16 flex-shrink-0">压气机</label>
                <div class="relative flex-1 min-w-0">
                  <input
                    type="text"
                    bind:value={inputParams.gasCompressionRatio}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-8"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">kg.s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 实时监控按钮 -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <button 
            class="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            onclick={openMonitorModal}
          >
            实时监控
          </button>
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

<!-- 实时监控弹窗 - 可拖拽，表格形式 -->
{#if showMonitorModal}
  <div 
    class="fixed bg-gray-800 border border-gray-700 rounded-lg w-[400px] h-[500px] flex flex-col z-50 shadow-2xl"
    style="left: {monitorModalPosition.x}px; top: {monitorModalPosition.y}px;"
  >
    <!-- 弹窗标题 - 可拖拽区域 -->
    <div 
      class="flex items-center justify-between p-4 border-b border-gray-700 cursor-move"
      onmousedown={(e) => handleModalMouseDown(e, 'monitor')}
    >
      <h3 class="text-lg font-medium text-gray-200">实时监控</h3>
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
              <td class="px-3 py-2 text-gray-300 border-r border-gray-600">{row.parameter}</td>
              <td class="px-3 py-2 text-center text-white font-mono">{row.value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- 底部控制按钮 -->
    <div class="p-3 border-t border-gray-700">
      <div class="flex justify-end gap-2">
        <button class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded" onclick={closeModals}>关闭</button>
      </div>
    </div>
  </div>
{/if}