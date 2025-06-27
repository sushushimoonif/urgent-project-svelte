<script lang="ts">
  let isCalculating = $state(false);
  let showResults = $state(false);

  // 输入参数状态
  const inputParams = $state({
    height: '21980.33',
    machNumber: '21980.33',
    temperature: '102534.11',
    gasFlowSystem: '102534.11',
    powerConsumption: '123444.33',
    gasCompressionRatio: '122444.33',
    oilFieldAngle: '122444.33'
  });

  // 传感器长度状态
  let sensor1 = $state('0.023 5');
  let sensor2 = $state('0.123 6');

  // 模式选择状态
  let selectedMode1 = $state('作线');
  let selectedMode2 = $state('地面');

  // 结果数据
  const resultsData = [
    { label: '仿真步长', value1: '0', label2: '仿真步长', value2: '0' },
    { label: '仿真步长', value1: '22000.00', label2: '低压侧输送管道', value2: '22000.00' },
    { label: '高度', value1: '1.33', label2: '高压侧输送管道', value2: '1.33' },
    { label: '发动机进口物理流量/kg/s', value1: '300.66', label2: '发动机进口物理流量/kg/s', value2: '300.66' },
    { label: '发动机净马力/kW', value1: '2000000.00', label2: '发动机净马力/kW', value2: '2000000.00' },
    { label: '发动机总马力/kW', value1: '300.55', label2: '发动机总马力/kW', value2: '300.55' },
    { label: '发动机进口净压阻力/kN', value1: '114.33', label2: '发动机进口净压阻力/kN', value2: '114.33' },
    { label: '发动机总转速/kg/h', value1: '300.55', label2: '发动机总转速/kg/h', value2: '300.55' },
    { label: '主输送管转速/kg/h', value1: '111111', label2: '主输送管转速/kg/h', value2: '111111' },
    { label: '加力装置管转速/kg/h', value1: '1345567', label2: '加力装置管转速/kg/h', value2: '1345567' },
    { label: '循环装置面积/m²', value1: '31311', label2: '循环装置面积/m²', value2: '31311' },
    { label: '循环出口面积/m²', value1: '231', label2: '循环出口面积/m²', value2: '231' },
    { label: '风嘴出口温度/K', value1: '12312', label2: '风嘴出口温度/K', value2: '12312' },
    { label: '高压气气体出口温度/K', value1: '5678', label2: '高压气气体出口温度/K', value2: '5678' },
    { label: '高压泵轮出口温度/K', value1: '906534', label2: '高压泵轮出口温度/K', value2: '906534' },
    { label: '低压泵轮出口温度/K', value1: '24234', label2: '低压泵轮出口温度/K', value2: '24234' }
  ];

  async function handleCalculate() {
    isCalculating = true;
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    showResults = true;
    isCalculating = false;
  }
</script>

<div class="flex h-[calc(100vh-120px)]">
  <!-- 左侧输入面板 - 缩小尺寸 -->
  <div class="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
    <!-- 传感器长度按钮 -->
    <div class="mb-4">
      <div class="flex gap-1 mb-2">
        <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
          传感器长度<br>{sensor1}
        </button>
        <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
          传感器长度<br>{sensor2}
        </button>
      </div>
      
      <!-- 模式选择按钮 -->
      <div class="flex gap-1 mb-2">
        <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
          作线
        </button>
        <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
          训线
        </button>
      </div>
      
      <div class="flex gap-1 mb-4">
        <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
          地面
        </button>
        <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
          空中
        </button>
      </div>
    </div>

    <!-- 输入参数 - 缩小间距和字体 -->
    <div class="space-y-2">
      <!-- 高度 -->
      <div>
        <label class="block text-xs text-gray-300 mb-1">
          高度(0~22000)
        </label>
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
        <label class="block text-xs text-gray-300 mb-1">
          马赫数(0~2.5)
        </label>
        <input
          type="text"
          bind:value={inputParams.machNumber}
          class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <!-- 温度修正 -->
      <div>
        <label class="block text-xs text-gray-300 mb-1">
          温度修正(20)
        </label>
        <div class="relative">
          <input
            type="text"
            bind:value={inputParams.temperature}
            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
          />
          <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">K</span>
        </div>
      </div>

      <!-- 进气道压力传递系统 -->
      <div>
        <label class="block text-xs text-gray-300 mb-1">
          进气道压力传递系统(0~1.1)
        </label>
        <div class="relative">
          <input
            type="text"
            bind:value={inputParams.gasFlowSystem}
            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
          />
          <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">m</span>
        </div>
      </div>

      <!-- 功率规律 -->
      <div>
        <label class="block text-xs text-gray-300 mb-1">
          功率规律(0~1000000)
        </label>
        <div class="relative">
          <input
            type="text"
            bind:value={inputParams.powerConsumption}
            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
          />
          <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">W</span>
        </div>
      </div>

      <!-- 压气机压缩比引气 -->
      <div>
        <label class="block text-xs text-gray-300 mb-1">
          压气机压缩比引气(0~100000)
        </label>
        <div class="relative">
          <input
            type="text"
            bind:value={inputParams.gasCompressionRatio}
            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-8"
          />
          <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">kg.s</span>
        </div>
      </div>

      <!-- 油门杆角度 -->
      <div>
        <label class="block text-xs text-gray-300 mb-1">
          油门杆角度(0~1000000)
        </label>
        <div class="relative">
          <input
            type="text"
            bind:value={inputParams.oilFieldAngle}
            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-8"
          />
          <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">deg</span>
        </div>
      </div>
    </div>

    <!-- 计算按钮 -->
    <div class="mt-4">
      <button
        class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        onclick={handleCalculate}
        disabled={isCalculating}
      >
        <span class="text-sm">▶</span>
        {isCalculating ? '计算中...' : '计算'}
      </button>
    </div>
  </div>

  <!-- 右侧结果面板 -->
  <div class="flex-1 bg-gray-900 overflow-hidden">
    {#if showResults}
      <div class="h-full overflow-auto p-6">
        <div class="bg-gray-800 rounded border border-gray-700 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <!-- 表头 -->
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-4 py-3 text-center font-medium text-gray-200 border-r border-gray-600 min-w-[200px]">1</th>
                  <th class="px-4 py-3 text-center font-medium text-gray-200 border-r border-gray-600 min-w-[120px]">1</th>
                  <th class="px-4 py-3 text-center font-medium text-gray-200 border-r border-gray-600 min-w-[200px]">1</th>
                  <th class="px-4 py-3 text-center font-medium text-gray-200 min-w-[120px]">1</th>
                </tr>
              </thead>
              
              <!-- 数据行 -->
              <tbody>
                {#each resultsData as row, index}
                  <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                    <td class="px-4 py-3 text-gray-300 border-r border-gray-600">{row.label}</td>
                    <td class="px-4 py-3 text-center text-white border-r border-gray-600">{row.value1}</td>
                    <td class="px-4 py-3 text-gray-300 border-r border-gray-600">{row.label2}</td>
                    <td class="px-4 py-3 text-center text-white">{row.value2}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center h-full text-gray-400">
        <div class="text-center">
          <div class="text-6xl mb-4">📊</div>
          <p class="text-lg">点击计算按钮查看结果</p>
        </div>
      </div>
    {/if}
  </div>
</div>