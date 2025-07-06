<script lang="ts">
        import type { Snippet } from "svelte";

    interface Props {
        icon: Snippet;
        text: string;
        loadPresetClick: () => void;

    }

    let { icon, text, loadPresetClick }: Props = $props();
</script>

<button onclick={loadPresetClick}
class="flex flex-row justify-center items-center gap-2 bg-input-bg rounded-[4px] px-2 py-2 border-button-border border-1">
    {@render icon()}
    <p class="text-label-color/70 text-sm">{text}</p >
</button>