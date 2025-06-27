<script lang="ts">
  import ParameterList from './ParameterList.svelte';
  
  let isCalculating = $state(false);
  let showResults = $state(false);
  let storagePath = $state('');

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

  // 传感器长度状态
  let sensor1 = $state('0.023 5');
  let sensor2 = $state('0.123 6');

  // 刻度组件状态 - 简化版，删除最小值、最大值、间隔设置
  const scaleSettings = $state({
    min: 0,
    max: 120,
    interval: 20,
    currentValue: 66.66
  });

  // 曲线组数据 - 简化版，只显示名称
  const curveGroups = [
    {
      name: '曲线组-1',
      curves: [
        { name: '高压涡轮出口总压' },
        { name: '高压压气机出口总压' },
        { name: '低压涡轮出口总压' }
      ]
    },
    {
      name: '曲线组-2', 
      curves: [
        { name: '高压涡轮出口总压' },
        { name: '高压压气机出口总压' },
        { name: '低压涡轮出口总压' }
      ]
    },
    {
      name: '曲线组-3',
      curves: [
        { name: '高压涡轮出口总压' },
        { name: '高压压气机出口总压' },
        { name: '低压涡轮出口总压' }
      ]
    }
  ];

  // 参数列表数据 - 左侧
  const leftParameterList = [
    { name: '低压涡轮进口总压' },
    { name: '高压涡轮进口总压' },
    { name: '发动机进口总流量' },
    { name: '发动机进口净压阻力' },
    { name: '发动机总转速' },
    { name: '主燃烧室转速' },
    { name: '加力燃烧室转速' },
    { name: '风扇出口总压' },
    { name: '高压压气机出口温度' },
    { name: '高压涡轮进口温度' },
    { name: '低压涡轮进口温度' },
    { name: '低压涡轮出口温度' },
    { name: '风扇出口总压' },
    { name: '高压压气机出口总压' },
    { name: '高压涡轮出口总压' },
    { name: '低压涡轮出口总压' }
  ];

  // 参数列表数据 - 右侧
  const rightParameterList = [
    { name: '发动机净马力' },
    { name: '发动机总马力' },
    { name: '循环装置面积' },
    { name: '循环装置总压' },
    { name: '循环出口总压' },
    { name: '循环装置温度' },
    { name: '循环出口温度' },
    { name: '循环装置流量温度' },
    { name: '循环出口流量' },
    { name: '循环装置总压' },
    { name: '循环出口总压' },
    { name: '循环装置流量温度' },
    { name: '循环出口流量' },
    { name: '循环压力损失系数' }
  ];

  // 2列参数列表数据 - 用于新的参数列表组件
  const parameterListData = [
    { name: 'N1Cor', value: '8542.3', unit: 'rpm', category: '转速参数' },
    { name: 'N2Cor', value: '12456.7', unit: 'rpm', category: '转速参数' },
    { name: 'WTCor', value: '245.8', unit: 'kg/s', category: '流量参数' },
    { name: 'F', value: '15420.5', unit: 'N', category: '推力参数' },
    { name: 'FG', value: '16890.2', unit: 'N', category: '推力参数' },
    { name: 'A8', value: '0.245', unit: 'm²', category: '面积参数' },
    { name: 'A9', value: '0.312', unit: 'm²', category: '面积参数' },
    { name: 'A16', value: '0.156', unit: 'm²', category: '面积参数' },
    { name: 'T3', value: '658.4', unit: 'K', category: '温度参数' },
    { name: 'T41', value: '1245.6', unit: 'K', category: '温度参数' },
    { name: 'T43', value: '1156.8', unit: 'K', category: '温度参数' },
    { name: 'P21', value: '2.45', unit: 'bar', category: '压力参数' },
    { name: 'P3', value: '12.8', unit: 'bar', category: '压力参数' },
    { name: 'P41', value: '11.2', unit: 'bar', category: '压力参数' },
    { name: 'P43', value: '3.8', unit: 'bar', category: '压力参数' },
    { name: 'T6', value: '945.2', unit: 'K', category: '温度参数' },
    { name: 'P6', value: '2.1', unit: 'bar', category: '压力参数' },
    { name: 'P8', value: '1.8', unit: 'bar', category: '压力参数' },
    { name: 'T38', value: '1089.5', unit: 'K', category: '温度参数' },
    { name: 'T8', value: '856.3', unit: 'K', category: '温度参数' },
    { name: 'T9', value: '798.4', unit: 'K', category: '温度参数' },
    { name: 'P49', value: '1.6', unit: 'bar', category: '压力参数' },
    { name: 'P9', value: '1.4', unit: 'bar', category: '压力参数' },
    { name: 'T49', value: '745.8', unit: 'K', category: '温度参数' },
    { name: 'V9', value: '456.2', unit: 'm/s', category: '速度参数' },
    { name: 'Cfg', value: '0.985', unit: '', category: '系数参数' }
  ];

  // 右侧数据表格
  const dataTable = [
    { name: 'N1Cor', unit: '数值', value: '', path: '' },
    { name: 'N2Cor', unit: '数值', value: '', path: '存储路径' },
    { name: 'WTCor', unit: '数值', value: '', path: '' },
    { name: 'F', unit: '参数', value: '', path: '' },
    { name: 'FG', unit: '数值', value: '', path: '' },
    { name: '', unit: '参数', value: '参数', path: '参数' },
    { name: '', unit: '数值', value: '数值', path: '数值' },
    { name: '', unit: '参数', value: '参数', path: '参数' },
    { name: '', unit: '参数', value: '参数', path: '参数' },
    { name: 'A8', unit: '参数', value: '', path: '' },
    { name: 'A9', unit: '参数', value: '', path: '' },
    { name: 'A16', unit: '数值', value: '', path: '' },
    { name: 'T3', unit: '参数', value: '', path: '' },
    { name: 'T41', unit: '参数', value: '', path: '' },
    { name: 'T43', unit: '数值', value: '', path: '' },
    { name: 'P21', unit: '参数', value: '', path: '' },
    { name: 'P3', unit: '参数', value: '', path: '' },
    { name: 'P41', unit: '参数', value: '', path: '' },
    { name: 'P43', unit: '参数', value: '', path: '' },
    { name: 'T6', unit: '参数', value: '', path: '' },
    { name: 'P6', unit: '参数', value: '', path: '' },
    { name: 'P8', unit: '参数', value: '', path: '' },
    { name: 'T38', unit: '参数', value: '', path: '' },
    { name: 'T8', unit: '参数', value: '', path: '' },
    { name: 'T9', unit: '参数', value: '', path: '' },
    { name: 'P49', unit: '参数', value: '', path: '' },
    { name: 'P9', unit: '参数', value: '', path: '' },
    { name: 'T49', unit: '参数', value: '', path: '' },
    { name: 'T9', unit: '参数', value: '', path: '' },
    { name: 'V9', unit: '参数', value: '', path: '' },
    { name: 'Cfg', unit: '参数', value: '', path: '' }
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
    isCalculating = true;
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    showResults = true;
    isCalculating = false;
  }

  function handleReset() {
    showResults = false;
    isCalculating = false;
    // 重置输入参数
    Object.keys(inputParams).forEach(key => {
      inputParams[key] = '';
    });
    storagePath = '';
    scaleSettings.currentValue = 0;
  }

  function handleSave() {
    if (!storagePath) {
      alert('请输入存储路径');
      return;
    }
    alert(`数据已保存到: ${storagePath}`);
  }
</script>

<svelte:window onmousemove={handleScaleMouseMove} onmouseup={handleScaleMouseUp} />

<div class="flex h-[calc(100vh-120px)]">
  <!-- 左侧曲线组面板 -->
  <div class="w-48 bg-gray-800 border-r border-gray-700 overflow-y-auto">
    {#each curveGroups as group}
      <div class="border-b border-gray-700">
        <!-- 曲线组标题 -->
        <div class="flex items-center justify-between p-2 bg-gray-750">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <span class="text-sm text-gray-300">{group.name}</span>
          </div>
        </div>
        
        <!-- 曲线列表 - 只显示名称，无复选框 -->
        <div class="p-2 space-y-1">
          {#each group.curves as curve}
            <div class="text-xs text-gray-300 leading-tight px-2 py-1">
              {curve.name}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- 中间参数选择面板 -->
  <div class="w-80 bg-gray-850 border-r border-gray-700 flex flex-col">
    <!-- 参数选择区域 -->
    <div class="flex-1 flex">
      <!-- 左侧参数列表 -->
      <div class="flex-1 p-3 overflow-y-auto">
        <div class="space-y-1">
          {#each leftParameterList as param}
            <div class="flex items-center gap-2">
              <input type="checkbox" class="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-1">
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
              <input type="checkbox" class="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-1">
              <span class="text-xs text-gray-300 leading-tight">{param.name}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- 底部控制按钮 -->
    <div class="p-3 border-t border-gray-700 space-y-2">
      <div class="flex gap-2">
        <button class="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded">关闭</button>
        <button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">确认</button>
      </div>
    </div>
  </div>

  <!-- 右侧主要内容区域 -->
  <div class="flex-1 bg-gray-900 flex">
    <!-- 图表区域 -->
    <div class="flex-1 p-4 overflow-y-auto">
      {#if showResults}
        <!-- 长曲线图展示 - 每行一个图表 -->
        <div class="space-y-4">
          {#each Array(6) as _, index}
            <div class="bg-black rounded border border-gray-700 p-4 h-48">
              <!-- 图表标题 -->
              <div class="flex justify-between items-center mb-2">
                <h3 class="text-sm text-gray-300">曲线图 {index + 1}</h3>
                <div class="flex gap-1">
                  <button class="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs flex items-center justify-center">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                    </svg>
                  </button>
                  <button class="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs flex items-center justify-center">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                    </svg>
                  </button>
                </div>
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

    <!-- 2列参数列表组件 - 位于存储路径栏左侧 -->
    <div class="w-80 border-l border-gray-700">
      <ParameterList 
        title="实时参数监控" 
        parameters={parameterListData} 
        columns={2} 
      />
    </div>

    <!-- 右侧刻度组件和数据表格 -->
    <div class="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      <!-- 存储路径 - 放在最上方 -->
      <div class="p-3 border-b border-gray-700">
        <label class="block text-xs text-gray-300 mb-2">存储路径</label>
        <input
          type="text"
          bind:value={storagePath}
          placeholder="输入存储路径"
          class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <!-- 刻度组件和输入参数并排 -->
      <div class="p-3 border-b border-gray-700">
        <div class="bg-gray-900 rounded p-3">
          <h3 class="text-sm text-gray-300 mb-3">油门杆角度</h3>
          <div class="flex items-start gap-4">
            <!-- 垂直刻度条 -->
            <div class="relative">
              <div 
                class="w-6 h-32 bg-gray-700 rounded cursor-pointer relative"
                onmousedown={handleScaleMouseDown}
              >
                <!-- 刻度标记 -->
                {#each Array(7) as _, i}
                  {@const value = scaleSettings.max - (i * scaleSettings.interval)}
                  <div class="absolute left-0 w-full flex items-center" style="top: {i * 26.67}px;">
                    <div class="w-1 h-0.5 bg-gray-400"></div>
                    <span class="text-xs text-gray-400 ml-1 font-mono">{value}</span>
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
                    class="absolute w-3 h-3 bg-blue-500 rounded-full border border-white cursor-pointer transform -translate-x-1/2"
                    style="bottom: {percentage * 100}%; left: 50%; transform: translate(-50%, 50%);"
                  ></div>
                {/each}
              </div>
              
              <!-- 当前值显示 -->
              <div class="text-center mt-2">
                <span class="text-xs text-white font-mono">{scaleSettings.currentValue.toFixed(2)}/deg</span>
              </div>
            </div>

            <!-- 输入参数区域 - 紧凑布局 -->
            <div class="flex-1 space-y-2">
              <!-- 高度 -->
              <div>
                <label class="block text-xs text-gray-300 mb-1">高度(0~22000)</label>
                <div class="relative">
                  <input
                    type="text"
                    bind:value={inputParams.height}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">m</span>
                </div>
              </div>

              <!-- 马赫数 -->
              <div>
                <label class="block text-xs text-gray-300 mb-1">马赫数(0~2.5)</label>
                <input
                  type="text"
                  bind:value={inputParams.machNumber}
                  class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <!-- 温度修正 -->
              <div>
                <label class="block text-xs text-gray-300 mb-1">温度修正(20)</label>
                <div class="relative">
                  <input
                    type="text"
                    bind:value={inputParams.temperature}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">K</span>
                </div>
              </div>

              <!-- 进气道总压恢复系数 -->
              <div>
                <label class="block text-xs text-gray-300 mb-1">进气道总压恢复系数(0~1.1)</label>
                <div class="relative">
                  <input
                    type="text"
                    bind:value={inputParams.gasFlowSystem}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">m</span>
                </div>
              </div>

              <!-- 功率提取 -->
              <div>
                <label class="block text-xs text-gray-300 mb-1">功率提取(0~1000000)</label>
                <div class="relative">
                  <input
                    type="text"
                    bind:value={inputParams.powerConsumption}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                  />
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">W</span>
                </div>
              </div>

              <!-- 压气机中间级引气 -->
              <div>
                <label class="block text-xs text-gray-300 mb-1">压气机中间级引气(0~100000)</label>
                <div class="relative">
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
      </div>

      <!-- 底部按钮区域 - 缩小尺寸 -->
      <div class="p-3 border-t border-gray-700">
        <div class="flex gap-1 mb-2">
          <!-- 传感器长度按钮 - 缩小 -->
          <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-1 py-1 rounded text-xs font-medium transition-colors">
            传感器长度<br>{sensor1}
          </button>
          <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-1 py-1 rounded text-xs font-medium transition-colors">
            传感器长度<br>{sensor2}
          </button>
        </div>
        
        <div class="flex gap-1 mb-2">
          <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
            作线
          </button>
          <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
            训线
          </button>
        </div>
        
        <div class="flex gap-1 mb-2">
          <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
            地面
          </button>
          <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
            空中
          </button>
        </div>

        <!-- 控制按钮 -->
        <div class="flex gap-1">
          <button
            class="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={handleStart}
            disabled={isCalculating}
          >
            {isCalculating ? '计算中...' : '开始'}
          </button>
          <button
            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
            onclick={handleReset}
          >
            重置
          </button>
          <button
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
            onclick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</div>