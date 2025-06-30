// src/stores/pageData.ts
import { writable } from 'svelte/store';
import { appCacheDir } from '@tauri-apps/api/path';
import { readTextFile, writeFile, exists } from '@tauri-apps/api/fs';

// 缓存文件名
const CACHE_FILE_NAME = 'pageDataCache.json';

// 初始数据（和 paste.txt 中一致）
const initialData = {
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
  ],
  selectedSimulationStep: '0.025',
  selectedMode: '作战',
  selectedEnvironment: '地面'
};

function createPersistentStore() {
  const store = writable(initialData);

  // 异步读取缓存
  async function load() {
    try {
      const cacheDir = await appCacheDir();
      const filePath = `${cacheDir}/${CACHE_FILE_NAME}`;
      if (await exists(filePath)) {
        const content = await readTextFile(filePath);
        const data = JSON.parse(content);
        store.set(data);
      }
    } catch (e) {
      // 读取失败用初始值
    }
  }

  // 订阅数据变化写入缓存
  store.subscribe(async (value) => {
    try {
      const cacheDir = await appCacheDir();
      const filePath = `${cacheDir}/${CACHE_FILE_NAME}`;
      await writeFile({ path: filePath, contents: JSON.stringify(value) });
    } catch (e) {
      // 写入失败忽略
    }
  });

  load();

  return store;
}

export const pageData = createPersistentStore();
