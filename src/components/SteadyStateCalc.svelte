<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/tauri';

  // 响应式状态变量 - 使用 $state() 替代 let
  let isCalculating = $state(false);
  let showResults = $state(true);
  let validationErrors = $state<Record<string, string>>({});

  // 输入参数数据结构 - dataIN格式
  let dataIN = $state([
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
  ]);

  // 用户选择状态 - 使用 $state() 避免组件销毁
  let selectedSimulationStep = $state('0.025');
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 输出参数 - dataOut格式
  let dataOut = $state([
    // 第一张表数据（仿真步长 + 15个参数）
    { name: "仿真步长", data: ["0.025"] },
    { name: "低压轴换算转速", data: [8542.30] },
    { name: "高压轴换算转速", data: [12456.70] },
    { name: "发动机进口换算流量/kg/s", data: [245.80] },
    { name: "发动机净推力/kN", data: [15420.50] },
    { name: "发动机总推力/kN", data: [16890.20] },
    { name: "发动机进口冲压阻力/kN", data: [245.60] },
    { name: "发动机总耗油量/kg/h", data: [3456.80] },
    { name: "主燃烧室耗油量/kg/h", data: [2890.40] },
    { name: "加力燃烧室耗油量/kg/h", data: [566.40] },
    { name: "喷管喉道面积/m²", data: [0.245] },
    { name: "喷管出口面积/m²", data: [0.312] },
    { name: "风扇出口温度/K", data: [658.40] },
    { name: "高压压气机出口温度/K", data: [1245.60] },
    { name: "高压涡轮进口温度/K", data: [1156.80] },
    { name: "低压涡轮进口温度/K", data: [945.20] },
    
    // 第二张表数据（16个参数）
    { name: "低压涡轮出口温度/K", data: [756.30] },
    { name: "风扇出口总压/kPa", data: [245.80] },
    { name: "高压压气机出口总压/kPa", data: [1280.50] },
    { name: "高压涡轮进口总压/kPa", data: [1120.30] },
    { name: "低压涡轮进口总压/kPa", data: [890.70] },
    { name: "低压涡轮出口总压/kPa", data: [156.40] },
    { name: "喷管出口总压/kPa", data: [101.30] },
    { name: "喷管出口速度/m/s", data: [1245.60] },
    { name: "喷管出口马赫数", data: [2.15] },
    { name: "推重比", data: [8.45] },
    { name: "单位推力/N·s/kg", data: [1456.80] },
    { name: "推进效率", data: [0.85] },
    { name: "热效率", data: [0.42] },
    { name: "总效率", data: [0.36] },
    { name: "燃油消耗率/kg/(kN·h)", data: [0.78] },
    { name: "比冲/s", data: [1890.50] }
  ]);

  // 参数配置 - 根据图片更新参数信息
  const parameterConfig = {
    "高度": { 
      range: '(0~22000)', 
      unit: 'm',
      placeholder: '0'
    },
    "马赫数": { 
      range: '(0~2.5)', 
      unit: '',
      placeholder: '0'
    },
    "温度修正": { 
      range: '(-50~50)', 
      unit: 'K',
      placeholder: '0'
    },
    "进气道总压恢复系数": { 
      range: '(-1或0~1.1)', 
      unit: 'm',
      placeholder: '-1'
    },
    "功率提取": { 
      range: '(0~600)', 
      unit: 'kW',
      placeholder: '0'
    },
    "压气机出口座舱引气": { 
      range: '(0~2)', 
      unit: 'kg/s',
      placeholder: '0'
    },
    "油门杆角度": { 
      range: '(0~115)', 
      unit: 'deg',
      placeholder: '66'
    }
  };

  // 检查是否在 Tauri 环境中
  function isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.__TAURI_IPC__ === 'function';
  }

  // 验证输入值
  function validateInput(paramName: string, value: number): string | null {
    const config = parameterConfig[paramName];
    if (!config) return null;

    // 根据参数名称进行验证
    switch (paramName) {
      case "高度":
        if (value < 0 || value > 22000) return '值必须在0~22000范围内';
        break;
      case "马赫数":
        if (value < 0 || value > 2.5) return '值必须在0~2.5范围内';
        break;
      case "温度修正":
        if (value < -50 || value > 50) return '值必须在-50~50范围内';
        break;
      case "进气道总压恢复系数":
        if (value !== -1 && (value < 0 || value > 1.1)) return '值必须为-1或在0~1.1范围内';
        break;
      case "功率提取":
        if (value < 0 || value > 600) return '值必须在0~600范围内';
        break;
      case "压气机出口座舱引气":
        if (value < 0 || value > 2) return '值必须在0~2范围内';
        break;
      case "油门杆角度":
        if (value < 0 || value > 115) return '值必须在0~115范围内';
        break;
    }
    
    return null;
  }

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
  }

  // 生成虚拟数据
  function generateVirtualData() {
    dataOut.forEach((param, index) => {
      if (index === 0) {
        // 第一个参数是仿真步长，使用用户选择的原始字符串值
        param.data = [selectedSimulationStep];
      } else {
        // 其他参数生成虚拟数据，在原值基础上添加随机变化
        const baseValue = typeof param.data[0] === 'number' ? param.data[0] : 100;
        const variation = (Math.random() - 0.5) * 0.2; // ±10%的变化
        param.data = [baseValue * (1 + variation)];
      }
    });
    // 触发响应式更新
    dataOut = [...dataOut];
  }

  // 调用后端计算函数
  async function callSteadyStateCalculation(data: any) {
    try {
      if (isTauriEnvironment()) {
        const result = await invoke("transient_calculation", data);
        return result;
      } else {
        console.log('运行在浏览器环境中，使用模拟数据');
        return {
          success: true,
          message: '浏览器环境模拟计算完成',
          dataOut: null
        };
      }
    } catch (error) {
      console.error('计算调用失败:', error);
      return {
        success: false,
        message: '计算失败，返回模拟结果',
        dataOut: null
      };
    }
  }

  // 计算函数
  async function handleCalculate() {
    // 验证所有输入
    const errors: Record<string, string> = {};
    Object.keys(parameterConfig).forEach(paramName => {
      const value = getInputValue(paramName);
      const error = validateInput(paramName, value);
      if (error) {
        errors[paramName] = error;
      }
    });

    validationErrors = errors;
    
    if (Object.keys(errors).length > 0) {
      return; // 有验证错误，不执行计算
    }

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
      
      // 调用后端计算函数
      const result = await callSteadyStateCalculation(data);
      console.log('计算返回结果:', result);
      
      // 生成虚拟数据
      generateVirtualData();
      
      console.log('稳态计算完成');
      
    } catch (error) {
      console.error('计算过程中出错:', error);
      generateVirtualData();
    } finally {
      isCalculating = false;
    }
  }

  // 获取输入参数值
  function getInputValue(paramName: string): number {
    const param = dataIN.find(p => p.name === paramName);
    return param && param.data.length > 0 ? param.data[0] : 0;
  }

  // 更新输入参数值
  function updateInputParameter(paramName: string, value: number) {
    const param = dataIN.find(p => p.name === paramName);
    if (param) {
      param.data = [value];
    }
  }

  // 处理输入值变化
  function handleInputChange(paramName: string, value: string) {
    const numValue = parseFloat(value) || 0;
    
    // 验证输入
    const error = validateInput(paramName, numValue);
    if (error) {
      validationErrors = { ...validationErrors, [paramName]: error };
    } else {
      const { [paramName]: removed, ...rest } = validationErrors;
      validationErrors = rest;
    }
    
    // 更新值
    updateInputParameter(paramName, numValue);
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

  // 监听选择变化，自动更新dataIN - 使用 $effect 替代 $:
  $effect(() => {
    updateDataINOptions();
  });

  // 组件挂载时的初始化
  onMount(() => {
    console.log('稳态计算组件已挂载');
  });
</script>

<div class="h-[calc(100vh-120px)] bg-gray-900 p-4 sm:p-6 lg:p-8">
  <div class="w-full max-w-[95%] mx-auto h-full">
    <div class="flex h-full gap-4">
      <!-- 左侧输入面板 - 参考图片样式 -->
      <div class="w-80 bg-gray-800 border border-gray-700 rounded-lg flex flex-col shadow-lg">
        <!-- 面板标题 -->
        <div class="bg-gray-750 px-4 py-3 border-b border-gray-700 rounded-t-lg">
          <h2 class="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            稳态计算参数
          </h2>
        </div>

        <div class="flex-1 p-6 overflow-y-auto">
          <!-- 作战/训练、地面/空中按钮 - 参考图片布局 -->
          <div class="mb-8 space-y-4">
            <!-- 作战/训练按钮 - 2x2网格布局 -->
            <div class="grid grid-cols-2 gap-3">
              <button 
                class="px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200"
                class:bg-purple-600={selectedMode === '作战'}
                class:text-white={selectedMode === '作战'}
                class:shadow-lg={selectedMode === '作战'}
                class:bg-gray-600={selectedMode !== '作战'}
                class:text-gray-300={selectedMode !== '作战'}
                class:hover:bg-gray-500={selectedMode !== '作战'}
                class:hover:text-white={selectedMode !== '作战'}
                onclick={() => selectedMode = '作战'}
              >
                作战
              </button>
              <button 
                class="px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200"
                class:bg-purple-600={selectedMode === '训练'}
                class:text-white={selectedMode === '训练'}
                class:shadow-lg={selectedMode === '训练'}
                class:bg-gray-600={selectedMode !== '训练'}
                class:text-gray-300={selectedMode !== '训练'}
                class:hover:bg-gray-500={selectedMode !== '训练'}
                class:hover:text-white={selectedMode !== '训练'}
                onclick={() => selectedMode = '训练'}
              >
                训练
              </button>
              
              <!-- 地面/空中按钮 -->
              <button 
                class="px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200"
                class:bg-purple-600={selectedEnvironment === '地面'}
                class:text-white={selectedEnvironment === '地面'}
                class:shadow-lg={selectedEnvironment === '地面'}
                class:bg-gray-600={selectedEnvironment !== '地面'}
                class:text-gray-300={selectedEnvironment !== '地面'}
                class:hover:bg-gray-500={selectedEnvironment !== '地面'}
                class:hover:text-white={selectedEnvironment !== '地面'}
                onclick={() => selectedEnvironment = '地面'}
              >
                地面
              </button>
              <button 
                class="px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200"
                class:bg-purple-600={selectedEnvironment === '空中'}
                class:text-white={selectedEnvironment === '空中'}
                class:shadow-lg={selectedEnvironment === '空中'}
                class:bg-gray-600={selectedEnvironment !== '空中'}
                class:text-gray-300={selectedEnvironment !== '空中'}
                class:hover:bg-gray-500={selectedEnvironment !== '空中'}
                class:hover:text-white={selectedEnvironment !== '空中'}
                onclick={() => selectedEnvironment = '空中'}
              >
                空中
              </button>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="border-t border-gray-600 mb-8"></div>

          <!-- 输入参数列表 - 参考图片样式 -->
          <div class="space-y-6">
            {#each Object.entries(parameterConfig) as [paramName, config]}
              <div class="space-y-2">
                <!-- 参数名称和范围 - 居中显示 -->
                <div class="text-center">
                  <div class="text-base font-medium text-gray-200 mb-1">
                    {paramName}
                  </div>
                  <div class="text-sm text-gray-400">
                    {config.range}
                  </div>
                </div>
                
                <!-- 输入框和单位 - 右对齐布局 -->
                <div class="flex items-center justify-end gap-3">
                  <input
                    type="number"
                    value={getInputValue(paramName)}
                    oninput={(e) => handleInputChange(paramName, e.target.value)}
                    placeholder={config.placeholder}
                    step="any"
                    class="w-20 bg-gray-700 border rounded px-3 py-2 text-white text-lg font-mono text-center focus:outline-none focus:ring-2 transition-all duration-200"
                    class:border-red-500={validationErrors[paramName]}
                    class:focus:ring-red-500={validationErrors[paramName]}
                    class:border-gray-600={!validationErrors[paramName]}
                    class:focus:ring-purple-500={!validationErrors[paramName]}
                    class:focus:border-transparent={!validationErrors[paramName]}
                  />
                  <span class="text-gray-300 text-base font-medium min-w-[40px]">
                    {config.unit}
                  </span>
                </div>
                
                <!-- 验证错误提示 -->
                {#if validationErrors[paramName]}
                  <div class="flex items-center justify-center gap-1 text-red-400 text-xs">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {validationErrors[paramName]}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- 计算按钮 - 参考图片样式 -->
        <div class="p-6 border-t border-gray-700">
          <button
            class="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-4 rounded-lg font-medium text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            onclick={handleCalculate}
            disabled={isCalculating || Object.keys(validationErrors).length > 0}
          >
            {#if isCalculating}
              <svg class="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              计算中...
            {:else}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
              ▶ 计算
            {/if}
          </button>
        </div>
      </div>

      <!-- 右侧结果表格区域 -->
      <div class="flex-1 flex gap-4">
        <!-- 第一张表格：仿真步长 + 15个参数 -->
        <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
          <div class="bg-gray-750 px-4 py-3 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              基础性能参数
            </h3>
          </div>
          
          {#if showResults}
            <div class="h-full flex flex-col">
              <div class="flex-1 overflow-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-700 sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-gray-600">参数名称</th>
                      <th class="w-32 px-4 py-3 text-center font-medium text-gray-200">数值</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {#each dataOut.slice(0, 16) as param, index}
                      <tr class="border-b border-gray-600 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                        <td class="px-4 py-3 text-gray-300 border-r border-gray-600 font-medium">{param.name}</td>
                        <td class="w-32 px-4 py-3 text-center text-white font-mono bg-gray-900">{formatDisplayValue(param)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {:else}
            <div class="flex items-center justify-center h-full text-gray-400">
              <div class="text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <p class="text-lg font-medium">等待计算结果</p>
                <p class="text-sm text-gray-500 mt-1">点击"开始计算"按钮获取结果</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- 第二张表格：16个性能参数 -->
        <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
          <div class="bg-gray-750 px-4 py-3 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              高级性能参数
            </h3>
          </div>
          
          {#if showResults}
            <div class="h-full flex flex-col">
              <div class="flex-1 overflow-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-700 sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-gray-600">参数名称</th>
                      <th class="w-32 px-4 py-3 text-center font-medium text-gray-200">数值</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {#each dataOut.slice(16, 32) as param, index}
                      <tr class="border-b border-gray-600 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                        <td class="px-4 py-3 text-gray-300 border-r border-gray-600 font-medium">{param.name}</td>
                        <td class="w-32 px-4 py-3 text-center text-white font-mono bg-gray-900">{formatDisplayValue(param)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {:else}
            <div class="flex items-center justify-center h-full text-gray-400">
              <div class="text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <p class="text-lg font-medium">等待计算结果</p>
                <p class="text-sm text-gray-500 mt-1">点击"开始计算"按钮获取结果</p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>