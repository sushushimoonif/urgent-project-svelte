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

  // 计算结果数据 - 包含所有30个参数的默认值
  let calculationResults = $state<Array<{name: string, value: number}>>([
    { name: "高度/m", value: 0 },
    { name: "马赫数", value: 0 },
    { name: "温度修正/开尔文", value: 0 },
    { name: "进气道总压恢复系数", value: -1 },
    { name: "功率提取/W", value: 0 },
    { name: "压气机出口座舱引气/%", value: 0 },
    { name: "油门杆角度PLA/度", value: 66 },
    { name: "发动机进口物理流量/kg/s", value: 245.8 },
    { name: "发动机净推力/N", value: 15420.5 },
    { name: "发动机总推力/N", value: 16890.2 },
    { name: "发动机进口净推阻力/N", value: 1245.6 },
    { name: "低压转子转速/rpm", value: 8542.3 },
    { name: "高压转子转速/rpm", value: 12456.7 },
    { name: "加力燃烧室燃油流量/kg/h", value: 1156.8 },
    { name: "风扇出口总压/Pa", value: 245000.0 },
    { name: "高压压气机出口总压/Pa", value: 1280000.0 },
    { name: "高压涡轮进口总压/Pa", value: 1120000.0 },
    { name: "低压涡轮进口总压/Pa", value: 380000.0 },
    { name: "低压涡轮出口总压/Pa", value: 210000.0 },
    { name: "风扇出口总温/K", value: 658.4 },
    { name: "高压压气机出口总温/K", value: 945.2 },
    { name: "高压涡轮进口总温/K", value: 1245.6 },
    { name: "低压涡轮进口总温/K", value: 1089.5 },
    { name: "低压涡轮出口总温/K", value: 856.3 },
    { name: "喷管出口面积/m²", value: 0.245 },
    { name: "加力喷管出口面积/m²", value: 0.312 },
    { name: "喷管出口速度/m/s", value: 456.2 },
    { name: "喷管出口总温/K", value: 798.4 },
    { name: "燃油消耗率/kg/h", value: 2456.8 },
    { name: "推重比", value: 8.5 }
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
    // 更新前7个参数为用户输入值
    const updatedResults = [...calculationResults];
    
    // 更新仿真步长
    const simulationStepResult = { name: "仿真步长/秒", value: parseFloat(selectedSimulationStep) };
    
    // 更新用户输入的参数值
    updatedResults[0] = { name: "高度/m", value: parseFloat(inputParams.height) || 0 };
    updatedResults[1] = { name: "马赫数", value: parseFloat(inputParams.machNumber) || 0 };
    updatedResults[2] = { name: "温度修正/开尔文", value: parseFloat(inputParams.temperature) || 0 };
    updatedResults[3] = { name: "进气道总压恢复系数", value: parseFloat(inputParams.gasFlowSystem) || -1 };
    updatedResults[4] = { name: "功率提取/W", value: parseFloat(inputParams.powerConsumption) || 0 };
    updatedResults[5] = { name: "压气机出口座舱引气/%", value: parseFloat(inputParams.gasCompressionRatio) || 0 };
    updatedResults[6] = { name: "油门杆角度PLA/度", value: parseFloat(inputParams.oilFieldAngle) || 66 };
    
    // 其他参数保持模拟计算值或根据输入参数进行简单计算
    for (let i = 7; i < updatedResults.length; i++) {
      // 添加一些随机变化来模拟计算结果
      const baseValue = calculationResults[i].value;
      const variation = (Math.random() - 0.5) * 0.1; // ±5% 变化
      updatedResults[i].value = baseValue * (1 + variation);
    }
    
    return { simulationStepResult, calculationResults: updatedResults };
  }

  // 将结果分成两列显示，每列第一行都是仿真步长，然后是15行数据
  function splitResultsIntoColumns(results: Array<{name: string, value: number}>, simulationStep: {name: string, value: number}) {
    // 左列：仿真步长 + 前15个结果
    const leftColumn = [simulationStep, ...results.slice(0, 15)];
    
    // 右列：仿真步长 + 后15个结果
    const rightColumn = [simulationStep, ...results.slice(15, 30)];
    
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
      const { simulationStepResult, calculationResults: newResults } = generateCalculationResults();
      calculationResults = newResults;
      
      console.log('计算完成');
      
    } catch (error) {
      console.error('计算过程中出错:', error);
    } finally {
      isCalculating = false;
    }
  }

  // 获取分列显示的结果
  const columnResults = $derived(() => {
    const { simulationStepResult } = generateCalculationResults();
    return splitResultsIntoColumns(calculationResults, simulationStepResult);
  });
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

      <!-- 右侧结果面板 -->
      <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {#if showResults}
          <div class="h-full overflow-auto p-6">
            <!-- 两个并列的表格 -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
              <!-- 左侧表格 - 16行（仿真步长 + 15行数据） -->
              <div class="bg-gray-900 rounded border border-gray-600 overflow-hidden">
                <div class="overflow-x-auto h-full">
                  <table class="w-full text-sm h-full">
                    <tbody>
                      {#each columnResults.leftColumn as result, index}
                        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                          <td class="px-4 py-3 text-gray-300 border-r border-gray-600 w-2/3">{result.name}</td>
                          <td class="px-4 py-3 text-center text-white font-mono w-1/3">{result.value.toFixed(3)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 右侧表格 - 16行（仿真步长 + 15行数据） -->
              <div class="bg-gray-900 rounded border border-gray-600 overflow-hidden">
                <div class="overflow-x-auto h-full">
                  <table class="w-full text-sm h-full">
                    <tbody>
                      {#each columnResults.rightColumn as result, index}
                        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                          <td class="px-4 py-3 text-gray-300 border-r border-gray-600 w-2/3">{result.name}</td>
                          <td class="px-4 py-3 text-center text-white font-mono w-1/3">{result.value.toFixed(3)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>