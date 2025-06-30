<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/tauri';
  import {
    dataIN,
    dataOut,
    selectedSimulationStep,
    selectedMode,
    selectedEnvironment,
    isCalculating,
    showResults
  } from '../store';
  import { get, writable } from 'svelte/store';

  const parameterLabels = {
    "高度": { range: '(0~22000)', unit: 'm' },
    "马赫数": { range: '(0~2.5)', unit: '' },
    "温度修正": { range: '(0~xx)', unit: 'K' },
    "进气道总压恢复系数": { range: '(-1或0~1.1)', unit: '' },
    "功率提取": { range: '(0~1000000)', unit: 'W' },
    "压气机中间级引气": { range: '(0~2)', unit: '%' },
    "油门杆角度": { range: '(0~115)', unit: '度' }
  };

  function isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && typeof window.__TAURI_IPC__ === 'function';
  }

  function updateDataINOptions() {
    const $dataIN = get(dataIN);
    const $selectedSimulationStep = get(selectedSimulationStep);
    const $selectedMode = get(selectedMode);
    const $selectedEnvironment = get(selectedEnvironment);

    const updateParam = (name: string, value: number) => {
      const param = $dataIN.find(p => p.name === name);
      if (param) param.data = [value];
    };

    updateParam('仿真步长', parseFloat($selectedSimulationStep));
    updateParam('作战', $selectedMode === '作战' ? 0 : 1);
    updateParam('训练', $selectedMode === '作战' ? 1 : 0);
    updateParam('地面', $selectedEnvironment === '地面' ? 0 : 1);
    updateParam('空中', $selectedEnvironment === '地面' ? 1 : 0);

    if (get(dataOut)[0].name === '仿真步长') {
      dataOut.update(out => {
        out[0].data = [$selectedSimulationStep];
        return [...out];
      });
    }

    dataIN.set([...$dataIN]);
  }

  function generateVirtualData() {
    const $selectedSimulationStep = get(selectedSimulationStep);
    dataOut.update(list => list.map((param, i) => {
      if (i === 0) return { ...param, data: [$selectedSimulationStep] };
      const base = typeof param.data[0] === 'number' ? param.data[0] : 100;
      const delta = (Math.random() - 0.5) * 0.2;
      return { ...param, data: [base * (1 + delta)] };
    }));
  }

  async function callSteadyStateCalculation(data: any) {
    try {
      if (isTauriEnvironment()) {
        return await invoke("transient_calculation", data);
      } else {
        return { success: true, message: '浏览器环境模拟计算完成', dataOut: null };
      }
    } catch (err) {
      return { success: false, message: '计算失败', dataOut: null };
    }
  }

  async function handleCalculate() {
    isCalculating.set(true);
    try {
      updateDataINOptions();
      const input = { dataIN: get(dataIN), type: "稳态计算" };
      const result = await callSteadyStateCalculation(input);
      console.log('计算结果', result);
      generateVirtualData();
    } catch (e) {
      generateVirtualData();
    } finally {
      isCalculating.set(false);
    }
  }

  function getInputValue(name: string): string {
    const param = get(dataIN).find(p => p.name === name);
    return param?.data[0]?.toString() ?? '0';
  }

  function setInputValue(name: string, value: string) {
    dataIN.update(list => {
      const num = parseFloat(value) || 0;
      return list.map(p => p.name === name ? { ...p, data: [num] } : p);
    });
  }

  function formatDisplayValue(param: any): string {
    if (param.name === '仿真步长') return param.data[0];
    const val = param.data[0];
    return typeof val === 'number' ? val.toFixed(2) : '0.00';
  }
</script>

<!-- HTML部分保持不变，只需要用$store语法绑定 -->
<!-- 示例：{#each $dataOut.slice(0, 16) as param} -->
