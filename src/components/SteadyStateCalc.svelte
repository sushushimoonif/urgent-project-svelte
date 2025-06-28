<script lang="ts">
  let isCalculating = $state(false);
  let showResults = $state(true); // 页面加载时立即显示结果

  // 输入参数数据结构 - 改为列表结构
  let dataIN = $state([
    { name: "height", data: '0' },
    { name: "machNumber", data: '0' },
    { name: "temperature", data: '0' },
    { name: "gasFlowSystem", data: '-1' },
    { name: "powerConsumption", data: '0' },
    { name: "gasCompressionRatio", data: '0' },
    { name: "oilFieldAngle", data: '66' }
  ]);

  // 参数名称映射 - 英文名对应中文名和取值范围
  const parameterLabels = {
    height: { label: '高度', range: '(0~22000)', unit: 'm' },
    machNumber: { label: '马赫数', range: '(0~2.5)', unit: '' },
    temperature: { label: '温度修正', range: '(0~xx)', unit: 'K' },
    gasFlowSystem: { label: '进气道', range: '(-1或0~1.1)', unit: '' },
    powerConsumption: { label: '功率提取', range: '(0~1000000)', unit: 'W' },
    gasCompressionRatio: { label: '压气机引气', range: '(0~2)', unit: '%' },
    oilFieldAngle: { label: '油门角度', range: '(0~115)', unit: '度' }
  };

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 31个仿真输出参数 - 新的数据结构，增加title属性
  let outputParameters = $state([
    { name: "N1cor", title: "低压轴换算转速/N1cor", range: "(0~110)", value: 100.0 },
    { name: "N2cor", title: "高压轴换算转速/N2cor", range: "(0~110)", value: 100.0 },
    { name: "W1cor", title: "发动机进口换算流量/W1cor", range: "(0~300)", value: 0.0 },
    { name: "FG", title: "发动机净推力/FG", range: "(0~180)", value: 0.0 },
    { name: "F", title: "发动机总推力/F", range: "(0~180)", value: 0.0 },
    { name: "netDrag", title: "发动机进口净推阻力", range: "(0~180)", value: 0.0 },
    { name: "totalFuelFlow", title: "发动机总耗油量", range: "(0~37000)", value: 0.0 },
    { name: "mainFuelFlow", title: "主燃烧室耗油量", range: "(0~12000)", value: 0.0 },
    { name: "afterburnerFuelFlow", title: "加力燃烧室耗油量", range: "(0~25000)", value: 0.0 },
    { name: "A8", title: "喷管喉道面积/A8", range: "(0~0.8)", value: 0.27 },
    { name: "A9", title: "喷管出口面积/A9", range: "(0~0.8)", value: 0.33 },
    { name: "T24", title: "风扇出口温度/T24", range: "(0~1000)", value: 288.15 },
    { name: "T3", title: "高压压气机出口温度/T3", range: "(0~1000)", value: 288.15 },
    { name: "T41", title: "高压涡轮进口温度/T41", range: "(0~2000)", value: 288.15 },
    { name: "T43", title: "低压涡轮进口温度/T43", range: "(0~2000)", value: 288.15 },
    { name: "P21", title: "风扇出口总压/P21", range: "(0~1000000)", value: 101325.0 },
    { name: "P3", title: "高压压气机出口总压/P3", range: "(0~4200000)", value: 101325.0 },
    { name: "P41", title: "高压涡轮进口总压/P41", range: "(0~1000000)", value: 101325.0 },
    { name: "P43", title: "低压涡轮进口总压/P43", range: "(0~1000000)", value: 101325.0 },
    { name: "T6", title: "低压涡轮出口总温/T6", range: "(200~1300)", value: 288.15 },
    { name: "Ps8", title: "喷管喉道静压/Ps8", range: "(0~500000)", value: 101325.0 },
    { name: "P8", title: "喷管喉道总压/P8", range: "(0~500000)", value: 101325.0 },
    { name: "Ts8", title: "喷管喉道静温/Ts8", range: "(0~1000)", value: 288.15 },
    { name: "T8", title: "喷管喉道总温/T8", range: "(0~1000)", value: 288.15 },
    { name: "V8", title: "喷管喉道气流速度/V8", range: "(0~500)", value: 0.0 },
    { name: "Ps9", title: "喷管出口静压/Ps9", range: "(0~500000)", value: 288.15 },
    { name: "P9", title: "喷管出口总压/P9", range: "(0~500000)", value: 101325.0 },
    { name: "Ts9", title: "喷管出口静温/Ts9", range: "(0~1200)", value: 288.15 },
    { name: "T9", title: "喷管出口总温/T9", range: "(0~1200)", value: 288.15 },
    { name: "V9", title: "喷管出口气流速度/V9", range: "(0~500)", value: 0.0 },
    { name: "Cfg", title: "喷管推力损失系数/Cfg", range: "(0.7~1.0)", value: 0.0 }
  ]);

  // 更新输出参数的值 - 根据后端返回的dataOUT更新
  function updateOutputParameters(dataOUT: Array<{name: string, data: string}>) {
    dataOUT.forEach(outParam => {
      const outputParam = outputParameters.find(p => p.name === outParam.name);
      if (outputParam) {
        outputParam.value = parseFloat(outParam.data) || 0.0;
      }
    });
    // 触发响应式更新
    outputParameters = [...outputParameters];
  }

  // 构建调用参数 - 将dataIN和选项状态传给后端
  function buildCalculationParams() {
    // 更新dataIN中的仿真步长、模式等选项
    const stepTimeParam = dataIN.find(p => p.name === 'stepTime');
    const missionTypeParam = dataIN.find(p => p.name === 'missionType');
    const flightModeParam = dataIN.find(p => p.name === 'flightMode');

    // 如果不存在这些参数，则添加
    if (!stepTimeParam) {
      dataIN.push({ name: 'stepTime', data: selectedSimulationStep });
    } else {
      stepTimeParam.data = selectedSimulationStep;
    }

    if (!missionTypeParam) {
      dataIN.push({ name: 'missionType', data: selectedMode === '作战' ? '0' : '1' });
    } else {
      missionTypeParam.data = selectedMode === '作战' ? '0' : '1';
    }

    if (!flightModeParam) {
      dataIN.push({ name: 'flightMode', data: selectedEnvironment === '地面' ? '0' : '1' });
    } else {
      flightModeParam.data = selectedEnvironment === '地面' ? '0' : '1';
    }

    return dataIN;
  }

  // 生成模拟的dataOUT数据
  function generateMockDataOUT() {
    return outputParameters.map(param => ({
      name: param.name,
      data: (Math.random() * 100 + 50).toFixed(2) // 生成50-150之间的随机数
    }));
  }

  // 简化的计算函数 - 直接使用模拟数据
  async function handleCalculate() {
    isCalculating = true;
    
    try {
      // 构建调用参数 - 更新dataIN
      const updatedDataIN = buildCalculationParams();
      console.log('发送到后端的 dataIN:', updatedDataIN);
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 生成模拟的dataOUT
      const dataOUT = generateMockDataOUT();
      console.log('模拟的 dataOUT:', dataOUT);
      
      // 根据dataOUT更新输出参数
      updateOutputParameters(dataOUT);
      console.log('输出参数已更新');
      
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

        <!-- 输入参数 - 使用新的数据结构和映射 -->
        <div class="flex-1 space-y-3 overflow-y-auto">
          {#each dataIN.filter(p => parameterLabels[p.name]) as param}
            {@const config = parameterLabels[param.name]}
            <div class="flex items-center">
              <label class="text-xs text-gray-300 flex-1">
                {config.label}{config.range}
              </label>
              <div class="flex items-center gap-1">
                <input
                  type="text"
                  bind:value={param.data}
                  class="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                  placeholder={param.data}
                />
                <span class="text-gray-400 text-xs w-4">{config.unit}</span>
              </div>
            </div>
          {/each}
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

      <!-- 右侧参数列表 - 缩短行间距 -->
      <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {#if showResults}
          <div class="h-full flex flex-col">
            <!-- 参数列表内容 - 缩短行间距 -->
            <div class="flex-1 overflow-hidden">
              <div class="h-full grid grid-cols-2 gap-0">
                <!-- 左列：参数1-16 -->
                <div class="border-r border-gray-700 overflow-y-auto">
                  {#each outputParameters.slice(0, 16) as param, index}
                    <div class="flex items-center px-2 py-0.5 border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                      <!-- 序号 -->
                      <div class="w-4 text-xs text-gray-500 font-mono flex-shrink-0 mr-1">
                        {index + 1}
                      </div>
                      <!-- 参数名称和取值范围 -->
                      <div class="flex-1 min-w-0 mr-1">
                        <div class="flex items-baseline gap-1">
                          <span class="text-xs text-gray-300 font-medium truncate" title={param.title}>
                            {param.title}
                          </span>
                          <span class="text-xs text-gray-500 flex-shrink-0">
                            {param.range}
                          </span>
                        </div>
                      </div>
                      <!-- 数值 - 保留两位小数 -->
                      <div class="text-xs text-white font-mono bg-gray-700 px-1 py-0.5 rounded min-w-[50px] text-center flex-shrink-0">
                        {param.value.toFixed(2)}
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- 右列：参数17-31 -->
                <div class="overflow-y-auto">
                  {#each outputParameters.slice(16, 31) as param, index}
                    <div class="flex items-center px-2 py-0.5 border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                      <!-- 序号 -->
                      <div class="w-4 text-xs text-gray-500 font-mono flex-shrink-0 mr-1">
                        {index + 17}
                      </div>
                      <!-- 参数名称和取值范围 -->
                      <div class="flex-1 min-w-0 mr-1">
                        <div class="flex items-baseline gap-1">
                          <span class="text-xs text-gray-300 font-medium truncate" title={param.title}>
                            {param.title}
                          </span>
                          <span class="text-xs text-gray-500 flex-shrink-0">
                            {param.range}
                          </span>
                        </div>
                      </div>
                      <!-- 数值 - 保留两位小数 -->
                      <div class="text-xs text-white font-mono bg-gray-700 px-1 py-0.5 rounded min-w-[50px] text-center flex-shrink-0">
                        {param.value.toFixed(2)}
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
                  <div class="w-2 h-2 bg-green-500 rounded-full {isCalculating ? 'animate-pulse' : ''}"></div>
                  <span>{isCalculating ? '计算中...' : '实时更新'}</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>