<script lang="ts">
  let isCalculating = $state(false);
  let showResults = $state(true); // 页面加载时立即显示结果

  // 输入参数状态 - 使用图片中的默认值
  const inputParams = $state({
    height: '0',
    machNumber: '0',
    temperature: '0',
    gasFlowSystem: '-1',
    powerConsumption: '0',
    gasCompressionRatio: '0',
    oilFieldAngle: '66'
  });

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 根据PDF文件定义的31个属性数据
  const simulationData = [
    { name: "仿真步长/stepTime", range: "0.025或0.0125", defaultValue: 0.025, unit: "秒/s" },
    { name: "高度/Height", range: "0~22000", defaultValue: 0, unit: "米/m" },
    { name: "马赫数/Mach", range: "0~2.5", defaultValue: 0, unit: "" },
    { name: "温度修正/deltaT", range: "0~xx", defaultValue: 0, unit: "开尔文/K" },
    { name: "进气道总压恢复系数", range: "-1或0~1.1，-1表示按照经验公式计算", defaultValue: -1, unit: "" },
    { name: "功率提取", range: "0~1000000", defaultValue: 0, unit: "W" },
    { name: "压气机出口座舱引气", range: "0~2", defaultValue: 0, unit: "%" },
    { name: "油门杆角度/PLA", range: "0~115", defaultValue: 66, unit: "度/deg" },
    { name: "作战or训练", range: "0（作战）或1（训练）", defaultValue: 0, unit: "" },
    { name: "地面or空中", range: "0（地面）或1（空中）", defaultValue: 0, unit: "" },
    { name: "低压轴换算转速/N1cor", range: "0~110", defaultValue: 100, unit: "" },
    { name: "高压轴换算转速/N2cor", range: "0~120", defaultValue: 110, unit: "" },
    { name: "发动机进口物理流量/WTCor", range: "0~300", defaultValue: 245.8, unit: "kg/s" },
    { name: "发动机净推力/F", range: "0~20000", defaultValue: 15420.5, unit: "N" },
    { name: "发动机总推力/FG", range: "0~25000", defaultValue: 16890.2, unit: "N" },
    { name: "喷管出口面积/A8", range: "0~1", defaultValue: 0.245, unit: "m²" },
    { name: "加力喷管出口面积/A9", range: "0~1", defaultValue: 0.312, unit: "m²" },
    { name: "风扇出口面积/A16", range: "0~1", defaultValue: 0.156, unit: "m²" },
    { name: "高压压气机出口总温/T3", range: "200~800", defaultValue: 658.4, unit: "K" },
    { name: "高压涡轮进口总温/T41", range: "800~1500", defaultValue: 1245.6, unit: "K" },
    { name: "低压涡轮进口总温/T43", range: "800~1300", defaultValue: 1156.8, unit: "K" },
    { name: "风扇出口总压/P21", range: "1~5", defaultValue: 2.45, unit: "bar" },
    { name: "高压压气机出口总压/P3", range: "5~20", defaultValue: 12.8, unit: "bar" },
    { name: "高压涡轮进口总压/P41", range: "5~18", defaultValue: 11.2, unit: "bar" },
    { name: "低压涡轮进口总压/P43", range: "2~8", defaultValue: 3.8, unit: "bar" },
    { name: "低压涡轮出口总温/T6", range: "600~1100", defaultValue: 945.2, unit: "K" },
    { name: "低压涡轮出口总压/P6", range: "1~4", defaultValue: 2.1, unit: "bar" },
    { name: "喷管出口总压/P8", range: "1~3", defaultValue: 1.8, unit: "bar" },
    { name: "加力燃烧室出口总温/T38", range: "800~1400", defaultValue: 1089.5, unit: "K" },
    { name: "喷管出口总温/T8", range: "600~1000", defaultValue: 856.3, unit: "K" },
    { name: "燃油消耗率", range: "1000~5000", defaultValue: 2456.8, unit: "kg/h" }
  ];

  // dataIN数组 - 建立映射关系
  let dataIN = $state([
    { name: "stepTime", data: 0.025 },
    { name: "Height", data: 0 },
    { name: "Mach", data: 0 },
    { name: "deltaT", data: 0 },
    { name: "intakeTotalPressureCoeff", data: -1 },
    { name: "powerExtraction", data: 0 },
    { name: "bleedAirRatio", data: 0 },
    { name: "pla", data: 66 },
    { name: "missionType", data: 0 },
    { name: "flightMode", data: 0 },
    { name: "N1cor", data: 100 },
    { name: "N2cor", data: 110 },
    { name: "WTCor", data: 245.8 },
    { name: "F", data: 15420.5 },
    { name: "FG", data: 16890.2 },
    { name: "A8", data: 0.245 },
    { name: "A9", data: 0.312 },
    { name: "A16", data: 0.156 },
    { name: "T3", data: 658.4 },
    { name: "T41", data: 1245.6 },
    { name: "T43", data: 1156.8 },
    { name: "P21", data: 2.45 },
    { name: "P3", data: 12.8 },
    { name: "P41", data: 11.2 },
    { name: "P43", data: 3.8 },
    { name: "T6", data: 945.2 },
    { name: "P6", data: 2.1 },
    { name: "P8", data: 1.8 },
    { name: "T38", data: 1089.5 },
    { name: "T8", data: 856.3 },
    { name: "fuelConsumption", data: 2456.8 }
  ]);

  // 参数名称映射关系
  const parameterMapping = {
    "stepTime": "selectedSimulationStep",
    "Height": "height",
    "Mach": "machNumber", 
    "deltaT": "temperature",
    "intakeTotalPressureCoeff": "gasFlowSystem",
    "powerExtraction": "powerConsumption",
    "bleedAirRatio": "gasCompressionRatio",
    "pla": "oilFieldAngle",
    "missionType": "selectedMode",
    "flightMode": "selectedEnvironment"
  };

  // 更新dataIN数组的函数
  function updateDataIN() {
    // 更新仿真步长
    dataIN[0].data = parseFloat(selectedSimulationStep);
    
    // 更新输入参数
    dataIN[1].data = parseFloat(inputParams.height) || 0;
    dataIN[2].data = parseFloat(inputParams.machNumber) || 0;
    dataIN[3].data = parseFloat(inputParams.temperature) || 0;
    dataIN[4].data = parseFloat(inputParams.gasFlowSystem) || -1;
    dataIN[5].data = parseFloat(inputParams.powerConsumption) || 0;
    dataIN[6].data = parseFloat(inputParams.gasCompressionRatio) || 0;
    dataIN[7].data = parseFloat(inputParams.oilFieldAngle) || 66;
    
    // 更新模式选择
    dataIN[8].data = selectedMode === '作战' ? 0 : 1;
    dataIN[9].data = selectedEnvironment === '地面' ? 0 : 1;
  }

  // 格式化显示数据的函数
  function formatDisplayData() {
    updateDataIN();
    
    return simulationData.map((item, index) => {
      const currentValue = dataIN[index]?.data ?? item.defaultValue;
      return {
        name: item.name,
        range: item.range,
        currentValue: currentValue,
        unit: item.unit,
        displayText: `${item.name}(${item.range}), ${currentValue}${item.unit ? ' ' + item.unit : ''}`
      };
    });
  }

  // 分列显示数据
  const displayData = $derived(formatDisplayData());
  const leftColumnData = $derived(displayData.slice(0, 15));
  const rightColumnData = $derived(displayData.slice(15, 31));

  // 构建调用参数
  function buildCalculationParams() {
    updateDataIN();
    return {
      stepTime: dataIN[0].data,
      height: dataIN[1].data,
      mach: dataIN[2].data,
      deltaT: dataIN[3].data,
      intakeTotalPressureCoeff: dataIN[4].data,
      powerExtraction: dataIN[5].data,
      bleedAirRatio: dataIN[6].data,
      pla: dataIN[7].data,
      missionType: dataIN[8].data,
      flightMode: dataIN[9].data
    };
  }

  async function handleCalculate() {
    isCalculating = true;
    
    try {
      // 构建调用参数
      const params = buildCalculationParams();
      console.log('计算参数:', params);
      console.log('dataIN数组:', dataIN);
      
      // 模拟计算延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟计算结果更新 - 更新后面的计算结果参数
      for (let i = 10; i < dataIN.length; i++) {
        const baseValue = simulationData[i].defaultValue;
        const variation = (Math.random() - 0.5) * 0.1; // ±5% 变化
        dataIN[i].data = baseValue * (1 + variation);
      }
      
      console.log('计算完成，更新后的dataIN:', dataIN);
      
    } catch (error) {
      console.error('计算过程中出错:', error);
    } finally {
      isCalculating = false;
    }
  }
</script>

<div class="min-h-[calc(100vh-120px)] bg-gray-900 p-4 sm:p-6 lg:p-8">
  <div class="w-full max-w-[80%] mx-auto h-full">
    <div class="flex flex-col lg:flex-row h-full gap-4">
      <!-- 左侧输入面板 -->
      <div class="w-full lg:w-80 bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-y-auto">
        <!-- 仿真步长、作战/训练、地面/空中按钮 -->
        <div class="mb-4 space-y-2">
          <!-- 仿真步长按钮 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedSimulationStep === '0.025' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedSimulationStep = '0.025'}
            >
              仿真步长<br>0.025秒
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedSimulationStep === '0.0125' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedSimulationStep = '0.0125'}
            >
              仿真步长<br>0.0125秒
            </button>
          </div>
          
          <!-- 作战/训练模式选择按钮 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedMode === '作战' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedMode = '作战'}
            >
              作战
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedMode === '训练' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedMode = '训练'}
            >
              训练
            </button>
          </div>
          
          <!-- 地面/空中环境选择按钮 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedEnvironment === '地面' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedEnvironment = '地面'}
            >
              地面
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedEnvironment === '空中' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedEnvironment = '空中'}
            >
              空中
            </button>
          </div>
        </div>

        <!-- 输入参数 - 根据图片更新参数范围 -->
        <div class="space-y-3">
          <!-- 高度 -->
          <div class="flex items-center gap-3">
            <label class="text-xs text-gray-300 w-32 flex-shrink-0">
              高度(0~22000)
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.height}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                placeholder="0"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">m</span>
            </div>
          </div>

          <!-- 马赫数 -->
          <div class="flex items-center gap-3">
            <label class="text-xs text-gray-300 w-32 flex-shrink-0">
              马赫数(0~2.5)
            </label>
            <input
              type="text"
              bind:value={inputParams.machNumber}
              class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <!-- 温度修正 -->
          <div class="flex items-center gap-3">
            <label class="text-xs text-gray-300 w-32 flex-shrink-0">
              温度修正(0~xx)
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.temperature}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-12"
                placeholder="0"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">开尔文</span>
            </div>
          </div>

          <!-- 进气道总压恢复系数 -->
          <div class="flex items-center gap-3">
            <label class="text-xs text-gray-300 w-32 flex-shrink-0">
              进气道总压恢复系数(-1或0~1.1)
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.gasFlowSystem}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                placeholder="-1"
              />
            </div>
          </div>

          <!-- 功率提取 -->
          <div class="flex items-center gap-3">
            <label class="text-xs text-gray-300 w-32 flex-shrink-0">
              功率提取(0~1000000)
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.powerConsumption}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                placeholder="0"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">W</span>
            </div>
          </div>

          <!-- 压气机出口座舱引气 -->
          <div class="flex items-center gap-3">
            <label class="text-xs text-gray-300 w-32 flex-shrink-0">
              压气机出口座舱引气(0~2)
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.gasCompressionRatio}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-6"
                placeholder="0"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">%</span>
            </div>
          </div>

          <!-- 油门杆角度 -->
          <div class="flex items-center gap-3">
            <label class="text-xs text-gray-300 w-32 flex-shrink-0">
              油门杆角度PLA(0~115)
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.oilFieldAngle}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent pr-8"
                placeholder="66"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">度</span>
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

      <!-- 右侧结果面板 - 动态数据列表 -->
      <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {#if showResults}
          <div class="h-full overflow-auto p-6">
            <!-- 两个并列的列表 -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
              <!-- 左列 - 前15个数据 -->
              <div class="bg-gray-900 rounded border border-gray-600 overflow-hidden">
                <div class="bg-gray-750 px-3 py-2 border-b border-gray-700">
                  <h3 class="text-sm font-medium text-gray-200">参数列表 (1-15)</h3>
                </div>
                <div class="overflow-y-auto h-full p-3">
                  <div class="space-y-2">
                    {#each leftColumnData as item, index}
                      <div class="bg-gray-800 rounded px-3 py-2 border border-gray-600 hover:border-gray-500 transition-colors">
                        <div class="flex flex-col gap-1">
                          <div class="text-xs text-gray-300 font-medium">
                            {item.name}
                          </div>
                          <div class="text-xs text-gray-400">
                            范围: {item.range}
                          </div>
                          <div class="flex justify-between items-center">
                            <span class="text-xs text-gray-500">当前值:</span>
                            <span class="text-xs text-white font-mono">
                              {item.currentValue.toFixed(3)}{item.unit ? ' ' + item.unit : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>

              <!-- 右列 - 后16个数据 -->
              <div class="bg-gray-900 rounded border border-gray-600 overflow-hidden">
                <div class="bg-gray-750 px-3 py-2 border-b border-gray-700">
                  <h3 class="text-sm font-medium text-gray-200">参数列表 (16-31)</h3>
                </div>
                <div class="overflow-y-auto h-full p-3">
                  <div class="space-y-2">
                    {#each rightColumnData as item, index}
                      <div class="bg-gray-800 rounded px-3 py-2 border border-gray-600 hover:border-gray-500 transition-colors">
                        <div class="flex flex-col gap-1">
                          <div class="text-xs text-gray-300 font-medium">
                            {item.name}
                          </div>
                          <div class="text-xs text-gray-400">
                            范围: {item.range}
                          </div>
                          <div class="flex justify-between items-center">
                            <span class="text-xs text-gray-500">当前值:</span>
                            <span class="text-xs text-white font-mono">
                              {item.currentValue.toFixed(3)}{item.unit ? ' ' + item.unit : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>