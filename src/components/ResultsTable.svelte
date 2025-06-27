<script lang="ts">
  export let data: Array<{
    column1: string;
    column2: string;
    column3: string;
    column4: string;
  }>;
</script>

<div class="p-6 h-full overflow-auto">
  <div class="bg-app-surface rounded border border-app-border overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <!-- Headers -->
        <thead class="bg-gray-700">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-app-border min-w-[200px]">1</th>
            <th class="px-4 py-3 text-center font-medium text-gray-200 border-r border-app-border min-w-[120px]">1</th>
            <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-app-border min-w-[200px]">1</th>
            <th class="px-4 py-3 text-center font-medium text-gray-200 min-w-[120px]">1</th>
          </tr>
        </thead>
        
        <!-- Data Rows -->
        <tbody>
          {#each data as row, index}
            <tr class="border-b border-app-border hover:bg-gray-600 transition-colors {index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}">
              <td class="px-4 py-3 text-gray-300 border-r border-app-border">{row.column1}</td>
              <td class="px-4 py-3 text-center border-r border-app-border">{row.column2}</td>
              <td class="px-4 py-3 text-gray-300 border-r border-app-border">{row.column3}</td>
              <td class="px-4 py-3 text-center">{row.column4}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>