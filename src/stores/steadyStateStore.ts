import { writable } from 'svelte/store';

// 稳态计算数据接口定义
interface SteadyStateData {
  // 输入参数
  dataIN: Array<{ name: string; data: number[] }>;
  
  // 输出结果
  dataOut: Array<{ name: string; data: (string | number)[] }>;
  
  // 用户选择状态
  selectedSimulationStep: string;
  selectedMode: string;
  selectedEnvironment: string;
  
  // 计算状态
  isCalculating: boolean;
  showResults: boolean;
  
  // 时间戳
  lastUpdated: number;
}

// 默认数据
const defaultSteadyStateData: SteadyStateData = {
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
    // 第一张表数据（仿真步长 + 15个虚拟数据）
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
  ],
  
  selectedSimulationStep: '0.025',
  selectedMode: '作战',
  selectedEnvironment: '地面',
  
  isCalculating: false,
  showResults: true,
  
  lastUpdated: Date.now()
};

// 从localStorage加载数据
function loadFromStorage(): SteadyStateData {
  if (typeof window === 'undefined') return defaultSteadyStateData;
  
  try {
    const stored = localStorage.getItem('steadyStateData');
    if (stored) {
      const parsed = JSON.parse(stored);
      // 验证数据结构完整性
      if (parsed.dataIN && parsed.dataOut && parsed.selectedSimulationStep) {
        return { ...defaultSteadyStateData, ...parsed };
      }
    }
  } catch (error) {
    console.warn('加载稳态计算数据失败:', error);
  }
  
  return defaultSteadyStateData;
}

// 保存数据到localStorage
function saveToStorage(data: SteadyStateData) {
  if (typeof window === 'undefined') return;
  
  try {
    const dataToSave = {
      ...data,
      lastUpdated: Date.now()
    };
    localStorage.setItem('steadyStateData', JSON.stringify(dataToSave));
  } catch (error) {
    console.warn('保存稳态计算数据失败:', error);
  }
}

// 创建响应式存储
export const steadyStateStore = writable<SteadyStateData>(loadFromStorage());

// 订阅存储变化，自动保存到localStorage
steadyStateStore.subscribe((data) => {
  saveToStorage(data);
});

// 辅助函数：更新输入参数
export function updateInputParameter(name: string, value: number) {
  steadyStateStore.update(state => {
    const param = state.dataIN.find(p => p.name === name);
    if (param) {
      param.data = [value];
    }
    return { ...state, lastUpdated: Date.now() };
  });
}

// 辅助函数：更新选择状态
export function updateSelectionState(updates: Partial<Pick<SteadyStateData, 'selectedSimulationStep' | 'selectedMode' | 'selectedEnvironment'>>) {
  steadyStateStore.update(state => ({
    ...state,
    ...updates,
    lastUpdated: Date.now()
  }));
}

// 辅助函数：更新计算状态
export function updateCalculationState(isCalculating: boolean, showResults?: boolean) {
  steadyStateStore.update(state => ({
    ...state,
    isCalculating,
    showResults: showResults !== undefined ? showResults : state.showResults,
    lastUpdated: Date.now()
  }));
}

// 辅助函数：更新输出结果
export function updateOutputResults(dataOut: Array<{ name: string; data: (string | number)[] }>) {
  steadyStateStore.update(state => ({
    ...state,
    dataOut,
    lastUpdated: Date.now()
  }));
}

// 辅助函数：重置所有数据
export function resetSteadyStateData() {
  steadyStateStore.set(defaultSteadyStateData);
  // 清除localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('steadyStateData');
  }
}

// 辅助函数：获取输入参数值
export function getInputValue(state: SteadyStateData, paramName: string): number {
  const param = state.dataIN.find(p => p.name === paramName);
  return param && param.data.length > 0 ? param.data[0] : 0;
}