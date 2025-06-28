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

  // 31个仿真输出参数 - 根据PDF文件中的表格数据
  let outputParameters = $state([
    { name: "低压轴换算转速/N1cor", range: "(0~110)", value: 100 },
    { name: "高压轴换算转速/N2cor", range: "(0~110)", value: 100 },
    { name: "换算流量/WTcor", range: "(0~300)", value: 245.8 },
    { name: "发动机净推力/F", range: "(0~200000)", value: 15420.5 },
    { name: "发动机总推力/FG", range: "(0~200000)", value: 16890.2 },
    { name: "主喷管出口面积/A8", range: "(0~1)", value: 0.245 },
    { name: "加力喷管出口面积/A9", range: "(0~1)", value: 0.312 },
    { name: "风扇出口面积/A16", range: "(0~1)", value: 0.156 },
    { name: "高压压气机出口总温/T3", range: "(0~1500)", value: 658.4 },
    { name: "高压涡轮进口总温/T41", range: "(0~2000)", value: 1245.6 },
    { name: "低压涡轮进口总温/T43", range: "(0~2000)", value: 1156.8 },
    { name: "风扇出口总压/P21", range: "(0~10)", value: 2.45 },
    { name: "高压压气机出口总压/P3", range: "(0~50)", value: 12.8 },
    { name: "高压涡轮进口总压/P41", range: "(0~50)", value: 11.2 },
    { name: "低压涡轮进口总压/P43", range: "(0~20)", value: 3.8 },
    { name: "低压涡轮出口总温/T6", range: "(0~1500)", value: 945.2 },
    { name: "低压涡轮出口总压/P6", range: "(0~10)", value: 2.1 },
    { name: "主喷管出口总压/P8", range: "(0~5)", value: 1.8 },
    { name: "加力燃烧室出口总温/T38", range: "(0~2500)", value: 1089.5 },
    { name: "加力喷管出口总温/T8", range: "(0~2000)", value: 856.3 },
    { name: "主燃烧室燃油流量/Wf", range: "(0~5)", value: 2.456 },
    { name: "加力燃烧室燃油流量/Wfab", range: "(0~10)", value: 1.156 },
    { name: "发动机进口总流量/W0", range: "(0~500)", value: 245.8 },
    { name: "发动机进口净推阻力/D0", range: "(0~5000)", value: 1245.6 },
    { name: "低压转子转速/N1", range: "(0~15000)", value: 8542.3 },
    { name: "高压转子转速/N2", range: "(0~20000)", value: 12456.7 },
    { name: "推重比/TWR", range: "(0~15)", value: 8.5 },
    { name: "耗油率/SFC", range: "(0~3)", value: 0.856 },
    { name: "发动机净马力/Pnet", range: "(0~50000)", value: 25680.4 },
    { name: "发动机总马力/Pgross", range: "(0~60000)", value: 28950.2 },
    { name: "循环效率/ηcycle", range: "(0~1)", value: 0.425 }
  ]);

  // 构建调用参数
  function buildCalculationParams() {
    return {
      stepTime: parseFloat(selectedSimulationStep),
      height: parseFloat(inputParams.height) || 0.0,
      mach: parseFloat(inputParams.machNumber) || 0.0,
      deltaT: parseFloat(inputParams.temperature) || 0.0,
      intakeTotalPressureCoeff: parseFloat(inputParams.gasFlowSystem) || -1.0,
      powerExtraction: parseFloat(inputParams.powerConsumption) || 0.0,
      bleedAirRatio: parseFloat(inputParams.gasCompressionRatio) || 0.0,
      pla: parseFloat(inputParams.oilFieldAngle) || 66.0,
      missionType: selectedMode === '作战' ? 0 : 1,
      flightMode: selectedEnvironment === '地面' ? 0 : 1
    };
  }

  // 生成计算结果数据
  function generateCalculationResults() {
    // 更新输出参数值，添加一些随机变化来模拟计算结果
    const updatedParameters = outputParameters.map(param => ({
      ...param,
      value: param.value * (1 + (Math.random() - 0.5) * 0.1) // ±5% 变化
    }));
    
    return updatedParameters;
  }

  async function handleCalculate() {
    isCalculating = true;
    
    try {
      // 构建调用参数
      const params = buildCalculationParams();
      console.log('计算参数:', params);
      
      // 模拟计算延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 生成新的计算结果
      outputParameters = generateCalculationResults();
      
      console.log('计算完成');
      
    } catch (error) {
      console.error('计算过程中出错:', error);
    } finally {
      isCalculating = false;
    }
  }
</script>

<div class="h-[calc(100vh-120px)] bg-gray-900 p-4 sm:p-6 lg:p-8">
  <div class="w-full max-w-[95%] mx-auto h-full">
    <div class="flex h-full gap-4">
      <!-- 左侧输入面板 -->
      <div class="w-80 bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col">
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

        <!-- 输入参数 - text框和单位右对齐 -->
        <div class="flex-1 space-y-3 overflow-y-auto">
          <!-- 高度 -->
          <div class="flex items-center">
            <label class="text-xs text-gray-300 flex-1">
              高度(0~22000)
            </label>
            <div class="flex items-center gap-1">
              <input
                type="text"
                bind:value={inputParams.height}
                class="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
              <span class="text-gray-400 text-xs w-4">m</span>
            </div>
          </div>

          <!-- 马赫数 -->
          <div class="flex items-center">
            <label class="text-xs text-gray-300 flex-1">
              马赫数(0~2.5)
            </label>
            <div class="flex items-center gap-1">
              <input
                type="text"
                bind:value={inputParams.machNumber}
                class="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
              <span class="text-gray-400 text-xs w-4"></span>
            </div>
          </div>

          <!-- 温度修正 -->
          <div class="flex items-center">
            <label class="text-xs text-gray-300 flex-1">
              温度修正(0~xx)
            </label>
            <div class="flex items-center gap-1">
              <input
                type="text"
                bind:value={inputParams.temperature}
                class="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
              <span class="text-gray-400 text-xs w-4">K</span>
            </div>
          </div>

          <!-- 进气道总压恢复系数 -->
          <div class="flex items-center">
            <label class="text-xs text-gray-300 flex-1">
              进气道(-1或0~1.1)
            </label>
            <div class="flex items-center gap-1">
              <input
                type="text"
                bind:value={inputParams.gasFlowSystem}
                class="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                placeholder="-1"
              />
              <span class="text-gray-400 text-xs w-4"></span>
            </div>
          </div>

          <!-- 功率提取 -->
          <div class="flex items-center">
            <label class="text-xs text-gray-300 flex-1">
              功率提取(0~1000000)
            </label>
            <div class="flex items-center gap-1">
              <input
                type="text"
                bind:value={inputParams.powerConsumption}
                class="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
              <span class="text-gray-400 text-xs w-4">W</span>
            </div>
          </div>

          <!-- 压气机出口座舱引气 -->
          <div class="flex items-center">
            <label class="text-xs text-gray-300 flex-1">
              压气机引气(0~2)
            </label>
            <div class="flex items-center gap-1">
              <input
                type="text"
                bind:value={inputParams.gasCompressionRatio}
                class="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
              <span class="text-gray-400 text-xs w-4">%</span>
            </div>
          </div>

          <!-- 油门杆角度 -->
          <div class="flex items-center">
            <label class="text-xs text-gray-300 flex-1">
              油门角度(0~115)
            </label>
            <div class="flex items-center gap-1">
              <input
                type="text"
                bind:value={inputParams.oilFieldAngle}
                class="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                placeholder="66"
              />
              <span class="text-gray-400 text-xs w-4">度</span>
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

      <!-- 右侧参数列表 - 缩短每行宽度1/3 -->
      <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {#if showResults}
          <div class="h-full flex flex-col">
            <!-- 参数列表内容 -->
            <div class="flex-1 overflow-hidden">
              <div class="h-full grid grid-cols-2 gap-0">
                <!-- 左列：参数1-16 -->
                <div class="border-r border-gray-700 overflow-y-auto">
                  {#each outputParameters.slice(0, 16) as param, index}
                    <div class="flex items-center px-2 py-2 border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                      <!-- 序号 -->
                      <div class="w-4 text-xs text-gray-500 font-mono flex-shrink-0 mr-1">
                        {index + 1}
                      </div>
                      <!-- 参数名称和取值范围 -->
                      <div class="flex-1 min-w-0 mr-1">
                        <div class="flex items-baseline gap-1">
                          <span class="text-xs text-gray-300 font-medium truncate" title={param.name}>
                            {param.name}
                          </span>
                          <span class="text-xs text-gray-500 flex-shrink-0">
                            {param.range}
                          </span>
                        </div>
                      </div>
                      <!-- 数值 -->
                      <div class="text-xs text-white font-mono bg-gray-700 px-1 py-1 rounded min-w-[45px] text-center flex-shrink-0">
                        {param.value.toFixed(1)}
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- 右列：参数17-31 -->
                <div class="overflow-y-auto">
                  {#each outputParameters.slice(16, 31) as param, index}
                    <div class="flex items-center px-2 py-2 border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                      <!-- 序号 -->
                      <div class="w-4 text-xs text-gray-500 font-mono flex-shrink-0 mr-1">
                        {index + 17}
                      </div>
                      <!-- 参数名称和取值范围 -->
                      <div class="flex-1 min-w-0 mr-1">
                        <div class="flex items-baseline gap-1">
                          <span class="text-xs text-gray-300 font-medium truncate" title={param.name}>
                            {param.name}
                          </span>
                          <span class="text-xs text-gray-500 flex-shrink-0">
                            {param.range}
                          </span>
                        </div>
                      </div>
                      <!-- 数值 -->
                      <div class="text-xs text-white font-mono bg-gray-700 px-1 py-1 rounded min-w-[45px] text-center flex-shrink-0">
                        {param.value.toFixed(1)}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <!-- 底部状态栏 -->
            <div class="bg-gray-750 px-3 py-2 border-t border-gray-600 flex-shrink-0">
              <div class="flex justify-between items-center text-xs text-gray-400">
                <span>共 {outputParameters.length} 个参数</span>
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>实时更新</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>