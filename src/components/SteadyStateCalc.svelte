<script lang="ts">
  import { onMount } from 'svelte';
  import {
    dataIN,
    dataOut,
    selectedSimulationStep,
    selectedMode,
    selectedEnvironment,
    isCalculating,
    showResults,
    updateDataINParam,
    getDataINParam
  } from '../store';

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

  // 检查是否在Tauri环境中
  function isTauriEnvironment(): boolean {
    try {
      return !!(
        typeof window !== 'undefined' && 
        (
          window.__TAURI__ || 
          window.__TAURI_IPC__ ||
          (window as any).__TAURI_METADATA__ ||
          navigator.userAgent.includes('Tauri')
        )
      );
    } catch (error) {
      console.log('Tauri环境检测失败:', error);
      return false;
    }
  }

  // 按钮事件
  function selectSimulationStep(step: string) {
    selectedSimulationStep.set(step);
  }

  function selectMode(mode: string) {
    selectedMode.set(mode);
  }

  function selectEnvironment(env: string) {
    selectedEnvironment.set(env);
  }

  // 输入框处理
  function getInputValue(paramName: string): string {
    let result = '0';
    dataIN.subscribe(list => {
      const param = list.find(p => p.name === paramName);
      result = param && param.data.length > 0 ? param.data[0].toString() : '0';
    })();
    return result;
  }

  function setInputValue(paramName: string, value: string) {
    const numValue = parseFloat(value) || 0;
    updateDataINParam(paramName, numValue);
  }

  // 更新dataIN的选项状态
  function updateDataINOptions() {
    let currentStep: string;
    let currentMode: string;
    let currentEnv: string;

    selectedSimulationStep.subscribe(v => currentStep = v)();
    selectedMode.subscribe(v => currentMode = v)();
    selectedEnvironment.subscribe(v => currentEnv = v)();

    // 更新仿真步长
    updateDataINParam("仿真步长", parseFloat(currentStep));

    // 更新作战/训练模式
    updateDataINParam("作战", currentMode === '作战' ? 1 : 0);
    updateDataINParam("训练", currentMode === '训练' ? 1 : 0);

    // 更新地面/空中环境
    updateDataINParam("地面", currentEnv === '地面' ? 1 : 0);
    updateDataINParam("空中", currentEnv === '空中' ? 1 : 0);

    // 更新输出参数仿真步长
    dataOut.update(list => {
      if (list.length > 0 && list[0].name === "仿真步长") {
        list[0].data = [currentStep];
      }
      return [...list];
    });
  }

  // 生成虚拟数据
  function generateVirtualData() {
    dataOut.update(list => {
      return list.map((param, index) => {
        if (index === 0) {
          // 第一个参数是仿真步长，使用当前选择的值
          let currentStep: string;
          selectedSimulationStep.subscribe(v => currentStep = v)();
          return { ...param, data: [currentStep] };
        } else {
          // 其他参数生成随机变化的数据
          const baseValue = typeof param.data[0] === 'number' ? param.data[0] : 100;
          const variation = (Math.random() - 0.5) * 0.2;
          return { ...param, data: [baseValue * (1 + variation)] };
        }
      });
    });
  }

  // 调用后端计算函数
  async function callSteadyStateCalculation(requestData: any) {
    try {
      console.log('发送到后端的数据:', requestData);
      
      if (isTauriEnvironment()) {
        // 动态导入Tauri API
        const { invoke } = await import('@tauri-apps/api/tauri');
        const result = await invoke("transient_calculation", requestData);
        console.log('后端返回结果:', result);
        return result;
      } else {
        console.log('非Tauri环境，使用模拟计算');
        return { success: true, message: '浏览器环境模拟计算完成', dataOut: null };
      }
    } catch (error) {
      console.error('后端调用失败:', error);
      return { success: false, message: '计算失败', dataOut: null };
    }
  }

  // 计算函数
  async function handleCalculate() {
    isCalculating.set(true);
    
    try {
      // 更新dataIN
      updateDataINOptions();
      
      // 准备发送给后端的数据
      let currentDataIN: any[];
      dataIN.subscribe(v => currentDataIN = v)();
      
      const requestData = {
        dataIN: currentDataIN,
        type: "稳态计算"
      };
      
      // 调用后端
      const result = await callSteadyStateCalculation(requestData);
      console.log('稳态计算结果:', result);
      
      // 无论后端调用是否成功，都生成虚拟数据用于展示
      generateVirtualData();
      
    } catch (error) {
      console.error('计算过程中出错:', error);
      // 出错时也生成虚拟数据
      generateVirtualData();
    } finally {
      isCalculating.set(false);
    }
  }

  // 格式化显示值
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
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {$selectedSimulationStep === '0.025' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectSimulationStep('0.025')}
            >
              仿真步长<br>0.025秒
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {$selectedSimulationStep === '0.0125' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectSimulationStep('0.0125')}
            >
              仿真步长<br>0.0125秒
            </button>
          </div>
          
          <!-- 作战/训练 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {$selectedMode === '作战' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectMode('作战')}
            >
              作战
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {$selectedMode === '训练' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectMode('训练')}
            >
              训练
            </button>
          </div>
          
          <!-- 地面/空中 -->
          <div class="flex">
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {$selectedEnvironment === '地面' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectEnvironment('地面')}
            >
              地面
            </button>
            <button 
              class="flex-1 px-2 py-1 text-xs font-medium transition-colors {$selectedEnvironment === '空中' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}"
              onclick={() => selectEnvironment('空中')}
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
                  oninput={(e) => setInputValue(paramName, e.target.value)}
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
            onclick={handleCalculate}
            disabled={$isCalculating}
          >
            <span class="text-sm">▶</span>
            {$isCalculating ? '计算中...' : '计算'}
          </button>
        </div>
      </div>

      <!-- 右侧两张表格 -->
      <div class="flex-1 flex gap-4">
        <!-- 第一张表格：仿真步长 + 15个虚拟数据 -->
        <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {#if $showResults}
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
                    {#each $dataOut.slice(0, 16) as param, index}
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
          {#if $showResults}
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
                    {#each $dataOut.slice(16, 32) as param, index}
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