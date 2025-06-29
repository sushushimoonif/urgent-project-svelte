<script lang="ts">
  interface MonitorData {
    parameter: string;
    value: string;
  }

  interface Props {
    data: MonitorData[];
    isVisible: boolean;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    onClose?: () => void;
    onPositionChange?: (position: { x: number; y: number }) => void;
    onSizeChange?: (size: { width: number; height: number }) => void;
  }

  let { 
    data,
    isVisible = $bindable(),
    position = $bindable({ x: 200, y: 150 }),
    size = $bindable({ width: 400, height: 500 }),
    onClose,
    onPositionChange,
    onSizeChange
  }: Props = $props();

  // 拖拽状态
  let isDragging = $state(false);
  let isResizing = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });
  let resizeStartPos = $state({ x: 0, y: 0 });
  let resizeStartSize = $state({ width: 0, height: 0 });

  // 拖拽处理
  function handleMouseDown(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.x = event.clientX - rect.left;
    dragOffset.y = event.clientY - rect.top;
    isDragging = true;
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging) {
      const newPosition = {
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y
      };
      position = newPosition;
      onPositionChange?.(newPosition);
    } else if (isResizing) {
      const deltaX = event.clientX - resizeStartPos.x;
      const deltaY = event.clientY - resizeStartPos.y;
      
      const newSize = {
        width: Math.max(300, resizeStartSize.width + deltaX),
        height: Math.max(200, resizeStartSize.height + deltaY)
      };
      size = newSize;
      onSizeChange?.(newSize);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    isResizing = false;
  }

  // 缩放处理
  function handleResizeMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    isResizing = true;
    resizeStartPos.x = event.clientX;
    resizeStartPos.y = event.clientY;
    resizeStartSize.width = size.width;
    resizeStartSize.height = size.height;
  }

  // 关闭处理
  function handleClose() {
    isVisible = false;
    onClose?.();
  }
</script>

<svelte:window 
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
/>

{#if isVisible}
  <div 
    class="fixed bg-gray-800 border border-gray-700 rounded-lg flex flex-col z-50 shadow-2xl"
    style="left: {position.x}px; top: {position.y}px; width: {size.width}px; height: {size.height}px;"
  >
    <!-- 弹窗标题 - 可拖拽区域 -->
    <div 
      class="flex items-center justify-between p-4 border-b border-gray-700 cursor-move"
      onmousedown={handleMouseDown}
    >
      <h3 class="text-lg font-medium text-gray-200 flex items-center gap-2">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        实时监控
      </h3>
      <button class="text-gray-400 hover:text-gray-200" onclick={handleClose}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- 监控表格内容 -->
    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-700 sticky top-0">
          <tr>
            <th class="px-3 py-2 text-left font-medium text-gray-200 border-r border-gray-600">参数</th>
            <th class="px-3 py-2 text-center font-medium text-gray-200">值</th>
          </tr>
        </thead>
        <tbody>
          {#each data as row, index}
            <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
              <td class="px-3 py-2 text-gray-300 border-r border-gray-600 text-xs">{row.parameter}</td>
              <td class="px-3 py-2 text-center text-white font-mono text-xs">{row.value}</td>
            </tr>
          {/each}
          
          <!-- 如果没有数据，显示提示 -->
          {#if data.length === 0}
            <tr>
              <td colspan="2" class="px-3 py-8 text-center text-gray-400 text-xs">
                暂无实时数据
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <!-- 底部控制按钮 -->
    <div class="p-3 border-t border-gray-700">
      <div class="flex justify-end gap-2">
        <button class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded" onclick={handleClose}>关闭</button>
      </div>
    </div>

    <!-- 缩放控制器 - 右下角 -->
    <div 
      class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-600 hover:bg-gray-500 transition-colors"
      onmousedown={handleResizeMouseDown}
      style="clip-path: polygon(100% 0%, 0% 100%, 100% 100%);"
    >
    </div>
  </div>
{/if}