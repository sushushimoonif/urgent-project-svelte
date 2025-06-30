<script lang="ts">
    import type { Snippet } from "svelte";

    let selected = $state(0)

    interface Props {
        left: string;
        right: string;
        selectedData: number;
    }
    let { left, right, selectedData = $bindable()}: Props = $props();

    $effect(() => {
        selectedData = selected;
    })
</script>

<div class="flex flex-row gap-[1px] text-base">
    <button
        class="{selected === 0 ? 'bg-tab-selected text-label-color' : 'bg-tab-bg text-label-color/70'} w-24 h-10 rounded-l-[2px]"
        onclick={() => (selected = 0)}
    >
    <p class="px-[10px] py-[4px]">{left}</p>
    </button>
    <button
        class="{selected === 1 ? 'bg-tab-selected text-label-color' : 'bg-tab-bg text-label-color/70'} w-24 h-10 rounded-r-[2px]"
        onclick={() => (selected = 1)}
    >
    <p class="px-[10px] py-[4px] rounded-l-[2px]">{right}</p>
    </button>
</div>
