<script lang="ts">

    let { selectedData = $bindable()} = $props();
</script>

<div class="flex flex-col gap-4 justify-center items-center">
    <Switcher left="作战" right="训练" bind:selectedData={selectedData[0]} />
    <Switcher left="地面" right="空中" bind:selectedData={selectedData[1]} />
</div>

