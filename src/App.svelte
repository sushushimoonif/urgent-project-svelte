<script lang="ts">
  import TabNavigation from './components/TabNavigation.svelte';
  import SteadyStateCalc from './components/SteadyStateCalc.svelte';
  import TransientCalc from './components/TransientCalc.svelte';
  import RealTimeCalc from './components/RealTimeCalc.svelte';

  let activeTab = $state('稳态计算');

  const tabs = ['稳态计算', '过渡态计算', '实时计算'];
</script>

<main class="min-h-screen bg-gray-900 text-white flex flex-col">
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