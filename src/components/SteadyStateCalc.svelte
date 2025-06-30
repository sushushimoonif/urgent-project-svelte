<script lang="ts">
  import { dataOutStore } from './store.js';

  let dataOut = $state([
    // 第一张表数据（仿真步长 + 15个虚拟数据）
    { name: "仿真步长", data: ["0.025"] }, // 第1行：仿真步长 - 使用字符串保持原始格式
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
    
    // 第二张表数据（16个虚拟数据）
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
  $: dataOut = $dataOutStore;  // 绑定到你的 table 渲染逻辑里

  // 如果需要初始化数据
  import { onMount } from 'svelte';
  onMount(() => {
    if ($dataOutStore.length === 0) {
      dataOutStore.set(generateFakeData()); // 你原来的初始化逻辑
    }
  });

  // 格式化显示值 - 仿真步长显示原始字符串，其他数值显示两位小数
  function formatDisplayValue(param: any): string {
    if (param.name === "仿真步长") {
      return param.data[0]; // 直接返回字符串，不格式化
    } else {
      const value = param.data[0];
      return typeof value === 'number' ? value.toFixed(2) : '0.00';
    }
  }
  
  import { invoke } from '@tauri-apps/api/tauri';

  let isCalculating = $state(false);
  let showResults = $state(true); // 页面加载时立即显示结果

  // 输入参数数据结构 - 修改为新格式，包含作战/训练、地面/空中
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

  // 参数名称映射 - 用于显示界面
  const parameterLabels = {
    "高度": { range: '(0~22000)', unit: 'm' },
    "马赫数": { range: '(0~2.5)', unit: '' },
    "温度修正": { range: '(0~xx)', unit: 'K' },
    "进气道总压恢复系数": { range: '(-1或0~1.1)', unit: '' },
    "功率提取": { range: '(0~1000000)', unit: 'W' },
    "压气机中间级引气": { range: '(0~2)', unit: '%' },
    "油门杆角度": { range: '(0~115)', unit: '度' }
  };

  // 仿真步长状态 - 只能选择一个
  let selectedSimulationStep = $state('0.025');
  
  // 模式选择状态 - 只能选择一个
  let selectedMode = $state('作战');
  let selectedEnvironment = $state('地面');

  // 输出参数 - 第一张表：仿真步长 + 15个虚拟数据，第二张表：16个虚拟数据
  // let dataOut = $state([
  //   // 第一张表数据（仿真步长 + 15个虚拟数据）
  //   { name: "仿真步长", data: ["0.025"] }, // 第1行：仿真步长 - 使用字符串保持原始格式
  //   { name: "低压轴换算转速", data: [8542.30] },
  //   { name: "高压轴换算转速", data: [12456.70] },
  //   { name: "发动机进口换算流量/kg/s", data: [245.80] },
  //   { name: "发动机净推力/kN", data: [15420.50] },
  //   { name: "发动机总推力/kN", data: [16890.20] },
  //   { name: "发动机进口冲压阻力/kN", data: [245.60] },
  //   { name: "发动机总耗油量/kg/h", data: [3456.80] },
  //   { name: "主燃烧室耗油量/kg/h", data: [2890.40] },
  //   { name: "加力燃烧室耗油量/kg/h", data: [566.40] },
  //   { name: "喷管喉道面积/m²", data: [0.245] },
  //   { name: "喷管出口面积/m²", data: [0.312] },
  //   { name: "风扇出口温度/K", data: [658.40] },
  //   { name: "高压压气机出口温度/K", data: [1245.60] },
  //   { name: "高压涡轮进口温度/K", data: [1156.80] },
  //   { name: "低压涡轮进口温度/K", data: [945.20] },
    
  //   // 第二张表数据（16个虚拟数据）
  //   { name: "低压涡轮出口温度/K", data: [756.30] },
  //   { name: "风扇出口总压/kPa", data: [245.80] },
  //   { name: "高压压气机出口总压/kPa", data: [1280.50] },
  //   { name: "高压涡轮进口总压/kPa", data: [1120.30] },
  //   { name: "低压涡轮进口总压/kPa", data: [890.70] },
  //   { name: "低压涡轮出口总压/kPa", data: [156.40] },
  //   { name: "喷管出口总压/kPa", data: [101.30] },
  //   { name: "喷管出口速度/m/s", data: [1245.60] },
  //   { name: "喷管出口马赫数", data: [2.15] },
  //   { name: "推重比", data: [8.45] },
  //   { name: "单位推力/N·s/kg", data: [1456.80] },
  //   { name: "推进效率", data: [0.85] },
  //   { name: "热效率", data: [0.42] },
  //   { name: "总效率", data: [0.36] },
  //   { name: "燃油消耗率/kg/(kN·h)", data: [0.78] },
  //   { name: "比冲/s", data: [1890.50] }
  // ]);

  // 检查是否在 Tauri 环境中
  function isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.__TAURI_IPC__ === 'function';
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

    // 更新输出参数中的仿真步长（只有第一个参数）- 使用原始字符串值
    if (dataOut.length > 0 && dataOut[0].name === "仿真步长") {
      dataOut[0].data = [selectedSimulationStep]; // 直接使用字符串，不转换为数字
    }
  }

  // 生成虚拟数据 - 为除仿真步长外的所有参数生成随机数据
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

  // 调用后端计算函数 - 添加环境检查
  async function callSteadyStateCalculation(data: any) {
    try {
      // 检查是否在 Tauri 环境中
      if (isTauriEnvironment()) {
        // 在 Tauri 环境中，使用 invoke 调用后端
        const result = await invoke("transient_calculation", data);
        return result;
      } else {
        // 在浏览器环境中，返回模拟成功结果
        console.log('运行在浏览器环境中，使用模拟数据');
        return {
          success: true,
          message: '浏览器环境模拟计算完成',
          dataOut: null
        };
      }
    } catch (error) {
      console.error('计算调用失败:', error);
      // 如果调用失败，返回模拟结果作为后备
      return {
        success: false,
        message: '计算失败，返回模拟结果',
        dataOut: null
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
      
      // 调用后端计算函数
      const result = await callSteadyStateCalculation(data);
      console.log('计算返回结果:', result);
      
      // 生成虚拟数据（包括更新仿真步长）
      generateVirtualData();
      
      console.log('虚拟数据已生成');
      
    } catch (error) {
      console.error('计算过程中出错:', error);
      // 出错时也生成虚拟数据
      generateVirtualData();
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

  // // 格式化显示值 - 仿真步长显示原始字符串，其他数值显示两位小数
  // function formatDisplayValue(param: any): string {
  //   if (param.name === "仿真步长") {
  //     return param.data[0]; // 直接返回字符串，不格式化
  //   } else {
  //     const value = param.data[0];
  //     return typeof value === 'number' ? value.toFixed(2) : '0.00';
  //   }
  // }
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
          
          <!-- 作战/训练 -->
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
          
          <!-- 地面/空中 -->
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
                    {#each dataOut.slice(0, 16) as param, index}
                      <tr class="border-b border-gray-600 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                        <!-- 参数名称 -->
                        <td class="px-4 py-3 text-gray-300 border-r border-gray-600">{param.name}</td>
                        <!-- 数值 -->
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
                  <!-- 表头 -->
                  <thead class="bg-gray-700 sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-gray-600">名称</th>
                      <th class="w-32 px-4 py-3 text-center font-medium text-gray-200">数值</th>
                    </tr>
                  </thead>
                  
                  <!-- 数据行 -->
                  <tbody>
                    {#each dataOut.slice(16, 32) as param, index}
                      <tr class="border-b border-gray-600 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                        <!-- 参数名称 -->
                        <td class="px-4 py-3 text-gray-300 border-r border-gray-600">{param.name}</td>
                        <!-- 数值 -->
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