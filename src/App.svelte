<script lang="ts">
  import TabNavigation from './components/TabNavigation.svelte';
  import SteadyStateCalc from './components/SteadyStateCalc.svelte';
  import TransientCalc from './components/TransientCalc.svelte';
  import RealTimeCalc from './components/RealTimeCalc.svelte';

  let activeTab = $state('稳态计算');

  const tabs = ['稳态计算', '过渡态计算', '实时计算'];
</script>

<main class="min-h-screen bg-gray-900 text-white flex flex-col">
  <!-- Title Bar -->
  <div class="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
    <div class="flex items-center space-x-2">
      <div class="w-3 h-3 bg-red-500 rounded-full"></div>
      <span class="text-sm text-gray-300">XXXXXXXXXXX</span>
    </div>
    <div class="flex space-x-1">
      <button class="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs flex items-center justify-center">−</button>
      <button class="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs flex items-center justify-center">□</button>
      <button class="w-6 h-6 bg-red-600 hover:bg-red-500 rounded text-xs flex items-center justify-center">×</button>
    </div>
  </div>

  <!-- Tab Navigation -->
  <TabNavigation {tabs} bind:activeTab />

  <!-- Content Area -->
  <div class="flex-1 overflow-hidden">
    {#if activeTab === '稳态计算'}
      <SteadyStateCalc />
    {:else if activeTab === '过渡态计算'}
      <TransientCalc />
    {:else if activeTab === '实时计算'}
      <RealTimeCalc />
    {/if}
  </div>
</main>