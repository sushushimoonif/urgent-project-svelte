// src/store.ts
import { writable } from 'svelte/store';

export const dataIN = writable([
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

export const dataOut = writable([
  { name: "仿真步长", data: ["0.025"] },
  { name: "低压轴换算转速", data: [8542.30] },
  { name: "高压轴换算转速", data: [12456.70] },
  // ...其余参数
]);

export const selectedSimulationStep = writable('0.025');
export const selectedMode = writable('作战');
export const selectedEnvironment = writable('地面');
export const isCalculating = writable(false);
export const showResults = writable(true);
