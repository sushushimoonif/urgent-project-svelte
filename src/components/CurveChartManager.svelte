<script lang="ts">
    import type { curveGroup } from "@/utils/types";
    import AddButton from "./AddButton.svelte";
    import PresetButton from "./PresetButton.svelte";
    import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
    import { downloadDir, join } from "@tauri-apps/api/path";
    import { save } from '@tauri-apps/plugin-dialog';
    import { open } from '@tauri-apps/plugin-dialog';


    let curveTree: curveGroup[] = $state([
        {
            id: 1,
            name: "曲线图-1",
            curves: [
                { name: "高压涡轮出口总压" },
                { name: "高压压气机出口总压" },
                { name: "低压涡轮出口总压" },
            ],
        },
        {
            id: 2,
            name: "曲线图-2",
            curves: [
                { name: "高压涡轮出口总压" },
                { name: "高压压气机出口总压" },
                { name: "低压涡轮出口总压" },
            ],
        },
        {
            id: 3,
            name: "曲线图-3",
            curves: [
                { name: "高压涡轮出口总压" },
                { name: "高压压气机出口总压" },
                { name: "低压涡轮出口总压" },
            ],
        },
    ]);

    interface CurveChart {
      id: number;
      name: string;
      curves: Array<{ name: string }>;
    }
  
    interface Parameter {
      name: string;
      selected: boolean;
    }
  
    interface Props {
      charts: CurveChart[];
      leftParameters?: Parameter[];
      rightParameters?: Parameter[];
      onChartsChange?: (charts: CurveChart[]) => void;
      onLoadPreset?: () => void;
      onSavePreset?: () => void;
      showPresetButtons?: boolean;
    }
  
    let { 
      charts = $bindable(),
      leftParameters = [],
      rightParameters = [],
      onChartsChange,
      onLoadPreset,
      onSavePreset,
      showPresetButtons = true
    }: Props = $props();
  
    // 参数选择弹窗状态
    let showParameterModal = $state(false);
    let currentEditingChartId = $state<number | null>(null);
    let parameterModalPosition = $state({ x: 100, y: 100 });
    let isDraggingParameterModal = $state(false);
    let dragOffset = $state({ x: 0, y: 0 });
  
    // tauri 下载到本地
    async function handleSavePreset() {
      try {
        const savePath = await save({
          title: '选择保存位置',
          defaultPath: await downloadDir(),
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (!savePath) return;

        const presetData = JSON.stringify(charts, null, 2);
        console.log('fullPath', savePath);
        
        await writeTextFile(savePath, presetData);
          
        alert('保存成功！');
        } catch (error) {
          console.error('预设保存失败:', error);
        }
      }

    // 默认从预设加载处理
    async function handleLoadPreset() {
      try {
        const selectedPath = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
        if (selectedPath) {
          const content = await readTextFile(selectedPath as string);
          const presetData = JSON.parse(content);

          // 验证数据结构
          if (Array.isArray(presetData) && presetData.every(item => 
            item.id && item.name && Array.isArray(item.curves)
          )) {
            charts = presetData;
            onChartsChange?.(charts);
            alert('预设加载成功！');
          } else {
            alert('文件格式不正确，请选择有效的预设文件');
          }
          } 
        }
        catch (error) {
          console.error('预设加载失败:', error);
          alert(`加载失败：${error instanceof Error ? error.message : '未知错误'}`);
      }
}

    // 打开参数选择弹窗 - 用于创建新曲线图
    function openParameterModal() {
      currentEditingChartId = null;
      // 清空所有选择状态
      // leftParameters.forEach(p => p.selected = false);
      // rightParameters.forEach(p => p.selected = false);

      leftParameters.forEach((p,i) => p.selected = (i===0));
      rightParameters.forEach((p,i) => p.selected = (i===0));


      showParameterModal = true;
    }
  
    // 编辑现有曲线图的参数
    function editChartParameters(chartId: number) {
      currentEditingChartId = chartId;
      const chart = charts.find(c => c.id === chartId);
      
      if (chart) {
        // 清空所有选择状态
        leftParameters.forEach(p => p.selected = false);
        rightParameters.forEach(p => p.selected = false);
        
        // 根据当前曲线图中的参数，设置对应的选择状态
        chart.curves.forEach(curve => {
          const leftParam = leftParameters.find(p => p.name === curve.name);
          const rightParam = rightParameters.find(p => p.name === curve.name);
          
          if (leftParam) {
            leftParam.selected = true;
          }
          if (rightParam) {
            rightParam.selected = true;
          }
        });
      }
      
      showParameterModal = true;
    }
  
    // 确认参数选择
    function confirmParameterSelection() {
      // 获取选中的参数
      const selectedParams = [
        ...leftParameters.filter(p => p.selected),
        ...rightParameters.filter(p => p.selected)
      ];
      
      if (currentEditingChartId !== null) {
        // 编辑现有曲线图
        const chart = charts.find(c => c.id === currentEditingChartId);
        if (chart) {
          chart.curves = selectedParams.map(p => ({ name: p.name }));
          charts = [...charts]; // 触发响应式更新
          onChartsChange?.(charts);
        }
      } else {
        // 创建新的曲线图
        if (selectedParams.length > 0) {
          const newChart = {
            id: Date.now(),
            name: `曲线图-${charts.length + 1}`,
            curves: selectedParams.map(p => ({ name: p.name }))
          };
          charts = [...charts, newChart];
          onChartsChange?.(charts);
        }
      }
      
      // 重置选择状态
      leftParameters.forEach(p => p.selected = false);
      rightParameters.forEach(p => p.selected = false);
      
      showParameterModal = false;
      currentEditingChartId = null;
    }
  
    // 删除曲线图
    function deleteChart(chartId: number) {
      charts = charts.filter(chart => chart.id !== chartId);
      onChartsChange?.(charts);
    }
  
    // 编辑曲线图名称
    function editChartName(chartId: number, newName: string) {
      const chart = charts.find(c => c.id === chartId);
      if (chart) {
        chart.name = newName;
        charts = [...charts]; // 触发响应式更新
        onChartsChange?.(charts);
      }
    }
  
    // 关闭弹窗
    function closeModals() {
      showParameterModal = false;
      currentEditingChartId = null;
    }
  
    // 模态框拖拽处理
    function handleModalMouseDown(event: MouseEvent) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      dragOffset.x = event.clientX - rect.left;
      dragOffset.y = event.clientY - rect.top;
      isDraggingParameterModal = true;
    }
  
    function handleModalMouseMove(event: MouseEvent) {
      if (isDraggingParameterModal) {
        parameterModalPosition.x = event.clientX - dragOffset.x;
        parameterModalPosition.y = event.clientY - dragOffset.y;
      }
    }
  
    function handleModalMouseUp() {
      isDraggingParameterModal = false;
    }
  </script>
  
  <svelte:window 
    onmousemove={handleModalMouseMove}
    onmouseup={handleModalMouseUp}
  />
  

  <div
    class="flex flex-col bg-container-bg border-r border-border h-[calc(100dvh-31px)] p-4 w-fit"
>
    <div class="flex flex-row justify-center items-center gap-2">
        <PresetButton text="从预设加载" loadPresetClick={handleLoadPreset}>
            {#snippet icon()}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="16"
                    viewBox="0 0 15 16"
                    fill="none"
                >
                    <path
                        d="M2.44444 15H12.5556C12.9386 15 13.306 14.8525 13.5769 14.5899C13.8478 14.3274 14 13.9713 14 13.6V4.5L10.3889 1H3.88889C3.5058 1 3.1384 1.1475 2.86751 1.41005C2.59663 1.6726 2.44444 2.0287 2.44444 2.4V5.2M9.66667 1V3.8C9.66667 4.1713 9.81885 4.5274 10.0897 4.78995C10.3606 5.0525 10.728 5.2 11.1111 5.2H14M1 10.1H8.22222M8.22222 10.1L6.05556 12.2M8.22222 10.1L6.05556 8"
                        stroke="white"
                        stroke-opacity="0.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            {/snippet}
        </PresetButton>
        <PresetButton text="保存为预设" loadPresetClick={handleSavePreset}>
            {#snippet icon()}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                >
                    <path
                        d="M11.5 3V5.8C11.5 6.1713 11.658 6.5274 11.9393 6.78995C12.2206 7.0525 12.6022 7.2 13 7.2H16M10 14.2V10M10 14.2L7.75 12.1M10 14.2L12.25 12.1M12.25 3H5.5C5.10218 3 4.72064 3.1475 4.43934 3.41005C4.15804 3.6726 4 4.0287 4 4.4V15.6C4 15.9713 4.15804 16.3274 4.43934 16.5899C4.72064 16.8525 5.10218 17 5.5 17H14.5C14.8978 17 15.2794 16.8525 15.5607 16.5899C15.842 16.3274 16 15.9713 16 15.6V6.5L12.25 3Z"
                        stroke="white"
                        stroke-opacity="0.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            {/snippet}
        </PresetButton>
        <AddButton
            addGroup={openParameterModal}
        />
    </div>

    <!-- 曲线图列表 -->
{#each charts as chart}
<div class="flex flex-col mt-3">
  <div class="flex flex-row justify-between items-center bg-curve-group-bg w-[260px] px-2 py-1 rounded-[4px]">
    <div class="flex flex-row justify-start items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M3 3V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H21M7 16C7.5 14 8.5 9 11 9C13 9 13 12 15 12C17.5 12 19.5 7 20 5"
          stroke="white"
          stroke-opacity="0.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <!-- 可编辑的名称 -->
      <input 
        type="text" 
        value={chart.name}
        oninput={(e) => editChartName(chart.id, e.target.value)}
        class="max-w-[60%] bg-transparent text-label-color/70 focus:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 flex-1"
      />
      <!-- 编辑参数按钮 -->
      <button onclick={() => editChartParameters(chart.id)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M2 8H14M8 2V14"
            stroke="white"
            stroke-opacity="0.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <!-- 删除曲线图按钮 -->
      <button onclick={() => deleteChart(chart.id)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M2 2L14 14M2 14L14 2"
            stroke="white"
            stroke-opacity="0.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
  <!-- 曲线列表 -->
  {#each chart.curves as curve}
    <div class="flex flex-row justify-start items-center w-[223px] px-2 h-8">
      <div class="w-[1px] bg-border h-full mx-4"></div>
      <p class="text-label-color/70">{curve.name}</p >
    </div>
  {/each}
</div>
{/each}
  </div>
  
  <!-- 参数选择弹窗 - 可拖拽 -->
  {#if showParameterModal}
    <div 
      class="fixed bg-gray-800 border border-gray-600 rounded-lg w-[600px] h-[600px] flex flex-col z-50 shadow-2xl"
      style="left: {parameterModalPosition.x}px; top: {parameterModalPosition.y}px;"
    >
      <!-- 弹窗标题 - 可拖拽区域 -->
      <div 
        class="flex items-center justify-between px-6 py-4 border-b border-gray-600 cursor-move"
        onmousedown={handleModalMouseDown}
      >
        <h3 class="text-xl font-medium text-gray-200">
          {currentEditingChartId !== null ? '编辑曲线图参数' : '参数选择'}
        </h3>
        <button class="text-gray-400 hover:text-gray-200" onclick={closeModals}>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
  
      <!-- 参数选择区域 -->
      <div class="flex-1 flex overflow-hidden px-6 py-4">
        <!-- 左侧参数列表 -->
        <div class="flex-1 pr-4 overflow-y-auto">
          <div class="space-y-4">
            {#each leftParameters as param}
              <div class="flex items-center gap-4 py-2 hover:bg-gray-700 rounded transition-colors">
                <div class="relative">
                  <input 
                    type="checkbox" 
                    bind:checked={param.selected} 
                    class="w-4 h-4 rounded border-2 border-gray-500 bg-gray-700 text-green-500 focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:ring-offset-gray-800"
                  >
                  {#if param.selected}
                    <svg class="absolute top-0 left-0 w-4 h-4 text-green-500 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  {/if}
                </div>
                <span class="text-base text-gray-300 leading-relaxed">{param.name}</span>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- 中间分隔线 -->
        <div class="w-px bg-gray-600 mx-4"></div>
        
        <!-- 右侧参数列表 -->
        <div class="flex-1 pl-4 overflow-y-auto">
          <div class="space-y-4">
            {#each rightParameters as param}
              <div class="flex items-center gap-4 py-2 hover:bg-gray-700 rounded transition-colors">
                <div class="relative">
                  <input 
                    type="checkbox" 
                    bind:checked={param.selected} 
                    class="w-4 h-4 rounded border-2 border-gray-500 bg-gray-700 text-green-500 focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:ring-offset-gray-800"
                  >
                  {#if param.selected}
                    <svg class="absolute top-0 left-0 w-4 h-4 text-green-500 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  {/if}
                </div>
                <span class="text-base text-gray-300 leading-relaxed">{param.name}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
  
      <!-- 底部控制按钮 - 居中显示 -->
      <div class="px-6 py-6 border-t border-gray-600">
        <div class="flex justify-center gap-6">
          <button 
            class="px-8 py-3 bg-gray-600 hover:bg-gray-500 text-white text-base rounded-lg transition-colors flex items-center gap-3 min-w-[120px] justify-center"
            onclick={closeModals}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            关闭
          </button>
          <button 
            class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-base rounded-lg transition-colors flex items-center gap-3 min-w-[120px] justify-center"
            onclick={confirmParameterSelection}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            确认
          </button>
        </div>
      </div>
    </div>
  {/if}