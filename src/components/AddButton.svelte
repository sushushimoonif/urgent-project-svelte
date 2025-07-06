<script lang="ts">

  interface Props {
    addGroup: () => void;
  }

 let { addGroup }: Props = $props();
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button onclick={addGroup}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="0.25" y="0.25" width="23.5" height="23.5" rx="3.75" fill="#262626"/>
        <rect x="0.25" y="0.25" width="23.5" height="23.5" rx="3.75" stroke="#5E5E5E" stroke-width="0.5"/>
        <path d="M6 12H18M12 6V18" stroke="white" stroke-opacity="0.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
</button>