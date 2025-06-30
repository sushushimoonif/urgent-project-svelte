<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';

  // 创建store保存页面状态
  export const enginePageStore = writable({
    isCalculating: false,
    showResults: true,
    dataIN: [
      { name: "仿真步长", data: [0.025] },
      { name: "高度", data: [0.0] },
      { name: "马赫数", data: [0.0] },
      { name: "温度修正", data: [0.0] },
      { name: "进气道总压恢复系数", data: [-1.0] },
      { name: "功率提取", data: [0.0] },
      { name: "压气机中间级引气", data: [0.0] },
      { name: "油门杆角度", data: [66.0] },
      { name: "作战", data: [0] },
      { name: "训练", data: [1] },
      { name: "地面", data: [0] },
      { name: "空中", data: [1] }
    ],
    dataOut: [
      // ...（输出数据）
    ],
    selectedSimulationStep: '0.025',
    selectedMode: '作战',
    selectedEnvironment: '地面'
  });

  // 在组件中订阅store
  let {
    isCalculating,
    showResults,
    dataIN,
    dataOut,
    selectedSimulationStep,
    selectedMode,
    selectedEnvironment
  } = $enginePageStore;

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

  // 组件挂载时恢复状态
  onMount(() => {
    // 这里可以添加额外的恢复逻辑
    console.log("组件挂载，状态已恢复");
  });

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
    if (dataOut.length > 0 && dataOut[0].name === "仿真步长") {
      dataOut[0].data = [selectedSimulationStep];
    }
    
    // 保存状态到store
    $enginePageStore = {
      ...$enginePageStore,
      dataIN,
      dataOut
    };
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
      
      // 保存状态到store
      $enginePageStore = {
        ...$enginePageStore,
        dataIN
      };
    }
  }

  // 切换模式
  function setMode(mode: string) {
    selectedMode = mode;
    updateDataINOptions();
  }

  // 切换环境
  function setEnvironment(env: string) {
    selectedEnvironment = env;
    updateDataINOptions();
  }

  // 设置仿真步长
  function setSimulationStep(step: string) {
    selectedSimulationStep = step;
    updateDataINOptions();
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
              on:click={() => setSimulationStep('0.025')}
            >
              仿真步长<br>0.025秒
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedSimulationStep === '0.0125' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => setSimulationStep('0.0125')}
            >
              仿真步长<br>0.0125秒
            </button>
          </div>
          
          <!-- 作战/训练 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedMode === '作战' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => setMode('作战')}
            >
              作战
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedMode === '训练' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => setMode('训练')}
            >
              训练
            </button>
          </div>
          
          <!-- 地面/空中 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedEnvironment === '地面' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => setEnvironment('地面')}
            >
              地面
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {selectedEnvironment === '空中' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              on:click={() => setEnvironment('空中')}
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

      <!-- 右侧两张表格 -->
      <!-- ...（表格代码保持不变）... -->
    </div>
  </div>
</div>