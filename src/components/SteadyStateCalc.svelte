<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';

  let isCalculating = $state(false);
  let showResults = $state(true); // 页面加载时立即显示结果

  // 输入参数数据结构 - 修改为新格式，包含作战/训练、地面/空中
  let dataIN = $state([
    { name: "仿真步长", data: [0.025] },
    { name: "高度", data: [21980.33] },
    { name: "马赫数", data: [21980.33] },
    { name: "温度修正", data: [102534.11] },
    { name: "进气道总压恢复系数", data: [102534.11] },
    { name: "功率提取", data: [123444.33] },
    { name: "压气机中间级引气", data: [122444.33] },
    { name: "油门杆角度", data: [122444.33] },
    { name: "作战", data: [0] },
    { name: "训练", data: [1] },
    { name: "地面", data: [0] },
    { name: "空中", data: [1] }
  ]);

  // 参数名称映射 - 用于显示界面
  const parameterLabels = {
    "高度": { range: '(0~22000)', unit: 'm' },
    "马赫数": { range: '(0~2.5)', unit: '' },
    "温度修正": { range: '(≥0)', unit: 'K' },
    "进气道总压恢复系数": { range: '(0~1.1)', unit: 'm' },
    "功率提取": { range: '(0~1000000)', unit: 'W' },
    "压气机中间级引气": { range: '(0~100000)', unit: 'kg.s' },
    "油门杆角度": { range: '(0~1000000)', unit: 'deg' }
  };

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 输出参数 - 修改为dataOut，仿真步长作为第一行，总共32条数据
  let dataOut = $state([
    { name: "仿真步长", data: [0] }, // 第1行：仿真步长
    { name: "仿真步长", data: [22000.00] }, // 第2行：仿真步长
    { name: "低压轴换算转速", data: [1.33] }, // 第3行
    { name: "高压轴换算转速", data: [300.66] }, // 第4行
    { name: "发动机进口换算流量/kg/s", data: [200000.00] }, // 第5行
    { name: "发动机净推力/kN", data: [300.55] }, // 第6行
    { name: "发动机总推力/kN", data: [114.33] }, // 第7行
    { name: "发动机进口冲压阻力/kN", data: [300.55] }, // 第8行
    { name: "发动机总耗油量/kg/h", data: [111111] }, // 第9行
    { name: "主燃烧室耗油量/kg/h", data: [1345567] }, // 第10行
    { name: "加力燃烧室耗油量/kg/h", data: [31311] }, // 第11行
    { name: "喷管喉道面积/m²", data: [231] }, // 第12行
    { name: "喷管出口面积/m²", data: [12312] }, // 第13行
    { name: "风扇出口温度/K", data: [5678] }, // 第14行
    { name: "高压压气机出口温度/K", data: [906534] }, // 第15行
    { name: "高压涡轮进口温度/K", data: [24234] }, // 第16行
    { name: "低压涡轮进口温度/K", data: [0] }, // 第17行
    { name: "低压轴换算转速", data: [22000.00] }, // 第18行
    { name: "高压轴换算转速", data: [1.33] }, // 第19行
    { name: "发动机进口换算流量/kg/s", data: [300.66] }, // 第20行
    { name: "发动机净推力/kN", data: [200000.00] }, // 第21行
    { name: "发动机总推力/kN", data: [300.55] }, // 第22行
    { name: "发动机进口冲压阻力/kN", data: [114.33] }, // 第23行
    { name: "发动机总耗油量/kg/h", data: [300.55] }, // 第24行
    { name: "主燃烧室耗油量/kg/h", data: [111111] }, // 第25行
    { name: "加力燃烧室耗油量/kg/h", data: [1345567] }, // 第26行
    { name: "喷管喉道面积/m²", data: [31311] }, // 第27行
    { name: "喷管出口面积/m²", data: [231] }, // 第28行
    { name: "风扇出口温度/K", data: [12312] }, // 第29行
    { name: "高压压气机出口温度/K", data: [5678] }, // 第30行
    { name: "高压涡轮进口温度/K", data: [906534] }, // 第31行
    { name: "低压涡轮进口温度/K", data: [24234] } // 第32行
  ]);

  // 更新dataIN中的选项状态
  function updateDataINOptions() {
    // 更新仿真步长
    const stepParam = dataIN.find(p => p.name === "仿真步长");
    if (stepParam) {
      stepParam.data = [parseFloat(selectedSimulationStep)];
    }

    // 更新作战/训练状态
    const combatParam = dataIN.find(p => p.name === "作战");
    const trainingParam = dataIN.find(p => p.name === "训练");
    if (combatParam && trainingParam) {
      if (selectedMode === '作战') {
        combatParam.data = [0];
        trainingParam.data = [1];
      } else {
        combatParam.data = [1];
        trainingParam.data = [0];
      }
    }

    // 更新地面/空中状态
    const groundParam = dataIN.find(p => p.name === "地面");
    const airParam = dataIN.find(p => p.name === "空中");
    if (groundParam && airParam) {
      if (selectedEnvironment === '地面') {
        groundParam.data = [0];
        airParam.data = [1];
      } else {
        groundParam.data = [1];
        airParam.data = [0];
      }
    }

    // 更新输出参数中的仿真步长
    const outputStepParam = dataOut.find(p => p.name === "仿真步长");
    if (outputStepParam) {
      outputStepParam.data = [parseFloat(selectedSimulationStep)];
    }
  }

  // 更新输出参数的值 - 根据后端返回的dataOut更新
  function updateOutputParameters(newDataOut: Array<{name: string, data: number[]}>) {
    newDataOut.forEach(outParam => {
      const outputParam = dataOut.find(p => p.name === outParam.name);
      if (outputParam && outParam.data && outParam.data.length > 0) {
        outputParam.data = [...outParam.data];
      }
    });
    // 触发响应式更新
    dataOut = [...dataOut];
  }

  // 生成模拟的dataOut数据
  function generateMockDataOut() {
    return dataOut.map(param => ({
      name: param.name,
      data: param.name === "仿真步长" ? [parseFloat(selectedSimulationStep)] : [(Math.random() * 100 + 50)] // 仿真步长保持选择的值，其他生成随机数
    }));
  }

  // 调用后端计算函数
  async function callSteadyStateCalculation(data: any) {
    try {
      // 使用 Tauri invoke 调用后端的 transient_calculation 函数
      const result = await invoke("transient_calculation", data);
      return result;
    } catch (error) {
      console.error('计算调用失败:', error);
      // 如果调用失败，返回模拟结果作为后备
      return {
        success: false,
        message: '计算失败，返回模拟结果',
        dataOut: generateMockDataOut()
      };
    }
  }

  // 计算函数 - 按照指定格式传值给后端
  async function handleCalculate() {
    isCalculating = true;
    
    try {
      // 更新dataIN中的选项状态
      updateDataINOptions();
      
      // 构建传给后端的数据格式
      const data = {
        dataIN: dataIN,
        type: "稳态计算"
      };
      
      console.log('发送到后端的数据:', data);
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 调用后端计算函数
      const result = await callSteadyStateCalculation(data);
      console.log('计算返回结果:', result);
      
      // 根据返回的dataOut更新输出参数
      if (result.dataOut) {
        updateOutputParameters(result.dataOut);
      } else {
        // 如果没有返回dataOut，使用模拟数据
        updateOutputParameters(generateMockDataOut());
      }
      
      console.log('输出参数已更新');
      
    } catch (error) {
      console.error('计算过程中出错:', error);
    } finally {
      isCalculating = false;
    }
  }

  // 获取输入参数的显示值
  function getInputValue(paramName: string): string {
    const param = dataIN.find(p => p.name === paramName);
    return param && param.data.length > 0 ? param.data[0].toString() : '0';
  }

  // 设置输入参数的值
  function setInputValue(paramName: string, value: string) {
    const param = dataIN.find(p => p.name === paramName);
    if (param) {
      const numValue = parseFloat(value) || 0;
      param.data = [numValue];
    }
  }
</script>

<div class="min-h-screen bg-gray-900 text-white">
  <div class="flex h-screen">
    <!-- 左侧输入面板 -->
    <div class="w-96 bg-gray-800 border-r border-gray-700 flex flex-col">
      <!-- 仿真步长选择 -->
      <div class="p-6 border-b border-gray-700">
        <div class="flex gap-2">
          <button 
            class="flex-1 px-4 py-2 text-sm font-medium rounded transition-colors {selectedSimulationStep === '0.025' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
            onclick={() => selectedSimulationStep = '0.025'}
          >
            仿真步长<br>0.025秒
          </button>
          <button 
            class="flex-1 px-4 py-2 text-sm font-medium rounded transition-colors {selectedSimulationStep === '0.125' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
            onclick={() => selectedSimulationStep = '0.125'}
          >
            仿真步长<br>0.125秒
          </button>
        </div>
      </div>

      <!-- 作战/训练模式选择 -->
      <div class="px-6 py-4 border-b border-gray-700">
        <div class="flex gap-2">
          <button 
            class="flex-1 px-4 py-2 text-sm font-medium rounded transition-colors {selectedMode === '作战' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
            onclick={() => selectedMode = '作战'}
          >
            作战
          </button>
          <button 
            class="flex-1 px-4 py-2 text-sm font-medium rounded transition-colors {selectedMode === '训练' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
            onclick={() => selectedMode = '训练'}
          >
            训练
          </button>
        </div>
      </div>

      <!-- 地面/空中环境选择 -->
      <div class="px-6 py-4 border-b border-gray-700">
        <div class="flex gap-2">
          <button 
            class="flex-1 px-4 py-2 text-sm font-medium rounded transition-colors {selectedEnvironment === '地面' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
            onclick={() => selectedEnvironment = '地面'}
          >
            地面
          </button>
          <button 
            class="flex-1 px-4 py-2 text-sm font-medium rounded transition-colors {selectedEnvironment === '空中' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
            onclick={() => selectedEnvironment = '空中'}
          >
            空中
          </button>
        </div>
      </div>

      <!-- 输入参数 -->
      <div class="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
        {#each Object.entries(parameterLabels) as [paramName, config]}
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-sm text-gray-300 font-medium">
                {paramName}
              </label>
              <div class="text-xs text-gray-500">
                {config.range}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="text"
                value={getInputValue(paramName)}
                oninput={(e) => setInputValue(paramName, e.target.value)}
                class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <span class="text-gray-400 text-sm w-8 text-left">{config.unit}</span>
            </div>
          </div>
        {/each}
      </div>

      <!-- 计算按钮 -->
      <div class="p-6 border-t border-gray-700">
        <button
          class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          onclick={handleCalculate}
          disabled={isCalculating}
        >
          <span class="text-lg">▶</span>
          {isCalculating ? '计算' : '计算'}
        </button>
      </div>
    </div>

    <!-- 右侧结果显示区域 -->
    <div class="flex-1 bg-gray-900">
      {#if showResults}
        <div class="h-full flex">
          <!-- 左侧表格 -->
          <div class="flex-1 bg-gray-800 border-r border-gray-700">
            <!-- 表格标题 -->
            <div class="bg-gray-700 px-4 py-3 border-b border-gray-600 flex items-center justify-between">
              <span class="text-sm font-medium text-gray-200">参数列表</span>
              <span class="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">1</span>
            </div>
            
            <!-- 表格内容 -->
            <div class="h-full overflow-y-auto">
              {#each dataOut.slice(0, 16) as param, index}
                <div class="flex items-center justify-between px-4 py-3 border-b border-gray-600 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}">
                  <div class="text-sm text-gray-200 font-medium flex-1">
                    {param.name}
                  </div>
                  <div class="text-sm text-white font-mono text-right">
                    {param.data[0]?.toFixed(2) || '0.00'}
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- 右侧表格 -->
          <div class="flex-1 bg-gray-800">
            <!-- 表格标题 -->
            <div class="bg-gray-700 px-4 py-3 border-b border-gray-600 flex items-center justify-between">
              <span class="text-sm font-medium text-gray-200">参数列表</span>
              <span class="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">1</span>
            </div>
            
            <!-- 表格内容 -->
            <div class="h-full overflow-y-auto">
              {#each dataOut.slice(16, 32) as param, index}
                <div class="flex items-center justify-between px-4 py-3 border-b border-gray-600 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}">
                  <div class="text-sm text-gray-200 font-medium flex-1">
                    {param.name}
                  </div>
                  <div class="text-sm text-white font-mono text-right">
                    {param.data[0]?.toFixed(2) || '0.00'}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>