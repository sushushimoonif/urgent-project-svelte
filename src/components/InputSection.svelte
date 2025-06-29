<script lang="ts">
  export let inputParams: Record<string, string>;
  
  const parameterLabels = {
    height: '高度\n(0~22000)',
    horsePower: '马赫数\n(0~2.5)',
    temperature: '温度修正\n(20)',
    gasFlowSystem: '进气道压力传递系统\n(0~1.1)',
    powerConsumption: '功率规律\n(0~1000000)',
    gasCompressionRatio: '压气机压缩比引气\n(0~100000)',
    oilFieldAngle: '油门杆角度\n(0~1000000)'
  };

  const units = {
    height: 'm',
    horsePower: '',
    temperature: 'K',
    gasFlowSystem: 'm',
    powerConsumption: 'W',
    gasCompressionRatio: 'kg.s',
    oilFieldAngle: 'deg'
  };
</script>

<div class="space-y-4">
  {#each Object.entries(inputParams) as [key, value]}
    <div class="space-y-2">
      <label class="block text-sm text-gray-300 whitespace-pre-line">
        {parameterLabels[key]}
      </label>
      <div class="relative">
        <input
          type="text"
          bind:value={inputParams[key]}
          class="w-full bg-gray-700 border border-app-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-app-purple focus:border-transparent"
          placeholder="输入数值"
        />
        {#if units[key]}
          <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {units[key]}
          </span>
        {/if}
      </div>
    </div>
  {/each}
</div>