<script lang="ts">
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

  // 默认从预设加载处理
  function handleLoadPreset() {
    if (onLoadPreset) {
      onLoadPreset();
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          const presetData = JSON.parse(text);
          
          if (Array.isArray(presetData) && presetData.every(item => 
            item.id && item.name && Array.isArray(item.curves)
          )) {
            charts = presetData;
            onChartsChange?.(charts);
            alert('预设加载成功！');
          } else {
            alert('文件格式不正确，请选择有效的预设文件');
          }
        } catch (error) {
          console.error('预设加载失败:', error);
          alert('预设加载失败，请检查文件格式');
        }
      };
      input.click();
    }
  }

  // 默认保存为预设处理
  function handleSavePreset() {
    if (onSavePreset) {
      onSavePreset();
    } else {
      try {
        const presetData = JSON.stringify(charts, null, 2);
        const blob = new Blob([presetData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `curve_preset_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('预设保存成功！');
      } catch (error) {
        console.error('预设保存失败:', error);
        alert('预设保存失败');
      }
    }
  }

  // 打开参数选择弹窗 - 用于创建新曲线图
  function openParameterModal() {
    currentEditingChartId = null;
    // 清空所有选择状态
    leftParameters.forEach(p => p.selected = false);
    rightParameters.forEach(p => p.selected = false);
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

<div class="w-full xl:w-72 bg-gray-800 border border-gray-700 rounded-lg">
  <!-- 顶部按钮区域 -->
  <div class="p-3 border-b border-gray-700">
    <div class="flex gap-2 mb-2">
      {#if showPresetButtons}
        <button 
          class="flex-1 border border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
          onclick={handleLoadPreset}
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
          </svg>
          从预设加载
        </button>
        <button 
          class="flex-1 border border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
          onclick={handleSavePreset}
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          保存为预设
        </button>
      {/if}
      <button 
        class="border border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white px-3 py-2 rounded text-lg font-medium transition-colors flex items-center justify-center"
        onclick={openParameterModal}
      >
        +
      </button>
    </div>
  </div>

  <!-- 曲线图列表 -->
  <div class="max-h-[calc(100vh-300px)] overflow-y-auto">
    {#each charts as chart}
      <div class="border-b border-gray-700">
        <!-- 曲线图标题 -->
        <div class="flex items-center justify-between p-3 bg-gray-750">
          <div class="flex items-center gap-2 flex-1">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <!-- 可编辑的名称 -->
            <input 
              type="text" 
              value={chart.name}
              oninput={(e) => editChartName(chart.id, e.target.value)}
              class="bg-transparent text-sm text-gray-300 focus:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 flex-1"
            />
          </div>
          <div class="flex gap-1">
            <!-- 编辑参数按钮 -->
            <button 
              class="w-5 h-5 bg-blue-600 hover:bg-blue-700 rounded text-xs flex items-center justify-center text-white"
              onclick={() => editChartParameters(chart.id)}
              title="编辑参数"
            >
              ✎
            </button>
            <!-- 删除曲线图按钮 -->
            <button 
              class="w-5 h-5 bg-red-600 hover:bg-red-700 rounded text-xs flex items-center justify-center text-white"
              onclick={() => deleteChart(chart.id)}
              title="删除曲线图"
            >
              ×
            </button>
          </div>
        </div>
        
        <!-- 曲线列表 -->
        <div class="p-3 space-y-1">
          {#each chart.curves as curve}
            <div class="text-xs text-gray-300 leading-tight px-2 py-1">
              {curve.name}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- 参数选择弹窗 - 可拖拽 -->
{#if showParameterModal}
  <div 
    class="fixed bg-gray-800 border border-gray-700 rounded-lg w-[600px] h-[500px] flex flex-col z-50 shadow-2xl"
    style="left: {parameterModalPosition.x}px; top: {parameterModalPosition.y}px;"
  >
    <!-- 弹窗标题 - 可拖拽区域 -->
    <div 
      class="flex items-center justify-between p-4 border-b border-gray-700 cursor-move"
      onmousedown={handleModalMouseDown}
    >
      <h3 class="text-lg font-medium text-gray-200">
        {currentEditingChartId !== null ? '编辑曲线图参数' : '参数选择'}
      </h3>
      <button class="text-gray-400 hover:text-gray-200" onclick={closeModals}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- 参数选择区域 -->
    <div class="flex-1 flex">
      <!-- 左侧参数列表 -->
      <div class="flex-1 p-3 overflow-y-auto">
        <div class="space-y-1">
          {#each leftParameters as param}
            <div class="flex items-center gap-2">
              <input type="checkbox" bind:checked={param.selected} class="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-1">
              <span class="text-xs text-gray-300 leading-tight">{param.name}</span>
            </div>
          {/each}
        </div>
      </div>
      
      <!-- 右侧参数列表 -->
      <div class="flex-1 p-3 overflow-y-auto border-l border-gray-700">
        <div class="space-y-1">
          {#each rightParameters as param}
            <div class="flex items-center gap-2">
              <input type="checkbox" bind:checked={param.selected} class="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-1">
              <span class="text-xs text-gray-300 leading-tight">{param.name}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- 底部控制按钮 -->
    <div class="p-3 border-t border-gray-700 space-y-2">
      <div class="flex gap-2">
        <button class="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded" onclick={closeModals}>关闭</button>
        <button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded" onclick={confirmParameterSelection}>确认</button>
      </div>
    </div>
  </div>
{/if}