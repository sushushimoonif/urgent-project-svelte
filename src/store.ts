// src/store.ts
import { writable } from 'svelte/store';

// 初始数据结构
const initialDataIN = [
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
];

const initialDataOut = [
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
];

// 创建响应式store
export const dataIN = writable(initialDataIN);
export const dataOut = writable(initialDataOut);
export const selectedSimulationStep = writable('0.025');
export const selectedMode = writable('作战');
export const selectedEnvironment = writable('地面');
export const isCalculating = writable(false);
export const showResults = writable(true);

// 辅助函数：更新dataIN中的特定参数
export function updateDataINParam(name: string, value: number) {
  dataIN.update(list => {
    const param = list.find(p => p.name === name);
    if (param) {
      param.data = [value];
    }
    return [...list];
  });
}

// 辅助函数：获取dataIN中的特定参数值
export function getDataINParam(name: string): number {
  let result = 0;
  dataIN.subscribe(list => {
    const param = list.find(p => p.name === name);
    result = param ? param.data[0] : 0;
  })();
  return result;
}

// 辅助函数：重置所有数据到初始状态
export function resetAllData() {
  dataIN.set([...initialDataIN]);
  dataOut.set([...initialDataOut]);
  selectedSimulationStep.set('0.025');
  selectedMode.set('作战');
  selectedEnvironment.set('地面');
  isCalculating.set(false);
  showResults.set(true);
}