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

  // 将31个参数分成两组：左侧15个，右侧16个
  function splitParametersIntoColumns(parameters: Array<{name: string, range: string, value: number}>) {
    const leftColumn = parameters.slice(0, 15);
    const rightColumn = parameters.slice(15, 31);
    
    return { leftColumn, rightColumn };
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

  // 获取分列显示的结果
  const columnResults = $derived(splitParametersIntoColumns(outputParameters));
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

      <!-- 右侧Excel格式数据列表 -->
      <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {#if showResults}
          <div class="h-full overflow-auto">
            <!-- Excel样式标题栏 -->
            <div class="bg-gray-700 px-4 py-2 border-b border-gray-600 sticky top-0 z-10">
              <h3 class="text-sm font-medium text-gray-200 flex items-center gap-2">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                仿真输出参数列表 (共31个参数)
              </h3>
            </div>

            <!-- Excel格式数据表格 -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-0 h-full">
              <!-- 左侧列表 - 前15个参数 -->
              <div class="border-r border-gray-700">
                <div class="bg-gray-750 px-3 py-2 border-b border-gray-600 text-xs font-medium text-gray-300">
                  参数组 A (1-15)
                </div>
                <div class="space-y-0">
                  {#each columnResults.leftColumn as param, index}
                    <div class="flex items-center px-3 py-2 border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                      <!-- 序号 -->
                      <div class="w-8 text-xs text-gray-500 font-mono">
                        {index + 1}
                      </div>
                      <!-- 参数信息 -->
                      <div class="flex-1 min-w-0">
                        <div class="text-xs text-gray-300 font-medium truncate" title={param.name}>
                          {param.name}
                        </div>
                        <div class="text-xs text-gray-500 mt-0.5">
                          {param.range}
                        </div>
                      </div>
                      <!-- 数值 -->
                      <div class="text-xs text-white font-mono bg-gray-700 px-2 py-1 rounded min-w-[60px] text-center">
                        {param.value.toFixed(3)}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- 右侧列表 - 后16个参数 -->
              <div>
                <div class="bg-gray-750 px-3 py-2 border-b border-gray-600 text-xs font-medium text-gray-300">
                  参数组 B (16-31)
                </div>
                <div class="space-y-0">
                  {#each columnResults.rightColumn as param, index}
                    <div class="flex items-center px-3 py-2 border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                      <!-- 序号 -->
                      <div class="w-8 text-xs text-gray-500 font-mono">
                        {index + 16}
                      </div>
                      <!-- 参数信息 -->
                      <div class="flex-1 min-w-0">
                        <div class="text-xs text-gray-300 font-medium truncate" title={param.name}>
                          {param.name}
                        </div>
                        <div class="text-xs text-gray-500 mt-0.5">
                          {param.range}
                        </div>
                      </div>
                      <!-- 数值 -->
                      <div class="text-xs text-white font-mono bg-gray-700 px-2 py-1 rounded min-w-[60px] text-center">
                        {param.value.toFixed(3)}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <!-- 底部状态栏 -->
            <div class="bg-gray-750 px-4 py-2 border-t border-gray-600 sticky bottom-0">
              <div class="flex justify-between items-center text-xs text-gray-400">
                <span>仿真步长: {selectedSimulationStep}秒 | 模式: {selectedMode} | 环境: {selectedEnvironment}</span>
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