<script lang="ts">

    interface Param {
        name: string;
        range: string;
        unit: string;
        value: number;
    }

    interface Props {
        paramLabels: Param[];
    }

    let { paramLabels = $bindable() }: Props = $props();

    $inspect(paramLabels);
</script>

<div class="flex flex-col justify-start gap-5">
    {#each paramLabels as param, id}
        <Params
            name={param.name}
            range={param.range}
            unit={param.unit}
            bind:value={paramLabels[id].value}
        />
    {/each}
</div>
