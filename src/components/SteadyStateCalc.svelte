<script lang="ts">
  import { pageData } from './src/store'; // 路径按你的目录调整
  import { invoke } from '@tauri-apps/api/tauri';

  // 参数名称映射
  const parameterLabels = {
    "高度": { range: '(0~22000)', unit: 'm' },
    "马赫数": { range: '(0~2.5)', unit: '' },
    "温度修正": { range: '(0~xx)', unit: 'K' },
    "进气道总压恢复系数": { range: '(-1或0~1.1)', unit: '' },
    "功率提取": { range: '(0~1000000)', unit: 'W' },
    "压气机中间级引气": { range: '(0~2)', unit: '%' },
    "油门杆角度": { range: '(0~115)', unit: '度' }
  };

  let isCalculating = false;
  let showResults = true;

  // 订阅 store
  let data;
  $: pageData.subscribe(v => data = v);

  // 按钮事件
  function selectSimulationStep(step: string) {
    pageData.update(d => ({ ...d, selectedSimulationStep: step }));
  }
  function selectMode(mode: string) {
    pageData.update(d => ({ ...d, selectedMode: mode }));
  }
  function selectEnvironment(env: string) {
    pageData.update(d => ({ ...d, selectedEnvironment: env }));
  }

  // 输入框
  function getInputValue(paramName: string): string {
    const param = data.dataIN.find(p => p.name === paramName);
    return param && param.data.length > 0 ? param.data[0].toString() : '0';
  }
  function setInputValue(paramName: string, value: string) {
    pageData.update(d => {
      const idx = d.dataIN.findIndex(p => p.name === paramName);
      if (idx > -1) d.dataIN[idx].data = [parseFloat(value) || 0];
      return { ...d };
    });
  }

  // 更新dataIN的选项状态
  function updateDataINOptions(d) {
    // 仿真步长
    const stepParam = d.dataIN.find(p => p.name === "仿真步长");
    if (stepParam) stepParam.data = [parseFloat(d.selectedSimulationStep)];

    // 作战/训练
    const combatParam = d.dataIN.find(p => p.name === "作战");
    const trainingParam = d.dataIN.find(p => p.name === "训练");
    if (combatParam && trainingParam) {
      if (d.selectedMode === '作战') {
        combatParam.data = [0];
        trainingParam.data = [1];
      } else {
        combatParam.data = [1];
        trainingParam.data = [0];
      }
    }

    // 地面/空中
    const groundParam = d.dataIN.find(p => p.name === "地面");
    const airParam = d.dataIN.find(p => p.name === "空中");
    if (groundParam && airParam) {
      if (d.selectedEnvironment === '地面') {
        groundParam.data = [0];
        airParam.data = [1];
      } else {
        groundParam.data = [1];
        airParam.data = [0];
      }
    }

    // 输出参数仿真步长
    if (d.dataOut.length > 0 && d.dataOut[0].name === "仿真步长") {
      d.dataOut[0].data = [d.selectedSimulationStep];
    }
    return d;
  }

  // 虚拟数据生成
  function generateVirtualData(d) {
    d.dataOut.forEach((param, index) => {
      if (index === 0) {
        param.data = [d.selectedSimulationStep];
      } else {
        const baseValue = typeof param.data[0] === 'number' ? param.data[0] : 100;
        const variation = (Math.random() - 0.5) * 0.2;
        param.data = [baseValue * (1 + variation)];
      }
    });
    return { ...d };
  }

  // 计算
  async function handleCalculate() {
    isCalculating = true;
    try {
      pageData.update(d => {
        d = updateDataINOptions(d);
        d = generateVirtualData(d);
        return d;
      });
      // 你可以在此处调用 invoke 发送 dataIN 到后端
      // await invoke("transient_calculation", { dataIN: data.dataIN, type: "稳态计算" });
    } finally {
      isCalculating = false;
    }
  }

  // 格式化显示
  function formatDisplayValue(param: any): string {
    if (param.name === "仿真步长") {
      return param.data[0];
    } else {
      const value = param.data[0];
      return typeof value === 'number' ? value.toFixed(2) : '0.00';
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
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {data.selectedSimulationStep === '0.025' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => selectSimulationStep('0.025')}
            >
              仿真步长<br>0.025秒
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {data.selectedSimulationStep === '0.0125' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => selectSimulationStep('0.0125')}
            >
              仿真步长<br>0.0125秒
            </button>
          </div>
          
          <!-- 作战/训练 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {data.selectedMode === '作战' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => selectMode('作战')}
            >
              作战
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {data.selectedMode === '训练' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => selectMode('训练')}
            >
              训练
            </button>
          </div>
          
          <!-- 地面/空中 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {data.selectedEnvironment === '地面' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => selectEnvironment('地面')}
            >
              地面
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {data.selectedEnvironment === '空中' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => selectEnvironment('空中')}
            >
              空中
            </button>
          </div>
        </div>

        <!-- 输入参数 -->
        <div class="flex-1 space-y-3 overflow-y-auto">
          {#each Object.entries(parameterLabels) as [paramName, config]}
            <div class="flex items-center">
              <label class="text-xs text-gray-300 flex-1">
                {paramName}{config.range}
              </label>
              <div class="flex items-center gap-1">
                <input
                  type="text"
                  value={getInputValue(paramName)}
                  on:input={(e) => setInputValue(paramName, e.target.value)}
                  class="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
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
            on:click={handleCalculate}
            disabled={isCalculating}
          >
            <span class="text-sm">▶</span>
            {isCalculating ? '计算中...' : '计算'}
          </button>
        </div>
      </div>

      <!-- 右侧两张表格 --->
      <div class="flex-1 flex gap-4">
        <!-- 第一张表格：仿真步长 + 15个虚拟数据 -->
        <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {#if showResults}
            <div class="h-full flex flex-col">
              <div class="flex-1 overflow-auto">
                <table class="w-full text-sm">
                  <!-- 表头 -->
                  <thead class="bg-gray-700 sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-gray-600">名称</th>
                      <th class="w-32 px-4 py-3 text-center font-medium text-gray-200">数值</th>
                    </tr>
                  </thead>
                  
                  <!-- 数据行 -->
                  <tbody>
                    {#each data.dataOut.slice(0, 16) as param, index}
                      <tr class="border-b border-gray-600 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                        <td class="px-4 py-3 text-gray-300 border-r border-gray-600">{param.name}</td>
                        <td class="w-32 px-4 py-3 text-center text-white font-mono">{formatDisplayValue(param)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>
        <!-- 第二张表格：16个虚拟数据 -->
        <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {#if showResults}
            <div class="h-full flex flex-col">
              <div class="flex-1 overflow-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-700 sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-gray-600">名称</th>
                      <th class="w-32 px-4 py-3 text-center font-medium text-gray-200">数值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each data.dataOut.slice(16, 32) as param, index}
                      <tr class="border-b border-gray-600 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                        <td class="px-4 py-3 text-gray-300 border-r border-gray-600">{param.name}</td>
                        <td class="w-32 px-4 py-3 text-center text-white font-mono">{formatDisplayValue(param)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
