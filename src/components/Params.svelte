<script lang="ts">
    interface Props {
        name: string;
        range: string;
        unit: string;
        value: number;
    }
    let { name, range, unit, value=$bindable() }: Props = $props();
</script>

<div class="flex flex-row justify-start items-center gap-[8px]">
    <div class="flex flex-col justify-items-end w-[112px]">
        <p class="text-label-color/70 text-end text-xs">{name}</p>
        <p class="text-label-color/70 text-xs text-end">{range}</p>
    </div>
    <input class="bg-input-bg h-8 w-24 text-end px-2 text-label-color" bind:value={value} />
    <div>
        <p class="text-label-color/70 text-xs">{unit}</p>
    </div>
</div>
Params