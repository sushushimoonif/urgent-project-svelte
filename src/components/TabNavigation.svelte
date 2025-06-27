<script lang="ts">
  interface Props {
    tabs: string[];
    activeTab: string;
  }

  let { tabs, activeTab = $bindable() }: Props = $props();
</script>

<nav class="bg-gray-800 border-b border-gray-700">
  <div class="flex">
    {#each tabs as tab}
      <button
        class="px-6 py-3 text-sm font-medium transition-colors duration-200 border-b-2 {
          activeTab === tab 
            ? 'bg-purple-600 text-white border-purple-500' 
            : 'text-gray-300 hover:text-white hover:bg-gray-700 border-transparent'
        }"
        onclick={() => activeTab = tab}
      >
        {tab}
      </button>
    {/each}
  </div>
</nav>