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

  // 将31个参数分成两列：左侧16个，右侧15个
  function splitParametersIntoColumns(parameters: Array<{name: string, range: string, value: number}>) {
    const leftColumn = parameters.slice(0, 16);
    const rightColumn = parameters.slice(16, 31);
    
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

<div class="h-[calc(100vh-120px)] bg-gray-900 p-3">
  <div class="w-full max-w-[95%] mx-auto h-full">
    <div class="flex h-full gap-3">
      <!-- 左侧输入面板 - 优化行间距 -->
      <div class="w-80 bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col">
        <!-- 仿真步长、作战/训练、地面/空中按钮 - 紧凑布局 -->
        <div class="mb-3 space-y-1.5">
          <!-- 仿真步长按钮 -->
          <div class="flex rounded overflow-hidden">
            <button 
              class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors {selectedSimulationStep === '0.025' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedSimulationStep = '0.025'}
            >
              仿真步长<br>0.025秒
            </button>
            <button 
              class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors {selectedSimulationStep === '0.0125' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedSimulationStep = '0.0125'}
            >
              仿真步长<br>0.0125秒
            </button>
          </div>
          
          <!-- 作战/训练模式选择按钮 -->
          <div class="flex rounded overflow-hidden">
            <button 
              class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors {selectedMode === '作战' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedMode = '作战'}
            >
              作战
            </button>
            <button 
              class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors {selectedMode === '训练' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedMode = '训练'}
            >
              训练
            </button>
          </div>
          
          <!-- 地面/空中环境选择按钮 -->
          <div class="flex rounded overflow-hidden">
            <button 
              class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors {selectedEnvironment === '地面' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedEnvironment = '地面'}
            >
              地面
            </button>
            <button 
              class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors {selectedEnvironment === '空中' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectedEnvironment = '空中'}
            >
              空中
            </button>
          </div>
        </div>

        <!-- 输入参数 - 优化间距和对齐 -->
        <div class="flex-1 space-y-2">
          <!-- 高度 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-300 w-28 flex-shrink-0 leading-tight">
              高度<br><span class="text-gray-500">(0~22000)</span>
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.height}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent hover:border-gray-500 transition-colors pr-6"
                placeholder="0"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">m</span>
            </div>
          </div>

          <!-- 马赫数 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-300 w-28 flex-shrink-0 leading-tight">
              马赫数<br><span class="text-gray-500">(0~2.5)</span>
            </label>
            <input
              type="text"
              bind:value={inputParams.machNumber}
              class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent hover:border-gray-500 transition-colors"
              placeholder="0"
            />
          </div>

          <!-- 温度修正 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-300 w-28 flex-shrink-0 leading-tight">
              温度修正<br><span class="text-gray-500">(0~xx)</span>
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.temperature}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent hover:border-gray-500 transition-colors pr-12"
                placeholder="0"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">K</span>
            </div>
          </div>

          <!-- 进气道总压恢复系数 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-300 w-28 flex-shrink-0 leading-tight">
              进气道总压<br><span class="text-gray-500">(-1或0~1.1)</span>
            </label>
            <input
              type="text"
              bind:value={inputParams.gasFlowSystem}
              class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent hover:border-gray-500 transition-colors"
              placeholder="-1"
            />
          </div>

          <!-- 功率提取 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-300 w-28 flex-shrink-0 leading-tight">
              功率提取<br><span class="text-gray-500">(0~1000000)</span>
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.powerConsumption}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent hover:border-gray-500 transition-colors pr-6"
                placeholder="0"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">W</span>
            </div>
          </div>

          <!-- 压气机出口座舱引气 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-300 w-28 flex-shrink-0 leading-tight">
              压气机引气<br><span class="text-gray-500">(0~2)</span>
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.gasCompressionRatio}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent hover:border-gray-500 transition-colors pr-6"
                placeholder="0"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">%</span>
            </div>
          </div>

          <!-- 油门杆角度 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-300 w-28 flex-shrink-0 leading-tight">
              油门杆角度<br><span class="text-gray-500">(0~115)</span>
            </label>
            <div class="relative flex-1">
              <input
                type="text"
                bind:value={inputParams.oilFieldAngle}
                class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent hover:border-gray-500 transition-colors pr-8"
                placeholder="66"
              />
              <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">度</span>
            </div>
          </div>
        </div>

        <!-- 计算按钮 -->
        <div class="mt-3">
          <button
            class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            onclick={handleCalculate}
            disabled={isCalculating}
          >
            <span class="text-sm">▶</span>
            {isCalculating ? '计算中...' : '计算'}
          </button>
        </div>
      </div>

      <!-- 右侧参数列表区域 - 无缝合并布局 -->
      <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {#if showResults}
          <div class="h-full flex flex-col">
            <!-- 统一标题栏 -->
            <div class="bg-gray-700 px-4 py-2 border-b border-gray-600 flex-shrink-0">
              <h3 class="text-sm font-medium text-gray-200 flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                仿真输出参数 (共31项)
              </h3>
            </div>

            <!-- 参数列表内容 - 双列网格布局 -->
            <div class="flex-1 overflow-hidden">
              <div class="h-full grid grid-cols-2 gap-0">
                <!-- 左列 (1-16) -->
                <div class="border-r border-gray-700 overflow-y-auto">
                  <div class="space-y-0">
                    {#each columnResults.leftColumn as param, index}
                      <div class="flex items-center px-3 py-2 border-b border-gray-700 hover:bg-gray-750 transition-colors group {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                        <!-- 序号 -->
                        <div class="w-6 text-xs text-gray-500 font-mono flex-shrink-0">
                          {index + 1}
                        </div>
                        <!-- 参数信息 -->
                        <div class="flex-1 min-w-0 mx-2">
                          <div class="text-xs text-gray-300 font-medium truncate group-hover:text-white transition-colors" title={param.name}>
                            {param.name}
                          </div>
                          <div class="text-xs text-gray-500 mt-0.5">
                            {param.range}
                          </div>
                        </div>
                        <!-- 数值 -->
                        <div class="text-xs text-white font-mono bg-gray-700 group-hover:bg-gray-600 px-2 py-1 rounded min-w-[70px] text-center flex-shrink-0 transition-colors">
                          {param.value.toFixed(3)}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- 右列 (17-31) -->
                <div class="overflow-y-auto">
                  <div class="space-y-0">
                    {#each columnResults.rightColumn as param, index}
                      <div class="flex items-center px-3 py-2 border-b border-gray-700 hover:bg-gray-750 transition-colors group {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                        <!-- 序号 -->
                        <div class="w-6 text-xs text-gray-500 font-mono flex-shrink-0">
                          {index + 17}
                        </div>
                        <!-- 参数信息 -->
                        <div class="flex-1 min-w-0 mx-2">
                          <div class="text-xs text-gray-300 font-medium truncate group-hover:text-white transition-colors" title={param.name}>
                            {param.name}
                          </div>
                          <div class="text-xs text-gray-500 mt-0.5">
                            {param.range}
                          </div>
                        </div>
                        <!-- 数值 -->
                        <div class="text-xs text-white font-mono bg-gray-700 group-hover:bg-gray-600 px-2 py-1 rounded min-w-[70px] text-center flex-shrink-0 transition-colors">
                          {param.value.toFixed(3)}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <!-- 统一状态栏 -->
            <div class="bg-gray-750 px-4 py-2 border-t border-gray-600 flex-shrink-0">
              <div class="flex justify-between items-center text-xs text-gray-400">
                <span>共 {outputParameters.length} 个参数</span>
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>实时更新</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>计算完成</span>
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