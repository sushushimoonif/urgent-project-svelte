<script lang="ts">
    import { onMount } from 'svelte';
    import RealTimeMonitor from './RealTimeMonitor.svelte';
    
    // Reactive state declarations for the monitor modal
    let showMonitorModal = $state(false);
    let monitorModalPosition = $state({ x: 100, y: 100 });
    let monitorModalSize = $state({ width: 600, height: 400 });
    let monitorTableData = $state([]);
    
    // Throttle functions for mouse events
    function handleThrottleMouseMove(e: MouseEvent) {
        // Implementation for mouse move handling
    }
    
    function handleThrottleMouseUp() {
        // Implementation for mouse up handling
    }
</script>

<svelte:window
    onmousemove={(e) => {
        handleThrottleMouseMove(e);
    }}
    onmouseup={() => {
        handleThrottleMouseUp();
    }}
/>

<div class="max-h-screen overflow-auto bg-gray-900 p-4 sm:p-6 lg:p-8">
    <div class="w-full mx-auto h-full">
        <div class="flex flex-col xl:flex-row h-full gap-4">
            <!-- [Previous content remains unchanged] -->
        </div>
    </div>
</div>

<!-- 实时监控弹窗 - 使用封装的组件 -->
<RealTimeMonitor
    bind:isVisible={showMonitorModal}
    bind:position={monitorModalPosition}
    bind:size={monitorModalSize}
    data={monitorTableData}
/>