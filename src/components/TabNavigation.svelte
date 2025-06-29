<script lang="ts">
  interface Props {
    tabs: string[];
    activeTab: string;
  }

  let { tabs, activeTab = $bindable() }: Props = $props();
</script>

<nav class="bg-gray-800 border-b border-gray-700">
  <div class="flex justify-center">
    <div class="flex p-4">
      {#each tabs as tab}
        <button
          class="px-6 py-2 text-sm font-medium transition-colors duration-200 {
            activeTab === tab 
              ? 'bg-gray-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }"
          onclick={() => activeTab = tab}
        >
          {tab}
        </button>
      {/each}
    </div>
  </div>
</nav>