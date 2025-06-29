<script lang="ts">
  interface Parameter {
    name: string;
    value: string;
    unit?: string;
    category?: string;
  }

  interface Props {
    title?: string;
    parameters: Parameter[];
    columns?: number;
  }

  let { title = "参数列表", parameters, columns = 2 }: Props = $props();

  // 将参数分组到指定列数
  function distributeToColumns(items: Parameter[], cols: number) {
    const itemsPerColumn = Math.ceil(items.length / cols);
    const result = [];
    
    for (let i = 0; i < cols; i++) {
      const start = i * itemsPerColumn;
      const end = Math.min(start + itemsPerColumn, items.length);
      result.push(items.slice(start, end));
    }
    
    return result;
  }

  // 使用 $derived 替代 $: 响应式语句
  const columnData = $derived(distributeToColumns(parameters, columns));
</script>

<div class="bg-gray-800 border border-gray-700 rounded overflow-hidden h-full flex flex-col">
  <!-- 标题栏 -->
  <div class="bg-gray-750 px-3 py-2 border-b border-gray-700">
    <h3 class="text-sm font-medium text-gray-200 flex items-center gap-2">
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      {title}
    </h3>
  </div>

  <!-- 参数内容区域 -->
  <div class="flex-1 overflow-hidden">
    <div class="grid grid-cols-{columns} gap-0 h-full">
      {#each columnData as column, columnIndex}
        <div class="p-3 overflow-y-auto {columnIndex < columnData.length - 1 ? 'border-r border-gray-700' : ''}">
          <div class="space-y-2">
            {#each column as param}
              <div class="bg-gray-900 rounded px-3 py-2 border border-gray-600 hover:border-gray-500 transition-colors">
                <div class="flex justify-between items-center">
                  <div class="flex-1 min-w-0">
                    <div class="text-xs text-gray-300 font-medium truncate" title={param.name}>
                      {param.name}
                    </div>
                    {#if param.category}
                      <div class="text-xs text-gray-500 mt-1">
                        {param.category}
                      </div>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1 ml-2">
                    <span class="text-xs text-white font-mono">
                      {param.value || '--'}
                    </span>
                    {#if param.unit}
                      <span class="text-xs text-gray-400">
                        {param.unit}
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- 底部状态栏 -->
  <div class="bg-gray-750 px-3 py-2 border-t border-gray-700">
    <div class="flex justify-between items-center text-xs text-gray-400">
      <span>共 {parameters.length} 个参数</span>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>实时更新</span>
      </div>
    </div>
  </div>
</div>